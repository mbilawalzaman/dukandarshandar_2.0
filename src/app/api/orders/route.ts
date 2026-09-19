import { CheckoutError, validateCheckout } from "@/lib/checkoutValidation";
import { checkoutIdentity, validateShippingLocation } from "@/lib/checkout.server";
import { withOrderTransaction, reserveOrderStock } from "@/lib/orderTransaction";
import { allowedOrderTransitions } from "@/lib/orderRules";
import { cancelCustomerOrder } from "@/services/orderCancelService";
import { throttleRequest } from "@/lib/rateLimit.server";
import { escapeRegex } from "@/lib/escapeRegex";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { attachSessionCookies } from "@/lib/session";
import { syncCheckoutProfileToUser } from "@/lib/syncCheckoutProfile";
import { getShopInbox, sendMail } from "@/lib/mail";
import { orderConfirmationEmail, orderStatusEmail, orderDeliveredEmail } from "@/lib/emailTemplates";
import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins, createNotification } from "@/services/notificationService";
import { parsePageLimit, paginationMeta } from "@/lib/pagination";
import { quoteCart, recordRedemptions, toOrderDiscountLines } from "@/services/promotionService";
import { getDeliverySettings } from "@/lib/deliverySettings.server";

async function enrichOrdersWithImages(
  db: Awaited<ReturnType<typeof getDb>>,
  orders: Array<{ items?: Array<{ _id?: string; name?: string; image?: string }> }>
) {
  const productIdsToFetch: ObjectId[] = [];
  const productNamesToFetch: string[] = [];

  orders.forEach((o) => {
    o.items?.forEach((it) => {
      if (!it.image) {
        if (it._id && ObjectId.isValid(it._id)) {
          productIdsToFetch.push(new ObjectId(it._id));
        } else if (it.name) {
          productNamesToFetch.push(it.name);
        }
      }
    });
  });

  if (productIdsToFetch.length === 0 && productNamesToFetch.length === 0) return;

  const orConditions: Array<Record<string, unknown>> = [];
  if (productIdsToFetch.length > 0) orConditions.push({ _id: { $in: productIdsToFetch } });
  if (productNamesToFetch.length > 0) orConditions.push({ name: { $in: productNamesToFetch } });

  const products = await db.collection("products").find({ $or: orConditions }).toArray();
  const imgById: Record<string, string> = {};
  const imgByName: Record<string, string> = {};
  products.forEach((p) => {
    if (p.image) {
      imgById[String(p._id)] = p.image;
      imgByName[p.name] = p.image;
    }
  });

  orders.forEach((o) => {
    o.items?.forEach((it) => {
      if (!it.image) {
        it.image = (it._id && imgById[String(it._id)]) || (it.name && imgByName[it.name]) || "";
      }
    });
  });
}

