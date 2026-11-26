import assert from "node:assert/strict";
import test from "node:test";
import { saveNavigation, readNavigation, nextResourceIds, navigationHref } from "../lib/curator-navigation.ts";
function memoryStorage() { const entries = new Map(); return { getItem: (key) => entries.get(key) ?? null, setItem: (key,value) => entries.set(key,value) }; }

test("editing and saving B cannot send next back to A after the live list reorders", () => {
  const storage = memoryStorage();
  const liveOrder = ["a", "b", "c"];
  const navigation = saveNavigation(storage, "pass", liveOrder);
  assert.equal(nextResourceIds(navigation, "a")[0], "b");
  liveOrder.splice(0, liveOrder.length, "b", "a", "c");
  const restored = readNavigation(storage, "pass");
  assert.equal(nextResourceIds(restored, "b")[0], "c", "refresh must reuse the entry order, not today's updated order");
  assert.deepEqual(nextResourceIds(restored, "c"), [], "the last item never wraps back");
});
test("filtered results across pages keep their membership, order, and return query", () => {
  const storage = memoryStorage(), ids = Array.from({length:65},(_,index)=>`site-${index}`);
  const query = "block=site&status=draft&query=design&sort=title-asc&page=2";
  saveNavigation(storage, "filtered", ids, query);
  const restored = readNavigation(storage, "filtered");
  assert.equal(nextResourceIds(restored, "site-49")[0], "site-50");
  assert.equal(restored.query, query);
  assert.deepEqual(nextResourceIds(restored, "unrelated-tool"), []);
  assert.equal(navigationHref("/curator/editor/?workspace=b", restored.id), "/curator/editor/?workspace=b&nav=filtered");
});
test("missing or broken editing sessions are not silently replaced with a new order", () => {
  const storage = memoryStorage();
  assert.equal(readNavigation(storage,"missing"),null);
  storage.setItem("curator-navigation:broken", "{");
  assert.equal(readNavigation(storage,"broken"),null);
});
