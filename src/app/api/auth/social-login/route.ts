import { NextResponse } from "next/server";
import { socialLoginController } from "@/controllers/authController";
import { attachSessionCookies } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await socialLoginController(idToken, { userAgent });
    const response = NextResponse.json(result, { status: result.success ? 200 : 401 });

    if (result.success && result.token && result.refreshToken) {
      attachSessionCookies(response, result.token, result.refreshToken);
    }

    return response;
  } catch (error) {
    console.error("Social login error:", error);
    const message = error instanceof Error ? error.message : "Social login failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
