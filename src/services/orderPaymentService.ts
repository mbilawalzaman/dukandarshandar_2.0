import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { computeShipping, isDeliveryPromoActive } from "@/lib/deliverySettings";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { getShopInbox, sendMail } from "@/lib/mail";
import { orderConfirmationEmail } from "@/lib/emailTemplates";
import type { CreatePaymentSessionBody } from "@/types/safepay";

export interface PendingOrderResult {
  orderId: string;
  orderObjectId: ObjectId;
  totalAmount: number;
}

interface CartItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

function buildCartFingerprint(items: CartItem[], totalAmount: number): string {
  const normalized = [...items]
    .map((item) => `${item._id}:${item.quantity}:${item.price}`)
    .sort()
    .join("|");
  return `${normalized}::${totalAmount}`;
}

/**
 * Order payment lifecycle pending order creation and post-payment fulfillment.
 */
export class OrderPaymentService {
  static async validateCartItems(items: CartItem[]): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!items || items.length === 0) {
      return { ok: false, message: "Cart is empty" };
    }

    const db = await getDb();

    for (const item of items) {
      if (!item._id || !ObjectId.isValid(item._id)) {
        return { ok: false, message: `Invalid product in cart: ${item.name}` };
      }

      const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
      if (!product) {
        return { ok: false, message: `${item.name} is no longer available` };
      }

      if (Number(product.quantity) < Number(item.quantity)) {
        return {
          ok: false,
          message: `Not enough stock for ${product.name}. Available: ${product.quantity}`,
        };
      }
    }

    return { ok: true };
  }

  static async getOrCreatePendingOrder(
    body: CreatePaymentSessionBody,
    user?: { userId?: string; userName?: string; email?: string } | null,
    paymentMethod: "card" | "raast" | "wallet" = "card"
  ): Promise<PendingOrderResult> {
    const validation = await OrderPaymentService.validateCartItems(body.items);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const db = await getDb();
    const deliverySettings = await getDeliverySettings();
    const subtotal = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = computeShipping(subtotal, deliverySettings);
    const totalAmount = subtotal + shipping;
    const customerEmail = body.customer_email || user?.email || "guest@example.com";
    const cartFingerprint = buildCartFingerprint(body.items, totalAmount);
    const reuseCutoff = new Date(Date.now() - 30 * 60 * 1000);

    const existingOrder = await db.collection("orders").findOne({
      customer_email: customerEmail,
      status: "pending_payment",
      payment_status: "unpaid",
      cart_fingerprint: cartFingerprint,
      created_at: { $gte: reuseCutoff },
    });

    if (existingOrder) {
      await db.collection("orders").updateMany(
        {
          customer_email: customerEmail,
          status: "pending_payment",
          payment_status: "unpaid",
          _id: { $ne: existingOrder._id },
        },
        {
          $set: {
            status: "cancelled",
            updated_at: new Date(),
          },
        }
      );

      await db.collection("orders").updateOne(
        { _id: existingOrder._id },
        {
          $set: {
            customer_name: body.customer_name || user?.userName || existingOrder.customer_name,
            phone: body.phone || "",
            address: body.address || "",
            city: body.city || "",
            payment_method: paymentMethod,
            updated_at: new Date(),
          },
        }
      );

      const { syncCheckoutProfileToUser } = await import("@/lib/syncCheckoutProfile");
      await syncCheckoutProfileToUser(user?.userId, {
        customer_name: body.customer_name,
        customer_email: body.customer_email || customerEmail,
        phone: body.phone,
        address: body.address,
        city: body.city,
      }).catch(() => undefined);

      return {
        orderId: String(existingOrder._id),
        orderObjectId: existingOrder._id,
        totalAmount,
      };
    }

    return OrderPaymentService.createPendingOrder(body, user, paymentMethod, cartFingerprint);
  }

  static async createPendingOrder(
    body: CreatePaymentSessionBody,
    user?: { userId?: string; userName?: string; email?: string } | null,
    paymentMethod: "card" | "raast" | "wallet" = "card",
    cartFingerprint?: string
  ): Promise<PendingOrderResult> {
    const validation = await OrderPaymentService.validateCartItems(body.items);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const db = await getDb();
    const deliverySettings = await getDeliverySettings();
    const subtotal = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = computeShipping(subtotal, deliverySettings);
    const delivery_promo = isDeliveryPromoActive(deliverySettings, subtotal);
    const totalAmount = subtotal + shipping;
    const fingerprint = cartFingerprint || buildCartFingerprint(body.items, totalAmount);

    const enrichedItems = [];
    for (const item of body.items) {
      const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
      enrichedItems.push({
        ...item,
        image: product?.image || item.image || "",
      });
    }

    const customerEmail = body.customer_email || user?.email || "guest@example.com";

    await db.collection("orders").updateMany(
      {
        customer_email: customerEmail,
        status: "pending_payment",
        payment_status: "unpaid",
      },
      {
        $set: {
          status: "cancelled",
          updated_at: new Date(),
        },
      }
    );

    const newOrder = {
      customer_name: body.customer_name || user?.userName || "Guest Customer",
      customer_email: customerEmail,
      customer_id: user?.userId || null,
      phone: body.phone || "",
      address: body.address || "",
      city: body.city || "",
      items: enrichedItems,
      subtotal,
      shipping,
      delivery_promo,
      total_amount: totalAmount,
      cart_fingerprint: fingerprint,
      status: "pending_payment",
      payment_status: "unpaid",
      payment_method: paymentMethod,
      safepay_tracker: null as string | null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);

    const { syncCheckoutProfileToUser } = await import("@/lib/syncCheckoutProfile");
    await syncCheckoutProfileToUser(user?.userId, {
      customer_name: body.customer_name,
      customer_email: customerEmail,
      phone: body.phone,
      address: body.address,
      city: body.city,
    }).catch(() => undefined);

    return {
      orderId: String(result.insertedId),
      orderObjectId: result.insertedId,
      totalAmount,
    };
  }

  static async attachSafepayTracker(orderId: string, tracker: string): Promise<void> {
    if (!ObjectId.isValid(orderId)) return;

    const db = await getDb();
    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          safepay_tracker: tracker,
          updated_at: new Date(),
        },
      }
    );
  }

  static async findOrderIdByTracker(tracker: string): Promise<string | null> {
    const db = await getDb();
    const order = await db.collection("orders").findOne({ safepay_tracker: tracker });
    return order ? String(order._id) : null;
  }

  /** Resolve order for webhook tracker is authoritative over metadata order_id. */
  static async resolveOrderIdForWebhook(
    tracker: string | null,
    orderIdHint: string | null
  ): Promise<string | null> {
    if (tracker) {
      const byTracker = await OrderPaymentService.findOrderIdByTracker(tracker);
      if (byTracker) return byTracker;
    }

    if (orderIdHint && ObjectId.isValid(orderIdHint)) {
      const db = await getDb();
      const byId = await db.collection("orders").findOne({ _id: new ObjectId(orderIdHint) });
      if (byId) return String(byId._id);
    }

    return null;
  }

  static async fulfillPaidOrder(
    orderId: string,
    tracker?: string
  ): Promise<{ alreadyPaid: boolean; notFound?: boolean }> {
    if (!ObjectId.isValid(orderId)) {
      return { alreadyPaid: false, notFound: true };
    }

    const db = await getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return { alreadyPaid: false, notFound: true };
    }

    if (order.payment_status === "paid") {
      return { alreadyPaid: true };
    }

    const fulfillableStatuses = ["pending_payment", "cancelled", "payment_failed"];
    if (!fulfillableStatuses.includes(String(order.status))) {
      throw new Error(`Order ${orderId} cannot be fulfilled from status ${order.status}`);
    }

    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item._id && ObjectId.isValid(item._id)) {
          const result = await db.collection("products").updateOne(
            { _id: new ObjectId(item._id), quantity: { $gte: Number(item.quantity) } },
            {
              $inc: { quantity: -Number(item.quantity) },
              $set: { updated_at: new Date() },
            }
          );

          if (result.modifiedCount === 0) {
            throw new Error(`Could not reserve stock for ${item.name}`);
          }
        }
      }
    }

    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          payment_status: "paid",
          status: "pending",
          safepay_tracker: tracker || order.safepay_tracker || null,
          paid_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    const displayOrderId = String(orderId).slice(-8).toUpperCase();
    const confirmationHtml = orderConfirmationEmail({
      name: order.customer_name || "Customer",
      orderId: displayOrderId,
      items: order.items || [],
      total: Number(order.total_amount) || 0,
      address: order.address || "",
      city: order.city || "",
    });

    await Promise.all([
      order.customer_email
        ? sendMail({
            to: order.customer_email,
            subject: `Order #${displayOrderId} confirmed Dukandar Shandar`,
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

    return { alreadyPaid: false };
  }

  static async markPaymentFailed(orderId: string, tracker?: string): Promise<{ notFound?: boolean }> {
    if (!ObjectId.isValid(orderId)) {
      return { notFound: true };
    }

    const db = await getDb();
    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId), payment_status: { $ne: "paid" } },
      {
        $set: {
          payment_status: "failed",
          status: "payment_failed",
          safepay_tracker: tracker || null,
          updated_at: new Date(),
        },
      }
    );

    return result.matchedCount === 0 ? { notFound: true } : {};
  }
}
