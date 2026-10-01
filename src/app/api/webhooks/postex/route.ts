import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { POSTEX_STATUS_CODES } from "@/config/postex.config.js";

/**
 * PostEx Real-Time Status Webhook Handler
 * Endpoint: POST /api/webhooks/postex
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify Secret Header (Optional - if configured in PostEx Merchant Portal)
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
      const trackingNumber = event.trackingNumber || event.tracking_number || event.dist?.trackingNumber;
      const statusCode = String(event.orderStatusCode || event.statusCode || event.statusId || "");
      const rawStatus = event.orderStatus || event.status || POSTEX_STATUS_CODES[statusCode as keyof typeof POSTEX_STATUS_CODES] || "Updated";
      const remarks = event.message || event.remarks || event.transactionNotes || "";

      if (!trackingNumber) return null;

      // Determine matching internal order status
      let internalStatus: string | null = null;
      if (statusCode === "0005" || rawStatus.toLowerCase() === "delivered") {
        internalStatus = "delivered";
      } else if (["0002", "0006", "0007"].includes(statusCode) || rawStatus.toLowerCase().includes("return")) {
        internalStatus = "returned";
      } else if (statusCode === "0004" || rawStatus.toLowerCase().includes("route")) {
        internalStatus = "shipped";
      }

      const updateFields: Record<string, unknown> = {
        "postexDetails.orderStatus": rawStatus,
        updatedAt: new Date(),
      };

      if (internalStatus) {
        updateFields.status = internalStatus;
        if (internalStatus === "delivered") {
          updateFields["postexDetails.deliveredAt"] = new Date();
        }
      }

      return db.collection("orders").updateOne(
        { "postexDetails.trackingNumber": trackingNumber },
        {
          $set: updateFields,
          $push: {
            "postexDetails.statusHistory": {
              statusCode,
              statusMessage: `${rawStatus}${remarks ? `: ${remarks}` : ""}`,
              timestamp: new Date(),
            },
          },
        } as unknown as Record<string, never>
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
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
