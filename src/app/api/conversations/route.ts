import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getOrCreateSupportConversation,
  listConversations,
} from "@/services/chatService";
import { UserRole } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const conversations = await listConversations(auth.user.userId, auth.user.role);
    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("List conversations error:", error);
    const message = error instanceof Error ? error.message : "Failed to list conversations";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  if (auth.user.role === UserRole.GUEST) {
    return NextResponse.json({ success: false, message: "Guests cannot start support chat" }, { status: 403 });
  }

  if (auth.user.role === UserRole.ADMIN) {
    return NextResponse.json({ success: false, message: "Admins cannot create support threads" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await getOrCreateSupportConversation(auth.user.userId, body.orderId || null);
    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ success: false, message: "Failed to create conversation" }, { status: 500 });
  }
}
