/**
 * Pure promotion engine. No I/O, no framework imports: the same function prices a
 * cart on the server (authoritative, at order time) and in the browser (preview).
 *
 * Order of application:
 *   1. product-level deals (product_discount, flash_sale): best unit price per line
 *   2. bundles (buy X get Y)
 *   3. one voucher (explicit code)
 *   4. automatic free shipping
 *
 * A non-stackable promotion that wins a line blocks other item-level promotions on
 * that line; a non-stackable voucher is refused when item-level discounts exist.
 */

import type {
  Promotion,
  PromotionKind,
  PromotionScope,
  PublicPromotion,
} from "../types/apps/promotionTypes";

export type EnginePromotion = Promotion | PublicPromotion;

export interface EngineCartItem {
  productId: string;
  category?: string;
  price: number;
  quantity: number;
  name?: string;
}

export interface EngineCustomer {
  id?: string | null;
  email?: string | null;
  /** number of prior (non-cancelled) orders, for firstOrderOnly */
  orderCount?: number;
}

export interface EngineInput {
  items: EngineCartItem[];
  promotions: EnginePromotion[];
  /** voucher code typed or picked at checkout */
  voucherCode?: string | null;
  /** promotionId -> how many times this customer already redeemed it */
  redemptionCounts?: Record<string, number>;
  customer?: EngineCustomer | null;
  /** delivery fee before promotions (0 when the store already waives it) */
  shippingFee: number;
  now?: Date;
}

export type RejectionReason =
  | "invalid_code"
  | "not_started"
  | "expired"
  | "paused"
  | "draft"
  | "usage_limit"
  | "per_customer_limit"
  | "min_order"
  | "min_items"
  | "no_qualifying_items"
  | "shipping_already_free"
  | "not_stackable"
  | "first_order_only"
  | "no_discount";

export interface EngineRejection {
  promotionId: string;
  code?: string | null;
  kind: PromotionKind;
  reason: RejectionReason;
  message: string;
}

export interface EngineAppliedPromotion {
  promotionId: string;
  code?: string | null;
  kind: PromotionKind;
  name: string;
  amount: number;
  badge?: { label: string; color: string };
}

export interface EngineLine extends EngineCartItem {
  originalPrice: number;
  unitPrice: number;
  /** item-level discount for this line (product deal + bundle share) */
  lineDiscount: number;
  lineTotal: number;
  appliedPromotionIds: string[];
  badge?: { label: string; color: string };
}

export interface EngineResult {
  lines: EngineLine[];
  /** sum of original prices */
  subtotal: number;
  itemDiscount: number;
  bundleDiscount: number;
  voucher: EngineAppliedPromotion | null;
  voucherDiscount: number;
  shipping: number;
  shippingDiscount: number;
  freeShippingPromotion: EngineAppliedPromotion | null;
  discountTotal: number;
  total: number;
  applied: EngineAppliedPromotion[];
  rejected: EngineRejection[];
  /** promotions that would apply if the cart grew; used for nudges */
  hints: EngineHint[];
}

export interface EngineHint {
  promotionId: string;
  kind: PromotionKind;
  name: string;
  /** rupees still needed to unlock */
  amountShort?: number;
  /** items still needed to unlock */
  itemsShort?: number;
}

const REASON_MESSAGES: Record<RejectionReason, string> = {
  invalid_code: "Invalid promo code",
  not_started: "This promotion has not started yet",
  expired: "This promotion has expired",
  paused: "This promotion is currently paused",
  draft: "This promotion is not published",
  usage_limit: "This promotion has reached its usage limit",
  per_customer_limit: "You have already used this promotion",
  min_order: "Your order does not meet the minimum amount for this promotion",
  min_items: "Your cart does not have enough qualifying items for this promotion",
  no_qualifying_items: "This promotion does not apply to any items in your cart",
  shipping_already_free: "Delivery is already free on this order",
  not_stackable: "This promotion cannot be combined with the discounts already applied",
  first_order_only: "This promotion is only valid on a first order",
  no_discount: "This promotion gives no discount on your cart",
};

function round(n: number): number {
  return Math.round(n);
}

export function promotionStatus(p: EnginePromotion, now: Date = new Date()): Promotion["status"] {
  if ("isDraft" in p && p.isDraft) return "draft";
  if ("isPaused" in p && p.isPaused) return "paused";
  if (p.endAt && new Date(p.endAt) < now) return "expired";
  if (p.startAt && new Date(p.startAt) > now) return "scheduled";
  return "active";
}

