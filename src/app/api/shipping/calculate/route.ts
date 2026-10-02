import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { calculatePostExShippingRate } from "@/lib/postexCalculator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { province = "", city = "" } = body;
    const fee = await calculatePostExShippingRate(province, city);

    return NextResponse.json({
      success: true,
      fee,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Shipping calculator error:", err.message);
    return NextResponse.json({ success: false, fee: 200, error: err.message }, { status: 500 });
  }
}
