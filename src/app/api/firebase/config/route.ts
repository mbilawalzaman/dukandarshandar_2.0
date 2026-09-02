import { NextResponse } from "next/server";
import { firebasePublicConfig } from "@/lib/firebaseConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(firebasePublicConfig);
}
