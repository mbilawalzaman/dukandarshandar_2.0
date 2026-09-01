import { NextRequest } from "next/server";
import { SafepayController } from "@/controllers/safepayController";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  return SafepayController.createSession(req);
}
