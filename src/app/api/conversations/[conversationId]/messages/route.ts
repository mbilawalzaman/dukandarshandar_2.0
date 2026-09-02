import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendMessage } from "@/services/chatService";
import { UserRole } from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  if (auth.user.role === UserRole.GUEST) {
    return NextResponse.json({ success: false, message: "Guests cannot send messages" }, { status: 403 });
  }

  const { conversationId } = await ctx.params;

  try {
    const body = await req.json();
    const { text, clientMessageId, orderId } = body;
    if (!clientMessageId) {
      return NextResponse.json({ success: false, message: "clientMessageId is required" }, { status: 400 });
    }

    const result = await sendMessage({
      conversationId,
      senderId: auth.user.userId,
      role: auth.user.role,
      text,
      clientMessageId,
      orderId,
    });

    if ("ok" in result && !result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }
    if ("success" in result && !result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      messageId: "messageId" in result ? result.messageId : undefined,
      duplicate: "duplicate" in result ? result.duplicate : false,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
  }
}
