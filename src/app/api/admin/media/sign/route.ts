import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSignedUploadParams, isConfigured } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { success: false, message: "Cloudinary is not configured on the server" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const resourceType =
      body.resourceType === "image" || body.resourceType === "raw" || body.resourceType === "auto"
        ? body.resourceType
        : "video";
    const folder =
      typeof body.folder === "string" && body.folder.trim()
        ? body.folder.trim()
        : resourceType === "video"
          ? "dukandarshandar/banners/videos"
          : "dukandarshandar/banners";

    const signed = getSignedUploadParams({ folder, resourceType });

    return NextResponse.json({
      success: true,
      upload: signed,
    });
  } catch (error) {
    console.error("Error creating media upload signature:", error);
    const message = error instanceof Error ? error.message : "Failed to create upload signature";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
