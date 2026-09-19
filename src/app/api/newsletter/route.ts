import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { newsletterWelcomeEmail } from "@/lib/emailTemplates";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const throttle = rateLimit(`newsletter:${getClientIp(req)}`, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!throttle.ok) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || /[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Please enter a valid email" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("subscribers").findOne({ email });
    if (existing) {
      return NextResponse.json({ success: true, message: "You are already subscribed" });
    }

    await db.collection("subscribers").insertOne({
      email,
      created_at: new Date(),
    });

    const deliverySettings = await getDeliverySettings().catch(() => null);
    const shopName = deliverySettings?.shopName || "";

    await sendMail({
      to: email,
      subject: shopName ? `Welcome to ${shopName}` : "Welcome to our store",
      html: newsletterWelcomeEmail(shopName),
    });

    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json({ success: false, message: "Failed to subscribe" }, { status: 500 });
  }
}
