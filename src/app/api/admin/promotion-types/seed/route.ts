import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { seedSystemPromotionTypes } from "@/services/promotionTypeService";

/** Restore any missing system presets. */
export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const inserted = await seedSystemPromotionTypes();
    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error("Error seeding promotion types:", error);
    return NextResponse.json({ success: false, error: "Failed to restore presets" }, { status: 500 });
  }
}
