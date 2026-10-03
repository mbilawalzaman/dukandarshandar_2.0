import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { ownsOrder } from "@/lib/orderRules";
import PostExService from "@/services/postex.service.js";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber");
    const orderId = searchParams.get("orderId");

    if (!trackingNumber && !orderId) {
      return NextResponse.json({ success: false, error: "orderId or trackingNumber is required" }, { status: 400 });
    }

    const db = await getDb();
    let query: Record<string, unknown> = {};

    if (orderId && ObjectId.isValid(orderId)) {
      query._id = new ObjectId(orderId);
    } else if (trackingNumber) {
      query = {
        $or: [{ trackingNumber }, { "postexDetails.trackingNumber": trackingNumber }],
      };
    }

    const order = await db.collection("orders").findOne(query);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (!ownsOrder(order, user)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const tn = trackingNumber || order.postexDetails?.trackingNumber || order.trackingNumber;
    if (!tn) {
      return NextResponse.json({ success: false, error: "Tracking number not found for this order" }, { status: 404 });
    }

    // Attempt live fetch from PostEx API; fallback to stored order details if API call fails
    try {
      const liveData = await PostExService.trackOrder(tn);
      return NextResponse.json({ success: true, data: liveData, order });
    } catch (liveErr) {
      console.warn("[PostEx Live Track Error - using fallback]:", liveErr);
      return NextResponse.json({
        success: true,
        data: {
          dist: {
            trackingNumber: tn,
            transactionStatus: order.postexStatus || order.postexDetails?.orderStatus || order.status,
            customerName: order.customer_name,
            deliveryAddress: order.address,
            cityName: order.city,
            invoicePayment: order.total_amount,
            transactionStatusHistory: order.postexDetails?.statusHistory || [],
          },
        },
        order,
        isFallback: true,
      });
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ success: false, error: err.message || "Failed to track order" }, { status: 500 });
  }
}
