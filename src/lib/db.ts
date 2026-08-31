import clientPromise from "@/lib/mongodb";
import type { Db } from "mongodb";

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("dukandarshandar");
}
