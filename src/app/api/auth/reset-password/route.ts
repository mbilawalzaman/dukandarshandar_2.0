import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { revokeAllRefreshTokens } from "@/lib/session";
import { throttleRequest } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const limited = await throttleRequest(req, "password-reset-confirm", 10, 60 * 60 * 1000);
    if (limited) return limited;
    const body = await req.json();
    const token = String(body.token || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!token || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Invalid request. Missing token, email, or new password." },
        { status: 400 }
      );
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const resetRecord = await db.collection("password_resets").findOneAndDelete({
      email,
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired password reset link." }, { status: 400 });
    }

    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          password: hashedPassword,
          updated_at: new Date(),
        },
      }
    );

    await revokeAllRefreshTokens(String(user._id));

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset password" },
      { status: 500 }
    );
  }
}
