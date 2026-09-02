import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isSafepayConfigured } from "@/lib/safepayConfig";
import { OrderPaymentService } from "@/services/orderPaymentService";
import { SafepayService } from "@/services/safepayService";
import type { CreatePaymentSessionBody } from "@/types/safepay";

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

      const body = (await req.json()) as CreatePaymentSessionBody;
      const user = getAuthUser(req);
      const paymentMethod = body.payment_method || "card";

      if (!body.customer_name || !body.customer_email || !body.phone || !body.address || !body.city) {
        return NextResponse.json({ success: false, message: "All shipping fields are required" }, { status: 400 });
      }

      if (!["card", "raast", "wallet"].includes(paymentMethod)) {
        return NextResponse.json({ success: false, message: "Invalid online payment method" }, { status: 400 });
      }

      const pendingOrder = await OrderPaymentService.getOrCreatePendingOrder(body, user, paymentMethod);
      const appBaseUrl = getAppBaseUrl(req);

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

      return NextResponse.json({
        success: true,
        session: {
          tracker: session.tracker,
          clientToken: session.clientToken,
          orderId: session.orderId,
          environment: session.environment,
          checkoutUrl: session.checkoutUrl,
          paymentMethod,
        },
      });
    } catch (error) {
      console.error("[SafepayController] createSession error:", error);
      const message = error instanceof Error ? error.message : "Failed to create Safepay session";
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  }
}
