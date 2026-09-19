import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ObjectId } from "mongodb";
const require = createRequire(import.meta.url);
const createLoader = require("./helpers/loadModule.cjs");
const orderStore = require("./helpers/orderStore.cjs");
const oid = () => new ObjectId();

function fixture(options: { stock?: number; secondStock?: number; status?: string; paymentStatus?: string; reserved?: boolean; refundFails?: boolean } = {}) {
  const product = oid(), second = oid(), orderId = oid();
  const items = [{ _id: String(product), quantity: 1, name: "A", price: 100 }, ...(options.secondStock !== undefined ? [{ _id: String(second), quantity: 1, name: "B", price: 100 }] : [])];
  const store = orderStore({ products: [{ _id: product, status: "active", quantity: options.stock ?? 2, price: 100 }, { _id: second, status: "active", quantity: options.secondStock ?? 2, price: 100 }], orders: [{ _id: orderId, customer_id: "owner", customer_email: "same@example.com", items, status: options.status ?? "pending_payment", payment_status: options.paymentStatus ?? "unpaid", stock_reserved: options.reserved ?? false, payment_method: "card", safepay_tracker: "tracker", total_amount: 100, discounts: [] }] });
  let refunds = 0;
  const load = createLoader({
    "@/lib/db": { getDb: async () => store.db }, "@/lib/mongodb": Promise.resolve(store.client),
    "@/lib/mail": { sendMail: async () => ({ success: true }), getShopInbox: () => "" },
    "@/lib/emailTemplates": { orderConfirmationEmail: () => "", orderStatusEmail: () => "" },
    "@/lib/deliverySettings.server": { getDeliverySettings: async () => ({ shopName: "Test" }) },
    "@/lib/safeNotify": { safeNotify: async (fn: () => unknown) => fn() },
    "@/services/notificationService": { notifyAdmins: async () => undefined },
    "@/services/promotionService": { quoteCart: async ({ items }: any) => ({ orderItems: items, missingProductIds: [], rejected: [], applied: [], subtotal: 100, shipping: 0, total: 100, discounts: [], discountTotal: 0, voucherDiscount: 0 }), toOrderDiscountLines: () => [], invalidatePromotionCache: () => {}, recordRedemptions: async () => [], releaseRedemptions: async () => {}, redemptionQuoteFromOrder: () => ({}) },
    "@/lib/safepayConfig": { isSafepayConfigured: () => true },
    "@/services/safepayService": { SafepayService: { refundPayment: async () => { refunds++; if (options.refundFails) throw new Error("simulated timeout"); return {}; } } },
  });
  return { store, orderId: String(orderId), product, items, load, refunds: () => refunds,
    payments: load("src/services/orderPaymentService.ts").OrderPaymentService,
    cancel: load("src/services/orderCancelService.ts").cancelCustomerOrder,
  };
}

test("simultaneous and repeated success callbacks deduct stock once", async () => {
  const f = fixture();
  await Promise.all([f.payments.fulfillPaidOrder(f.orderId, "tracker"), f.payments.fulfillPaidOrder(f.orderId, "tracker")]);
  await f.payments.fulfillPaidOrder(f.orderId, "tracker");
  assert.equal(f.store.snapshot().products[0].quantity, 1);
  assert.equal(f.store.snapshot().orders[0].payment_status, "paid");
});

test("partial stock failure rolls back every deduction and records received payment for review", async () => {
  const f = fixture({ secondStock: 0 });
  await f.payments.fulfillPaidOrder(f.orderId, "tracker");
  await f.payments.fulfillPaidOrder(f.orderId, "tracker");
  assert.equal(f.store.snapshot().products[0].quantity, 2);
  assert.equal(f.store.snapshot().orders[0].status, "payment_review");
  assert.equal(f.store.snapshot().orders[0].payment_status, "paid");
});

test("COD-style stock reservation and insertion roll back together", async () => {
  const f = fixture({ secondStock: 0 });
  const { withOrderTransaction, reserveOrderStock } = f.load("src/lib/orderTransaction.ts");
  await assert.rejects(withOrderTransaction(async (tx: any) => {
    await reserveOrderStock(tx, f.items);
    await tx.db.collection("orders").insertOne({ _id: oid() }, { session: tx.session });
  }));
  assert.equal(f.store.snapshot().products[0].quantity, 2);
  assert.equal(f.store.snapshot().orders.length, 1);
});

test("simultaneous cancellation refunds and restores stock only once", async () => {
  const f = fixture({ status: "pending", paymentStatus: "paid", reserved: true, stock: 1 });
  await Promise.all([f.cancel(f.orderId, { userId: "owner" }), f.cancel(f.orderId, { userId: "owner" })]);
  await f.cancel(f.orderId, { userId: "owner" });
  assert.equal(f.refunds(), 1);
  assert.equal(f.store.snapshot().products[0].quantity, 2);
  assert.equal(f.store.snapshot().orders[0].payment_status, "refunded");
});

