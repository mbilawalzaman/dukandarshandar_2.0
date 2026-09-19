import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { passwordResetEmail } from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mail";
import { throttleRequest } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const limited = await throttleRequest(req, "password-reset-request", 5, 60 * 60 * 1000);
    if (limited) return limited;
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    const { shopName } = await getDeliverySettings();
    const storeName = shopName || "Ecommerce Store";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: `Not a registered email on ${storeName}` },
        { status: 404 }
      );
    }

    if (user.authProvider === "google" || !user.password) {
      return NextResponse.json(
        { success: false, message: "This email is registered via Google Login. Please sign in with Google." },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.collection("password_resets").updateOne(
      { email },
      {
        $set: {
          email,
          tokenHash,
          createdAt: new Date(),
          expiresAt,
        },
        $unset: { token: "" },
      },
      { upsert: true }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const html = passwordResetEmail({
      name: user.name,
      resetUrl,
      shopName: storeName,
    });

    await sendMail({
      to: email,
      subject: `Reset your password - ${storeName}`,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `Password reset instructions have been sent to ${email}.`,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}

