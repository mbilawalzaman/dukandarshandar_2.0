import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import PostExService from "@/services/postex.service.js";

export async function GET(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber");

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "trackingNumber query parameter is required" },
        { status: 400 }
      );
    }

    const result = await PostExService.trackOrder(trackingNumber);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to track order" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const { trackingNumbers } = await req.json();

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: "trackingNumbers array is required" },
        { status: 400 }
      );
    }

    const result = await PostExService.trackBulkOrders(trackingNumbers);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bulk track orders" },
      { status: err.statusCode || 500 }
    );
  }
}
