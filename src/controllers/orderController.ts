import { ObjectId } from "mongodb";

import { getDb } from "@/lib/db";
import { hasReservedStock } from "@/lib/orderRules";
import {
  withOrderTransaction,
  releaseOrderStock,
} from "@/lib/orderTransaction";
import { releaseRedemptions } from "@/services/promotionService";

export type DeleteOrdersResult = {
  success: boolean;
  message: string;
  deletedCount?: number;
  error?: string;
};

/**
 * Permanently deletes one or more orders by their string IDs.
 * Restores inventory stock for active reserved orders, releases promotion redemptions,
 * and removes related records (reviews, postex shipments).
 */
export async function deleteOrders(
  rawOrderIds: string[],
): Promise<DeleteOrdersResult> {
  if (!Array.isArray(rawOrderIds) || rawOrderIds.length === 0) {
    return { success: false, message: "No order IDs provided" };
  }

  const validObjectIds = rawOrderIds
    .filter((id) => typeof id === "string" && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (validObjectIds.length === 0) {
    return { success: false, message: "No valid order IDs provided" };
  }

  const stringIds = validObjectIds.map((id) => id.toString());

  try {
    const deletedCount = await withOrderTransaction(async (tx) => {
      // 1. Batch fetch the orders to be deleted
      const orders = await tx.db
        .collection("orders")
        .find({ _id: { $in: validObjectIds } }, { session: tx.session })
        .toArray();

      if (orders.length === 0) return 0;

      // 2. Release reserved product stock if orders were not cancelled yet
      for (const order of orders) {
        if (hasReservedStock(order) && order.status !== "cancelled") {
          await releaseOrderStock(tx, order);
        }

        if (order.promotions_recorded) {
          await releaseRedemptions(String(order._id), tx);
        }
      }

      // 3. Delete from orders collection
      const deleteResult = await tx.db
        .collection("orders")
        .deleteMany({ _id: { $in: validObjectIds } }, { session: tx.session });

      // 4. Cascade delete related records
      await tx.db
        .collection("promotion_redemptions")
        .deleteMany({ orderId: { $in: stringIds } }, { session: tx.session });

      await tx.db
        .collection("reviews")
        .deleteMany({ orderId: { $in: stringIds } }, { session: tx.session });

      await tx.db.collection("postex_shipments").deleteMany(
        {
          $or: [
            { orderId: { $in: stringIds } },
            { orderId: { $in: validObjectIds } },
          ],
        },
        { session: tx.session },
      );

      return deleteResult.deletedCount;
    });

    return {
      success: true,
      message: `Successfully deleted ${deletedCount} order(s)`,
      deletedCount,
    };
  } catch (error) {
    console.warn(
      "Transactional delete failed, attempting non-transactional fallback:",
      error,
    );

    try {
      const db = await getDb();

      const orders = await db
        .collection("orders")
        .find({ _id: { $in: validObjectIds } })
        .toArray();

      if (orders.length === 0) {
        return {
          success: true,
          message: "No orders found to delete",
          deletedCount: 0,
        };
      }

      const deleteResult = await db
        .collection("orders")
        .deleteMany({ _id: { $in: validObjectIds } });

      await db
        .collection("promotion_redemptions")
        .deleteMany({ orderId: { $in: stringIds } });

      await db
        .collection("reviews")
        .deleteMany({ orderId: { $in: stringIds } });

      await db.collection("postex_shipments").deleteMany({
        $or: [
          { orderId: { $in: stringIds } },
          { orderId: { $in: validObjectIds } },
        ],
      });

      return {
        success: true,
        message: `Successfully deleted ${deleteResult.deletedCount} order(s)`,
        deletedCount: deleteResult.deletedCount,
      };
    } catch (fallbackErr) {
      console.error("Error deleting orders:", fallbackErr);

      const msg =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : "Failed to delete order(s)";

      return { success: false, message: msg };
    }
  }
}
