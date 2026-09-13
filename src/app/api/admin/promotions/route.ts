import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPromotion, listPromotions } from "@/services/promotionService";
import type { PromotionKind, PromotionStatus, PromotionVisibility } from "@/types/apps/promotionTypes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(req.url);
    const promotions = await listPromotions({
      kind: (searchParams.get("kind") as PromotionKind) || undefined,
      status: (searchParams.get("status") as PromotionStatus | "all") || undefined,
      visibility: (searchParams.get("visibility") as PromotionVisibility) || undefined,
      search: searchParams.get("search") || undefined,
    });
    return NextResponse.json({ success: true, promotions });
  } catch (error) {
    console.error("Error listing promotions:", error);
    return NextResponse.json({ success: false, error: "Failed to load promotions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const body = await req.json();
    const promotion = await createPromotion(body, admin.user.userId);
    return NextResponse.json({ success: true, promotion }, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion:", error);
    const message = error instanceof Error ? error.message : "Failed to create promotion";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
