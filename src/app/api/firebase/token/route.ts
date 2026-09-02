import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createFirebaseCustomToken } from "@/controllers/firebaseController";
import { isFirebaseServerConfigured } from "@/lib/firebaseConfig";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isFirebaseServerConfigured()) {
    return NextResponse.json({ success: false, message: "Firebase is not configured" }, { status: 503 });
  }

  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const result = await createFirebaseCustomToken(auth.user);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json({ success: true, token: result.token });
}
