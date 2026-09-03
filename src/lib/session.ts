import crypto from "crypto";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import type { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { attachAuthCookie, clearAuthCookie, getJwtSecret, type JwtPayload } from "@/lib/auth";
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
  refreshToken: string;
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
  return jwt.sign(payload, getJwtSecret(), { expiresIn: `${ACCESS_TOKEN_TTL_SECONDS}s` });
}

export function attachSessionCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string | null
) {
  return attachAuthCookie(response, accessToken, refreshToken || undefined);
}

export function clearSessionCookies(response: NextResponse) {
  return clearAuthCookie(response);
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${REFRESH_TOKEN_COOKIE}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Issue access + refresh for a real Mongo user (not guest). */
export async function issueSessionForUser(
  user: { _id: ObjectId | string; name: string; email: string; role: string },
  options?: { userAgent?: string }
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
  await db.collection("users").updateOne(
    { _id: typeof user._id === "string" ? new ObjectId(user._id) : user._id },
    {
      $set: {
        refreshTokens: [record],
        updated_at: now,
      },
    }
  );

  return {
    accessToken,
    refreshToken,
    user: { name: user.name, email: user.email, role: user.role },
  };
}

/** Guest: short-lived access only, no refresh. */
export function issueGuestAccessToken(): { accessToken: string; user: SessionUser } {
  const accessToken = signAccessToken({
    userId: "guest",
    email: "guest@guest.com",
    userName: "Guest User",
    role: "guest",
  });
  return {
    accessToken,
    user: { name: "Guest User", email: "guest@guest.com", role: "guest" },
  };
}

export async function rotateRefreshToken(
  rawRefreshToken: string,
  options?: { userAgent?: string }
): Promise<IssuedSession | null> {
  if (!rawRefreshToken) return null;

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const db = await getDb();
  const now = new Date();

  const user = await db.collection("users").findOne({
    refreshTokens: {
      $elemMatch: {
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
    },
  });

  if (!user) return null;

  return issueSessionForUser(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    options
  );
}

export async function revokeRefreshToken(rawRefreshToken: string | null): Promise<void> {
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
    { arrayFilters: [{ "t.tokenHash": tokenHash }] }
  );
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  if (!userId || userId === "guest") return;
  try {
    const db = await getDb();
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { refreshTokens: [], updated_at: new Date() } }
    );
  } catch {
    /* ignore invalid id */
  }
}
