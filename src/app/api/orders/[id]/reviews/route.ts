import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrderReviews, upsertProductReview } from "@/services/productReviewService";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const result = await getOrderReviews(String(auth.user.userId), id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderDisplayId: result.orderDisplayId,
      orderStatus: result.orderStatus,
      isDelivered: result.isDelivered,
      items: result.items,
    });
  } catch (error) {
    console.error("Get order reviews error:", error);
    return NextResponse.json({ success: false, message: "Failed to load order reviews" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const productId = String(body.productId || "");
    const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment : "";

    if (!productId) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const result = await upsertProductReview({
      productId,
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

    // Refresh order items review state after upserting
    const { id } = await context.params;
    const updatedOrderReviews = await getOrderReviews(String(auth.user.userId), id);

    return NextResponse.json({
      success: true,
      message: result.message,
      items: updatedOrderReviews.success ? updatedOrderReviews.items : [],
    });
  } catch (error) {
    console.error("Submit order product review error:", error);
    return NextResponse.json({ success: false, message: "Failed to submit review" }, { status: 500 });
  }
}
