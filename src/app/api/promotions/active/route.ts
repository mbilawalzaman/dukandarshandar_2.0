import { NextResponse } from "next/server";
import { getPublicPromotions } from "@/services/promotionService";

export const dynamic = "force-dynamic";

/** Public, live promotions for the storefront. Private voucher codes are never included. */
export async function GET() {
  try {
    const promotions = await getPublicPromotions();
    return NextResponse.json(
      { success: true, promotions, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Error loading active promotions:", error);
    return NextResponse.json({ success: false, error: "Failed to load promotions" }, { status: 500 });
  }
}
