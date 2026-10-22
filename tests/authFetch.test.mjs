import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

import { jwtDecode } from "jwt-decode";
import ts from "typescript";

// Execute the actual browser helper with isolated storage and a mocked network.
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/lib/authFetch.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

function token(exp) {
  return `header.${Buffer.from(JSON.stringify({ exp, role: "admin" })).toString("base64url")}.signature`;
}

function createClient({ accessToken = token(1), refreshOk = true, responses = [200] } = {}) {
  const values = new Map(accessToken === null ? [] : [["token", accessToken]]);
  const session = new Map();
  const calls = [];
  const renewed = token(Math.floor(Date.now() / 1000) + 3600);
  const exports = {};
  let requestIndex = 0;
  const storage = (map) => ({
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  });
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === "jwt-decode") return { jwtDecode };
      if (name === "@/lib/constants") return { TOKEN_COOKIE: "ds_token", REFRESH_TOKEN_COOKIE: "ds_refresh_token" };
      throw new Error(`Unexpected import: ${name}`);
    },
    window: { dispatchEvent() {}, location: { protocol: "https:" } },
    document: { cookie: "" },
    localStorage: storage(values),
    sessionStorage: storage(session),
    Event: class {}, Headers, FormData,
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (url === "/api/auth/refresh") {
        return new Response(JSON.stringify(refreshOk ? { success: true, token: renewed } : { success: false }), { status: refreshOk ? 200 : 401 });
      }
      return new Response("{}", { status: responses[requestIndex++] ?? 200 });
    },
  });
  return { api: exports, calls, renewed, values };
}

test("renews expired access and replaces a bearer header captured before refresh", async () => {
  const client = createClient();
  const body = JSON.stringify({ name: "Product", images: ["image-data"] });
  await client.api.authFetch("/api/products/upload", {
    method: "POST", body,
    headers: { Authorization: "Bearer expired", "Idempotency-Key": "original-key" },
  });
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[0].url, "/api/auth/refresh");
  const request = client.calls[1].init;
  assert.equal(request.headers.get("Authorization"), `Bearer ${client.renewed}`);
  assert.equal(request.headers.get("Idempotency-Key"), "original-key");
  assert.equal(request.body, body);
  assert.equal(request.credentials, "include");
});

test("concurrent modules share one refresh", async () => {
  const client = createClient();
  await Promise.all([
    client.api.authFetch("/api/orders"),
    client.api.authFetch("/api/notifications"),
    client.api.authFetch("/api/admin/stats"),
  ]);
  assert.equal(client.calls.filter((call) => call.url === "/api/auth/refresh").length, 1);
  assert.equal(client.calls.length, 4);
});

test("retries a server 401 once with the renewed token and original body", async () => {
  const client = createClient({ accessToken: token(Math.floor(Date.now() / 1000) + 3600), responses: [401, 200] });
  const body = JSON.stringify({ orderId: "order" });
  const response = await client.api.authFetch("/api/orders", { method: "POST", body, headers: { "Idempotency-Key": "same-order" } });
  assert.equal(response.status, 200);
  assert.equal(client.calls.length, 3);
  assert.equal(client.calls[2].init.body, body);
  assert.equal(client.calls[2].init.headers.get("Authorization"), `Bearer ${client.renewed}`);
  assert.equal(client.calls[2].init.headers.get("Idempotency-Key"), "same-order");
});

test("does not loop when refreshed access is also rejected", async () => {
  const client = createClient({ accessToken: token(Math.floor(Date.now() / 1000) + 3600), responses: [401, 401] });
  const response = await client.api.authFetch("/api/orders");
  assert.equal(response.status, 401);
  assert.equal(client.calls.length, 3);
});

test("does not retry forbidden access or validation failures", async () => {
  for (const status of [400, 403]) {
    const client = createClient({ accessToken: token(Math.floor(Date.now() / 1000) + 3600), responses: [status] });
    assert.equal((await client.api.authFetch("/api/orders")).status, status);
    assert.equal(client.calls.length, 1);
  }
});

test("expired refresh credentials return the original 401", async () => {
  const client = createClient({ accessToken: token(Math.floor(Date.now() / 1000) + 3600), refreshOk: false, responses: [401] });
  assert.equal((await client.api.authFetch("/api/orders")).status, 401);
  assert.equal(client.calls.length, 2);
  assert.equal(client.values.has("token"), false);
});

test("FormData uploads retain their browser-generated multipart content type", async () => {
  const client = createClient();
  const body = new FormData();
  body.set("file", "sample");
  await client.api.authFetch("/api/admin/media/sign", { method: "POST", body });
  assert.equal(client.calls[1].init.body, body);
  assert.equal(client.calls[1].init.headers.has("Content-Type"), false);
});

test("logout prevents automatic session renewal", async () => {
  const client = createClient();
  client.api.clearClientAuth();
  await client.api.authFetch("/api/orders", { headers: { Authorization: "Bearer stale" } });
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].init.headers.has("Authorization"), false);
});
