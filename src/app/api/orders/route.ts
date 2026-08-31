import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { SHIPPING_FEE } from "@/lib/constants";
import { getShopInbox, sendMail } from "@/lib/mail";
import { orderConfirmationEmail, orderStatusEmail } from "@/lib/emailTemplates";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const query = user.role === "admin" ? {} : { customer_email: user.email };
    const orders = await db.collection("orders").find(query).sort({ created_at: -1 }).toArray();

    // Enrich order items with product images if missing
    const productIdsToFetch: ObjectId[] = [];
    const productNamesToFetch: string[] = [];

    orders.forEach((o) => {
      o.items?.forEach((it: { _id?: string; name?: string; image?: string }) => {
        if (!it.image) {
          if (it._id && ObjectId.isValid(it._id)) {
            productIdsToFetch.push(new ObjectId(it._id));
          } else if (it.name) {
            productNamesToFetch.push(it.name);
          }
        }
      });
    });

    if (productIdsToFetch.length > 0 || productNamesToFetch.length > 0) {
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
        o.items?.forEach((it: { _id?: string; name?: string; image?: string }) => {
          if (!it.image) {
            it.image = (it._id && imgById[String(it._id)]) || (it.name && imgByName[it.name]) || "";
          }
        });
      });
    }

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, customer_email, phone, address, city, items, total_amount } = body;
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
    }

    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 0 ? SHIPPING_FEE : 0;
    const computedTotal = total_amount || subtotal + shipping;

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
      total_amount: computedTotal,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);
    const orderId = String(result.insertedId).slice(-8).toUpperCase();
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
        subject: `Order #${orderId} confirmed — Dukandar Shandar`,
        html: confirmationHtml,
      }),
      getShopInbox()
        ? sendMail({
            to: getShopInbox(),
            subject: `New order #${orderId} — PKR ${computedTotal.toLocaleString()}`,
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

    // Automatic Inventory Restock when order is cancelled
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
    }
    // Re-deduct Inventory if order was uncancelled
    else if (previousStatus === "cancelled" && status !== "cancelled") {
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
        subject: `Order #${orderId} is ${status} — Dukandar Shandar`,
        html: orderStatusEmail({
          name: existingOrder.customer_name || "Customer",
          orderId,
          status,
        }),
      });
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