export function itemMatchesScope(item: EngineCartItem, scope: PromotionScope | undefined): boolean {
  if (!scope || scope.type === "all") return true;
  if (scope.type === "categories") {
    if (!scope.categories?.length || !item.category) return false;
    const wanted = new Set(scope.categories.map((c) => c.toLowerCase()));
    return wanted.has(item.category.toLowerCase());
  }
  if (scope.type === "products") {
    if (!scope.productIds?.length) return false;
    return scope.productIds.includes(item.productId);
  }
  return false;
}

/** Sale price a product deal gives for a single unit, or null when it does not apply. */
export function productDealUnitPrice(p: EnginePromotion, item: EngineCartItem): number | null {
  if (p.kind !== "product_discount" && p.kind !== "flash_sale") return null;

  const deal = p.perProduct?.find((d) => d.productId === item.productId);
  if (deal) {
    if (deal.stockLimit !== undefined && deal.sold >= deal.stockLimit) return null;
    return Math.max(0, Math.min(item.price, deal.salePrice));
  }

  if (!itemMatchesScope(item, p.scope)) return null;
  const reward = p.reward;
  if (reward.type === "percentage" && reward.value) {
    let off = (item.price * reward.value) / 100;
    if (reward.maxDiscount) off = Math.min(off, reward.maxDiscount);
    return Math.max(0, round(item.price - off));
  }
  if (reward.type === "fixed" && reward.value) {
    return Math.max(0, item.price - reward.value);
  }
  return null;
}

function liveCheck(p: EnginePromotion, now: Date): RejectionReason | null {
  const status = promotionStatus(p, now);
  if (status === "draft") return "draft";
  if (status === "paused") return "paused";
  if (status === "expired") return "expired";
  if (status === "scheduled") return "not_started";
  const limits = "limits" in p ? p.limits : undefined;
  const stats = "stats" in p ? p.stats : undefined;
  if (limits?.totalUses !== undefined && stats && stats.timesUsed >= limits.totalUses) return "usage_limit";
  return null;
}

function reject(p: EnginePromotion, reason: RejectionReason): EngineRejection {
  return { promotionId: String(p._id), code: p.code || null, kind: p.kind, reason, message: REASON_MESSAGES[reason] };
}

function applied(p: EnginePromotion, amount: number): EngineAppliedPromotion {
  return { promotionId: String(p._id), code: p.code || null, kind: p.kind, name: p.name, amount, badge: p.badge };
}

/** Check conditions against the qualifying lines (after item-level discounts). */
function conditionCheck(
  p: EnginePromotion,
  lines: EngineLine[],
  input: EngineInput
): { ok: true; qualifying: EngineLine[]; qualifyingTotal: number } | { ok: false; reason: RejectionReason; hint?: EngineHint } {
  const qualifying = lines.filter((l) => itemMatchesScope(l, p.scope));
  const scoped = p.scope && p.scope.type !== "all";
  if (scoped && qualifying.length === 0) return { ok: false, reason: "no_qualifying_items" };

  const qualifyingTotal = qualifying.reduce((s, l) => s + l.lineTotal, 0);
  const qualifyingQty = qualifying.reduce((s, l) => s + l.quantity, 0);
  const cond = p.conditions || {};

  if (cond.firstOrderOnly && (input.customer?.orderCount || 0) > 0) return { ok: false, reason: "first_order_only" };

  if (cond.minOrderAmount && qualifyingTotal < cond.minOrderAmount) {
    return {
      ok: false,
      reason: "min_order",
      hint: { promotionId: String(p._id), kind: p.kind, name: p.name, amountShort: cond.minOrderAmount - qualifyingTotal },
    };
  }
  if (cond.minItemQuantity && qualifyingQty < cond.minItemQuantity) {
    return {
      ok: false,
      reason: "min_items",
      hint: { promotionId: String(p._id), kind: p.kind, name: p.name, itemsShort: cond.minItemQuantity - qualifyingQty },
    };
  }

  const limits = "limits" in p ? p.limits : undefined;
  const perCustomer = limits?.perCustomer;
  if (perCustomer && (input.redemptionCounts?.[String(p._id)] || 0) >= perCustomer) {
    return { ok: false, reason: "per_customer_limit" };
  }

  return { ok: true, qualifying, qualifyingTotal };
}

