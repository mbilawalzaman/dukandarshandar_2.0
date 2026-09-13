import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins } from "@/services/notificationService";
import { SafepayService } from "@/services/safepayService";
import { isSafepayConfigured } from "@/lib/safepayConfig";
import { sendMail, getShopInbox } from "@/lib/mail";
import { orderStatusEmail } from "@/lib/emailTemplates";
import { releaseRedemptions } from "@/services/promotionService";

export type CancelOrderResult =
  | { success: true; orderId: string; refunded: boolean }
  | { success: false; message: string; status: number };

function ownsOrder(
  order: { customer_id?: string | null; customer_email?: string | null },
  user: { userId?: string; email?: string; role?: string }
): boolean {
  if (user.role === "admin") return true;
  if (user.userId && order.customer_id && String(order.customer_id) === String(user.userId)) {
    return true;
  }
  if (user.email && order.customer_email) {
    return user.email.trim().toLowerCase() === String(order.customer_email).trim().toLowerCase();
  }
  return false;
}

async function releaseOrderPromotions(order: { _id: ObjectId; promotions_recorded?: boolean }): Promise<void> {
  if (!order.promotions_recorded) return;
  await releaseRedemptions(String(order._id));
  const db = await getDb();
  await db.collection("orders").updateOne({ _id: order._id }, { $set: { promotions_recorded: false } });
}

async function restockOrderItems(
  items: Array<{ _id?: string; quantity?: number }> | undefined
): Promise<void> {
  if (!Array.isArray(items)) return;
  const db = await getDb();
  for (const item of items) {
    if (!item._id || !ObjectId.isValid(item._id)) continue;
    await db.collection("products").updateOne(
      { _id: new ObjectId(item._id) },
      {
        $inc: { quantity: Number(item.quantity) || 1 },
        $set: { updated_at: new Date() },
      }
    );
  }
}

/**
 * Customer (or admin) cancel while fulfillment status is still `pending`.
 * Paid card orders attempt a Safepay refund first (sandbox or production).
 */
export async function cancelCustomerOrder(
  orderId: string,
  user: { userId?: string; email?: string; role?: string }
): Promise<CancelOrderResult> {
  if (!orderId || !ObjectId.isValid(orderId)) {
    return { success: false, message: "Invalid order ID", status: 400 };
  }

  const db = await getDb();
  const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });

  if (!order) {
    return { success: false, message: "Order not found", status: 404 };
  }

  if (!ownsOrder(order as { customer_id?: string | null; customer_email?: string | null }, user)) {
    return { success: false, message: "You can only cancel your own orders", status: 403 };
  }

  const status = String(order.status || "").toLowerCase();
  if (status === "cancelled") {
    return { success: false, message: "Order is already cancelled", status: 400 };
  }

  if (status !== "pending") {
    return {
      success: false,
      message: "This order can no longer be cancelled. Contact support if you need help.",
      status: 400,
    };
  }

  const paymentStatus = String(order.payment_status || "").toLowerCase();
  const paymentMethod = String(order.payment_method || "cod").toLowerCase();
  const tracker = typeof order.safepay_tracker === "string" ? order.safepay_tracker.trim() : "";
  const needsRefund = paymentStatus === "paid" && paymentMethod !== "cod" && Boolean(tracker);

  let refunded = false;
  if (needsRefund) {
    if (!isSafepayConfigured()) {
      return {
        success: false,
        message: "Payment refund is unavailable right now. Please contact support.",
        status: 503,
      };
    }
    try {
      await SafepayService.refundPayment(tracker, {
        amount: Number(order.total_amount) || undefined,
        reason: "customer_cancel",
      });
      refunded = true;
    } catch (error) {
      console.error("Safepay refund failed:", error);
      return {
        success: false,
        message:
          "Could not refund this payment automatically. Please contact support — your order was not cancelled.",
        status: 502,
      };
    }
  }

  await restockOrderItems(order.items);
  await releaseOrderPromotions(order as { _id: ObjectId; promotions_recorded?: boolean });

  await db.collection("orders").updateOne(
    { _id: new ObjectId(orderId), status: "pending" },
    {
      $set: {
        status: "cancelled",
        cancelled_at: new Date(),
        cancelled_by: user.userId || user.email || "customer",
        payment_status: refunded ? "refunded" : order.payment_status,
        refunded_at: refunded ? new Date() : order.refunded_at || null,
        updated_at: new Date(),
      },
    }
  );

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
    await sendMail({
      to: order.customer_email,
      subject: `Order #${displayOrderId} cancelled Dukandar Shandar`,
      html: orderStatusEmail({
        name: order.customer_name || "Customer",
        orderId: displayOrderId,
        status: refunded ? "cancelled (refund initiated)" : "cancelled",
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
