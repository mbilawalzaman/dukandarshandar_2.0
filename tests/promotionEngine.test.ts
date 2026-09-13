/**
 * Run with: npm run test:promotions
 * (node --experimental-strip-types --test; no bundler, so the engine uses relative imports only)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPromotions, bestDealForProduct, type EnginePromotion } from "../src/lib/promotionEngine.ts";
import type { Promotion } from "../src/types/apps/promotionTypes.ts";

const NOW = new Date("2026-09-15T12:00:00Z");

function promo(partial: Partial<Promotion> & Pick<Promotion, "_id" | "kind" | "name">): EnginePromotion {
  return {
    description: "",
    visibility: "public",
    isDraft: false,
    isPaused: false,
    startAt: "2026-09-01T00:00:00Z",
    endAt: "2026-09-30T23:59:59Z",
    scope: { type: "all" },
    conditions: {},
    reward: { type: "percentage", value: 10 },
    limits: {},
    stats: { timesUsed: 0, totalDiscountGiven: 0, revenue: 0 },
    stackable: true,
    priority: 0,
    badge: { label: "Deal", color: "#dc2626" },
    status: "active",
    ...partial,
  };
}

const items = [
  { productId: "p1", category: "Craft", price: 1000, quantity: 2 },
  { productId: "p2", category: "Pen", price: 300, quantity: 1 },
];

test("no promotions: totals are plain subtotal + shipping", () => {
  const r = applyPromotions({ items, promotions: [], shippingFee: 250, now: NOW });
  assert.equal(r.subtotal, 2300);
  assert.equal(r.total, 2550);
  assert.equal(r.applied.length, 0);
});

test("category product discount only touches matching lines", () => {
  const p = promo({ _id: "a", kind: "product_discount", name: "Craft 20%", scope: { type: "categories", categories: ["craft"] }, reward: { type: "percentage", value: 20 } });
  const r = applyPromotions({ items, promotions: [p], shippingFee: 250, now: NOW });
  assert.equal(r.lines[0].unitPrice, 800);
  assert.equal(r.lines[1].unitPrice, 300);
  assert.equal(r.itemDiscount, 400);
  assert.equal(r.total, 2300 - 400 + 250);
});

test("per-product sale price wins over percentage and respects stock limit", () => {
  const sale = promo({
    _id: "s",
    kind: "flash_sale",
    name: "Flash",
    perProduct: [{ productId: "p1", salePrice: 700, stockLimit: 5, sold: 5 }, { productId: "p2", salePrice: 200, sold: 0 }],
  });
  const pct = promo({ _id: "a", kind: "product_discount", name: "10% all", reward: { type: "percentage", value: 10 } });
  const r = applyPromotions({ items, promotions: [sale, pct], shippingFee: 0, now: NOW });
  assert.equal(r.lines[0].unitPrice, 900, "p1 sold out of flash stock, falls back to 10%");
  assert.equal(r.lines[1].unitPrice, 200, "p2 flash price beats 10%");
});

test("expired, scheduled, paused and draft promotions are ignored", () => {
  const promos = [
    promo({ _id: "e", kind: "product_discount", name: "old", endAt: "2026-09-01T00:00:00Z" }),
    promo({ _id: "f", kind: "product_discount", name: "future", startAt: "2026-10-01T00:00:00Z" }),
    promo({ _id: "p", kind: "product_discount", name: "paused", isPaused: true }),
    promo({ _id: "d", kind: "product_discount", name: "draft", isDraft: true }),
  ];
  const r = applyPromotions({ items, promotions: promos, shippingFee: 0, now: NOW });
  assert.equal(r.itemDiscount, 0);
});

test("voucher: percentage with cap, min order, invalid code", () => {
  const v = promo({ _id: "v", kind: "voucher", name: "SAVE25", code: "SAVE25", reward: { type: "percentage", value: 25, maxDiscount: 400 }, conditions: { minOrderAmount: 2000 } });
  const ok = applyPromotions({ items, promotions: [v], voucherCode: "save25", shippingFee: 250, now: NOW });
  assert.equal(ok.voucherDiscount, 400, "25% of 2300 = 575 capped to 400");
  assert.equal(ok.total, 2300 - 400 + 250);

  const small = applyPromotions({ items: [items[1]], promotions: [v], voucherCode: "SAVE25", shippingFee: 250, now: NOW });
  assert.equal(small.voucher, null);
  assert.equal(small.rejected[0].reason, "min_order");

  const bad = applyPromotions({ items, promotions: [v], voucherCode: "NOPE", shippingFee: 250, now: NOW });
  assert.equal(bad.rejected[0].reason, "invalid_code");
});

test("voucher usage and per-customer limits", () => {
  const v = promo({ _id: "v", kind: "voucher", name: "ONE", code: "ONE", reward: { type: "fixed", value: 100 }, limits: { totalUses: 10, perCustomer: 1 }, stats: { timesUsed: 10, totalDiscountGiven: 0, revenue: 0 } });
  const exhausted = applyPromotions({ items, promotions: [v], voucherCode: "ONE", shippingFee: 0, now: NOW });
  assert.equal(exhausted.rejected[0].reason, "usage_limit");

  const v2 = { ...v, stats: { timesUsed: 1, totalDiscountGiven: 0, revenue: 0 } };
  const used = applyPromotions({ items, promotions: [v2], voucherCode: "ONE", redemptionCounts: { v: 1 }, shippingFee: 0, now: NOW });
  assert.equal(used.rejected[0].reason, "per_customer_limit");

  const fresh = applyPromotions({ items, promotions: [v2], voucherCode: "ONE", shippingFee: 0, now: NOW });
  assert.equal(fresh.voucherDiscount, 100);
});

test("non-stackable voucher is refused when item discounts exist", () => {
  const deal = promo({ _id: "a", kind: "product_discount", name: "10%", reward: { type: "percentage", value: 10 } });
  const v = promo({ _id: "v", kind: "voucher", name: "X", code: "X", stackable: false, reward: { type: "fixed", value: 50 } });
  const r = applyPromotions({ items, promotions: [deal, v], voucherCode: "X", shippingFee: 0, now: NOW });
  assert.equal(r.rejected[0].reason, "not_stackable");
});

test("free shipping voucher and automatic free shipping with min items", () => {
  const auto = promo({ _id: "fs", kind: "free_shipping", name: "3+ items ship free", reward: { type: "free_shipping" }, conditions: { minItemQuantity: 3 } });
  const r = applyPromotions({ items, promotions: [auto], shippingFee: 250, now: NOW });
  assert.equal(r.shipping, 0);
  assert.equal(r.total, 2300);
  assert.equal(r.freeShippingPromotion?.promotionId, "fs");

  const short = applyPromotions({ items: [items[1]], promotions: [auto], shippingFee: 250, now: NOW });
  assert.equal(short.shipping, 250);
  assert.equal(short.hints[0].itemsShort, 2);

  const v = promo({ _id: "v", kind: "voucher", name: "SHIP", code: "SHIP", reward: { type: "free_shipping" } });
  const alreadyFree = applyPromotions({ items, promotions: [v], voucherCode: "SHIP", shippingFee: 0, now: NOW });
  assert.equal(alreadyFree.rejected[0].reason, "shipping_already_free");
  const shipV = applyPromotions({ items, promotions: [v], voucherCode: "SHIP", shippingFee: 250, now: NOW });
  assert.equal(shipV.shipping, 0);
  assert.equal(shipV.total, 2300);
  assert.equal(shipV.discountTotal, 250);
});

test("bundle buy 2 get 1 free discounts the cheapest unit per group", () => {
  const b = promo({ _id: "b", kind: "bundle", name: "Buy 2 Get 1", scope: { type: "categories", categories: ["Craft", "Pen"] }, reward: { type: "bundle", buyQty: 2, getQty: 1, getDiscountPercent: 100 } });
  const r = applyPromotions({ items, promotions: [b], shippingFee: 0, now: NOW });
  assert.equal(r.bundleDiscount, 300, "3 units -> one group -> cheapest (300) free");
  assert.equal(r.total, 2000);

  const half = promo({ ...b, _id: "h", reward: { type: "bundle", buyQty: 1, getQty: 1, getDiscountPercent: 50 } });
  const r2 = applyPromotions({ items: [{ productId: "p1", category: "Craft", price: 1000, quantity: 4 }], promotions: [half], shippingFee: 0, now: NOW });
  assert.equal(r2.bundleDiscount, 1000, "4 units -> 2 groups -> 2 units at 50% off");
});

test("bestDealForProduct picks the lowest live sale price", () => {
  const a = promo({ _id: "a", kind: "product_discount", name: "10%", reward: { type: "percentage", value: 10 } });
  const b = promo({ _id: "b", kind: "flash_sale", name: "Flash", perProduct: [{ productId: "p1", salePrice: 650, sold: 0 }] });
  const best = bestDealForProduct({ _id: "p1", price: 1000, category: "Craft" }, [a, b], NOW);
  assert.equal(best?.salePrice, 650);
  assert.equal(best?.percentOff, 35);
  assert.equal(bestDealForProduct({ _id: "zz", price: 100 }, [b], NOW)?.salePrice, 90);
});
