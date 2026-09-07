import { NextResponse } from "next/server";

/** Deprecated: use POST /api/products/[id]/reviews (requires delivered order). */
export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      message: "Use POST /api/products/{id}/reviews. Reviews require a delivered order for that product.",
    },
    { status: 410 }
  );
}
