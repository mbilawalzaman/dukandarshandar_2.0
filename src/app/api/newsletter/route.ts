import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { newsletterWelcomeEmail } from "@/lib/emailTemplates";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Please enter a valid email" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("subscribers").findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ success: true, message: "You are already subscribed" });
    }

    await db.collection("subscribers").insertOne({
      email: email.toLowerCase(),
      created_at: new Date(),
    });

    await sendMail({
      to: email.toLowerCase(),
      subject: "Welcome to Dukandar Shandar",
      html: newsletterWelcomeEmail(),
    });

    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json({ success: false, message: "Failed to subscribe" }, { status: 500 });
  }
}
