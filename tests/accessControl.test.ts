import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ObjectId } from "mongodb";
const require = createRequire(import.meta.url);
const createLoader = require("./helpers/loadModule.cjs");
const orderStore = require("./helpers/orderStore.cjs");

test("ordinary profile requests cannot mutate store branding", async () => {
  let databaseAccessed = false;
  const load = createLoader({
    "@/lib/auth": { requireAuth: () => ({ ok: true, user: { userId: String(new ObjectId()), role: "user" } }) },
    "@/lib/db": { getDb: async () => { databaseAccessed = true; throw new Error("must not run"); } },
    "@/lib/cloudinary": {}, "@/lib/session": {}, "@/lib/deliverySettings.server": {},
  });
  const response = await load("src/app/api/profile/route.ts").PUT(new Request("http://localhost/api/profile", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeLogo: "https://example.com/logo.png" }),
  }));
  assert.equal(response.status, 403);
  assert.equal(databaseAccessed, false);
});

test("partial logo updates preserve the delivery fee and enabled flag", async () => {
  const store = orderStore({ settings: [{ _id: new ObjectId(), key: "delivery", fee: 250, feeEnabled: true }] });
  const load = createLoader({ "@/lib/db": { getDb: async () => store.db } });
  const result = await load("src/lib/deliverySettings.server.ts").updateDeliverySettings({ storeLogo: "https://example.com/logo.png" }, "admin");
  assert.equal(result.fee, 250);
  assert.equal(result.feeEnabled, true);
  assert.equal(result.storeLogo, "https://example.com/logo.png");
});

test("the first public signup receives the customer role even if admin was requested", async () => {
  const store = orderStore({ users: [] });
  const load = createLoader({
    "@/lib/db": { getDb: async () => store.db }, "@/lib/session": {},
    "@/lib/firebaseConfig": {}, "@/lib/safeNotify": { safeNotify: async () => undefined },
  });
  await load("src/controllers/authController.ts").signupController("First user", "first@example.com", "test-password-only", "admin");
  assert.equal(store.snapshot().users[0].role, "user");
});

test("user detail reads explicitly project public fields", async () => {
  let options: any;
  const load = createLoader({ "@/lib/auth": {}, "@/lib/db": { getDb: async () => ({ collection: () => ({ findOne: async (_q: unknown, opts: any) => { options = opts; return null; } }) }) } });
  await load("src/controllers/userController.ts").getUserById(String(new ObjectId()));
  assert.deepEqual(options.projection, { name: 1, email: 1, role: 1, created_at: 1 });
  assert.equal(options.projection.password, undefined);
  assert.equal(options.projection.refreshTokens, undefined);
});

test("checkout request keys bind the owner and reject missing keys", () => {
  const load = createLoader({ "@/services/locationService": {} });
  const { checkoutIdentity } = load("src/lib/checkout.server.ts");
  const req = new Request("http://localhost", { headers: { "Idempotency-Key": "00000000-0000-4000-8000-000000000000" } });
  const a = checkoutIdentity(req, "owner-a", { items: [1] });
  assert.deepEqual(checkoutIdentity(req, "owner-a", { items: [1] }), a);
  assert.notEqual(checkoutIdentity(req, "owner-b", { items: [1] }).id, a.id);
  assert.notEqual(checkoutIdentity(req, "owner-a", { items: [2] }).fingerprint, a.fingerprint);
  assert.throws(() => checkoutIdentity(new Request("http://localhost"), "a", {}));
});

test("concurrent session requests and a retry after order creation call the payment provider once", async () => {
  const orderId = new ObjectId();
  const store = orderStore({ orders: [{ _id: orderId, customer_id: "owner", status: "pending_payment", payment_status: "unpaid" }] });
  let providerCalls = 0;
  const load = createLoader({
    "@/lib/db": { getDb: async () => store.db },
    "@/lib/auth": { getAuthUser: () => ({ userId: "owner", role: "user" }) },
    "@/lib/checkout.server": { checkoutIdentity: () => ({ id: String(orderId), fingerprint: "payload" }), validateShippingLocation: async () => {} },
    "@/lib/rateLimit.server": { throttleRequest: async () => null },
    "@/lib/safepayConfig": { isSafepayConfigured: () => true },
    "@/lib/safeNotify": { safeNotify: async () => {} }, "@/services/notificationService": {},
    "@/services/orderPaymentService": { OrderPaymentService: {
      getOrCreatePendingOrder: async () => ({ orderId: String(orderId), orderObjectId: orderId, totalAmount: 100, created: false }),
      attachSafepayTracker: async () => {},
    } },
    "@/services/safepayService": { SafepayService: { createCheckoutSession: async () => {
      providerCalls++; await new Promise(resolve => setTimeout(resolve, 10));
      return { tracker: "tracker", clientToken: "test-token", orderId: String(orderId), environment: "sandbox" };
    } } },
  });
  const controller = load("src/controllers/safepayController.ts").SafepayController;
  const request = () => new Request("http://localhost/api/payments/safepay/session", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      customer_name: "Buyer", customer_email: "buyer@example.com", phone: "03001234567", province: "Punjab", city: "Lahore", address: "Test address",
      items: [{ _id: String(new ObjectId()), quantity: 1 }], payment_method: "card",
    }),
  });
  const results = await Promise.all([controller.createSession(request()), controller.createSession(request())]);
  assert.deepEqual(results.map((r: Response) => r.status).sort(), [200, 409]);
  const retry = await controller.createSession(request());
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).session.clientToken, "test-token");
  assert.equal(providerCalls, 1);
});
