import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { quoteCart } from "@/services/promotionService";

export const dynamic = "force-dynamic";

const LIMIT = { limit: 30, windowMs: 60 * 1000 };

/**
 * Authoritative cart quote. Body: { items: [{ _id, quantity }], voucherCode?, customerEmail? }.
 * Prices are read from the products collection; the client cannot influence them.
 */
export async function POST(req: Request) {
  const throttle = rateLimit(`promo-quote:${getClientIp(req)}`, LIMIT);
  if (!throttle.ok) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body.items)
      ? body.items
          .filter((i: { _id?: unknown }) => typeof i._id === "string")
          .map((i: { _id: string; quantity?: unknown }) => ({ _id: i._id, quantity: Math.max(1, Number(i.quantity) || 1) }))
      : [];
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    const user = getAuthUser(req);
    const quote = await quoteCart({
      items,
      voucherCode: typeof body.voucherCode === "string" ? body.voucherCode : null,
      customerId: user?.userId || null,
      customerEmail: (typeof body.customerEmail === "string" && body.customerEmail) || user?.email || null,
    });

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    console.error("Error quoting cart:", error);
    return NextResponse.json({ success: false, error: "Could not price your cart" }, { status: 500 });
  }
}
