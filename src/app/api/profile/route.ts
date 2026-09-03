import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { attachSessionCookies, issueSessionForUser } from "@/lib/session";
import { getDisplayEmail, isSyntheticEmail, isValidCustomerEmail } from "@/lib/userDisplay";

export const dynamic = "force-dynamic";

function publicProfile(user: Record<string, unknown>) {
  const email = String(user.email || "");
  return {
    id: String(user._id),
    name: user.name || "",
    email: getDisplayEmail({ email }),
    rawEmail: email,
    needsEmail: Boolean(user.needsEmail) || isSyntheticEmail(email),
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    image: user.image || "",
    role: user.role || "user",
    authProvider: user.authProvider || "password",
  };
}

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  if (auth.user.userId === "guest") {
    return NextResponse.json(
      { success: false, message: "Guests do not have a saved profile. Please sign up or log in." },
      { status: 403 }
    );
  }

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(auth.user.userId) });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile: publicProfile(user) });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  if (auth.user.userId === "guest") {
    return NextResponse.json(
      { success: false, message: "Guests cannot update a profile" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const db = await getDb();
    const userId = new ObjectId(auth.user.userId);
    const existing = await db.collection("users").findOne({ _id: userId });
    if (!existing) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }
    if (typeof body.address === "string") {
      updates.address = body.address.trim();
    }
    if (typeof body.city === "string") {
      updates.city = body.city.trim();
    }

    let emailChanged = false;
    if (typeof body.email === "string") {
      const nextEmail = body.email.trim().toLowerCase();
      if (!isValidCustomerEmail(nextEmail)) {
        return NextResponse.json({ success: false, message: "Enter a valid email address" }, { status: 400 });
      }
      const taken = await db.collection("users").findOne({
        email: nextEmail,
        _id: { $ne: userId },
      });
      if (taken) {
        return NextResponse.json({ success: false, message: "Email is already in use" }, { status: 400 });
      }
      updates.email = nextEmail;
      updates.needsEmail = false;
      emailChanged = nextEmail !== String(existing.email || "").toLowerCase();
    }

    if (typeof body.image === "string" && body.image) {
      if (body.image.startsWith("data:image/")) {
        const uploaded = await uploadImage(body.image, "dukandarshandar/avatars");
        updates.image = uploaded.url;
      } else if (body.image.startsWith("http")) {
        updates.image = body.image;
      }
    }

    if (body.image === null || body.image === "") {
      updates.image = "";
    }

    await db.collection("users").updateOne({ _id: userId }, { $set: updates });
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found after update" }, { status: 404 });
    }

    const profile = publicProfile(user);
    const shouldRefreshSession = Boolean(emailChanged || updates.name);

    if (shouldRefreshSession) {
      const session = await issueSessionForUser({
        _id: user._id as ObjectId,
        name: String(user.name),
        email: String(user.email),
        role: String(user.role),
      });
      const response = NextResponse.json({
        success: true,
        message: "Profile updated",
        profile,
        token: session.accessToken,
      });
      attachSessionCookies(response, session.accessToken, session.refreshToken);
      return response;
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated",
      profile,
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
