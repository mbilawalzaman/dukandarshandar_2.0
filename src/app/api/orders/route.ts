import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { computeShipping, isDeliveryPromoActive } from "@/lib/deliverySettings";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { getShopInbox, sendMail } from "@/lib/mail";
import { orderConfirmationEmail, orderStatusEmail } from "@/lib/emailTemplates";
import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins, createNotification } from "@/services/notificationService";
import { parsePageLimit, paginationMeta } from "@/lib/pagination";

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
    filter.$or = [
      { customer_name: { $regex: search, $options: "i" } },
      { customer_email: { $regex: search, $options: "i" } },
      { "items.name": { $regex: search, $options: "i" } },
      ...(ObjectId.isValid(search) ? [{ _id: new ObjectId(search) }] : []),
    ];
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
        { $match: { ...baseQuery, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
      ])
      .toArray(),
    db.collection("orders").countDocuments({
      ...baseQuery,
      status: { $in: ["pending", "processing", "shipped", "pending_payment"] },
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
    const baseQuery = user.role === "admin" ? {} : { customer_email: user.email };
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
    const body = await req.json();
    const { customer_name, customer_email, phone, address, city, items, payment_method } = body;
    const user = getAuthUser(req);

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    }

    const db = await getDb();

    for (const item of items) {
      if (!item._id || !ObjectId.isValid(item._id)) {
        return NextResponse.json({ success: false, message: `Invalid product in cart: ${item.name}` }, { status: 400 });
      }
      const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
      if (!product) {
        return NextResponse.json({ success: false, message: `${item.name} is no longer available` }, { status: 400 });
      }
      if (Number(product.quantity) < Number(item.quantity)) {
        return NextResponse.json(
          { success: false, message: `Not enough stock for ${product.name}. Available: ${product.quantity}` },
          { status: 400 }
        );
      }
    }

    for (const item of items) {
      const result = await db.collection("products").updateOne(
        { _id: new ObjectId(item._id), quantity: { $gte: Number(item.quantity) } },
        { $inc: { quantity: -Number(item.quantity) }, $set: { updated_at: new Date() } }
      );
      if (result.modifiedCount === 0) {
        return NextResponse.json({ success: false, message: `Could not reserve stock for ${item.name}` }, { status: 400 });
      }
      const updated = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
      if (updated && Number(updated.quantity) <= 5) {
        await safeNotify(() =>
          notifyAdmins({
            type: "low_stock",
            title: "Low stock alert",
            body: `${updated.name} has only ${updated.quantity} units left`,
            entityType: "product",
            entityId: String(updated._id),
            idempotencyKey: `low_stock:${updated._id}:${updated.quantity}`,
            sendPush: true,
            route: "/admin/products",
          })
        );
      }
    }

    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
    const deliverySettings = await getDeliverySettings();
    const shipping = computeShipping(subtotal, deliverySettings);
    const delivery_promo = isDeliveryPromoActive(deliverySettings, subtotal);
    const computedTotal = subtotal + shipping;

    const enrichedItems = [];
    for (const item of items) {
      const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
      enrichedItems.push({
        ...item,
        image: product?.image || item.image || "",
      });
    }

    const newOrder = {
      customer_name: customer_name || user?.userName || "Guest Customer",
      customer_email: customer_email || user?.email || "guest@example.com",
      customer_id: user?.userId || null,
      phone: phone || "",
      address: address || "",
      city: city || "",
      items: enrichedItems,
      subtotal,
      shipping,
      delivery_promo,
      total_amount: computedTotal,
      payment_method: payment_method || "cod",
      payment_status: payment_method === "cod" ? "unpaid" : "unpaid",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);
    const orderId = String(result.insertedId).slice(-8).toUpperCase();

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

    const confirmationHtml = orderConfirmationEmail({
      name: newOrder.customer_name,
      orderId,
      items,
      total: computedTotal,
      address: newOrder.address,
      city: newOrder.city,
    });

    await Promise.all([
      sendMail({
        to: newOrder.customer_email,
        subject: `Order #${orderId} confirmed Dukandar Shandar`,
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

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order: { _id: result.insertedId, ...newOrder },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ success: false, message: "Failed to place order" }, { status: 500 });
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

    const previousStatus = existingOrder.status;

    if (previousStatus !== "cancelled" && status === "cancelled") {
      if (Array.isArray(existingOrder.items)) {
        for (const item of existingOrder.items) {
          if (item._id && ObjectId.isValid(item._id)) {
            await db.collection("products").updateOne(
              { _id: new ObjectId(item._id) },
              {
                $inc: { quantity: Number(item.quantity) || 1 },
                $set: { updated_at: new Date() },
              }
            );
          }
        }
      }
    } else if (previousStatus === "cancelled" && status !== "cancelled") {
      if (Array.isArray(existingOrder.items)) {
        for (const item of existingOrder.items) {
          if (item._id && ObjectId.isValid(item._id)) {
            await db.collection("products").updateOne(
              { _id: new ObjectId(item._id) },
              {
                $inc: { quantity: -(Number(item.quantity) || 1) },
                $set: { updated_at: new Date() },
              }
            );
          }
        }
      }
    }

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { status, updated_at: new Date() } }
    );

    if (result.modifiedCount === 0 && previousStatus === status) {
      return NextResponse.json({ success: false, message: "Order already has this status" }, { status: 400 });
    }

    if (existingOrder.customer_email) {
      const orderId = String(existingOrder._id).slice(-8).toUpperCase();
      await sendMail({
        to: existingOrder.customer_email,
        subject: `Order #${orderId} is ${status} Dukandar Shandar`,
        html: orderStatusEmail({
          name: existingOrder.customer_name || "Customer",
          orderId,
          status,
        }),
      });
    }

    let recipientId = existingOrder.customer_id ? String(existingOrder.customer_id) : null;
    if (!recipientId && existingOrder.customer_email) {
      const customer = await db.collection("users").findOne({ email: existingOrder.customer_email });
      recipientId = customer?._id ? String(customer._id) : null;
    }
    if (recipientId) {
      await safeNotify(() =>
        createNotification({
          recipients: [recipientId],
          type: "order_status",
          title: `Order #${String(existingOrder._id).slice(-8).toUpperCase()} updated`,
          body: `Your order is now ${status}`,
          entityType: "order",
          entityId: String(existingOrder._id),
          idempotencyKey: `order_status:${existingOrder._id}:${status}`,
          sendPush: true,
          route: "/orders",
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
    return NextResponse.json({ success: false, message: "Failed to update order" }, { status: 500 });
  }
}
