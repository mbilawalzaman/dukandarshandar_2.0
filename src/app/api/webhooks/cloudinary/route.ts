import { NextResponse } from "next/server";

/**
 * Cloudinary webhook stub removed — unsigned acknowledgements are unsafe.
 * Re-enable only with signature verification against CLOUDINARY_API_SECRET.
 */
export async function POST() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}
