import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCartItems, validateCheckout, isAvailableProduct } from "../src/lib/checkoutValidation.ts";
import { ownsOrder, hasReservedStock, allowedOrderTransitions } from "../src/lib/orderRules.ts";

const id = "0123456789abcdef01234567";
const body = { customer_name: "Customer", customer_email: "buyer@example.com", phone: "03001234567", province: "Punjab", city: "Lahore", address: "12 Test Street", items: [{ _id: id, quantity: 1 }], payment_method: "cod" };

test("rejects negative, zero, fractional, nonfinite, oversized and coerced quantities", () => {
  for (const quantity of [-1, 0, 0.5, NaN, Infinity, 10001, "2", null, undefined]) {
    assert.throws(() => normalizeCartItems([{ _id: id, quantity }]));
  }
  assert.throws(() => normalizeCartItems([{ _id: id, quantity: 1 }, { _id: id.toUpperCase(), quantity: 1 }]));
  assert.throws(() => normalizeCartItems([]));
  assert.throws(() => normalizeCartItems([null]));
  assert.throws(() => normalizeCartItems({}));
});

test("valid cart ignores client price and normalizes IDs without changing quantity", () => {
  assert.deepEqual(normalizeCartItems([{ _id: id.toUpperCase(), quantity: 2, price: -100, name: "Forged" }]), [{ _id: id, quantity: 2, price: 0, name: "Product" }]);
});

test("COD rejects online methods and malformed shipping fields", () => {
  assert.equal(validateCheckout(body, ["cod"]).items[0].quantity, 1);
  for (const patch of [{ payment_method: "card" }, { phone: "123" }, { address: "" }, { city: {} }, { customer_email: "invalid" }, { customer_name: " " }]) {
    assert.throws(() => validateCheckout({ ...body, ...patch }, ["cod"]));
  }
});

test("email is never an ownership fallback", () => {
  const order = { customer_id: "owner", customer_email: "shared@example.com" };
  assert.equal(ownsOrder(order, { userId: "other", role: "user" }), false);
  assert.equal(ownsOrder(order, { userId: "owner", role: "user" }), true);
  assert.equal(ownsOrder(order, { userId: "admin", role: "admin" }), true);
  assert.equal(ownsOrder({ customer_id: null }, { userId: "owner" }), false);
});

test("legacy unpaid online orders never restock and cancelled orders cannot reopen", () => {
  assert.equal(hasReservedStock({ status: "pending_payment", payment_method: "card", payment_status: "unpaid" }), false);
  assert.equal(hasReservedStock({ status: "pending", payment_method: "card", payment_status: "paid" }), true);
  assert.equal(hasReservedStock({ status: "pending", payment_method: "cod" }), true);
  assert.equal(hasReservedStock({ status: "pending", payment_method: "cod", stock_reserved: false }), false);
  assert.deepEqual(allowedOrderTransitions({ status: "cancelled" }), []);
  assert.deepEqual(allowedOrderTransitions({ status: "delivered" }), []);
  assert.deepEqual(allowedOrderTransitions({ status: "pending_payment", payment_method: "card" }), ["cancelled"]);
  assert.deepEqual(allowedOrderTransitions({ status: "payment_review", payment_status: "paid" }), ["cancelled"]);
  assert.deepEqual(allowedOrderTransitions({ status: "shipped", payment_method: "cod" }), ["delivered"]);
});

test("inactive, deleted or invalidly priced products cannot be purchased", () => {
  assert.equal(isAvailableProduct({ status: "active", price: 100 }), true);
  for (const product of [{ status: "inactive", price: 100 }, { status: "active", deleted_at: new Date(), price: 100 }, { status: "active", price: -1 }, { status: "active", price: "100" }]) assert.equal(isAvailableProduct(product), false);
});
