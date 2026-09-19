import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const createLoader = require("./helpers/loadModule.cjs");

test("theme settings round-trip through the public API and reject invalid selections", async () => {
  let stored = { fee: 250, feeEnabled: true, activeThemeKey: "default" };
  const load = createLoader({
    "@/lib/auth": { requireAdmin: () => ({ ok: true, user: { userName: "admin" } }) },
    "@/lib/cloudinary": {},
    "@/lib/deliverySettings.server": {
      getDeliverySettings: async () => stored,
      updateDeliverySettings: async (input: typeof stored) => {
        stored = { ...stored, activeThemeKey: input.activeThemeKey };
        return stored;
      },
    },
  });
  const route = load("src/app/api/settings/delivery/route.ts");
  const request = (key: unknown) => new Request("http://localhost/api/settings/delivery", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activeThemeKey: key }),
  });
  for (const key of ["default", "daraz", "amazon", "ebay", "walmart", "aliexpress", "temu"]) {
    assert.equal((await (await route.PUT(request(key))).json()).settings.activeThemeKey, key);
    assert.equal((await (await route.GET()).json()).settings.activeThemeKey, key);
  }
  assert.equal((await route.PUT(request("invalid"))).status, 400);
  assert.equal(stored.activeThemeKey, "temu");
});

test("customers cannot update the active theme", async () => {
  const load = createLoader({
    "@/lib/auth": { requireAdmin: () => ({ ok: false, response: new Response(null, { status: 403 }) }) },
    "@/lib/cloudinary": {}, "@/lib/deliverySettings.server": {},
  });
  const response = await load("src/app/api/settings/delivery/route.ts").PUT(new Request("http://localhost", { method: "PUT" }));
  assert.equal(response.status, 403);
});
