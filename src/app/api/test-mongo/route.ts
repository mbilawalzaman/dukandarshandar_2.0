import { NextResponse } from "next/server";

/** Diagnostic endpoint disabled — do not expose DB metadata publicly. */
export async function GET() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}
