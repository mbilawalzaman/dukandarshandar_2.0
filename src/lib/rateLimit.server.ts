import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";

let indexes: Promise<unknown> | undefined;
/** Shared, atomic limits across instances. Fixed windows include the window in the key. */
export async function throttleRequest(req: Request, scope: string, limit: number, windowMs: number, owner?: string) {
  const db = await getDb();
  const buckets = db.collection<{ _id: string; count: number; expiresAt: Date }>("request_limits");
  if (!indexes) indexes = buckets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => { indexes = undefined; throw error; });
  await indexes;
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  // Check IP as well as owner: creating new guest sessions must not bypass order limits.
  for (const identity of [getClientIp(req), ...(owner ? [`owner:${owner}`] : [])]) {
    const id = createHash("sha256").update(`${scope}:${identity}:${window}`).digest("hex");
    let bucket;
    const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) } };
    try {
      bucket = await buckets.findOneAndUpdate({ _id: id }, update, { upsert: true, returnDocument: "after" });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      bucket = await buckets.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { returnDocument: "after" });
    }
    if (!bucket || bucket.count > limit) return NextResponse.json({ success: false, error: "Too many attempts. Please try again shortly.", message: "Too many attempts. Please try again shortly." }, {
      status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(((window + 1) * windowMs - now) / 1000))) },
    });
  }
  return null;
}
