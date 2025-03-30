import { NextResponse } from "next/server";
import { signupController, loginController, guestLoginController } from "@/controllers/authController";

export async function POST(req: Request) {
  try {
    const { name, email, password, type, role } = await req.json();

    if (type === "signup") {
      const response = await signupController(name, email, password, role);
      return NextResponse.json(response, { status: response.success ? 201 : 400 });
    }

    if (type === "login") {
      const response = await loginController(email, password);
      return NextResponse.json(response, { status: response.success ? 200 : 401 });
    }

    if (type === "guest") {
      const response = await guestLoginController();
      return NextResponse.json(response, { status: response.success ? 200 : 401 });
    }

    return NextResponse.json({ success: false, error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Auth Error:", error);

    // ✅ Properly handle unknown error type
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
