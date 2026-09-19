import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins } from "@/services/notificationService";
import { CheckoutError, validateCheckout } from "@/lib/checkoutValidation";
import { checkoutIdentity, validateShippingLocation } from "@/lib/checkout.server";
import { throttleRequest } from "@/lib/rateLimit.server";
import { getDb } from "@/lib/db";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isSafepayConfigured } from "@/lib/safepayConfig";
import { OrderPaymentService } from "@/services/orderPaymentService";
import { SafepayService } from "@/services/safepayService";
import type { CreatePaymentSessionBody } from "@/types/apps/paymentTypes";

function getAppBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

/**
 * HTTP controller for Safepay checkout session endpoints.
 * Receives requests and delegates business logic to services.
 */
export class SafepayController {
  static async createSession(req: NextRequest): Promise<NextResponse> {
    try {
      if (!isSafepayConfigured()) {
        return NextResponse.json(
          { success: false, message: "Safepay is not configured on the server" },
          { status: 503 }
        );
      }

      const normalized = validateCheckout(await req.json(), ["card", "raast", "wallet"]);
      const body = normalized as CreatePaymentSessionBody;
      const user = getAuthUser(req);
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Please login, sign up, or continue as guest to place an order" },
          { status: 401 }
        );
      }

      const limited = await throttleRequest(req, "payment-session", 15, 60 * 1000, user.userId);
      if (limited) return limited;
      const identity = checkoutIdentity(req, user.userId, normalized);
      const paymentMethod = body.payment_method || "card";
      await validateShippingLocation(normalized);
      const pendingOrder = await OrderPaymentService.getOrCreatePendingOrder(body, user, paymentMethod, identity);
      const db = await getDb();
      const attempts = db.collection<{ _id: string; owner: string; state: string; session?: Record<string, unknown>; createdAt: Date }>("payment_sessions");
      const attempt = await attempts.findOne({ _id: identity.id, owner: user.userId });
      const order = await db.collection("orders").findOne({ _id: pendingOrder.orderObjectId });
      if (order?.status !== "pending_payment" || order?.payment_status !== "unpaid") {
        throw new CheckoutError("This payment attempt has finished. Check your orders before retrying.", 409);
      }
      if (attempt?.state === "ready" && attempt.session) {
        return NextResponse.json({ success: true, session: attempt.session });
      }
      if (attempt) throw new CheckoutError("This payment attempt is already processing. Check your orders before retrying.", 409);
      // Only the insert winner calls the provider. A crash before this claim can be retried safely.
      try {
        await attempts.insertOne({ _id: identity.id, owner: user.userId, state: "creating", createdAt: new Date() });
      } catch (error) {
        if ((error as { code?: number }).code === 11000) throw new CheckoutError("This payment attempt is already processing. Please wait.", 409);
        throw error;
      }
      const appBaseUrl = getAppBaseUrl(req);

      try {
        const session = await SafepayService.createCheckoutSession(
          {
            amount: pendingOrder.totalAmount,
            currency: "PKR",
            orderId: pendingOrder.orderId,
            customerEmail: body.customer_email,
            customerName: body.customer_name,
            customerPhone: body.phone,
          },
          paymentMethod === "raast" || paymentMethod === "wallet"
            ? {
                hostedRedirectUrl: `${appBaseUrl}/orders?placed=1`,
                hostedCancelUrl: `${appBaseUrl}/checkout`,
              }
            : undefined
        );

        await OrderPaymentService.attachSafepayTracker(pendingOrder.orderId, session.tracker);

        const responseSession = {
          tracker: session.tracker, clientToken: session.clientToken, orderId: session.orderId,
          environment: session.environment, checkoutUrl: session.checkoutUrl, paymentMethod,
        };
        await attempts.updateOne({ _id: identity.id, owner: user.userId }, { $set: { state: "ready", session: responseSession } });
        return NextResponse.json({ success: true, session: responseSession });
      } catch (error) {
        await attempts.updateOne({ _id: identity.id }, { $set: { state: "review_required" } });
        await safeNotify(() => notifyAdmins({ type: "order_status", title: "Payment session needs review", body: `Check the payment attempt for order ${identity.id} before creating another session.`, entityType: "order", entityId: identity.id, idempotencyKey: `session_review:${identity.id}`, sendPush: true, route: "/admin/orders" }));
        throw error;
      }
    } catch (error) {
      console.error("[SafepayController] createSession error:", error);
      const message = error instanceof CheckoutError ? error.message : "Could not prepare payment. Check your orders before retrying.";
      return NextResponse.json({ success: false, message }, { status: error instanceof CheckoutError ? error.status : 500 });
    }
  }
}
