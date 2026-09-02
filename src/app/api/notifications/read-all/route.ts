import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { markAllNotificationsRead } from "@/services/notificationService";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const result = await markAllNotificationsRead(auth.user.userId);
    return NextResponse.json({ success: true, updated: result.updated });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json({ success: false, message: "Failed to update notifications" }, { status: 500 });
  }
}
