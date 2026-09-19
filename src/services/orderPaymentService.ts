import { ObjectId, type Document } from "mongodb";
import { getDb } from "@/lib/db";
import { getShopInbox, sendMail } from "@/lib/mail";
import { orderConfirmationEmail } from "@/lib/emailTemplates";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import type { CreatePaymentSessionBody } from "@/types/apps/paymentTypes";
import { quoteCart, recordRedemptions, redemptionQuoteFromOrder, toOrderDiscountLines } from "@/services/promotionService";
import { CheckoutError, normalizeCartItems, isAvailableProduct } from "@/lib/checkoutValidation";
import { withOrderTransaction, reserveOrderStock } from "@/lib/orderTransaction";
import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins } from "@/services/notificationService";

export interface PendingOrderResult { orderId: string; orderObjectId: ObjectId; totalAmount: number; created: boolean }

export class OrderPaymentService {
  static async validateCartItems(items: CreatePaymentSessionBody["items"]): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const normalized = normalizeCartItems(items);
      const db = await getDb();
      for (const item of normalized) {
        const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
        if (!product || !isAvailableProduct(product) || Number(product.quantity) < item.quantity) throw new CheckoutError("Some products are unavailable in the requested quantity");
      }
      return { ok: true };
    } catch (error) {
      if (!(error instanceof CheckoutError)) throw error;
      return { ok: false, message: error.message };
    }
  }

  static async getOrCreatePendingOrder(
    body: CreatePaymentSessionBody,
    user: { userId: string; userName?: string; email?: string },
    paymentMethod: "card" | "raast" | "wallet",
    identity: { id: string; fingerprint: string },
  ): Promise<PendingOrderResult> {
    const db = await getDb();
    const _id = new ObjectId(identity.id);
    const reuse = (order: Document): PendingOrderResult => {
      if (order.customer_id !== user.userId || order.checkout_fingerprint !== identity.fingerprint) throw new CheckoutError("Checkout key was already used for a different order", 409);
      return { orderId: identity.id, orderObjectId: _id, totalAmount: Number(order.total_amount), created: false };
    };
    const existing = await db.collection("orders").findOne({ _id });
    if (existing) return reuse(existing);
    const validation = await this.validateCartItems(body.items);
    if (!validation.ok) throw new CheckoutError(validation.message);
    const quote = await quoteCart({ items: body.items, voucherCode: body.promo_code || null, customerId: user.userId, customerEmail: body.customer_email });
    if (quote.missingProductIds.length) throw new CheckoutError("Some products are no longer available");
    if (body.promo_code && quote.rejected.length) throw new CheckoutError(quote.rejected[0].message);
    const order = {
      _id, customer_id: user.userId, customer_name: body.customer_name, customer_email: body.customer_email,
      phone: body.phone, province: body.province, city: body.city, area: body.area, address: body.address,
      items: quote.orderItems, subtotal: quote.subtotal, shipping: quote.shipping, delivery_promo: quote.deliveryPromo,
      discounts: toOrderDiscountLines(quote), discount_total: quote.discountTotal, discount_code: quote.voucher?.code || null,
      discount_amount: quote.voucherDiscount, promotions_recorded: false, total_amount: quote.total,
      checkout_fingerprint: identity.fingerprint, status: "pending_payment", payment_status: "unpaid",
      payment_method: paymentMethod, stock_reserved: false, safepay_tracker: null,
      created_at: new Date(), updated_at: new Date(),
    };
    try { await db.collection("orders").insertOne(order); }
    catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const winner = await db.collection("orders").findOne({ _id });
      if (!winner) throw error;
      return reuse(winner);
    }
    return { orderId: identity.id, orderObjectId: _id, totalAmount: quote.total, created: true };
  }

  static async attachSafepayTracker(orderId: string, tracker: string): Promise<void> {
    const db = await getDb();
    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId), safepay_tracker: null },
      { $set: { safepay_tracker: tracker, updated_at: new Date() } },
    );
    if (result.modifiedCount !== 1) throw new Error("Payment tracker is already attached");
  }

  static async findOrderIdByTracker(tracker: string): Promise<string | null> {
    const db = await getDb();
    const order = await db.collection("orders").findOne({ safepay_tracker: tracker });
    return order ? String(order._id) : null;
  }

  static async resolveOrderIdForWebhook(tracker: string | null, orderIdHint: string | null): Promise<string | null> {
    if (!tracker) return null;
    const id = await this.findOrderIdByTracker(tracker);
    if (orderIdHint && id !== orderIdHint) return null;
    return id;
  }

  static async fulfillPaidOrder(orderId: string, tracker?: string): Promise<{ alreadyPaid: boolean; notFound?: boolean; reviewRequired?: boolean }> {
    if (!ObjectId.isValid(orderId)) return { alreadyPaid: false, notFound: true };
    const _id = new ObjectId(orderId);
    let outcome: { order: Document | null; alreadyPaid: boolean; reviewRequired?: boolean };
    try {
      outcome = await withOrderTransaction(async (tx) => {
        const order = await tx.db.collection("orders").findOne({ _id, safepay_tracker: tracker }, { session: tx.session });
        if (!order || order.payment_method === "cod") return { order: null, alreadyPaid: false };
        if (["paid", "refunded"].includes(order.payment_status)) return { order, alreadyPaid: true, reviewRequired: order.status === "payment_review" };
        if (!["pending_payment", "payment_failed"].includes(order.status)) throw new CheckoutError("Payment arrived after cancellation", 409);
        if (!order.stock_reserved) await reserveOrderStock(tx, order.items);
        if (!order.promotions_recorded && order.discounts?.length) {
          await recordRedemptions({ orderId, quote: redemptionQuoteFromOrder(order), customerId: order.customer_id, customerEmail: order.customer_email }, tx);
        }
        await tx.db.collection("orders").updateOne({ _id }, { $set: { payment_status: "paid", status: "pending",
          stock_reserved: true, promotions_recorded: true, paid_at: new Date(), updated_at: new Date() } }, { session: tx.session });
        return { order, alreadyPaid: false };
      });
    } catch (error) {
      if (!(error instanceof CheckoutError)) throw error;
      // Money has arrived even if the inventory transaction rolled back. Preserve that fact for refund/review.
      const db = await getDb();
      const order = await db.collection("orders").findOneAndUpdate(
        { _id, safepay_tracker: tracker, payment_status: { $nin: ["paid", "refunded"] } },
        { $set: { payment_status: "paid", status: "payment_review", fulfillment_error: error.message, paid_at: new Date(), updated_at: new Date() } },
        { returnDocument: "after" },
      );
      outcome = { order, alreadyPaid: !order, reviewRequired: true };
    }
    if (outcome.reviewRequired) {
      await safeNotify(() => notifyAdmins({ type: "order_status", title: "Paid order needs review", body: `Order ${orderId} was paid but cannot be fulfilled. Review or cancel to refund.`, entityType: "order", entityId: orderId, idempotencyKey: `payment_review:${orderId}`, sendPush: true, route: "/admin/orders" }));
      return { alreadyPaid: outcome.alreadyPaid, reviewRequired: true };
    }
    if (!outcome.order) return { alreadyPaid: false, notFound: true };
    if (outcome.alreadyPaid) return { alreadyPaid: true };
    const order = outcome.order;
    const displayOrderId = String(orderId).slice(-8).toUpperCase();
    const deliverySettings = await getDeliverySettings().catch(() => null);
    const storeName = deliverySettings?.shopName || "";

    const confirmationHtml = orderConfirmationEmail({
      name: order.customer_name || "Customer",
      orderId: displayOrderId,
      items: order.items || [],
      total: Number(order.total_amount) || 0,
      subtotal: typeof order.subtotal === "number" ? order.subtotal : undefined,
      shipping: typeof order.shipping === "number" ? order.shipping : undefined,
      discounts: Array.isArray(order.discounts) ? order.discounts : [],
      province: order.province || "",
      city: order.city || "",
      area: order.area || "",
      address: order.address || "",
      shopName: storeName,
    });

    await Promise.all([
      order.customer_email
        ? sendMail({
            to: order.customer_email,
            subject: `Order #${displayOrderId} confirmed - ${storeName}`,
            html: confirmationHtml,
          })
        : Promise.resolve(),
      getShopInbox()
        ? sendMail({
            to: getShopInbox(),
            subject: `New paid order #${displayOrderId} PKR ${Number(order.total_amount).toLocaleString()}`,
            html: confirmationHtml,
          })
        : Promise.resolve(),
    ]);

    // Same admin alert as COD (POST /api/orders) — only after card payment is confirmed
    await safeNotify(() =>
      notifyAdmins({
        type: "order_placed",
        title: "New order placed",
        body: `Order #${displayOrderId} PKR ${Number(order.total_amount || 0).toLocaleString()}`,
        entityType: "order",
        entityId: String(orderId),
        actorId: order.customer_id ? String(order.customer_id) : null,
        idempotencyKey: `order_placed:${orderId}`,
        sendPush: true,
        route: "/admin/orders",
      })
    );

    return { alreadyPaid: false };
  }

  static async markPaymentFailed(orderId: string, tracker?: string): Promise<{ notFound?: boolean }> {
    if (!ObjectId.isValid(orderId) || !tracker) return { notFound: true };
    const db = await getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId), safepay_tracker: tracker });
    if (!order) return { notFound: true };
    await db.collection("orders").updateOne(
      { _id: order._id, safepay_tracker: tracker, status: "pending_payment", payment_status: "unpaid" },
      { $set: { payment_status: "failed", status: "payment_failed", updated_at: new Date() } },
    );
    return {};
  }
}
