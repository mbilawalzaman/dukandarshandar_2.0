import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import PostExService from "@/services/postex.service.js";

export async function GET(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const cityName = searchParams.get("cityName") || "";

    const result = await PostExService.getPickupAddresses(cityName);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch pickup addresses" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const body = await req.json();
    const result = await PostExService.createPickupAddress(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create pickup address" },
      { status: err.statusCode || 500 }
    );
  }
}
