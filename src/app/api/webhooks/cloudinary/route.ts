import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

/**
 * Public Cloudinary Webhook Endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ success: false, message: "Empty payload" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Webhook acknowledged" });
  } catch (error) {
    console.error("Cloudinary webhook route error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
