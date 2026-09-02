import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { markConversationRead } from "@/services/chatService";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { conversationId } = await ctx.params;
  try {
    const result = await markConversationRead(conversationId, auth.user.userId, auth.user.role);
    if ("ok" in result && !result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ success: false, message: "Failed to mark as read" }, { status: 500 });
  }
}
