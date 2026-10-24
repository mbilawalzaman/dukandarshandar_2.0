import type { NextRequest } from "next/server";

import {
  getOrderById,
  deleteOrdersHandler,
} from "@/controllers/orderController";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return getOrderById(req, id);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return deleteOrdersHandler(req, id);
}
