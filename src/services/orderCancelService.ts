import { ownsOrder, hasReservedStock, allowedOrderTransitions } from "@/lib/orderRules";
import { withOrderTransaction, releaseOrderStock } from "@/lib/orderTransaction";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins } from "@/services/notificationService";
import { SafepayService } from "@/services/safepayService";
import { isSafepayConfigured } from "@/lib/safepayConfig";
import { sendMail, getShopInbox } from "@/lib/mail";
import { orderStatusEmail } from "@/lib/emailTemplates";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { releaseRedemptions } from "@/services/promotionService";

export type CancelOrderResult =
  | { success: true; orderId: string; refunded: boolean }
  | { success: false; message: string; status: number };

/** A durable claim prevents duplicate refunds. Ambiguous provider failures are never blindly retried. */
export async function cancelCustomerOrder(
  orderId: string,
  user: { userId?: string; email?: string; role?: string }
): Promise<CancelOrderResult> {
  if (!orderId || !ObjectId.isValid(orderId)) return { success: false, message: "Invalid order ID", status: 400 };
  const db = await getDb();
  const _id = new ObjectId(orderId);
  const order = await db.collection("orders").findOne({ _id });
  if (!order) return { success: false, message: "Order not found", status: 404 };
  if (!ownsOrder(order, user)) return { success: false, message: "You can only cancel your own orders", status: 403 };
  if (order.status === "cancelled") return { success: true, orderId, refunded: order.payment_status === "refunded" };

  const resuming = order.status === "cancelling";
  if (resuming && order.refund_state !== "succeeded" && order.refund_state !== "not_required") {
    return { success: false, message: "Cancellation is being processed. Contact support if it remains pending.", status: 409 };
  }
  if (!resuming && !(user.role === "admin" ? allowedOrderTransitions(order).includes("cancelled") : order.status === "pending")) {
    return { success: false, message: "This order can no longer be cancelled. Contact support if you need help.", status: 409 };
  }
  const needsRefund = order.payment_status === "paid" && order.payment_method !== "cod";
  const tracker = typeof order.safepay_tracker === "string" ? order.safepay_tracker.trim() : "";
  if (!resuming && needsRefund && (!tracker || !isSafepayConfigured())) {
    return { success: false, message: "Payment refund is unavailable. Please contact support.", status: 503 };
  }

  if (!resuming) {
    const claimed = await db.collection("orders").updateOne(
      { _id, status: order.status, payment_status: order.payment_status },
      { $set: { status: "cancelling", cancellation_previous_status: order.status,
        stock_reserved: hasReservedStock(order), refund_state: needsRefund ? "requested" : "not_required",
        cancelled_by: user.userId, updated_at: new Date() } },
    );
    if (claimed.modifiedCount !== 1) return { success: false, message: "Order changed. Refresh and try again.", status: 409 };
    if (needsRefund) {
      try {
        await SafepayService.refundPayment(tracker, { amount: Number(order.total_amount), reason: "customer_cancel" });
        await db.collection("orders").updateOne({ _id, status: "cancelling", refund_state: "requested" }, {
          $set: { refund_state: "succeeded", payment_status: "refunded", refunded_at: new Date(), updated_at: new Date() },
        });
      } catch (error) {
        console.error("Safepay refund requires reconciliation:", error);
        await db.collection("orders").updateOne({ _id, status: "cancelling", refund_state: "requested" }, { $set: { refund_state: "review_required", updated_at: new Date() } });
        await safeNotify(() => notifyAdmins({ type: "order_status", title: "Refund requires review", body: `Check Safepay before retrying refund for order ${orderId}`,
          entityType: "order", entityId: orderId, idempotencyKey: `refund_review:${orderId}`, sendPush: true, route: "/admin/orders" }));
        return { success: false, message: "The refund needs verification. Please contact support; it will not be submitted twice.", status: 502 };
      }
    }
  }

  const refunded = await withOrderTransaction(async (tx) => {
    const current = await tx.db.collection("orders").findOne({ _id }, { session: tx.session });
    if (!current) throw new Error("Order not found");
    if (current.status === "cancelled") return current.payment_status === "refunded";
    if (current.status !== "cancelling" || !["succeeded", "not_required"].includes(current.refund_state)) throw new Error("Cancellation is not ready");
    await releaseOrderStock(tx, current);
    if (current.promotions_recorded) await releaseRedemptions(orderId, tx);
    await tx.db.collection("orders").updateOne({ _id }, { $set: {
      status: "cancelled", stock_reserved: false, promotions_recorded: false, cancelled_at: new Date(), updated_at: new Date(),
    } }, { session: tx.session });
    return current.payment_status === "refunded";
  });

  const displayOrderId = String(orderId).slice(-8).toUpperCase();

  await safeNotify(() =>
    notifyAdmins({
      type: "order_status",
      title: "Order cancelled by customer",
      body: `Order #${displayOrderId}${refunded ? " (refunded)" : ""}`,
      entityType: "order",
      entityId: String(orderId),
      actorId: user.userId || null,
      idempotencyKey: `order_cancelled_customer:${orderId}`,
      sendPush: true,
      route: "/admin/orders",
    })
  );

  if (order.customer_email) {
    const deliverySettings = await getDeliverySettings().catch(() => null);
    const storeName = deliverySettings?.shopName || "";

    await sendMail({
      to: order.customer_email,
      subject: `Order #${displayOrderId} cancelled - ${storeName}`,
      html: orderStatusEmail({
        name: order.customer_name || "Customer",
        orderId: displayOrderId,
        status: refunded ? "cancelled (refund initiated)" : "cancelled",
        shopName: storeName,
      }),
    }).catch(() => undefined);
  }

  const inbox = getShopInbox();
  if (inbox) {
    await sendMail({
      to: inbox,
      subject: `Customer cancelled order #${displayOrderId}`,
      html: orderStatusEmail({
        name: order.customer_name || "Customer",
        orderId: displayOrderId,
        status: refunded ? "cancelled (refund initiated)" : "cancelled",
      }),
    }).catch(() => undefined);
  }

  return { success: true, orderId: String(orderId), refunded };
}
