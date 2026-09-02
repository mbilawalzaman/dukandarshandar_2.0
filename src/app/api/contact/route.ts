import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getShopInbox, sendMail } from "@/lib/mail";
import { contactCustomerEmail, contactShopEmail } from "@/lib/emailTemplates";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();
    if (!name || !email || !message) {
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
        subject: "We received your message, Dukandar Shandar",
        html: contactCustomerEmail(name),
      }),
    ]);

    return NextResponse.json({ success: true, message: "Message received. We will get back to you soon." });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
  }
}