function rewardAmount(p: EnginePromotion, base: number): number {
  const r = p.reward;
  if (r.type === "percentage" && r.value) {
    let off = round((base * r.value) / 100);
    if (r.maxDiscount) off = Math.min(off, r.maxDiscount);
    return Math.max(0, Math.min(base, off));
  }
  if (r.type === "fixed" && r.value) return Math.max(0, Math.min(base, r.value));
  return 0;
}

export function applyPromotions(input: EngineInput): EngineResult {
  const now = input.now || new Date();
  const rejected: EngineRejection[] = [];
  const appliedList: EngineAppliedPromotion[] = [];
  const hints: EngineHint[] = [];

  const byPriority = [...input.promotions].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const live = byPriority.filter((p) => {
    const reason = liveCheck(p, now);
    // Only surface rejections for things the shopper asked for (voucher codes); silent for auto promos.
    return reason === null;
  });

  // ---- 1. product-level deals -------------------------------------------------
  const lines: EngineLine[] = input.items.map((item) => {
    const originalPrice = Number(item.price) || 0;
    let unitPrice = originalPrice;
    let winner: EnginePromotion | null = null;

    for (const p of live) {
      if (p.kind !== "product_discount" && p.kind !== "flash_sale") continue;
      const candidate = productDealUnitPrice(p, item);
      if (candidate === null) continue;
      if (candidate < unitPrice || (candidate === unitPrice && winner === null)) {
        unitPrice = candidate;
        winner = p;
      }
    }

    const lineDiscount = round((originalPrice - unitPrice) * item.quantity);
    return {
      ...item,
      originalPrice,
      unitPrice,
      lineDiscount,
      lineTotal: round(unitPrice * item.quantity),
      appliedPromotionIds: winner ? [String(winner._id)] : [],
      badge: winner?.badge,
    };
  });

  // Aggregate product-level amounts per promotion.
  const itemTotals = new Map<string, number>();
  for (const l of lines) {
    for (const id of l.appliedPromotionIds) itemTotals.set(id, (itemTotals.get(id) || 0) + l.lineDiscount);
  }
  for (const p of live) {
    const amt = itemTotals.get(String(p._id));
    if (amt && amt > 0) appliedList.push(applied(p, amt));
  }
  const itemDiscount = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const hasItemDiscount = itemDiscount > 0;

  // ---- 2. bundles ---------------------------------------------------------------
  let bundleDiscount = 0;
  for (const p of live) {
    if (p.kind !== "bundle") continue;
    const r = p.reward;
    const buyQty = Math.max(1, r.buyQty || 1);
    const getQty = Math.max(1, r.getQty || 1);
    const pct = Math.min(100, Math.max(0, r.getDiscountPercent ?? 100));

    // Skip lines already discounted by a non-stackable deal.
    const eligible = lines.filter((l) => itemMatchesScope(l, p.scope) && (p.stackable || l.appliedPromotionIds.length === 0));
    if (eligible.length === 0) continue;

    const check = conditionCheck(p, eligible, input);
    if (!check.ok) {
      if (check.hint) hints.push(check.hint);
      continue;
    }

    // Expand to units, cheapest first: every (buy+get) group gives `getQty` cheapest units the discount.
    const units: { line: EngineLine; price: number }[] = [];
    for (const l of eligible) for (let i = 0; i < l.quantity; i++) units.push({ line: l, price: l.unitPrice });
    const totalUnits = units.length;
    const groups = Math.floor(totalUnits / (buyQty + getQty));
    if (groups === 0) {
      const need = buyQty + getQty - totalUnits;
      hints.push({ promotionId: String(p._id), kind: p.kind, name: p.name, itemsShort: need });
      continue;
    }
    units.sort((a, b) => a.price - b.price);
    const freeUnits = units.slice(0, groups * getQty);
    let amount = 0;
    const perLine = new Map<EngineLine, number>();
    for (const u of freeUnits) {
      const off = round((u.price * pct) / 100);
      amount += off;
      perLine.set(u.line, (perLine.get(u.line) || 0) + off);
    }
    if (amount <= 0) continue;

    for (const [line, off] of perLine) {
      line.lineDiscount += off;
      line.lineTotal -= off;
      line.appliedPromotionIds.push(String(p._id));
      if (!line.badge) line.badge = p.badge;
    }
    bundleDiscount += amount;
    appliedList.push(applied(p, amount));
  }

  const subtotal = lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const afterItems = subtotal - itemDiscount - bundleDiscount;

  // ---- 3. voucher ---------------------------------------------------------------
  let voucher: EngineAppliedPromotion | null = null;
  let voucherDiscount = 0;
  let voucherFreeShipping = false;
  const code = (input.voucherCode || "").trim().toUpperCase();
  if (code) {
    const v = input.promotions.find((p) => p.kind === "voucher" && (p.code || "").toUpperCase() === code);
    if (!v) {
      rejected.push({ promotionId: "", code, kind: "voucher", reason: "invalid_code", message: REASON_MESSAGES.invalid_code });
    } else {
      const liveReason = liveCheck(v, now);
      if (liveReason) {
        rejected.push(reject(v, liveReason));
      } else if (!v.stackable && (hasItemDiscount || bundleDiscount > 0)) {
        rejected.push(reject(v, "not_stackable"));
      } else {
        const check = conditionCheck(v, lines, input);
        if (!check.ok) {
          rejected.push(reject(v, check.reason));
        } else if (v.reward.type === "free_shipping") {
          if (input.shippingFee <= 0) rejected.push(reject(v, "shipping_already_free"));
          else {
            voucherFreeShipping = true;
            voucherDiscount = input.shippingFee;
            voucher = applied(v, voucherDiscount);
          }
        } else {
          const amt = rewardAmount(v, check.qualifyingTotal);
          if (amt <= 0) rejected.push(reject(v, "no_discount"));
          else {
            voucherDiscount = amt;
            voucher = applied(v, amt);
          }
        }
      }
    }
  }
  if (voucher) appliedList.push(voucher);

  // ---- 4. automatic free shipping ---------------------------------------------
  let shipping = input.shippingFee;
  let shippingDiscount = 0;
  let freeShippingPromotion: EngineAppliedPromotion | null = null;
  if (voucherFreeShipping) {
    shipping = 0;
    shippingDiscount = input.shippingFee;
  } else if (input.shippingFee > 0) {
    for (const p of live) {
      if (p.kind !== "free_shipping") continue;
      if (!p.stackable && (hasItemDiscount || bundleDiscount > 0 || voucher)) continue;
      const check = conditionCheck(p, lines, input);
      if (!check.ok) {
        if (check.hint) hints.push(check.hint);
        continue;
      }
      shipping = 0;
      shippingDiscount = input.shippingFee;
      freeShippingPromotion = applied(p, shippingDiscount);
      appliedList.push(freeShippingPromotion);
      break;
    }
  }

  const discountTotal = itemDiscount + bundleDiscount + voucherDiscount + (voucherFreeShipping ? 0 : shippingDiscount);
  const total = Math.max(0, afterItems - (voucherFreeShipping ? 0 : voucherDiscount) + shipping);

  return {
    lines,
    subtotal,
    itemDiscount,
    bundleDiscount,
    voucher,
    voucherDiscount,
    shipping,
    shippingDiscount,
    freeShippingPromotion,
    discountTotal,
    total,
    applied: appliedList,
    rejected,
    hints,
  };
}

