import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listRedemptions } from "@/services/promotionService";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 100));
    const redemptions = await listRedemptions(id, limit);
    return NextResponse.json({ success: true, redemptions });
  } catch (error) {
    console.error("Error listing redemptions:", error);
    return NextResponse.json({ success: false, error: "Failed to load redemptions" }, { status: 500 });
  }
}
