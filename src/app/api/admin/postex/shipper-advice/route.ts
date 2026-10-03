import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import PostExService from "@/services/postex.service.js";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);

    if (!auth.ok) return auth.response;

    const { trackingNumber, statusId, remarks } = await req.json();

    if (!trackingNumber || !statusId) {
      return NextResponse.json(
        {
          success: false,
          error: "trackingNumber and statusId (1=Return, 2=Retry) are required",
        },
        { status: 400 },
      );
    }

    const result = await PostExService.saveShipperAdvice({
      trackingNumber,
      statusId: Number(statusId),
      remarks: remarks || "",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to submit Shipper Advice",
      },
      { status: err.statusCode || 500 },
    );
  }
}
