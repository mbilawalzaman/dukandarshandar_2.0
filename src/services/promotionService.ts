import { ObjectId, type Db, type WithId, type Document, type UpdateFilter } from "mongodb";
import { getDb } from "@/lib/db";
import { escapeRegex } from "@/lib/escapeRegex";
import { optionalNumber as num, compact } from "@/lib/objectUtils";
import { startOfDay, endOfDay } from "@/lib/dateUtils";
import { computeShipping, isDeliveryPromoActive } from "@/lib/deliverySettings";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import { applyPromotions, promotionStatus, type EngineCartItem, type EngineResult } from "@/lib/promotionEngine";
import {
  PROMOTION_KINDS as KINDS,
  type Promotion,
  type PromotionInput,
  type PromotionKind,
  type PromotionRedemption,
  type PromotionStatus,
  type PromotionVisibility,
  type PublicPromotion,
  type OrderDiscountLine,
} from "@/types/apps/promotionTypes";

export const PROMOTIONS = "promotions";
export const REDEMPTIONS = "promotion_redemptions";

const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

// ---------------------------------------------------------------------------
// indexes (created once per process)
// ---------------------------------------------------------------------------
let indexesReady: Promise<void> | null = null;
export function ensurePromotionIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    indexesReady = Promise.all([
      db.collection(PROMOTIONS).createIndex({ code: 1 }, { unique: true, sparse: true }),
      db.collection(PROMOTIONS).createIndex({ isDraft: 1, isPaused: 1, startAt: 1, endAt: 1 }),
      db.collection(PROMOTIONS).createIndex({ kind: 1, createdAt: -1 }),
      db.collection(REDEMPTIONS).createIndex({ promotionId: 1, customerId: 1 }),
      db.collection(REDEMPTIONS).createIndex({ promotionId: 1, customerEmail: 1 }),
      db.collection(REDEMPTIONS).createIndex({ orderId: 1 }),
      db.collection("orders").createIndex({ "discounts.promotionId": 1 }),
    ])
      .then(() => undefined)
      .catch((err) => {
        indexesReady = null;
        console.error("[promotionService] index creation failed:", err);
      });
  }
  return indexesReady;
}

