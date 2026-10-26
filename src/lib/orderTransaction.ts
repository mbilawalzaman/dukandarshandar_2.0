import type { ClientSession, Db, Document } from "mongodb";
import { ObjectId } from "mongodb";

import { invalidatePromotionCache } from "@/services/promotionService";
import clientPromise from "@/lib/mongodb";
import {
  CheckoutError,
  ACTIVE_PRODUCT_FILTER,
  normalizeCartItems,
} from "@/lib/checkoutValidation";
import { hasReservedStock } from "@/lib/orderRules";

export type OrderTransaction = { db: Db; session: ClientSession };

export async function withOrderTransaction<T>(
  work: (tx: OrderTransaction) => Promise<T>,
): Promise<T> {
  const client = await clientPromise;
  const session = client.startSession();

  try {
    const result = await session.withTransaction(
      () =>
        work({
          db: client.db(process.env.MONGODB_DB || "dukandarshandar"),
          session,
        }),
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    );

    invalidatePromotionCache();

    return result;
  } finally {
    await session.endSession();
  }
}

/** Call only inside a transaction with the associated order write. */
export async function reserveOrderStock(
  tx: OrderTransaction,
  items: unknown,
): Promise<void> {
  const lines = normalizeCartItems(items);

  const operations = lines.map((item) => ({
    updateOne: {
      filter: {
        _id: new ObjectId(item._id),
        ...ACTIVE_PRODUCT_FILTER,
        quantity: { $gte: item.quantity },
        ...(item.variationId
          ? {
              variations: {
                $elemMatch: {
                  id: item.variationId,
                  quantity: { $gte: item.quantity },
                },
              },
            }
          : { "variations.0": { $exists: false } }),
      },
      update: {
        $inc: {
          quantity: -item.quantity,
          ...(item.variationId
            ? { "variations.$.quantity": -item.quantity }
            : {}),
        },
        $set: { updated_at: new Date() },
      },
    },
  }));

  const result = await tx.db
    .collection("products")
    .bulkWrite(operations, { session: tx.session });

  if (result.matchedCount !== lines.length)
    throw new CheckoutError(
      "Some products or variations are no longer available in the requested quantity",
      409,
    );
}

export async function releaseOrderStock(
  tx: OrderTransaction,
  order: Document,
): Promise<void> {
  if (!hasReservedStock(order)) return;
  const lines = normalizeCartItems(order.items);

  const result = await tx.db.collection("products").bulkWrite(
    lines.map((item) => ({
      updateOne: {
        filter: {
          _id: new ObjectId(item._id),
          ...(item.variationId ? { "variations.id": item.variationId } : {}),
        },
        update: {
          $inc: {
            quantity: item.quantity,
            ...(item.variationId
              ? { "variations.$.quantity": item.quantity }
              : {}),
          },
          $set: { updated_at: new Date() },
        },
      },
    })),
    { session: tx.session },
  );

  if (result.matchedCount !== lines.length)
    throw new CheckoutError("Unable to restore product stock", 409);
}
