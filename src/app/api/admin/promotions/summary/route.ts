import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPromotionSummary } from "@/services/promotionService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const summary = await getPromotionSummary();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Error loading promotion summary:", error);
    return NextResponse.json({ success: false, error: "Failed to load summary" }, { status: 500 });
  }
}
