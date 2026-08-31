import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardStats } from "@/controllers/productController";

export async function GET(req: Request) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const result = await getAdminDashboardStats();
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, stats: result.stats });
  } catch (error) {
    console.error("Error in admin stats API:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
