import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
  registerFcmDevice,
  removeFcmDevice,
} from "@/services/notificationService";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ notificationId: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { notificationId } = await ctx.params;
  const body = await req.json().catch(() => ({})) as {
    deviceId?: string;
    token?: string;
    userAgent?: string;
    unregisterPush?: boolean;
  };

  try {
    if (body.deviceId && body.token) {
      await registerFcmDevice({
        userId: auth.user.userId,
        deviceId: body.deviceId,
        token: body.token,
        userAgent: body.userAgent,
      });
    }

    if (body.unregisterPush && body.deviceId) {
      await removeFcmDevice(auth.user.userId, body.deviceId);
    }

    if (notificationId === "push") {
      return NextResponse.json({ success: true });
    }

    if (notificationId === "all") {
      const result = await markAllNotificationsRead(auth.user.userId);
      return NextResponse.json({ success: true, updated: result.updated });
    }

    const result = await markNotificationRead(notificationId, auth.user.userId);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ success: false, message: "Failed to update notification" }, { status: 500 });
  }
}
