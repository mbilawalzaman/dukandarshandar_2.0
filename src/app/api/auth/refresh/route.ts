import { NextResponse } from "next/server";
import {
  attachSessionCookies,
  clearSessionCookies,
  getRefreshTokenFromRequest,
  rotateRefreshToken,
} from "@/lib/session";

export async function POST(req: Request) {
  try {
    const rawRefresh = getRefreshTokenFromRequest(req);
    if (!rawRefresh) {
      const response = NextResponse.json(
        { success: false, error: "No refresh token" },
        { status: 401 }
      );
      return clearSessionCookies(response);
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const session = await rotateRefreshToken(rawRefresh, { userAgent });

    if (!session) {
      const response = NextResponse.json(
        { success: false, error: "Invalid or expired refresh token" },
        { status: 401 }
      );
      return clearSessionCookies(response);
    }

    const response = NextResponse.json({
      success: true,
      token: session.accessToken,
      user: session.user,
    });
    attachSessionCookies(response, session.accessToken, session.refreshToken);
    return response;
  } catch (error) {
    console.error("Refresh token error:", error);
    const message = error instanceof Error ? error.message : "Refresh failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
