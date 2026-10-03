import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { calculatePostExShippingRate } from "@/lib/postexCalculator";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { computeShippingBreakdown } from "@/lib/deliverySettings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { province = "", city = "" } = body;
    const rawFee = await calculatePostExShippingRate(province, city);
    const settings = await getDeliverySettings();
    const breakdown = computeShippingBreakdown(1, settings, rawFee);

    return NextResponse.json({
      success: true,
      fee: breakdown.finalFee,
      rawFee: breakdown.rawFee,
      discount: breakdown.discount,
      discountApplied: breakdown.discountApplied,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };

    console.error("Shipping calculator error:", err.message);

    return NextResponse.json(
      {
        success: false,
        fee: 200,
        rawFee: 200,
        discount: 0,
        discountApplied: false,
        error: err.message,
      },
      { status: 500 },
    );
  }
}
