import test from "node:test";
import assert from "node:assert/strict";
import { calculateYearOverYearCpi, fetchGeoRiskMacroSeries } from "../src/worker/georisk-macro.js";
import { ensureGeoRiskMarketSchema } from "../src/worker/georisk-market-schema.js";

test("US CPI inflation compares the same month across years and skips annual rows", () => {
  const rows = [
    { year: "2025", period: "M02", value: "110" },
    { year: "2024", period: "M02", value: "100" },
    { year: "2025", period: "M13", value: "105" },
    { year: "2025", period: "M03", value: "120" },
  ];
  assert.deepEqual(calculateYearOverYearCpi(rows), [
    { date: "2025-02-01", value: 10 },
  ]);
});

test("macro feed keeps official metadata and isolates a failed source", async () => {
  const calls = [];
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("eurostat/api/dissemination")) return { ok: true, json: async () => ({
      dimension: { time: { category: { index: { "2026-08": 0, "2026-09": 1 } } } }, value: [2.4, 2.8],
    }) };
    if (String(url).includes("data-api.ecb.europa.eu")) return {
      ok: true, text: async () => "TIME_PERIOD,OBS_VALUE\n2026-10-01,2.0\n",
    };
    return {
      ok: true, json: async () => ({ status: "REQUEST_SUCCEEDED", Results: { series: [{ data: [
        { year: "2025", period: "M02", value: "110" },
        { year: "2024", period: "M02", value: "100" },
      ] }] } }),
    };
  };
  const result = await fetchGeoRiskMacroSeries(fakeFetch, new Date("2026-10-04T00:00:00Z"));
  assert.equal(result.series.length, 4);
  assert.equal(result.series.find(s => s.id === "US_CPI").latest.value, 10);
  assert.deepEqual(result.series.find(s => s.id === "EU_HICP").latest, { date: "2026-09-01", value: 2.8 });
  assert.ok(calls.find(call => call.url.includes("coicop18=TOTAL") && call.url.includes("geo=EA")));
  assert.equal(result.series.find(s => s.id === "ECB_DEPOSIT_RATE").latest.value, 2);
  assert.ok(calls.find(call => call.options.method === "POST" && call.options.body.includes("CUUR0000SA0")));
  const blsRequest = JSON.parse(calls.find(call => call.options.method === "POST").options.body);
  assert.equal(Number(blsRequest.endyear) - Number(blsRequest.startyear) + 1, 10);
  assert.ok(result.series.every(item => item.source_url && item.unit));
});


test("D1 archive bootstrap creates only missing tables and runs once per binding", async () => {
  let batchCalls = 0;
  let statements = [];
  const db = {
    prepare: sql => sql,
    batch: async sql => { batchCalls++; statements = sql; return { success: true }; },
  };
  await ensureGeoRiskMarketSchema(db);
  await ensureGeoRiskMarketSchema(db);
  assert.equal(batchCalls, 1);
  assert.equal(statements.length, 5);
  assert.ok(statements.every(sql => sql.includes("IF NOT EXISTS")));
});

test("empty official macro values remain gaps while a published zero is retained", async () => {
  const fakeFetch = async url => {
    if (String(url).includes("data-api.ecb")) return { ok: true, text: async () => "TIME_PERIOD,OBS_VALUE\n2026-10-01,\n2026-10-02,0\n" };
    if (String(url).includes("eurostat")) return { ok: true, json: async () => ({ dimension: { time: { category: { index: { "2026-08": 0, "2026-09": 1 } } } }, value: [null, 2.2] }) };
    return { ok: true, json: async () => ({ status: "REQUEST_SUCCEEDED", Results: { series: [{ data: [] }] } }) };
  };
  const result = await fetchGeoRiskMacroSeries(fakeFetch, new Date("2026-10-04"));
  assert.deepEqual(result.series.find(item => item.id === "ECB_DEPOSIT_RATE").points, [{ date: "2026-10-02", value: 0 }]);
  assert.deepEqual(result.series.find(item => item.id === "EU_HICP").points, [{ date: "2026-09-01", value: 2.2 }]);
  assert.equal(result.series.find(item => item.id === "US_CPI").derived, true);
});
