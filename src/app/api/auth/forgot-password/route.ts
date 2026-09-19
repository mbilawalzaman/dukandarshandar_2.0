import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    // Always respond with success to prevent user enumeration attacks
    if (!user || user.authProvider === "google" || !user.password) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, password reset instructions have been sent.",
      });
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
      shopName: "Dukandar Shandar",
    });

    await sendMail({
      to: email,
      subject: "Reset your password - Dukandar Shandar",
      html,
    });

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
