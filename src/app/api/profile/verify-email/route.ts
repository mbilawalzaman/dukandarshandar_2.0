import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { emailVerificationEmail } from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mail";
import { throttleRequest } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { shopName } = await getDeliverySettings();
    const storeName = shopName || "Ecommerce Store";
    const body = await req.json();
    const action = String(body.action || "request");
    const db = await getDb();

    if (action === "request") {
      const auth = requireAuth(req);
      if (!auth.ok) return auth.response;
      if (auth.user.role === "guest" || !ObjectId.isValid(auth.user.userId)) {
        return NextResponse.json({ success: false, message: "A full account is required" }, { status: 403 });
      }
      const limited = await throttleRequest(req, "email-verification-request", 5, 60 * 60 * 1000, auth.user.userId);
      if (limited) return limited;
      const userId = new ObjectId(auth.user.userId);
      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid new email address" },
          { status: 400 }
        );
      }

      const taken = await db.collection("users").findOne({
        email: newEmail,
        _id: { $ne: userId },
      });
      if (taken) {
        return NextResponse.json(
          { success: false, message: "This email address is already registered to another account" },
          { status: 400 }
        );
      }

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.collection("email_verifications").updateOne(
        { userId },
        {
          $set: {
            userId,
            newEmail,
            tokenHash,
            createdAt: new Date(),
            expiresAt,
          },
          $unset: { token: "" },
        },
        { upsert: true }
      );

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

      const user = await db.collection("users").findOne({ _id: userId });

      const html = emailVerificationEmail({
        name: user?.name,
        verifyUrl,
        newEmail,
        shopName: storeName,
      });

      await sendMail({
        to: newEmail,
        subject: `Verify your new email address - ${storeName}`,
        html,
      });

      return NextResponse.json({
        success: true,
        message: `Verification link sent to ${newEmail}. Please check your inbox to complete the update.`,
      });
    }

    if (action === "confirm") {
      const limited = await throttleRequest(req, "email-verification-confirm", 10, 60 * 60 * 1000);
      if (limited) return limited;
      const token = String(body.token || "").trim();
      if (!token) {
        return NextResponse.json({ success: false, message: "Verification token is required" }, { status: 400 });
      }

      const tokenHash = createHash("sha256").update(token).digest("hex");
      const record = await db.collection("email_verifications").findOne({ tokenHash });
      if (!record) {
        return NextResponse.json({ success: false, message: "Invalid or expired email verification token" }, { status: 400 });
      }

      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        await db.collection("email_verifications").deleteOne({ tokenHash });
        return NextResponse.json({ success: false, message: "Verification link has expired. Please request a new one." }, { status: 400 });
      }

      const taken = await db.collection("users").findOne({ email: record.newEmail, _id: { $ne: record.userId } }, { projection: { _id: 1 } });
      if (taken) {
        await db.collection("email_verifications").deleteOne({ tokenHash });
        return NextResponse.json({ success: false, message: "This email address is already registered" }, { status: 400 });
      }
      await db.collection("users").updateOne(
        { _id: new ObjectId(record.userId) },
        {
          $set: {
            email: record.newEmail,
            needsEmail: false,
            updated_at: new Date(),
          },
        }
      );

      await db.collection("email_verifications").deleteOne({ tokenHash });

      return NextResponse.json({
        success: true,
        message: "Email address verified and updated successfully!",
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ success: false, message: "Failed to process email verification" }, { status: 500 });
  }
}
