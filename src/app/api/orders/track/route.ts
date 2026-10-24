import type { NextRequest } from "next/server";

import { trackOrder } from "@/controllers/orderController";

export async function GET(req: NextRequest) {
  return trackOrder(req);
}
