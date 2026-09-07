import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cancelCustomerOrder } from "@/services/orderCancelService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const result = await cancelCustomerOrder(id, {
      userId: auth.user.userId,
      email: auth.user.email,
      role: auth.user.role,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.refunded
        ? "Order cancelled and refund initiated"
        : "Order cancelled successfully",
      orderId: result.orderId,
      refunded: result.refunded,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
