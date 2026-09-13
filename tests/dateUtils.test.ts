import { test } from "node:test";
import assert from "node:assert/strict";
import { startOfDay, endOfDay, toDateInputValue } from "../src/lib/dateUtils.ts";

test("promotion day boundaries use Pakistan time regardless of host timezone", () => {
  assert.equal(startOfDay("2026-09-30").toISOString(), "2026-09-29T19:00:00.000Z");
  assert.equal(endOfDay("2026-09-30").toISOString(), "2026-09-30T18:59:59.999Z");
  // an instant inside the PKT day snaps to that day's boundaries
  assert.equal(endOfDay(new Date("2026-09-30T18:00:00Z")).toISOString(), "2026-09-30T18:59:59.999Z");
  assert.equal(startOfDay(new Date("2026-09-29T19:30:00Z")).toISOString(), "2026-09-29T19:00:00.000Z");
});

test("stored instants round-trip to the picked calendar date in the form", () => {
  assert.equal(toDateInputValue("2026-09-29T19:00:00.000Z"), "2026-09-30");
  assert.equal(toDateInputValue("2026-09-30T18:59:59.999Z"), "2026-09-30");
  assert.equal(toDateInputValue(""), "");
});
