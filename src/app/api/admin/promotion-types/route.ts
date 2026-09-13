import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPromotionType, listPromotionTypes } from "@/services/promotionTypeService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(req.url);
    const types = await listPromotionTypes({ includeInactive: searchParams.get("all") === "true" });
    return NextResponse.json({ success: true, types });
  } catch (error) {
    console.error("Error listing promotion types:", error);
    return NextResponse.json({ success: false, error: "Failed to load promotion types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const body = await req.json();
    const type = await createPromotionType(body);
    return NextResponse.json({ success: true, type }, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion type:", error);
    const message = error instanceof Error ? error.message : "Failed to create promotion type";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
