import crypto from "crypto";

import type { NextResponse } from "next/server";

import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import { getDb } from "@/lib/db";
import {
  attachAuthCookie,
  clearAuthCookie,
  getJwtSecret,
  type JwtPayload,
} from "@/lib/auth";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/constants";

export type SessionUser = {
  name: string;
  email: string;
  role: string;
};

export type IssuedSession = {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
};

type RefreshTokenRecord = {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  revokedAt?: Date | null;
};

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${ACCESS_TOKEN_TTL_SECONDS}s`,
  });
}

export function attachSessionCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string | null,
) {
  return attachAuthCookie(response, accessToken, refreshToken || undefined);
}

export function clearSessionCookies(response: NextResponse) {
  return clearAuthCookie(response);
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";

  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${REFRESH_TOKEN_COOKIE}=([^;]+)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

/** Issue access + refresh for a real Mongo user (not guest). */
export async function issueSessionForUser(
  user: { _id: ObjectId | string; name: string; email: string; role: string },
  options?: { userAgent?: string },
): Promise<IssuedSession> {
  const userId = String(user._id);

  const accessToken = signAccessToken({
    userId,
    email: user.email,
    userName: user.name,
    role: user.role,
  });

  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const record: RefreshTokenRecord = {
    tokenHash,
    expiresAt,
    createdAt: now,
    userAgent: options?.userAgent,
    revokedAt: null,
  };

  const db = await getDb();

  const userObjectId =
    typeof user._id === "string" ? new ObjectId(user._id) : user._id;

  const userDoc = await db.collection("users").findOne({ _id: userObjectId });

  const rawList: RefreshTokenRecord[] = Array.isArray(userDoc?.refreshTokens)
    ? (userDoc.refreshTokens as RefreshTokenRecord[])
    : [];

  const validTokens = rawList.filter(
    (t) =>
      t &&
      t.expiresAt &&
      new Date(t.expiresAt) > now &&
      (!t.revokedAt ||
        new Date(t.revokedAt) > new Date(now.getTime() - 60 * 1000)),
  );

  const nextTokens = [...validTokens.slice(-9), record];

  await db.collection("users").updateOne(
    { _id: userObjectId },
    {
      $set: {
        refreshTokens: nextTokens,
        updated_at: now,
      },
    },
  );

  return {
    accessToken,
    refreshToken,
    user: { name: user.name, email: user.email, role: user.role },
  };
}

/** Guest: short-lived access only, no refresh. Unique id so this browser session owns its orders. */
export function issueGuestAccessToken(): {
  accessToken: string;
  user: SessionUser;
} {
  const guestId = `guest_${crypto.randomBytes(12).toString("hex")}`;

  const accessToken = jwt.sign(
    {
      userId: guestId,
      email: "guest@guest.com",
      userName: "Guest User",
      role: "guest",
    },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );

  return {
    accessToken,
    user: { name: "Guest User", email: "guest@guest.com", role: "guest" },
  };
}

export async function rotateRefreshToken(
  rawRefreshToken: string,
  options?: { userAgent?: string },
): Promise<IssuedSession | null> {
  if (!rawRefreshToken) return null;

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const db = await getDb();
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - 30 * 1000);

  // 1. Look for valid active token
  let user = await db.collection("users").findOne({
    refreshTokens: {
      $elemMatch: {
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
    },
  });

  if (user) {
    const userId = user._id;
    const newRefreshToken = createRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);

    const expiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000,
    );

    const newRecord: RefreshTokenRecord = {
      tokenHash: newTokenHash,
      expiresAt,
      createdAt: now,
      userAgent: options?.userAgent,
      revokedAt: null,
    };

    const accessToken = signAccessToken({
      userId: String(userId),
      email: user.email,
      userName: user.name,
      role: user.role,
    });

    const rawUserTokens: RefreshTokenRecord[] = Array.isArray(
      user.refreshTokens,
    )
      ? (user.refreshTokens as RefreshTokenRecord[])
      : [];

    const updatedTokens: RefreshTokenRecord[] = rawUserTokens
      .filter(
        (t) =>
          t &&
          t.expiresAt &&
          new Date(t.expiresAt) > now &&
          (!t.revokedAt || new Date(t.revokedAt) > graceCutoff),
      )
      .map((t) => (t.tokenHash === tokenHash ? { ...t, revokedAt: now } : t));

    updatedTokens.push(newRecord);
    const trimmedTokens = updatedTokens.slice(-10);

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          refreshTokens: trimmedTokens,
          updated_at: now,
        },
      },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: { name: user.name, email: user.email, role: user.role },
    };
  }

  // 2. Check if this token was rotated within the 30-second grace period (concurrent burst from another tab/call)
  user = await db.collection("users").findOne({
    refreshTokens: {
      $elemMatch: {
        tokenHash,
        revokedAt: { $gt: graceCutoff },
        expiresAt: { $gt: now },
      },
    },
  });

  if (user) {
    const accessToken = signAccessToken({
      userId: String(user._id),
      email: user.email,
      userName: user.name,
      role: user.role,
    });

    return {
      accessToken,
      user: { name: user.name, email: user.email, role: user.role },
    };
  }

  return null;
}

export async function revokeRefreshToken(
  rawRefreshToken: string | null,
): Promise<void> {
  if (!rawRefreshToken) return;
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const db = await getDb();

  await db.collection("users").updateOne(
    { "refreshTokens.tokenHash": tokenHash },
    {
      $set: {
        "refreshTokens.$[t].revokedAt": new Date(),
        updated_at: new Date(),
      },
    },
    { arrayFilters: [{ "t.tokenHash": tokenHash }] },
  );
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  if (!userId || userId === "guest" || userId.startsWith("guest_")) return;

  try {
    const db = await getDb();

    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { refreshTokens: [], updated_at: new Date() } },
      );
  } catch {
    /* ignore invalid id */
  }
}
