import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parsePageLimit } from "@/lib/pagination";
import { fetchNotificationsPaginated } from "@/services/notificationService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePageLimit(searchParams, { page: 1, limit: 20, maxLimit: 50 });
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await fetchNotificationsPaginated(auth.user.userId, { page, limit, unreadOnly });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch notifications" }, { status: 500 });
  }
}
