import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import PostExService from "@/services/postex.service.js";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);

    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;

    const result = await PostExService.getOperationalCities(type);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch operational cities",
      },
      { status: err.statusCode || 500 },
    );
  }
}
