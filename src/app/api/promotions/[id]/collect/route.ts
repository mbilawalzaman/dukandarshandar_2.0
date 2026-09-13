import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { collectVoucher } from "@/services/promotionService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role === "guest") {
    return NextResponse.json({ success: false, error: "Sign in to collect vouchers" }, { status: 403 });
  }

  const throttle = rateLimit(`promo-collect:${getClientIp(req)}`, { limit: 30, windowMs: 60 * 1000 });
  if (!throttle.ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please slow down." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const result = await collectVoucher(auth.user.userId, id);
    if (!result.ok) return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error collecting voucher:", error);
    return NextResponse.json({ success: false, error: "Could not collect voucher" }, { status: 500 });
  }
}
