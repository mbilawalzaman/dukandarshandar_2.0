import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import PostExService from "@/services/postex.service.js";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { trackingNumbers, pickupAddress } = await req.json();

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: "trackingNumbers array is required" },
        { status: 400 }
      );
    }

    const pdfBuffer = await PostExService.generateLoadSheet({
      trackingNumbers,
      pickupAddress: pickupAddress || "",
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="PostEx_LoadSheet_${Date.now()}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate Load Sheet PDF" },
      { status: err.statusCode || 500 }
    );
  }
}
