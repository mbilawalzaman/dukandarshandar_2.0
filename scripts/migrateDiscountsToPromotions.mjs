/**
 * One-off migration: legacy `discounts` + `discount_types` -> `promotions` + `promotion_types`.
 *
 *   node --env-file=.env scripts/migrateDiscountsToPromotions.mjs [--dry-run] [--drop-legacy]
 *
 * Idempotent: a legacy document that already has a promotion with the same code is skipped.
 */
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const dropLegacy = process.argv.includes("--drop-legacy");

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function badgeFor(rewardType, value) {
  if (rewardType === "free_shipping") return { label: "Free Delivery", color: "#0284c7" };
  if (rewardType === "percentage") return { label: `-${value}%`, color: "#dc2626" };
  return { label: `Rs. ${value} off`, color: "#dc2626" };
}

function mapScope(doc) {
  if (doc.targetScope === "specific_category") return { type: "categories", categories: doc.targetCategories || [], productIds: [] };
  if (doc.targetScope === "specific_products") return { type: "products", categories: [], productIds: doc.targetProductIds || [] };
  return { type: "all", categories: [], productIds: [] };
}

function mapDiscount(doc) {
  const rewardType = doc.rewardType || doc.type || "percentage";
  const value = Number(doc.rewardValue ?? doc.value ?? 0);
  const isFreeShipping = rewardType === "free_shipping";
  const now = new Date();
  return {
    name: doc.name || doc.code,
    description: doc.description || "",
    kind: "voucher",
    typeId: null,
    code: String(doc.code || "").toUpperCase(),
    visibility: doc.is_public ? "public" : "private",
    isDraft: false,
    isPaused: doc.isActive === false,
    startAt: doc.startDate ? new Date(doc.startDate) : now,
    endAt: doc.endDate ? endOfDay(doc.endDate) : endOfDay(new Date(now.getTime() + 30 * 86400000)),
    scope: mapScope(doc),
    conditions: {
      ...(doc.minOrderAmount != null ? { minOrderAmount: Number(doc.minOrderAmount) } : {}),
      ...(doc.minItemQuantity != null ? { minItemQuantity: Number(doc.minItemQuantity) } : {}),
      firstOrderOnly: false,
    },
    reward: isFreeShipping
      ? { type: "free_shipping" }
      : {
          type: rewardType === "percentage" ? "percentage" : "fixed",
          value,
          ...(doc.maxDiscount != null ? { maxDiscount: Number(doc.maxDiscount) } : {}),
        },
    perProduct: [],
    limits: {
      ...(doc.usageLimit != null ? { totalUses: Number(doc.usageLimit) } : {}),
      ...(doc.limitPerCustomer != null ? { perCustomer: Number(doc.limitPerCustomer) } : {}),
    },
    stats: { timesUsed: Number(doc.timesUsed) || 0, totalDiscountGiven: 0, revenue: 0 },
    stackable: true,
    priority: 0,
    badge: badgeFor(rewardType, value),
    createdBy: null,
    updatedBy: "migration",
    createdAt: doc.createdAt ? new Date(doc.createdAt) : now,
    updatedAt: now,
    legacyDiscountId: doc._id,
  };
}

function mapDiscountType(doc) {
  const rewardType = doc.rewardType || doc.calculationType || "percentage";
  const value = Number(doc.rewardValue ?? doc.value ?? 0);
  const kind = rewardType === "free_shipping" ? "free_shipping" : rewardType === "buy_x_get_y" ? "bundle" : "voucher";
  const now = new Date();
  return {
    name: doc.name,
    kind,
    description: doc.description || "",
    defaults: {
      scope: mapScope(doc),
      conditions: {
        ...(doc.minOrderAmount != null ? { minOrderAmount: Number(doc.minOrderAmount) } : {}),
        ...(doc.minItemQuantity != null ? { minItemQuantity: Number(doc.minItemQuantity) } : {}),
      },
      reward:
        kind === "free_shipping"
          ? { type: "free_shipping" }
          : kind === "bundle"
          ? { type: "bundle", buyQty: 2, getQty: 1, getDiscountPercent: 100 }
          : { type: rewardType === "percentage" ? "percentage" : "fixed", value, ...(doc.maxDiscount != null ? { maxDiscount: Number(doc.maxDiscount) } : {}) },
      badge: badgeFor(rewardType, value),
    },
    isSystem: false,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : now,
    updatedAt: now,
    legacyDiscountTypeId: doc._id,
  };
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("dukandarshandar");

  const discounts = await db.collection("discounts").find({}).toArray();
  const types = await db.collection("discount_types").find({}).toArray();
  console.log(`legacy: ${discounts.length} discounts, ${types.length} discount types${dryRun ? " (dry run)" : ""}`);

  let migrated = 0;
  for (const doc of discounts) {
    const code = String(doc.code || "").toUpperCase();
    if (!code) continue;
    const exists = await db.collection("promotions").findOne({ code });
    if (exists) {
      console.log(`skip ${code}: promotion already exists`);
      continue;
    }
    const mapped = mapDiscount(doc);
    console.log(`migrate ${code} -> ${mapped.kind}/${mapped.visibility}`);
    if (!dryRun) await db.collection("promotions").insertOne(mapped);
    migrated += 1;
  }

  let migratedTypes = 0;
  for (const doc of types) {
    if (!doc.name) continue;
    const exists = await db.collection("promotion_types").findOne({ name: doc.name });
    if (exists) {
      console.log(`skip type "${doc.name}": already exists`);
      continue;
    }
    const mapped = mapDiscountType(doc);
    console.log(`migrate type "${doc.name}" -> ${mapped.kind}`);
    if (!dryRun) await db.collection("promotion_types").insertOne(mapped);
    migratedTypes += 1;
  }

  // Orders created by the interim implementation carried a single discount_code.
  const legacyOrders = await db
    .collection("orders")
    .find({ discount_code: { $ne: null }, discounts: { $exists: false } })
    .toArray();
  let migratedOrders = 0;
  for (const order of legacyOrders) {
    const promo = await db.collection("promotions").findOne({ code: String(order.discount_code).toUpperCase() });
    if (!promo) continue;
    const line = { promotionId: String(promo._id), code: promo.code, kind: "voucher", name: promo.name, amount: Number(order.discount_amount) || 0 };
    if (!dryRun) {
      await db.collection("orders").updateOne({ _id: order._id }, { $set: { discounts: [line], discount_total: line.amount } });
      if (order.discount_redeemed) {
        await db.collection("promotion_redemptions").insertOne({
          promotionId: line.promotionId,
          orderId: String(order._id),
          customerId: order.customer_id ? String(order.customer_id) : null,
          customerEmail: order.customer_email ? String(order.customer_email).toLowerCase() : null,
          code: line.code,
          kind: "voucher",
          amount: line.amount,
          createdAt: order.created_at || new Date(),
        });
      }
    }
    migratedOrders += 1;
  }

  console.log(`done: ${migrated} promotions, ${migratedTypes} types, ${migratedOrders} orders`);

  if (dropLegacy && !dryRun) {
    await db.collection("discounts").rename("discounts_legacy", { dropTarget: true }).catch(() => undefined);
    await db.collection("discount_types").rename("discount_types_legacy", { dropTarget: true }).catch(() => undefined);
    console.log("legacy collections renamed to *_legacy");
  }

  await client.close();
  void ObjectId;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
