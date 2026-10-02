import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import PostExService from "@/services/postex.service.js";
import { sendMail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

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

    if (order.postexDetails?.trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          error: `Order is already booked with PostEx tracking number: ${order.postexDetails.trackingNumber}`,
        },
        { status: 400 }
      );
    }

    const customerPhone = order.shippingAddress?.phone || order.phone || "";
    const customerName = order.shippingAddress?.name || order.customer_name || order.customerName || order.userEmail || "Customer";
    const deliveryAddress = order.shippingAddress?.address || order.address || "";
    const cityName = order.shippingAddress?.city || order.city || "";
    const orderRefNumber = String(order.orderNumber || order._id);
    const invoicePayment = String(order.totalAmount || order.totalPrice || order.total_amount || 0);

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

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: postexResponse?.statusMessage || "Failed to receive tracking number from PostEx" },
        { status: 400 }
      );
    }

    const shippedAt = new Date();
    const updateDetails = {
      "postexDetails.trackingNumber": trackingNumber,
      "postexDetails.orderType": postexPayload.orderType,
      "postexDetails.orderStatus": postexStatusCode,
      "postexDetails.pickupAddressCode": pickupAddressCode || "",
      "postexDetails.shippedAt": shippedAt,
      courierName: "PostEx",
      trackingNumber: trackingNumber,
      shippedAt: shippedAt,
      status: "Shipped",
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

    // Non-blocking email notification to customer
    const recipientEmail = order.customerEmail || order.email || order.userEmail;
    if (recipientEmail) {
      try {
        const trackingUrl = `https://postex.pk/tracking?cn=${trackingNumber}`;
        const emailHtml = `
          <div style="font-family: Poppins, Arial, sans-serif; background: #f8fafc; padding: 24px;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background: #0f172a; color: #ffffff; padding: 20px 24px;">
                <h1 style="margin: 0; font-size: 20px;">Shipping Confirmation</h1>
                <p style="margin: 6px 0 0; color: #febe4c; font-size: 13px;">Order #${orderRefNumber}</p>
              </div>
              <div style="padding: 24px; color: #0f172a; font-size: 15px; line-height: 1.6;">
                <p>Hi <strong>${customerName}</strong>,</p>
                <p>Great news! Your order has been successfully booked with <strong>PostEx Courier</strong> and is now on its way to you.</p>
                <div style="background: #f1f5f9; border-left: 4px solid #febe4c; border-radius: 6px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0 0 8px;"><strong>Courier Service:</strong> PostEx</p>
                  <p style="margin: 0 0 8px;"><strong>Tracking Number:</strong> <span style="font-family: monospace; font-weight: bold; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${trackingNumber}</span></p>
                  <p style="margin: 12px 0 0;">
                    <a href="${trackingUrl}" style="background: #0f172a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;" target="_blank">
                      Track Package on PostEx &rarr;
                    </a>
                  </p>
                </div>
                <p>Thank you for shopping with us!</p>
              </div>
            </div>
          </div>
        `;

        await sendMail({
          to: recipientEmail,
          subject: `Order #${orderRefNumber} Shipped - PostEx Tracking #${trackingNumber}`,
          html: emailHtml,
        });
      } catch (emailErr: unknown) {
        console.error("Shipping email notification failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully booked with PostEx!",
      data: {
        trackingNumber,
        postexResponse,
      },
      trackingNumber,
      orderStatus: "Shipped",
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to book order with PostEx" },
      { status: err.statusCode || 500 }
    );
  }
}
