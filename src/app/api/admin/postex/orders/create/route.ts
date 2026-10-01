import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import PostExService from "@/services/postex.service.js";

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const body = await req.json();
    const { orderId, pickupAddressCode, orderType, transactionNotes } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 });
    }

    const db = await getDb();
    const orderQuery = ObjectId.isValid(orderId) ? { _id: new ObjectId(orderId) } : { orderNumber: orderId };
    const order = await db.collection("orders").findOne(orderQuery);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const customerPhone = order.shippingAddress?.phone || order.phone || "";
    const customerName = order.shippingAddress?.name || order.customerName || order.userEmail || "Customer";
    const deliveryAddress = order.shippingAddress?.address || order.address || "";
    const cityName = order.shippingAddress?.city || order.city || "";
    const orderRefNumber = String(order.orderNumber || order._id);
    const invoicePayment = String(order.totalAmount || order.totalPrice || 0);

    const postexPayload = {
      cityName,
      customerName,
      customerPhone,
      deliveryAddress,
      invoiceDivision: 1,
      invoicePayment,
      items: order.items?.length || 1,
      orderDetail: order.items?.map((i: { name?: string; quantity?: number }) => `${i.name || "Item"} x${i.quantity || 1}`).join(", ") || "",
      orderRefNumber,
      orderType: orderType || "Normal",
      transactionNotes: transactionNotes || "",
      pickupAddressCode: pickupAddressCode || "",
    };

    const postexResponse = await PostExService.createOrder(postexPayload);

    // PostEx v3 response format contains dist object or trackingNumber directly
    const trackingNumber = postexResponse?.dist?.trackingNumber || postexResponse?.trackingNumber || postexResponse?.dist?.orderRefNumber;
    const postexStatusCode = postexResponse?.dist?.orderStatus || postexResponse?.dist?.orderStatusId || "Unbooked";

    const updateDetails = {
      "postexDetails.trackingNumber": trackingNumber,
      "postexDetails.orderType": postexPayload.orderType,
      "postexDetails.orderStatus": postexStatusCode,
      "postexDetails.pickupAddressCode": pickupAddressCode || "",
      "postexDetails.shippedAt": new Date(),
      status: "shipped",
      updatedAt: new Date(),
    };

    await db.collection("orders").updateOne(
      orderQuery,
      {
        $set: updateDetails,
        $push: {
          "postexDetails.statusHistory": {
            statusCode: "BOOKED",
            statusMessage: "Order booked with PostEx courier",
            timestamp: new Date(),
          },
        } as unknown as Record<string, never>,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        trackingNumber,
        postexResponse,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to book order with PostEx" },
      { status: err.statusCode || 500 }
    );
  }
}
