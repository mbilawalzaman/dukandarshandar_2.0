import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setPromotionPaused } from "@/services/promotionService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const promotion = await setPromotionPaused(id, body.paused !== false, admin.user.userId);
    if (!promotion) return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    return NextResponse.json({ success: true, promotion });
  } catch (error) {
    console.error("Error pausing promotion:", error);
    return NextResponse.json({ success: false, error: "Failed to update promotion" }, { status: 500 });
  }
}
