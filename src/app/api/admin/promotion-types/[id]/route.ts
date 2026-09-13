import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deletePromotionType, updatePromotionType } from "@/services/promotionTypeService";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const type = await updatePromotionType(id, body);
    if (!type) return NextResponse.json({ success: false, error: "Promotion type not found" }, { status: 404 });
    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error("Error updating promotion type:", error);
    const message = error instanceof Error ? error.message : "Failed to update promotion type";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const deleted = await deletePromotionType(id);
    if (!deleted) return NextResponse.json({ success: false, error: "Promotion type not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion type:", error);
    const message = error instanceof Error ? error.message : "Failed to delete promotion type";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
