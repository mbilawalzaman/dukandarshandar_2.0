import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { POSTEX_STATUS_CODES } from "@/config/postex.config.js";
import { sendMail } from "@/lib/mail";
import { orderStatusEmail } from "@/lib/emailTemplates";

/**
 * Stage 2: PostEx Real-Time Webhook Handler
 * Endpoint: POST /api/webhooks/postex
 * Automatically transitions order from "Ready to Ship" -> "Shipped" when PostEx rider picks up parcel
 * and sends Email #2 ("Your Order is Handed Over to PostEx & On Its Way!")
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Optional Secret Signature Verification
    const webhookSecret = process.env.POSTEX_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization") || req.headers.get("x-postex-secret");
      if (authHeader !== webhookSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized webhook signature" }, { status: 401 });
      }
    }

    const body = await req.json();
    const payloadArray = Array.isArray(body) ? body : [body];

    if (payloadArray.length === 0) {
      return NextResponse.json({ success: true, message: "Empty payload received" });
    }

    const db = await getDb();

    const updatePromises = payloadArray.map(async (event) => {
      const trackingNumber =
        event.trackingNumber ||
        event.tracking_number ||
        event.dist?.trackingNumber ||
        body.trackingNumber;

      if (!trackingNumber) return null;

      const statusCode = String(
        event.transactionStatusMessageCode ||
        event.orderStatusCode ||
        event.statusCode ||
        event.statusId ||
        ""
      );

      const rawStatus =
        event.transactionStatus ||
        event.orderStatus ||
        event.status ||
        POSTEX_STATUS_CODES[statusCode as keyof typeof POSTEX_STATUS_CODES] ||
        "Updated";

      const remarks = event.message || event.remarks || event.transactionNotes || "";

      // Find Order by PostEx Tracking Number (top-level or inside postexDetails)
      const order = await db.collection("orders").findOne({
        $or: [
          { trackingNumber: trackingNumber },
          { "postexDetails.trackingNumber": trackingNumber },
        ],
      });

      if (!order) {
        console.warn(`[PostEx Webhook] No order found for trackingNumber: ${trackingNumber}`);
        return null;
      }

      const lowerStatus = rawStatus.toLowerCase();
      const isPickedUpState =
        rawStatus === "Picked By PostEx" ||
        rawStatus === "Out For Delivery" ||
        rawStatus === "In Transit" ||
        rawStatus === "Arrived at Warehouse" ||
        rawStatus === "At PostEx Warehouse" ||
        statusCode === "0003" ||
        statusCode === "0004" ||
        (lowerStatus.includes("picked") && !lowerStatus.includes("un-assigned")) ||
        lowerStatus.includes("transit") ||
        lowerStatus.includes("route");

      const isDeliveredState = statusCode === "0005" || statusCode === "5" || lowerStatus === "delivered";
      const isReturnedState = ["0002", "0006", "0007"].includes(statusCode) || lowerStatus.includes("return");

      const updateFields: Record<string, unknown> = {
        postexStatus: rawStatus,
        "postexDetails.orderStatus": rawStatus,
        updatedAt: new Date(),
      };

      // Stage 2 Transition: "Ready to Ship" -> "Shipped" & Email #2 trigger
      if (
        isPickedUpState &&
        order.status !== "Shipped" &&
        order.status !== "shipped" &&
        order.status !== "Delivered" &&
        order.status !== "delivered"
      ) {
        const shippedAt = new Date();
        updateFields.status = "Shipped";
        updateFields.shippedAt = shippedAt;
        updateFields["postexDetails.shippedAt"] = shippedAt;

        // Trigger Email #2: "Order Dispatched / Shipped" using emailTemplates
        const recipientEmail = order.customerEmail || order.email || order.userEmail;
        if (recipientEmail) {
          try {
            const customerName =
              order.shippingAddress?.name ||
              order.customer_name ||
              order.customerName ||
              order.userEmail ||
              "Customer";
            const orderRefNumber = String(order.orderNumber || order._id);

            const htmlContent = orderStatusEmail({
              name: customerName,
              orderId: orderRefNumber,
              status: "Shipped",
              courier: "PostEx",
              trackingNumber: trackingNumber,
              trackingUrl: `https://postex.pk/tracking?cn=${trackingNumber}`,
            });

            await sendMail({
              to: recipientEmail,
              subject: `Your Order #${orderRefNumber} Has Been Dispatched via PostEx! 🚚`,
              html: htmlContent,
            });
          } catch (emailErr) {
            console.error("[Email Error - Shipped]:", emailErr);
          }
        }
      } else if (isDeliveredState) {
        const deliveredAt = new Date();
        updateFields.status = "Delivered";
        updateFields.deliveredAt = deliveredAt;
        updateFields["postexDetails.deliveredAt"] = deliveredAt;

        // Trigger Delivered Email notification if order was not already Delivered
        const recipientEmail = order.customerEmail || order.email || order.userEmail;
        if (recipientEmail && order.status !== "Delivered" && order.status !== "delivered") {
          try {
            const customerName =
              order.shippingAddress?.name ||
              order.customer_name ||
              order.customerName ||
              order.userEmail ||
              "Customer";
            const orderRefNumber = String(order.orderNumber || order._id);

            const htmlContent = orderStatusEmail({
              name: customerName,
              orderId: orderRefNumber,
              status: "Delivered",
            });

            await sendMail({
              to: recipientEmail,
              subject: `Your Order #${orderRefNumber} Has Been Delivered! 🎉`,
              html: htmlContent,
            });
          } catch (emailErr) {
            console.error("[Email Error - Delivered]:", emailErr);
          }
        }
      } else if (isReturnedState) {
        updateFields.status = "Returned";
      }

      return db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: updateFields,
          $push: {
            "postexDetails.statusHistory": {
              statusCode,
              statusMessage: `${rawStatus}${remarks ? `: ${remarks}` : ""}`,
              timestamp: new Date(),
            },
          } as unknown as Record<string, never>,
        }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "PostEx Webhook processed successfully",
      processedCount: payloadArray.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("❌ PostEx Webhook Processing Error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process PostEx webhook" },
      { status: 500 }
    );
  }
}
