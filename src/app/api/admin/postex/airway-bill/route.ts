import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import PostExService from "@/services/postex.service.js";

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const { trackingNumbers } = await req.json();
    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: "trackingNumbers array is required" },
        { status: 400 }
      );
    }

    // PostEx limits requests to max 10 tracking numbers per request.
    // Batch in chunks of 10 if necessary.
    const batches: string[][] = [];
    for (let i = 0; i < trackingNumbers.length; i += 10) {
      batches.push(trackingNumbers.slice(i, i + 10));
    }

    const pdfBuffers: Buffer[] = [];
    for (const batch of batches) {
      const pdfBuffer = await PostExService.getAirwayBillPDF(batch);
      pdfBuffers.push(pdfBuffer);
    }

    // If single batch, stream directly; otherwise concatenate or stream the first batch
    const finalBuffer = Buffer.concat(pdfBuffers);

    return new Response(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="PostEx_AirwayBills_${Date.now()}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate Airway Bill PDF" },
      { status: err.statusCode || 500 }
    );
  }
}
