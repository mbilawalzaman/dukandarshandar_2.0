import type { NextRequest } from "next/server";

import {
  getOrders,
  createOrder,
  updateOrderStatus,
  deleteOrdersHandler,
} from "@/controllers/orderController";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return getOrders(req);
}

export async function POST(req: NextRequest) {
  return createOrder(req);
}

export async function PUT(req: NextRequest) {
  return updateOrderStatus(req);
}

export async function DELETE(req: NextRequest) {
  return deleteOrdersHandler(req);
}
