import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { registerFcmDevice, removeFcmDevice } from "@/services/notificationService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { deviceId, token, userAgent } = body;
    if (!deviceId || !token) {
      return NextResponse.json({ success: false, message: "deviceId and token are required" }, { status: 400 });
    }
    await registerFcmDevice({
      userId: auth.user.userId,
      deviceId,
      token,
      userAgent,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register FCM device error:", error);
    return NextResponse.json({ success: false, message: "Failed to register device" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const deviceId = body.deviceId || req.headers.get("x-device-id");
    if (!deviceId) {
      return NextResponse.json({ success: false, message: "deviceId is required" }, { status: 400 });
    }
    await removeFcmDevice(auth.user.userId, deviceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove FCM device error:", error);
    return NextResponse.json({ success: false, message: "Failed to remove device" }, { status: 500 });
  }
}