/** Product-card helper: the best live deal for one product (no cart needed). */
export function bestDealForProduct(
  product: { _id: string; price: number; category?: string },
  promotions: EnginePromotion[],
  now: Date = new Date()
): { salePrice: number; promotion: EnginePromotion; percentOff: number } | null {
  const item: EngineCartItem = { productId: product._id, category: product.category, price: product.price, quantity: 1 };
  let best: { salePrice: number; promotion: EnginePromotion; percentOff: number } | null = null;
  for (const p of promotions) {
    if (liveCheck(p, now)) continue;
    const price = productDealUnitPrice(p, item);
    if (price === null || price >= product.price) continue;
    if (!best || price < best.salePrice) {
      best = { salePrice: price, promotion: p, percentOff: Math.round(((product.price - price) / product.price) * 100) };
    }
  }
  return best;
}

/** Vouchers / bundles / free-shipping promos that mention this product (for the product page strip). */
export function promotionsForProduct(
  product: { _id: string; price: number; category?: string },
  promotions: EnginePromotion[],
  now: Date = new Date()
): EnginePromotion[] {
  const item: EngineCartItem = { productId: product._id, category: product.category, price: product.price, quantity: 1 };
  return promotions.filter(
    (p) =>
      !liveCheck(p, now) &&
      (p.kind === "voucher" || p.kind === "bundle" || p.kind === "free_shipping") &&
      itemMatchesScope(item, p.scope)
  );
}
