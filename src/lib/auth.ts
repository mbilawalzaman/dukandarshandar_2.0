import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
  TOKEN_COOKIE,
} from "@/lib/constants";
import type { JwtPayloadType } from "@/types/shared/authTypes";

export type JwtPayload = JwtPayloadType;

export function getJwtSecret() {
  return process.env.JWT_SECRET || "supersecretkey";
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function getTokenFromRequest(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAuthUser(req: Request): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true as const, user };
}

export function requireAdmin(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }),
    };
  }
  return auth;
}

export function cookieOptions(maxAgeSeconds = ACCESS_TOKEN_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function attachAuthCookie(response: NextResponse, token: string, refreshToken?: string) {
  // Keep access cookie for the refresh window so middleware still sees a session;
  // the JWT itself expires sooner and is renewed via /api/auth/refresh.
  response.cookies.set(TOKEN_COOKIE, token, cookieOptions(REFRESH_TOKEN_TTL_SECONDS));
  if (refreshToken) {
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      cookieOptions(REFRESH_TOKEN_TTL_SECONDS)
    );
  }
  return response;
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(TOKEN_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}
