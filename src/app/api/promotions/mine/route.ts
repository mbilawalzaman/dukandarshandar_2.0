import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserVouchers } from "@/services/promotionService";

export const dynamic = "force-dynamic";

/** The signed-in customer's voucher wallet: collected + public vouchers with per-user usage. */
export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const vouchers = await getUserVouchers({
      userId: auth.user.role === "guest" ? null : auth.user.userId,
      email: auth.user.email,
    });
    return NextResponse.json({ success: true, vouchers });
  } catch (error) {
    console.error("Error loading vouchers:", error);
    return NextResponse.json({ success: false, error: "Failed to load vouchers" }, { status: 500 });
  }
}
