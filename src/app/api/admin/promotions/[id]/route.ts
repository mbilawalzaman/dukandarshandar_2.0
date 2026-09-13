import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deletePromotion, getPromotionById, updatePromotion } from "@/services/promotionService";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;
  const { id } = await params;
  const promotion = await getPromotionById(id);
  if (!promotion) return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
  return NextResponse.json({ success: true, promotion });
}

export async function PUT(req: Request, { params }: Ctx) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const promotion = await updatePromotion(id, body, admin.user.userId);
    if (!promotion) return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    return NextResponse.json({ success: true, promotion });
  } catch (error) {
    console.error("Error updating promotion:", error);
    const message = error instanceof Error ? error.message : "Failed to update promotion";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const deleted = await deletePromotion(id);
    if (!deleted) return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json({ success: false, error: "Failed to delete promotion" }, { status: 500 });
  }
}
