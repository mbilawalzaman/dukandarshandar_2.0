import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ObjectId } from "mongodb";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import PostExService from "@/services/postex.service.js";
import { sendMail } from "@/lib/mail";
import { orderStatusEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);

    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { orderId, pickupAddressCode, orderType, transactionNotes } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId is required" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const orderQuery = ObjectId.isValid(orderId)
      ? { _id: new ObjectId(orderId) }
      : { orderNumber: orderId };

    const order = await db.collection("orders").findOne(orderQuery);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 },
      );
    }

    const existingTrackingNumber =
      order.postexDetails?.trackingNumber || order.trackingNumber;

    if (existingTrackingNumber) {
      return NextResponse.json(
        {
          success: false,
          error: `Order is already booked with PostEx tracking number: ${existingTrackingNumber}`,
        },
        { status: 400 },
      );
    }

    const customerPhone =
      order.shippingAddress?.phone || order.phone || order.customerPhone || "";

    const customerName =
      order.shippingAddress?.name ||
      order.customer_name ||
      order.customerName ||
      order.userEmail ||
      "Customer";

    const deliveryAddress =
      order.shippingAddress?.address ||
      order.address ||
      order.deliveryAddress ||
      "";

    const cityName = order.shippingAddress?.city || order.city || "";
    const orderRefNumber = String(order.orderNumber || order._id);

    const invoicePayment = String(
      order.totalAmount ||
        order.totalPrice ||
        order.total_amount ||
        order.codAmount ||
        0,
    );

    const postexPayload = {
      cityName,
      customerName,
      customerPhone,
      deliveryAddress,
      invoiceDivision: 1,
      invoicePayment,
      items: order.items?.length || 1,
      orderDetail:
        order.items
          ?.map(
            (i: { name?: string; quantity?: number }) =>
              `${i.name || "Item"} x${i.quantity || 1}`,
          )
          .join(", ") || "",
      orderRefNumber,
      orderType: orderType || "Normal",
      transactionNotes: transactionNotes || "",
      pickupAddressCode: pickupAddressCode || "001",
    };

    const postexRes = await PostExService.createOrder(postexPayload);

    // Extract tracking number from PostEx response dist object or top-level field
    const trackingNumber =
      postexRes?.dist?.trackingNumber ||
      postexRes?.trackingNumber ||
      postexRes?.dist?.orderRefNumber;

    const postexStatusCode =
      postexRes?.dist?.orderStatus ||
      postexRes?.dist?.orderStatusId ||
      "UnBooked";

    if (!trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            postexRes?.statusMessage ||
            "Booking failed - could not get tracking number from PostEx",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    // 1. Update Database Status to "Ready to Ship" & save PostEx info
    const updateDetails = {
      status: "Ready to Ship",
      courierName: "PostEx",
      trackingNumber: trackingNumber,
      postexStatus: "UnBooked",
      readyToShipAt: now,
      "postexDetails.trackingNumber": trackingNumber,
      "postexDetails.orderType": postexPayload.orderType,
      "postexDetails.orderStatus": postexStatusCode,
      "postexDetails.pickupAddressCode": pickupAddressCode || "001",
      "postexDetails.shippedAt": now,
      updatedAt: now,
    };

    await db.collection("orders").updateOne(orderQuery, {
      $set: updateDetails,
      $push: {
        "postexDetails.statusHistory": {
          statusCode: "UNBOOKED",
          statusMessage: "Order booked with PostEx courier - Ready to Ship",
          timestamp: now,
        },
      } as unknown as Record<string, never>,
    });

    // 2. Trigger Email #1: "Order Packed & Ready to Ship" using orderStatusEmail
    const recipientEmail =
      order.customerEmail || order.email || order.userEmail;

    if (recipientEmail) {
      try {
        const htmlContent = orderStatusEmail({
          name: customerName,
          orderId: orderRefNumber,
          status: "Ready to Ship",
          courier: "PostEx",
          trackingNumber: trackingNumber,
          trackingUrl: `https://postex.pk/tracking?cn=${trackingNumber}`,
        });

        await sendMail({
          to: recipientEmail,
          subject: `Your Order #${orderRefNumber} is Packed & Ready to Ship! 📦`,
          html: htmlContent,
        });
      } catch (emailErr) {
        console.error("[Email Error - Ready to Ship]:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Order booked with PostEx. Status set to Ready to Ship & email sent.",
      trackingNumber,
      orderStatus: "Ready to Ship",
      data: {
        trackingNumber,
        postexResponse: postexRes,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to book order with PostEx",
      },
      { status: err.statusCode || 500 },
    );
  }
}
