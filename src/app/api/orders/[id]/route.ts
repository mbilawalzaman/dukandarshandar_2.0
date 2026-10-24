import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { deleteOrders } from "@/controllers/orderController";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = requireAdmin(req);

    if (!admin.ok) return admin.response;

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteOrders([id.trim()]);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Error in DELETE /api/orders/[id]:", error);

    const message =
      error instanceof Error ? error.message : "Failed to delete order";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
