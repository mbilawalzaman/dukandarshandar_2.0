import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { duplicatePromotion } from "@/services/promotionService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const promotion = await duplicatePromotion(id, admin.user.userId);
    if (!promotion) return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    return NextResponse.json({ success: true, promotion }, { status: 201 });
  } catch (error) {
    console.error("Error duplicating promotion:", error);
    const message = error instanceof Error ? error.message : "Failed to duplicate promotion";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
