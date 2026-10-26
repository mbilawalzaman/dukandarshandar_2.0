import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ObjectId } from 'mongodb';
const require = createRequire(import.meta.url);
const createLoader = require('./helpers/loadModule.cjs');
const orderStore = require('./helpers/orderStore.cjs');
const load = createLoader({});
const { normalizeProductVariations, cartLineKey } = load('src/lib/productVariations.ts');
const { normalizeCartItems } = load('src/lib/checkoutValidation.ts');
const id = '0123456789abcdef01234567';

test('variations require unique names and IDs, integer stock, and safe total stock', () => {
  assert.deepEqual(normalizeProductVariations([{ id: 'red', name: ' Red ', quantity: 2 }]), [{ id: 'red', name: 'Red', quantity: 2 }]);
  for (const quantity of [-1, 1.2, '2', NaN]) assert.throws(() => normalizeProductVariations([{ id: 'red', name: 'Red', quantity }]));
  assert.throws(() => normalizeProductVariations([{ id: 'red', name: 'Red', quantity: 1 }, { id: 'other', name: 'RED', quantity: 1 }]));
  assert.throws(() => normalizeProductVariations([{ id: 'red', name: 'Red', quantity: Number.MAX_SAFE_INTEGER }, { id: 'blue', name: 'Blue', quantity: 1 }]));
});

test('checkout accepts different variations but rejects duplicate variant lines and malformed variation IDs', () => {
  const items = normalizeCartItems([{ _id: id, variationId: 'red', quantity: 1 }, { _id: id, variationId: 'blue', quantity: 2 }]);
  assert.equal(items.length, 2);
  assert.notEqual(cartLineKey(items[0]), cartLineKey(items[1]));
  assert.throws(() => normalizeCartItems([...items, items[0]]));
  assert.throws(() => normalizeCartItems([{ _id: id, variationId: { $ne: '' }, quantity: 1 }]));
});

test('cart stores, updates, and removes variations independently, including buy now', () => {
  const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
  globalThis.window = { dispatchEvent() {} };
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  try {
    const cart = load('src/lib/cart.ts');
    const red = { _id: id, name: 'Shirt', price: 10, variationId: 'red', variationName: 'Red' };
    const blue = { ...red, variationId: 'blue', variationName: 'Blue' };
    cart.addToCart(red, 1, 2);
    cart.addToCart(blue, 1, 3);
    assert.equal(cart.addToCart(red, 3, 2).addedQuantity, 1);
    assert.equal(cart.getCart().length, 2);
    cart.updateCartQuantity(cartLineKey(blue), 2);
    cart.removeFromCart(cartLineKey(red));
    assert.deepEqual(cart.getCart().map(item => [item.variationId, item.quantity]), [['blue', 2]]);
    cart.setBuyNowCheckoutItem(blue, 2);
    assert.equal(cart.getBuyNowCheckoutItem().variationId, 'blue');
  } finally {
    delete globalThis.window; delete globalThis.localStorage; delete globalThis.sessionStorage;
  }
});

function inventory() {
  const store = orderStore({ products: [{ _id: new ObjectId(id), status: 'active', quantity: 5, variations: [{ id: 'red', name: 'Red', quantity: 2 }, { id: 'blue', name: 'Blue', quantity: 3 }] }] });
  const txLoad = createLoader({ '@/lib/mongodb': Promise.resolve(store.client), '@/services/promotionService': { invalidatePromotionCache() {} } });
  return { store, ...txLoad('src/lib/orderTransaction.ts') };
}

test('reservation and cancellation change the selected variations and aggregate stock together', async () => {
  const f = inventory();
  const items = [{ _id: id, variationId: 'red', quantity: 1 }, { _id: id, variationId: 'blue', quantity: 2 }];
  await f.withOrderTransaction(tx => f.reserveOrderStock(tx, items));
  assert.equal(f.store.snapshot().products[0].quantity, 2);
  assert.deepEqual(f.store.snapshot().products[0].variations.map(variation => variation.quantity), [1, 1]);
  await f.withOrderTransaction(tx => f.releaseOrderStock(tx, { stock_reserved: true, items }));
  assert.equal(f.store.snapshot().products[0].quantity, 5);
  assert.deepEqual(f.store.snapshot().products[0].variations.map(variation => variation.quantity), [2, 3]);
});

test('missing variations, invalid variations, and partial overselling roll back all changes', async () => {
  for (const items of [
    [{ _id: id, quantity: 1 }],
    [{ _id: id, variationId: 'green', quantity: 1 }],
    [{ _id: id, variationId: 'red', quantity: 1 }, { _id: id, variationId: 'blue', quantity: 4 }],
  ]) {
    const f = inventory();
    await assert.rejects(f.withOrderTransaction(tx => f.reserveOrderStock(tx, items)));
    assert.equal(f.store.snapshot().products[0].quantity, 5);
    assert.deepEqual(f.store.snapshot().products[0].variations.map(variation => variation.quantity), [2, 3]);
  }
});

test('concurrent purchases cannot oversell a variation even when other variations have stock', async () => {
  const f = inventory();
  const results = await Promise.allSettled([1, 2].map(() => f.withOrderTransaction(tx => f.reserveOrderStock(tx, [{ _id: id, variationId: 'red', quantity: 2 }]))));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.store.snapshot().products[0].quantity, 3);
  assert.equal(f.store.snapshot().products[0].variations[0].quantity, 0);
});


test('archived variations cannot be purchased and cancellation restores only their internal stock', async () => {
  const store = orderStore({ products: [{ _id: new ObjectId(id), status: 'active', quantity: 3, variations: [{ id: 'red', name: 'Red', quantity: 1, archived: true }, { id: 'blue', name: 'Blue', quantity: 3 }] }] });
  const load = createLoader({ '@/lib/mongodb': Promise.resolve(store.client), '@/services/promotionService': { invalidatePromotionCache() {} } });
  const f = load('src/lib/orderTransaction.ts');
  const items = [{ _id: id, variationId: 'red', quantity: 1 }];
  await assert.rejects(f.withOrderTransaction(tx => f.reserveOrderStock(tx, items)));
  await f.withOrderTransaction(tx => f.releaseOrderStock(tx, { stock_reserved: true, items }));
  assert.equal(store.snapshot().products[0].quantity, 3);
  assert.equal(store.snapshot().products[0].variations[0].quantity, 2);
});
