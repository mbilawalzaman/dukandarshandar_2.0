import { NextResponse } from "next/server";
import { signupController, loginController, guestLoginController } from "@/controllers/authController";
import { clearAuthCookie, getAuthUser } from "@/lib/auth";
import {
  attachSessionCookies,
  getRefreshTokenFromRequest,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from "@/lib/session";

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ success: true, user });
}

export async function POST(req: Request) {
  try {
    const { name, email, password, type, role } = await req.json();
    const userAgent = req.headers.get("user-agent") || undefined;

    if (type === "logout") {
      const refresh = getRefreshTokenFromRequest(req);
      await revokeRefreshToken(refresh).catch(() => undefined);
      const current = getAuthUser(req);
      if (current?.userId) {
        await revokeAllRefreshTokens(current.userId).catch(() => undefined);
      }
      const response = NextResponse.json({ success: true });
      return clearAuthCookie(response);
    }

    if (type === "signup") {
      const result = await signupController(name, email, password, role);
      return NextResponse.json(result, { status: result.success ? 201 : 400 });
    }

    if (type === "login") {
      const result = await loginController(email, password, { userAgent });
      const response = NextResponse.json(result, { status: result.success ? 200 : 401 });
      if (result.success && result.token && result.refreshToken) {
        attachSessionCookies(response, result.token, result.refreshToken);
      }
      return response;
    }

    if (type === "guest") {
      const result = await guestLoginController();
      const response = NextResponse.json(result, { status: result.success ? 200 : 401 });
      if (result.success && result.token) {
        // Guest: access only — clear any prior refresh cookie
        clearAuthCookie(response);
        attachSessionCookies(response, result.token, null);
      }
      return response;
    }

    return NextResponse.json({ success: false, error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Auth Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
