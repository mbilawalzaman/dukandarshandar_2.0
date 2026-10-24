import type { NextRequest } from "next/server";

import { cancelOrder } from "@/controllers/orderController";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return cancelOrder(req, id);
}
