import clientPromise from "@/lib/mongodb";
import type { Db } from "mongodb";

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "dukandarshandar";
  return client.db(dbName);
}