test("admin cancellation of unpaid online checkout does not create stock", async () => {
  const f = fixture();
  assert.equal((await f.cancel(f.orderId, { userId: "admin", role: "admin" })).success, true);
  assert.equal(f.refunds(), 0);
  assert.equal(f.store.snapshot().products[0].quantity, 2);
});

test("same email does not authorize cancellation", async () => {
  const f = fixture({ status: "pending", paymentStatus: "paid", reserved: true });
  const result = await f.cancel(f.orderId, { userId: "intruder", email: "same@example.com" });
  assert.equal(result.status, 403);
  assert.equal(f.refunds(), 0);
});

test("ambiguous refund timeout cannot cause a second refund request", async () => {
  const f = fixture({ status: "pending", paymentStatus: "paid", reserved: true, refundFails: true });
  await f.cancel(f.orderId, { userId: "owner" });
  await f.cancel(f.orderId, { userId: "owner" });
  assert.equal(f.refunds(), 1);
  assert.equal(f.store.snapshot().products[0].quantity, 2);
  assert.equal(f.store.snapshot().orders[0].refund_state, "review_required");
});

test("late success after cancellation records review without resurrecting fulfillment", async () => {
  const f = fixture({ status: "cancelled" });
  await f.payments.fulfillPaidOrder(f.orderId, "tracker");
  assert.equal(f.store.snapshot().orders[0].status, "payment_review");
  assert.equal(f.store.snapshot().products[0].quantity, 2);
});

test("failure event and replayed success cannot undo refund", async () => {
  const f = fixture({ status: "cancelled", paymentStatus: "refunded" });
  await f.payments.markPaymentFailed(f.orderId, "tracker");
  await f.payments.fulfillPaidOrder(f.orderId, "tracker");
  assert.equal(f.store.snapshot().orders[0].payment_status, "refunded");
  assert.equal(f.store.snapshot().orders[0].status, "cancelled");
  assert.equal(f.store.snapshot().products[0].quantity, 2);
});

test("webhooks cannot bind another tracker using order metadata", async () => {
  const f = fixture();
  assert.equal(await f.payments.resolveOrderIdForWebhook("unrelated", f.orderId), null);
  assert.equal(await f.payments.resolveOrderIdForWebhook("tracker", String(oid())), null);
  assert.equal(await f.payments.resolveOrderIdForWebhook("tracker", f.orderId), f.orderId);
});

test("two paid buyers competing for the final unit do not oversell", async () => {
  const f = fixture({ stock: 1 });
  const secondId = oid();
  await f.store.db.collection("orders").insertOne({ ...f.store.snapshot().orders[0], _id: secondId, safepay_tracker: "tracker-2", customer_id: "second-owner" });
  await Promise.all([f.payments.fulfillPaidOrder(f.orderId, "tracker"), f.payments.fulfillPaidOrder(String(secondId), "tracker-2")]);
  assert.equal(f.store.snapshot().products[0].quantity, 0);
  assert.equal(f.store.snapshot().orders.filter((o: any) => o.status === "pending").length, 1);
  assert.equal(f.store.snapshot().orders.filter((o: any) => o.status === "payment_review" && o.payment_status === "paid").length, 1);
});

test("a paid order awaiting stock review can be refunded without restocking unreserved items", async () => {
  const f = fixture({ status: "payment_review", paymentStatus: "paid", stock: 0 });
  const result = await f.cancel(f.orderId, { userId: "admin", role: "admin" });
  assert.equal(result.success, true);
  assert.equal(f.refunds(), 1);
  assert.equal(f.store.snapshot().products[0].quantity, 0);
  assert.equal(f.store.snapshot().orders[0].payment_status, "refunded");
});

test("pending payment creation is idempotent and does not cancel another customer's same-email checkout", async () => {
  const f = fixture();
  const id = String(oid());
  const body = { customer_name: "Second buyer", customer_email: "same@example.com", phone: "03001234567", province: "Punjab", city: "Lahore", area: "", address: "Test address", items: f.items };
  const identity = { id, fingerprint: "same-payload" };
  const results = await Promise.all([
    f.payments.getOrCreatePendingOrder(body, { userId: "second-owner" }, "card", identity),
    f.payments.getOrCreatePendingOrder(body, { userId: "second-owner" }, "card", identity),
  ]);
  assert.equal(results.filter((r: any) => r.created).length, 1);
  assert.equal(f.store.snapshot().orders.length, 2);
  assert.equal(f.store.snapshot().orders[0].status, "pending_payment");
  assert.equal(f.store.snapshot().orders[1].customer_id, "second-owner");
  await assert.rejects(f.payments.getOrCreatePendingOrder(body, { userId: "intruder" }, "card", identity));
  await assert.rejects(f.payments.getOrCreatePendingOrder(body, { userId: "second-owner" }, "card", { ...identity, fingerprint: "different-payload" }));
});
