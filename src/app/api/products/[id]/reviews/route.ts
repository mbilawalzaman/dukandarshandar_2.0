import { NextResponse } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { listProductReviews, upsertProductReview } from "@/services/productReviewService";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = getAuthUser(req);
    const result = await listProductReviews(id, user?.userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      reviews: result.reviews,
      myReview: result.myReview,
      canReview: result.canReview,
      averageRating: result.averageRating,
      reviewCount: result.reviewCount,
    });
  } catch (error) {
    console.error("List product reviews error:", error);
    return NextResponse.json({ success: false, message: "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await req.json();
    const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment : "";

    const result = await upsertProductReview({
      productId: id,
      userId: String(auth.user.userId),
      userName: String(auth.user.userName || "Customer"),
      rating,
      comment,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      myReview: result.myReview,
      reviews: result.reviews,
      canReview: result.canReview,
      averageRating: result.averageRating,
      reviewCount: result.reviewCount,
    });
  } catch (error) {
    console.error("Submit product review error:", error);
    return NextResponse.json({ success: false, message: "Failed to submit review" }, { status: 500 });
  }
}
