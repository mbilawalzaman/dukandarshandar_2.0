import type { ClientSession, Db, Document } from "mongodb";
import { ObjectId } from "mongodb";
import { invalidatePromotionCache } from "@/services/promotionService";
import clientPromise from "@/lib/mongodb";
import { CheckoutError, ACTIVE_PRODUCT_FILTER, normalizeCartItems } from "@/lib/checkoutValidation";
import { hasReservedStock } from "@/lib/orderRules";

export type OrderTransaction = { db: Db; session: ClientSession };
export async function withOrderTransaction<T>(work: (tx: OrderTransaction) => Promise<T>): Promise<T> {
  const client = await clientPromise;
  const session = client.startSession();
  try {
    const result = await session.withTransaction(() => work({ db: client.db(process.env.MONGODB_DB || "dukandarshandar"), session }), {
      readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary",
    });
    invalidatePromotionCache();
    return result;
  } finally { await session.endSession(); }
}

/** Call only inside a transaction with the associated order write. */
export async function reserveOrderStock(tx: OrderTransaction, items: unknown) {
  for (const item of normalizeCartItems(items)) {
    const result = await tx.db.collection("products").updateOne(
      { _id: new ObjectId(item._id), ...ACTIVE_PRODUCT_FILTER, quantity: { $gte: item.quantity } },
      { $inc: { quantity: -item.quantity }, $set: { updated_at: new Date() } }, { session: tx.session },
    );
    if (result.modifiedCount !== 1) throw new CheckoutError("Some products are no longer available in the requested quantity", 409);
  }
}

export async function releaseOrderStock(tx: OrderTransaction, order: Document) {
  if (!hasReservedStock(order)) return;
  for (const item of normalizeCartItems(order.items)) {
    await tx.db.collection("products").updateOne({ _id: new ObjectId(item._id) }, {
      $inc: { quantity: item.quantity }, $set: { updated_at: new Date() },
    }, { session: tx.session });
  }
}
