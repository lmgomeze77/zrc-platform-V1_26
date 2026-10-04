import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseECBHistory, handleGeoRiskMarket } from "../src/worker/georisk-market.js";

const now = new Date("2026-10-04T10:00:00Z");
const xml = `<Envelope><Cube>
  <Cube time="2026-10-02"><Cube rate="1.1225" currency="USD"/><Cube currency='GBP' rate='0.85033'/><Cube currency="CNY" rate="7.5259"/></Cube>
  <Cube time="2026-10-01"><Cube currency="USD" rate="1.12"/><Cube currency="GBP" rate="0.85"/></Cube>
  <Cube time="2020-01-01"><Cube currency="USD" rate="1.2"/></Cube>
  <Cube time="2026-10-05"><Cube currency="USD" rate="1.3"/></Cube>
</Cube></Envelope>`;

test("official observations are sorted, dated and bounded; crosses use matching dates", () => {
  const series = parseECBHistory(xml, now);
  assert.deepEqual(series[0].points, [{ date: "2026-10-01", value: 1.12 }, { date: "2026-10-02", value: 1.1225 }]);
  assert.equal(series[0].latest.date, "2026-10-02");
  assert.equal(series[0].stale, false);
  assert.equal(series[3].points.length, 1);
  assert.equal(series[3].latest.value, 7.5259 / 1.1225);
  assert.equal(series[3].derived, true);
});

test("invalid or absent rates are not manufactured; old observations are flagged", () => {
  const series = parseECBHistory(`<Cube time="2026-09-01"><Cube currency="USD" rate="1.1"/><Cube currency="CNY" rate="0"/><Cube currency="GBP" rate="oops"/></Cube>`, now);
  assert.equal(series[0].status, "stale");
  assert.equal(series[1].status, "unavailable");
  assert.equal(series[3].latest, null);
  assert.throws(() => parseECBHistory("<error>unavailable</error>", now));
});

test("duplicate dates do not add invented observations", () => {
  const series = parseECBHistory(xml + xml, now);
  assert.equal(series[0].points.length, 2);
});

test("provider failure returns an explicit error and no example prices", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: { match: async () => null } };
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    const response = await handleGeoRiskMarket(new Request("https://example.com/api/georisk-market-data"), { waitUntil() {} });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const result = await response.json();
    assert.ok(result.error);
    assert.equal(result.series, undefined);
  } finally { globalThis.fetch = originalFetch; globalThis.caches = originalCaches; }
});

// Optional verification of a downloaded official XML, without requiring network in CI.
if (process.env.ECB_HISTORY_FIXTURE) test("downloaded ECB history has a usable daily series", async () => {
  const series = parseECBHistory(await readFile(process.env.ECB_HISTORY_FIXTURE, "utf8"));
  assert.ok(series[0].points.length > 1000);
  assert.ok(series[0].latest.value > 0);
  assert.ok(series[0].points.every(point => Number.isFinite(point.value)));
  console.log(JSON.stringify(series.map(({ id, latest, points }) => ({ id, latest, observations: points.length }))));
});