async function col() {
  const db = await getDb();
  await ensurePromotionIndexes(db);
  return { db, promotions: db.collection(PROMOTIONS), redemptions: db.collection(REDEMPTIONS) };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function serializePromotion(doc: WithId<Document>, now = new Date()): Promotion {
  const base: Omit<Promotion, "status"> = {
    _id: String(doc._id),
    name: String(doc.name || ""),
    description: String(doc.description || ""),
    kind: (KINDS.includes(doc.kind) ? doc.kind : "voucher") as PromotionKind,
    typeId: doc.typeId ? String(doc.typeId) : null,
    code: doc.code ? String(doc.code).toUpperCase() : null,
    visibility: (doc.visibility === "private" ? "private" : "public") as PromotionVisibility,
    isDraft: Boolean(doc.isDraft),
    isPaused: Boolean(doc.isPaused),
    startAt: iso(doc.startAt) || new Date(0).toISOString(),
    endAt: iso(doc.endAt) || new Date(8640000000000000).toISOString(),
    scope: {
      type: doc.scope?.type === "categories" || doc.scope?.type === "products" ? doc.scope.type : "all",
      categories: Array.isArray(doc.scope?.categories) ? doc.scope.categories.map(String) : [],
      productIds: Array.isArray(doc.scope?.productIds) ? doc.scope.productIds.map(String) : [],
    },
    conditions: {
      minOrderAmount: num(doc.conditions?.minOrderAmount),
      minItemQuantity: num(doc.conditions?.minItemQuantity),
      firstOrderOnly: Boolean(doc.conditions?.firstOrderOnly),
    },
    reward: {
      type: doc.reward?.type || "percentage",
      value: num(doc.reward?.value),
      maxDiscount: num(doc.reward?.maxDiscount),
      buyQty: num(doc.reward?.buyQty),
      getQty: num(doc.reward?.getQty),
      getDiscountPercent: num(doc.reward?.getDiscountPercent),
    },
    perProduct: Array.isArray(doc.perProduct)
      ? doc.perProduct.map((d: Document) => ({
          productId: String(d.productId),
          productName: d.productName ? String(d.productName) : undefined,
          originalPrice: num(d.originalPrice),
          salePrice: Number(d.salePrice) || 0,
          stockLimit: num(d.stockLimit),
          sold: Number(d.sold) || 0,
        }))
      : [],
    limits: { totalUses: num(doc.limits?.totalUses), perCustomer: num(doc.limits?.perCustomer) },
    stats: {
      timesUsed: Number(doc.stats?.timesUsed) || 0,
      totalDiscountGiven: Number(doc.stats?.totalDiscountGiven) || 0,
      revenue: Number(doc.stats?.revenue) || 0,
    },
    stackable: doc.stackable !== false,
    priority: Number(doc.priority) || 0,
    badge: { label: String(doc.badge?.label || ""), color: String(doc.badge?.color || "#dc2626") },
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
  return { ...base, status: promotionStatus({ ...base, status: "active" }, now) };
}

export function toPublicPromotion(p: Promotion): PublicPromotion {
  return {
    _id: p._id,
    name: p.name,
    description: p.description,
    kind: p.kind,
    code: p.visibility === "public" ? p.code : null,
    visibility: p.visibility,
    startAt: p.startAt,
    endAt: p.endAt,
    scope: p.scope,
    conditions: p.conditions,
    reward: p.reward,
    perProduct: p.perProduct?.map((d) => ({ ...d, sold: d.sold })),
    stackable: p.stackable,
    priority: p.priority,
    badge: p.badge,
    status: p.status,
    limits: { perCustomer: p.limits.perCustomer },
  };
}

function defaultBadge(input: PromotionInput): { label: string; color: string } {
  const r = input.reward;
  if (input.kind === "flash_sale") return { label: "Flash Sale", color: "#ea580c" };
  if (input.kind === "free_shipping" || r?.type === "free_shipping") return { label: "Free Delivery", color: "#0284c7" };
  if (input.kind === "bundle") return { label: `Buy ${r?.buyQty || 1} Get ${r?.getQty || 1}`, color: "#7c3aed" };
  if (r?.type === "percentage" && r.value) return { label: `-${r.value}%`, color: "#dc2626" };
  if (r?.type === "fixed" && r.value) return { label: `Rs. ${r.value} off`, color: "#dc2626" };
  return { label: "Deal", color: "#dc2626" };
}

function validate(input: PromotionInput, partial = false) {
  if (!partial || input.name !== undefined) {
    if (!String(input.name || "").trim()) throw new Error("Promotion name is required");
  }
  if (!partial || input.kind !== undefined) {
    if (!input.kind || !KINDS.includes(input.kind)) throw new Error("Invalid promotion kind");
  }
  if (input.kind === "voucher" || (partial && input.code !== undefined && input.code)) {
    const code = String(input.code || "").trim().toUpperCase();
    if (!code && input.kind === "voucher") throw new Error("Vouchers need a code");
    if (code && !CODE_PATTERN.test(code)) throw new Error("Code must be 3-30 letters, numbers, dashes or underscores");
  }
  const r = input.reward;
  if (r) {
    if (r.type === "percentage") {
      const v = Number(r.value);
      if (!(v > 0 && v <= 100)) throw new Error("Percentage must be between 1 and 100");
    }
    if (r.type === "fixed" && !(Number(r.value) > 0)) throw new Error("Fixed discount must be greater than 0");
    if (r.type === "bundle") {
      if (!(Number(r.buyQty) >= 1) || !(Number(r.getQty) >= 1)) throw new Error("Bundle needs buy and get quantities of at least 1");
      const pct = Number(r.getDiscountPercent ?? 100);
      if (!(pct > 0 && pct <= 100)) throw new Error("Bundle discount percent must be between 1 and 100");
    }
  }
  if (input.startAt && input.endAt && startOfDay(input.startAt) > endOfDay(input.endAt)) {
    throw new Error("End date must be on or after the start date");
  }
  if (input.scope?.type === "categories" && !input.scope.categories?.length) {
    throw new Error("Pick at least one category for this scope");
  }
  if (input.scope?.type === "products" && !input.scope.productIds?.length && !input.perProduct?.length) {
    throw new Error("Pick at least one product for this scope");
  }
  for (const d of input.perProduct || []) {
    if (!(Number(d.salePrice) >= 0)) throw new Error("Sale price must be 0 or more");
  }
}

function buildDoc(input: PromotionInput, actor?: string | null) {
  const now = new Date();
  const kind = input.kind || "voucher";
  const scopeType = input.scope?.type || (input.perProduct?.length ? "products" : "all");
  const productIds = scopeType === "products"
    ? Array.from(new Set([...(input.scope?.productIds || []), ...(input.perProduct || []).map((d) => d.productId)]))
    : [];
  return compact({
    name: String(input.name || "").trim(),
    description: String(input.description || "").trim(),
    kind,
    typeId: input.typeId || null,
    code: kind === "voucher" ? String(input.code || "").trim().toUpperCase() : null,
    visibility: input.visibility === "private" ? "private" : "public",
    isDraft: Boolean(input.isDraft),
    isPaused: Boolean(input.isPaused),
    startAt: input.startAt ? startOfDay(input.startAt) : now,
    endAt: input.endAt ? endOfDay(input.endAt) : endOfDay(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
    scope: {
      type: scopeType,
      categories: scopeType === "categories" ? input.scope?.categories || [] : [],
      productIds,
    },
    conditions: compact({
      minOrderAmount: num(input.conditions?.minOrderAmount),
      minItemQuantity: num(input.conditions?.minItemQuantity),
      firstOrderOnly: Boolean(input.conditions?.firstOrderOnly),
    }),
    reward: compact({
      type: kind === "free_shipping" ? "free_shipping" : kind === "bundle" ? "bundle" : input.reward?.type || "percentage",
      value: num(input.reward?.value),
      maxDiscount: num(input.reward?.maxDiscount),
      buyQty: num(input.reward?.buyQty),
      getQty: num(input.reward?.getQty),
      getDiscountPercent: num(input.reward?.getDiscountPercent),
    }),
    perProduct: (input.perProduct || []).map((d) =>
      compact({
        productId: String(d.productId),
        productName: d.productName,
        originalPrice: num(d.originalPrice),
        salePrice: Number(d.salePrice) || 0,
        stockLimit: num(d.stockLimit),
        sold: Number(d.sold) || 0,
      })
    ),
    limits: compact({ totalUses: num(input.limits?.totalUses), perCustomer: num(input.limits?.perCustomer) }),
    stackable: input.stackable !== false,
    priority: Number(input.priority) || 0,
    badge: input.badge?.label ? { label: input.badge.label, color: input.badge.color || "#dc2626" } : defaultBadge({ ...input, kind }),
    updatedBy: actor || null,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export interface ListPromotionsOptions {
  kind?: PromotionKind;
  status?: PromotionStatus | "all";
  visibility?: PromotionVisibility;
  search?: string;
}

export async function listPromotions(options: ListPromotionsOptions = {}): Promise<Promotion[]> {
  const { promotions } = await col();
  const query: Record<string, unknown> = {};
  if (options.kind) query.kind = options.kind;
  if (options.visibility) query.visibility = options.visibility;
  if (options.search) {
    const rx = new RegExp(escapeRegex(options.search), "i");
    query.$or = [{ name: rx }, { code: rx }, { description: rx }];
  }
  const docs = await promotions.find(query).sort({ createdAt: -1 }).toArray();
  const now = new Date();
  let list = docs.map((d) => serializePromotion(d, now));
  if (options.status && options.status !== "all") list = list.filter((p) => p.status === options.status);
  return list;
}

export async function getPromotionById(id: string): Promise<Promotion | null> {
  if (!ObjectId.isValid(id)) return null;
  const { promotions } = await col();
  const doc = await promotions.findOne({ _id: new ObjectId(id) });
  return doc ? serializePromotion(doc) : null;
}

export async function getPromotionByCode(code: string): Promise<Promotion | null> {
  const clean = (code || "").trim().toUpperCase();
  if (!clean) return null;
  const { promotions } = await col();
  const doc = await promotions.findOne({ code: clean });
  return doc ? serializePromotion(doc) : null;
}

export async function createPromotion(input: PromotionInput, actor?: string | null): Promise<Promotion> {
  validate(input);
  const { promotions } = await col();
  const doc = buildDoc(input, actor);
  if (doc.code) {
    const clash = await promotions.findOne({ code: doc.code });
    if (clash) throw new Error(`Code "${doc.code}" is already used by another promotion`);
  }
  const full = {
    ...doc,
    stats: { timesUsed: 0, totalDiscountGiven: 0, revenue: 0 },
    createdBy: actor || null,
    createdAt: new Date(),
  };
  const res = await promotions.insertOne(full);
  invalidatePromotionCache();
  return serializePromotion({ _id: res.insertedId, ...full });
}

export async function updatePromotion(id: string, input: PromotionInput, actor?: string | null): Promise<Promotion | null> {
  if (!ObjectId.isValid(id)) return null;
  const { promotions } = await col();
  const existing = await promotions.findOne({ _id: new ObjectId(id) });
  if (!existing) return null;

  const current = serializePromotion(existing);
  const merged: PromotionInput = {
    ...current,
    ...input,
    scope: input.scope ?? current.scope,
    conditions: input.conditions ?? current.conditions,
    reward: input.reward ?? current.reward,
    limits: input.limits ?? current.limits,
    perProduct: input.perProduct ?? current.perProduct,
    badge: input.badge ?? current.badge,
  };
  validate(merged);
  const doc = buildDoc(merged, actor);

  if (doc.code) {
    const clash = await promotions.findOne({ code: doc.code, _id: { $ne: new ObjectId(id) } });
    if (clash) throw new Error(`Code "${doc.code}" is already used by another promotion`);
  }

  // Keep sold counters from the stored deals.
  const soldById = new Map<string, number>((existing.perProduct || []).map((d: Document) => [String(d.productId), Number(d.sold) || 0]));
  doc.perProduct = doc.perProduct.map((d) => ({ ...d, sold: soldById.get(d.productId) ?? d.sold }));

  const unset: Record<string, ""> = {};
  if (!doc.code) unset.code = "";
  const update: Record<string, unknown> = { $set: doc };
  if (Object.keys(unset).length) update.$unset = unset;

  const res = await promotions.findOneAndUpdate({ _id: new ObjectId(id) }, update, { returnDocument: "after" });
  invalidatePromotionCache();
  return res ? serializePromotion(res) : null;
}

export async function setPromotionPaused(id: string, paused: boolean, actor?: string | null): Promise<Promotion | null> {
  if (!ObjectId.isValid(id)) return null;
  const { promotions } = await col();
  const res = await promotions.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { isPaused: paused, updatedAt: new Date(), updatedBy: actor || null } },
    { returnDocument: "after" }
  );
  invalidatePromotionCache();
  return res ? serializePromotion(res) : null;
}

export async function duplicatePromotion(id: string, actor?: string | null): Promise<Promotion | null> {
  const source = await getPromotionById(id);
  if (!source) return null;
  const input: PromotionInput = {
    ...source,
    name: `${source.name} (copy)`,
    code: source.code ? `${source.code}-COPY`.slice(0, 30) : null,
    isDraft: true,
    isPaused: false,
    perProduct: source.perProduct?.map((d) => ({ ...d, sold: 0 })),
  };
  return createPromotion(input, actor);
}

export async function deletePromotion(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const { promotions } = await col();
  const res = await promotions.deleteOne({ _id: new ObjectId(id) });
  invalidatePromotionCache();
  return res.deletedCount > 0;
}

// ---------------------------------------------------------------------------
// storefront reads
// ---------------------------------------------------------------------------

/** Promotions that can price a cart right now (public + private vouchers). */
export async function getLivePromotions(): Promise<Promotion[]> {
  const { promotions } = await col();
  const now = new Date();
  const docs = await promotions
    .find({ isDraft: { $ne: true }, isPaused: { $ne: true }, startAt: { $lte: now }, endAt: { $gte: now } })
    .sort({ priority: -1 })
    .toArray();
  return docs.map((d) => serializePromotion(d, now)).filter((p) => {
    if (p.limits.totalUses !== undefined && p.stats.timesUsed >= p.limits.totalUses) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// storefront cache: the public list is read on every product page and cart render,
// so keep it for a short TTL per instance and drop it on any admin write or redemption.
// Authoritative pricing (quoteCart) always reads live data.
// ---------------------------------------------------------------------------
const PUBLIC_CACHE_TTL_MS = 60 * 1000;
let publicCache: { value: PublicPromotion[]; expiresAt: number } | null = null;
let publicCacheInflight: Promise<PublicPromotion[]> | null = null;

export function invalidatePromotionCache(): void {
  publicCache = null;
  publicCacheInflight = null;
}

/** What the storefront may see: public live promotions, private codes hidden. Cached for 60s. */
export async function getPublicPromotions(): Promise<PublicPromotion[]> {
  const now = Date.now();
  if (publicCache && publicCache.expiresAt > now) return publicCache.value;
  if (publicCacheInflight) return publicCacheInflight;

  publicCacheInflight = getLivePromotions()
    .then((live) => {
      const value = live.filter((p) => p.visibility === "public").map(toPublicPromotion);
      publicCache = { value, expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      publicCacheInflight = null;
    });
  return publicCacheInflight;
}

// ---------------------------------------------------------------------------
// quoting + redemptions
// ---------------------------------------------------------------------------
export interface QuoteCartParams {
  items: Array<{ _id: string; price?: number; quantity: number; category?: string; name?: string }>;
  voucherCode?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  /** override delivery fee (tests); otherwise read from settings */
  shippingFee?: number;
}

/** Order line as persisted on an order document: what was actually charged. */
export interface OrderLineItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  original_price: number;
  line_discount: number;
  applied_promotion_ids: string[];
  image: string;
}

export interface CartQuote extends EngineResult {
  /** product ids that were not found or are inactive */
  missingProductIds: string[];
  /** store toggle waived delivery, or a promotion did */
  deliveryPromo: boolean;
  /** ready-to-persist order items (DB names, images and charged prices) */
  orderItems: OrderLineItem[];
}

async function customerRedemptionCounts(
  db: Db,
  promotionIds: string[],
  customerId?: string | null,
  customerEmail?: string | null
): Promise<Record<string, number>> {
  if (promotionIds.length === 0) return {};
  const ownership: Array<Record<string, unknown>> = [];
  if (customerId) ownership.push({ customerId });
  if (customerEmail) ownership.push({ customerEmail: customerEmail.trim().toLowerCase() });
  if (ownership.length === 0) return {};
  const rows = await db
    .collection(REDEMPTIONS)
    .aggregate([
      { $match: { promotionId: { $in: promotionIds }, $or: ownership } },
      { $group: { _id: "$promotionId", count: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((r) => [String(r._id), Number(r.count)]));
}

async function customerOrderCount(db: Db, customerId?: string | null, customerEmail?: string | null): Promise<number> {
  const ownership: Array<Record<string, unknown>> = [];
  if (customerId) ownership.push({ customer_id: customerId });
  if (customerEmail) ownership.push({ customer_email: customerEmail.trim().toLowerCase() });
  if (ownership.length === 0) return 0;
  return db.collection("orders").countDocuments({ $or: ownership, status: { $nin: ["cancelled", "payment_failed", "pending_payment"] } });
}

/**
 * Authoritative cart quote. Prices come from the products collection, never from
 * the client. Throws only on DB failure; a bad voucher shows up in `rejected`.
 */
export async function quoteCart(params: QuoteCartParams): Promise<CartQuote> {
  const { db } = await col();
  const ids = params.items.filter((i) => ObjectId.isValid(i._id)).map((i) => new ObjectId(i._id));
  const products = ids.length
    ? await db
        .collection("products")
        .find({ _id: { $in: ids } }, { projection: { price: 1, category: 1, name: 1, image: 1, status: 1, deleted_at: 1 } })
        .toArray()
    : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const missingProductIds: string[] = [];
  const items: EngineCartItem[] = [];
  for (const item of params.items) {
    const product = byId.get(String(item._id));
    if (!product || product.deleted_at) {
      missingProductIds.push(String(item._id));
      continue;
    }
    items.push({
      productId: String(item._id),
      category: product.category ? String(product.category) : item.category,
      price: Number(product.price) || 0,
      quantity: Math.max(1, Number(item.quantity) || 1),
      name: product.name ? String(product.name) : item.name,
    });
  }

  const [promotions, deliverySettings] = await Promise.all([getLivePromotions(), getDeliverySettings()]);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = params.shippingFee ?? computeShipping(subtotal, deliverySettings);

  const limitedIds = promotions.filter((p) => p.limits.perCustomer).map((p) => String(p._id));
  const needsOrderCount = promotions.some((p) => p.conditions.firstOrderOnly);
  const [redemptionCounts, orderCount] = await Promise.all([
    customerRedemptionCounts(db, limitedIds, params.customerId, params.customerEmail),
    needsOrderCount ? customerOrderCount(db, params.customerId, params.customerEmail) : Promise.resolve(0),
  ]);

  const result = applyPromotions({
    items,
    promotions,
    voucherCode: params.voucherCode,
    redemptionCounts,
    customer: { id: params.customerId, email: params.customerEmail, orderCount },
    shippingFee,
  });

  const orderItems: OrderLineItem[] = result.lines.map((line) => ({
    _id: line.productId,
    name: line.name || "",
    quantity: line.quantity,
    price: line.unitPrice,
    original_price: line.originalPrice,
    line_discount: line.lineDiscount,
    applied_promotion_ids: line.appliedPromotionIds,
    image: String(byId.get(line.productId)?.image || ""),
  }));

  return {
    ...result,
    missingProductIds,
    deliveryPromo: isDeliveryPromoActive(deliverySettings, subtotal) || (subtotal > 0 && result.shippingDiscount > 0),
    orderItems,
  };
}

export function toOrderDiscountLines(quote: RedemptionQuote): OrderDiscountLine[] {
  return quote.applied.map((a) => ({ promotionId: a.promotionId, code: a.code || null, kind: a.kind, name: a.name, amount: a.amount }));
}

/**
 * Consume redemptions for an order: one row per applied promotion, stats bumped,
 * per-product `sold` counters advanced. Total-use limits are enforced atomically;
 * a promotion that hit its limit in the meantime is dropped from the returned list.
 */
/** Minimal shape needed to record redemptions; EngineResult satisfies it, and so does a stored order. */
export interface RedemptionQuote {
  applied: Array<{ promotionId: string; code?: string | null; kind: PromotionKind; name: string; amount: number }>;
  lines: Array<{ productId: string; quantity: number; appliedPromotionIds: string[] }>;
  total: number;
}

/** Rebuild a RedemptionQuote from an order document (Safepay fulfilment, admin un-cancel). */
export function redemptionQuoteFromOrder(order: Document): RedemptionQuote {
  const applied = Array.isArray(order.discounts)
    ? order.discounts.map((d: Document) => ({
        promotionId: String(d.promotionId),
        code: d.code ? String(d.code) : null,
        kind: d.kind as PromotionKind,
        name: String(d.name || ""),
        amount: Number(d.amount) || 0,
      }))
    : [];
  const lines = Array.isArray(order.items)
    ? order.items.map((i: Document) => ({
        productId: String(i._id),
        quantity: Number(i.quantity) || 0,
        appliedPromotionIds: Array.isArray(i.applied_promotion_ids) ? i.applied_promotion_ids.map(String) : [],
      }))
    : [];
  return { applied, lines, total: Number(order.total_amount) || 0 };
}

export async function recordRedemptions(params: {
  orderId: string;
  quote: RedemptionQuote;
  customerId?: string | null;
  customerEmail?: string | null;
}): Promise<OrderDiscountLine[]> {
  const { db, promotions, redemptions } = await col();
  const kept: OrderDiscountLine[] = [];
  const now = new Date();

  for (const a of params.quote.applied) {
    if (!ObjectId.isValid(a.promotionId)) continue;
    const res = await promotions.updateOne(
      {
        _id: new ObjectId(a.promotionId),
        $or: [
          { "limits.totalUses": { $exists: false } },
          { "limits.totalUses": null },
          { $expr: { $lt: [{ $ifNull: ["$stats.timesUsed", 0] }, "$limits.totalUses"] } },
        ],
      },
      {
        $inc: { "stats.timesUsed": 1, "stats.totalDiscountGiven": a.amount, "stats.revenue": params.quote.total },
        $set: { updatedAt: now },
      }
    );
    if (res.modifiedCount === 0) continue;

    // Advance per-product sold counters for product deals.
    if (a.kind === "product_discount" || a.kind === "flash_sale") {
      for (const line of params.quote.lines) {
        if (!line.appliedPromotionIds.includes(a.promotionId)) continue;
        await promotions.updateOne(
          { _id: new ObjectId(a.promotionId), "perProduct.productId": line.productId },
          { $inc: { "perProduct.$.sold": line.quantity } }
        );
      }
    }

    const row: Omit<PromotionRedemption, "_id"> = {
      promotionId: a.promotionId,
      orderId: params.orderId,
      customerId: params.customerId || null,
      customerEmail: params.customerEmail ? params.customerEmail.trim().toLowerCase() : null,
      code: a.code || null,
      kind: a.kind,
      amount: a.amount,
      createdAt: now.toISOString(),
    };
    await redemptions.insertOne({ ...row, createdAt: now });
    kept.push({ promotionId: a.promotionId, code: a.code || null, kind: a.kind, name: a.name, amount: a.amount });
  }

  void db;
  if (kept.length > 0) invalidatePromotionCache();
  return kept;
}

/** Undo everything recordRedemptions did for an order (cancellation). */
export async function releaseRedemptions(orderId: string): Promise<number> {
  const { promotions, redemptions, db } = await col();
  const rows = await redemptions.find({ orderId }).toArray();
  if (rows.length === 0) return 0;

  const order = ObjectId.isValid(orderId) ? await db.collection("orders").findOne({ _id: new ObjectId(orderId) }) : null;

  for (const row of rows) {
    if (!ObjectId.isValid(row.promotionId)) continue;
    await promotions.updateOne(
      { _id: new ObjectId(row.promotionId), "stats.timesUsed": { $gt: 0 } },
      {
        $inc: {
          "stats.timesUsed": -1,
          "stats.totalDiscountGiven": -Number(row.amount || 0),
          "stats.revenue": -Number(order?.total_amount || 0),
        },
      }
    );
    if ((row.kind === "product_discount" || row.kind === "flash_sale") && Array.isArray(order?.items)) {
      for (const item of order!.items) {
        const promoIds: string[] = Array.isArray(item.applied_promotion_ids) ? item.applied_promotion_ids : [];
        if (!promoIds.includes(String(row.promotionId))) continue;
        await promotions.updateOne(
          { _id: new ObjectId(row.promotionId), "perProduct.productId": String(item._id) },
          { $inc: { "perProduct.$.sold": -(Number(item.quantity) || 0) } }
        );
      }
    }
  }
  const res = await redemptions.deleteMany({ orderId });
  invalidatePromotionCache();
  return res.deletedCount;
}

export async function listRedemptions(promotionId: string, limit = 100): Promise<PromotionRedemption[]> {
  const { redemptions } = await col();
  const rows = await redemptions.find({ promotionId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map((r) => ({
    _id: String(r._id),
    promotionId: String(r.promotionId),
    orderId: String(r.orderId),
    customerId: r.customerId ? String(r.customerId) : null,
    customerEmail: r.customerEmail ? String(r.customerEmail) : null,
    code: r.code ? String(r.code) : null,
    kind: r.kind,
    amount: Number(r.amount) || 0,
    createdAt: iso(r.createdAt) || new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// collected vouchers (per user)
// ---------------------------------------------------------------------------
export async function collectVoucher(userId: string, promotionId: string): Promise<{ ok: boolean; message: string }> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(promotionId)) return { ok: false, message: "Invalid voucher" };
  const promo = await getPromotionById(promotionId);
  if (!promo || promo.kind !== "voucher" || promo.visibility !== "public") return { ok: false, message: "Voucher not available" };
  if (promo.status !== "active" && promo.status !== "scheduled") return { ok: false, message: "This voucher is no longer available" };

  const { db } = await col();
  const push = { $push: { collectedVouchers: { promotionId, collectedAt: new Date() } } } as unknown as UpdateFilter<Document>;
  const res = await db.collection("users").updateOne(
    { _id: new ObjectId(userId), "collectedVouchers.promotionId": { $ne: promotionId } },
    push
  );
  return res.modifiedCount > 0 ? { ok: true, message: "Voucher collected" } : { ok: true, message: "Already in your wallet" };
}

export interface UserVoucherView extends PublicPromotion {
  collected: boolean;
  usedByMe: number;
  collectedAt?: string;
}

/** Collected vouchers + public vouchers, with per-user usage. */
export async function getUserVouchers(params: { userId?: string | null; email?: string | null }): Promise<UserVoucherView[]> {
  const { db, promotions } = await col();
  const now = new Date();
  const user = params.userId && ObjectId.isValid(params.userId)
    ? await db.collection("users").findOne({ _id: new ObjectId(params.userId) }, { projection: { collectedVouchers: 1 } })
    : null;
  const collected = new Map<string, Date>(
    (user?.collectedVouchers || []).map((c: Document) => [String(c.promotionId), new Date(c.collectedAt)])
  );

  const collectedIds = Array.from(collected.keys()).filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const docs = await promotions
    .find({
      kind: "voucher",
      isDraft: { $ne: true },
      $or: [{ visibility: "public" }, ...(collectedIds.length ? [{ _id: { $in: collectedIds } }] : [])],
    })
    .sort({ endAt: 1 })
    .toArray();

  const list = docs.map((d) => serializePromotion(d, now));
  const counts = await customerRedemptionCounts(db, list.map((p) => String(p._id)), params.userId, params.email);

  return list.map((p) => ({
    ...toPublicPromotion(p),
    // A collected private voucher is visible to its collector.
    code: p.code,
    collected: collected.has(String(p._id)),
    collectedAt: collected.get(String(p._id))?.toISOString(),
    usedByMe: counts[String(p._id)] || 0,
  }));
}

// ---------------------------------------------------------------------------
// admin summary
// ---------------------------------------------------------------------------
export async function getPromotionSummary(): Promise<{
  active: number;
  scheduled: number;
  expired: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  revenueWithPromotions: number;
  topPromotions: Array<{ _id: string; name: string; kind: PromotionKind; timesUsed: number; totalDiscountGiven: number; revenue: number }>;
}> {
  const all = await listPromotions();
  const counts = { active: 0, scheduled: 0, expired: 0 };
  for (const p of all) if (p.status in counts) counts[p.status as keyof typeof counts] += 1;
  const totalRedemptions = all.reduce((s, p) => s + p.stats.timesUsed, 0);
  const totalDiscountGiven = all.reduce((s, p) => s + p.stats.totalDiscountGiven, 0);
  const revenueWithPromotions = all.reduce((s, p) => s + p.stats.revenue, 0);
  const topPromotions = [...all]
    .sort((a, b) => b.stats.timesUsed - a.stats.timesUsed)
    .slice(0, 5)
    .map((p) => ({ _id: String(p._id), name: p.name, kind: p.kind, ...p.stats }));
  return { ...counts, totalRedemptions, totalDiscountGiven, revenueWithPromotions, topPromotions };
}
