import type { NextRequest } from "next/server";
import { SafepayWebhookController } from "@/controllers/safepayWebhookController";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  return SafepayWebhookController.handleWebhook(req);
}
