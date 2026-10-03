import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import PostExService from "@/services/postex.service.js";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);

    if (!auth.ok) return auth.response;

    const { trackingNumber, orderId } = await req.json();

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "trackingNumber is required" },
        { status: 400 },
      );
    }

    const result = await PostExService.cancelOrder(trackingNumber);

    if (orderId) {
      const db = await getDb();

      await db.collection("orders").updateOne(
        { "postexDetails.trackingNumber": trackingNumber },
        {
          $set: {
            "postexDetails.orderStatus": "Cancelled",
            updatedAt: new Date(),
          },
          $push: {
            "postexDetails.statusHistory": {
              statusCode: "CANCELLED",
              statusMessage: "Shipment cancelled with PostEx courier",
              timestamp: new Date(),
            },
          } as unknown as Record<string, never>,
        },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };

    return NextResponse.json(
      { success: false, error: err.message || "Failed to cancel PostEx order" },
      { status: err.statusCode || 500 },
    );
  }
}