function resolveTimeframeFrom(searchParams: URLSearchParams): Date | null {
  const timeframe = searchParams.get("timeframe");
  if (!timeframe || timeframe === "all") return null;

  const now = new Date();
  const from = new Date(now);

  if (timeframe === "30d" || timeframe === "30days") {
    from.setDate(from.getDate() - 30);
    return from;
  }
  if (timeframe === "90d" || timeframe === "3months") {
    from.setDate(from.getDate() - 90);
    return from;
  }
  if (timeframe === "365d" || timeframe === "6months") {
    from.setDate(from.getDate() - 180);
    return from;
  }
  if (timeframe === "thisYear") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

function buildOrderFilter(
  baseQuery: Record<string, unknown>,
  searchParams: URLSearchParams
) {
  const filter: Record<string, unknown> = { ...baseQuery };
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  if (status && status !== "all") {
    filter.status = status;
  }

  if (search) {
    const searchOr: Array<Record<string, unknown>> = [
      { customer_name: { $regex: escapeRegex(search), $options: "i" } },
      { customer_email: { $regex: escapeRegex(search), $options: "i" } },
      { "items.name": { $regex: escapeRegex(search), $options: "i" } },
      ...(ObjectId.isValid(search) ? [{ _id: new ObjectId(search) }] : []),
    ];
    // Don't clobber ownership $or (registered users) — combine with $and
    if (filter.$or) {
      const ownershipOr = filter.$or;
      delete filter.$or;
      filter.$and = [{ $or: ownershipOr }, { $or: searchOr }];
    } else {
      filter.$or = searchOr;
    }
  }

  const from = resolveTimeframeFrom(searchParams);
  if (from) {
    filter.created_at = { $gte: from };
  }

  return filter;
}

function orderSort(searchParams: URLSearchParams): Record<string, 1 | -1> {
  const sortBy = searchParams.get("sortBy") || "newest";
  switch (sortBy) {
    case "oldest":
      return { created_at: 1 };
    case "amount_desc":
      return { total_amount: -1 };
    case "amount_asc":
      return { total_amount: 1 };
    default:
      return { created_at: -1 };
  }
}

async function buildOrderSummary(db: Awaited<ReturnType<typeof getDb>>, baseQuery: Record<string, unknown>) {
  const [totalOrders, statusAgg, spentAgg, activeCount, deliveredCount] = await Promise.all([
    db.collection("orders").countDocuments(baseQuery),
    db
      .collection("orders")
      .aggregate([{ $match: baseQuery }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
    db
      .collection("orders")
      .aggregate([
        { $match: { ...baseQuery, status: { $ne: "cancelled" }, $or: [{ payment_status: "paid" }, { payment_method: "cod", status: "delivered" }] } },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
      ])
      .toArray(),
    db.collection("orders").countDocuments({
      ...baseQuery,
      status: { $in: ["pending", "processing", "shipped", "pending_payment", "payment_review", "cancelling"] },
    }),
    db.collection("orders").countDocuments({ ...baseQuery, status: "delivered" }),
  ]);

  const statusCounts: Record<string, number> = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    pending_payment: 0,
    payment_failed: 0,
  };
  statusAgg.forEach((row) => {
    const key = String(row._id || "pending").toLowerCase();
    statusCounts[key] = (statusCounts[key] || 0) + (row.count as number);
  });

  return {
    totalOrders,
    totalSpent: spentAgg[0]?.total || 0,
    activeCount,
    deliveredCount,
    statusCounts,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePageLimit(searchParams, { page: 1, limit: 10, maxLimit: 50 });

    // Contact email is not evidence of ownership (including guest orders).
    const baseQuery: Record<string, unknown> = user.role === "admin" ? {} : { customer_id: user.userId };

    const filter = buildOrderFilter(baseQuery, searchParams);
    const sort = orderSort(searchParams);

    const db = await getDb();
    const [orders, total, summary] = await Promise.all([
      db.collection("orders").find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection("orders").countDocuments(filter),
      buildOrderSummary(db, baseQuery),
    ]);

    await enrichOrdersWithImages(
      db,
      orders as Array<{ items?: Array<{ _id?: string; name?: string; image?: string }> }>
    );

    return NextResponse.json({
      success: true,
      orders,
      pagination: paginationMeta(page, limit, total),
      summary,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = validateCheckout(await req.json(), ["cod"]);
    const { customer_name, customer_email, phone, province, city, area, address, items, payment_method, promo_code } = body;
    const user = getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please login, sign up, or continue as guest to place an order" },
        { status: 401 }
      );
    }

    const limited = await throttleRequest(req, "orders", 20, 60 * 1000, user.userId);
    if (limited) return limited;
    const identity = checkoutIdentity(req, user.userId, body);
    const db = await getDb();
    const previous = await db.collection("orders").findOne({ _id: new ObjectId(identity.id) });
    if (previous) {
      if (previous.customer_id !== user.userId || previous.checkout_fingerprint !== identity.fingerprint) throw new CheckoutError("Checkout key was already used for a different order", 409);
      return NextResponse.json({ success: true, order: previous, message: "Order already placed" });
    }
    await validateShippingLocation(body);

    // Authoritative pricing: product prices, promotions and delivery fee all come from the server.
    const quote = await quoteCart({
      items,
      voucherCode: promo_code || null,
      customerId: user.userId || null,
      customerEmail: customer_email || user.email || null,
    });
    if (quote.missingProductIds.length > 0) {
      return NextResponse.json({ success: false, message: "Some items in your cart are no longer available" }, { status: 400 });
    }
    if (promo_code && quote.rejected.length > 0) {
      return NextResponse.json({ success: false, message: quote.rejected[0].message }, { status: 400 });
    }

    const { subtotal, shipping, deliveryPromo: delivery_promo, discountTotal: discount_total, total: computedTotal } = quote;

    const enrichedItems = quote.orderItems;

    const newOrder = {
      _id: new ObjectId(identity.id),
      checkout_fingerprint: identity.fingerprint,
      stock_reserved: true,
      customer_name: customer_name || user?.userName || "Guest Customer",
      customer_email: customer_email || user?.email || "guest@example.com",
      customer_id: user?.userId || null,
      phone: phone || "",
      province: province || "",
      city: city || "",
      area: area || "",
      address: address || "",
      items: enrichedItems,
      subtotal,
      shipping,
      delivery_promo,
      discounts: toOrderDiscountLines(quote),
      discount_total,
      // legacy single-voucher fields kept for older UI/reports
      discount_code: quote.voucher?.code || null,
      discount_amount: quote.voucherDiscount,
      promotions_recorded: false,
      total_amount: computedTotal,
      payment_method: payment_method || "cod",
      payment_status: "unpaid",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const committed = await withOrderTransaction(async (tx) => {
      const existing = await tx.db.collection("orders").findOne({ _id: newOrder._id }, { session: tx.session });
      if (existing) {
        if (existing.checkout_fingerprint !== identity.fingerprint || existing.customer_id !== user.userId) throw new CheckoutError("Checkout key was already used for a different order", 409);
        return { created: false, order: existing };
      }
      await reserveOrderStock(tx, enrichedItems);
      await tx.db.collection("orders").insertOne(newOrder, { session: tx.session });
      if (quote.applied.length) {
        const kept = await recordRedemptions({ orderId: identity.id, quote, customerId: user.userId, customerEmail: customer_email }, tx);
        if (kept.length !== quote.applied.length) throw new CheckoutError("A promotion has reached its limit. Refresh your cart and try again.", 409);
        await tx.db.collection("orders").updateOne({ _id: newOrder._id }, { $set: { promotions_recorded: true } }, { session: tx.session });
      }
      return { created: true, order: newOrder };
    });
    if (!committed.created) return NextResponse.json({ success: true, order: committed.order, message: "Order already placed" });
    newOrder.promotions_recorded = quote.applied.length > 0;
    await safeNotify(async () => {
      for (const item of enrichedItems) {
        const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
        if (product && Number(product.quantity) <= 5) await notifyAdmins({
          type: "low_stock", title: "Low stock alert", body: `${product.name} has only ${product.quantity} units left`,
          entityType: "product", entityId: String(product._id), idempotencyKey: `low_stock:${product._id}:${product.quantity}`,
          sendPush: true, route: "/admin/products",
        });
      }
    });
    const result = { insertedId: newOrder._id };
    const orderId = identity.id.slice(-8).toUpperCase();

    await safeNotify(() =>
      notifyAdmins({
        type: "order_placed",
        title: "New order placed",
        body: `Order #${orderId} PKR ${computedTotal.toLocaleString()}`,
        entityType: "order",
        entityId: String(result.insertedId),
        actorId: user?.userId || null,
        idempotencyKey: `order_placed:${result.insertedId}`,
        sendPush: true,
        route: "/admin/orders",
      })
    );

    const deliverySettings = await getDeliverySettings().catch(() => null);
    const storeName = deliverySettings?.shopName || "";

    const confirmationHtml = orderConfirmationEmail({
      name: newOrder.customer_name,
      orderId,
      items: enrichedItems,
      total: computedTotal,
      subtotal,
      shipping,
      discounts: newOrder.discounts,
      province: newOrder.province,
      city: newOrder.city,
      area: newOrder.area,
      address: newOrder.address,
      shopName: storeName,
    });

    await Promise.all([
      sendMail({
        to: newOrder.customer_email,
        subject: storeName ? `Order #${orderId} confirmed - ${storeName}` : `Order #${orderId} confirmed`,
        html: confirmationHtml,
      }),
      getShopInbox()
        ? sendMail({
            to: getShopInbox(),
            subject: `New order #${orderId} PKR ${computedTotal.toLocaleString()}`,
            html: confirmationHtml,
          })
        : Promise.resolve(),
    ]);

    let token: string | undefined;
    // Persist checkout email + shipping onto the logged-in user profile
    const synced = await syncCheckoutProfileToUser(user?.userId, {
      customer_name,
      customer_email,
      phone,
      address,
      city,
      province,
      area,
    }).catch(() => ({ updated: false, session: undefined }));
    if (synced.session) {
      token = synced.session.accessToken;
      const response = NextResponse.json({
        success: true,
        message: "Order placed successfully",
        order: newOrder,
        token: synced.session.accessToken,
        profileSynced: true,
      });
      attachSessionCookies(response, synced.session.accessToken, synced.session.refreshToken);
      return response;
    }

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
      ...(token ? { token } : {}),
      profileSynced: synced.updated,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ success: false, message: error instanceof CheckoutError ? error.message : "Failed to place order" }, { status: error instanceof CheckoutError ? error.status : 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { _id, status } = await req.json();

    if (!_id || !ObjectId.isValid(_id)) {
      return NextResponse.json({ success: false, message: "Invalid order ID" }, { status: 400 });
    }

    const db = await getDb();
    const existingOrder = await db.collection("orders").findOne({ _id: new ObjectId(_id) });

    if (!existingOrder) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    if (status === "cancelled") {
      const cancelled = await cancelCustomerOrder(_id, admin.user);
      return NextResponse.json(cancelled.success ? { success: true, message: cancelled.refunded ? "Order cancelled and refund initiated" : "Order cancelled" } : cancelled,
        { status: cancelled.success ? 200 : cancelled.status });
    }
    if (!allowedOrderTransitions(existingOrder).includes(status)) {
      throw new CheckoutError("This order status transition is not allowed", 409);
    }
    const result = await db.collection("orders").updateOne(
      { _id: existingOrder._id, status: existingOrder.status, payment_status: existingOrder.payment_status },
      { $set: { status, updated_at: new Date() } },
    );
    if (result.modifiedCount !== 1) throw new CheckoutError("Order changed. Refresh and try again.", 409);

    if (existingOrder.customer_email) {
      const deliverySettings = await getDeliverySettings().catch(() => null);
      const storeName = deliverySettings?.shopName || "";
      const orderId = String(existingOrder._id).slice(-8).toUpperCase();
      const isDelivered = status === "delivered";
      await sendMail({
        to: existingOrder.customer_email,
        subject: isDelivered
          ? (storeName ? `Order #${orderId} delivered! Rate & Review Your Products - ${storeName}` : `Order #${orderId} delivered! Rate & Review Your Products`)
          : (storeName ? `Order #${orderId} is ${status} - ${storeName}` : `Order #${orderId} is ${status}`),
        html: isDelivered
          ? orderDeliveredEmail({
              name: existingOrder.customer_name || "Customer",
              orderId,
              fullOrderId: String(existingOrder._id),
              shopName: storeName,
            })
          : orderStatusEmail({
              name: existingOrder.customer_name || "Customer",
              orderId,
              status,
              shopName: storeName,
            }),
      });
    }

    const recipientId = existingOrder.customer_id ? String(existingOrder.customer_id) : null;
    if (recipientId) {
      const isDelivered = status === "delivered";
      const displayId = String(existingOrder._id).slice(-8).toUpperCase();
      await safeNotify(() =>
        createNotification({
          recipients: [recipientId!],
          type: isDelivered ? "order_delivered" : "order_status",
          title: isDelivered ? `Order #${displayId} Delivered 🎉` : `Order #${displayId} updated`,
          body: isDelivered
            ? `Your order #${displayId} has been delivered. Tap to rate and review your products!`
            : `Your order is now ${status}`,
          entityType: "order",
          entityId: String(existingOrder._id),
          idempotencyKey: `order_status:${existingOrder._id}:${status}`,
          sendPush: true,
          route: `/orders?orderId=${existingOrder._id}&action=review`,
        })
      );
    }

    return NextResponse.json({
      success: true,
      message:
        status === "cancelled"
          ? "Order cancelled and items restocked to inventory successfully"
          : "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ success: false, message: error instanceof CheckoutError ? error.message : "Failed to update order" }, { status: error instanceof CheckoutError ? error.status : 500 });
  }
}
