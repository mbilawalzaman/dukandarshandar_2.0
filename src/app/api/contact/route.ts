import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getShopInbox, sendMail } from "@/lib/mail";
import { contactCustomerEmail, contactShopEmail } from "@/lib/emailTemplates";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const throttle = rateLimit(`contact:${getClientIp(req)}`, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!throttle.ok) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!name || name.length > 120 || !email || email.length > 254 || /[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length > 4000) {
      return NextResponse.json({ success: false, message: "Name, email, and message are required" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("messages").insertOne({
      name,
      email,
      subject: subject || "",
      message,
      created_at: new Date(),
    });

    const deliverySettings = await getDeliverySettings().catch(() => null);
    const shopName = deliverySettings?.shopName || "";

    const shopInbox = getShopInbox();
    await Promise.all([
      shopInbox
        ? sendMail({
            to: shopInbox,
            subject: `Contact: ${subject || "New message"} from ${name}`,
            html: contactShopEmail({ name, email, subject, message }),
            replyTo: email,
          })
        : Promise.resolve(),
      sendMail({
        to: email,
        subject: shopName ? `We received your message - ${shopName}` : "We received your message",
        html: contactCustomerEmail(name, shopName),
      }),
    ]);

    return NextResponse.json({ success: true, message: "Message received. We will get back to you soon." });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
  }
}
