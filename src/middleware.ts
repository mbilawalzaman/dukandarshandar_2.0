import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { TOKEN_COOKIE } from "@/lib/constants";

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");

  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));

  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

type VerifyResult = "ok" | "expired" | "forbidden" | "invalid";

/** Edge-safe HS256 JWT verify (no jose / jsonwebtoken). */
async function verifyAdminToken(token: string): Promise<VerifyResult> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") return "invalid";
  }

  const keyMaterial = secret || "supersecretkey";

  try {
    const parts = token.split(".");

    if (parts.length !== 3) return "invalid";
    const [headerB64, payloadB64, signatureB64] = parts;

    if (!headerB64 || !payloadB64 || !signatureB64) return "invalid";

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keyMaterial),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToBytes(signatureB64);

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature.buffer as ArrayBuffer,
      data.buffer as ArrayBuffer,
    );

    if (!valid) return "invalid";

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payloadB64)),
    ) as {
      role?: string;
      exp?: number;
    };

    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return "expired";
    }

    if (payload.role !== "admin") {
      return "forbidden";
    }

    return "ok";
  } catch {
    return "invalid";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!token) {
    const url = request.nextUrl.clone();

    url.pathname = "/login";
    url.searchParams.set("next", pathname);

    return NextResponse.redirect(url);
  }

  const authResult = await verifyAdminToken(token);

  if (authResult === "expired" || authResult === "invalid") {
    const url = request.nextUrl.clone();

    url.pathname = "/login";
    url.searchParams.set("next", pathname);

    return NextResponse.redirect(url);
  }

  if (authResult === "forbidden") {
    const url = request.nextUrl.clone();

    url.pathname = "/";

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
