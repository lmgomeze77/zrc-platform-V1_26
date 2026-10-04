import test from "node:test";
import assert from "node:assert/strict";
import { calculateYearOverYearCpi, fetchGeoRiskMacroSeries, parseFredCpiCsv } from "../src/worker/georisk-macro.js";
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
    return { ok: true, text: async () => "observation_date,CPIAUCNS\n2024-02-01,100\n2025-02-01,110\n" };
  };
  const result = await fetchGeoRiskMacroSeries(fakeFetch, new Date("2026-10-04T00:00:00Z"));
  assert.equal(result.series.length, 4);
  assert.equal(result.series.find(s => s.id === "US_CPI").latest.value, 10);
  assert.deepEqual(result.series.find(s => s.id === "EU_HICP").latest, { date: "2026-09-01", value: 2.8 });
  assert.ok(calls.find(call => call.url.includes("coicop18=TOTAL") && call.url.includes("geo=EA")));
  assert.equal(result.series.find(s => s.id === "ECB_DEPOSIT_RATE").latest.value, 2);
  const fredRequest = calls.find(call => call.url.includes("fredgraph.csv"));
  assert.ok(fredRequest.url.includes("id=CPIAUCNS") && fredRequest.url.includes("cosd=2015-01-01"));
  assert.equal(fredRequest.options.method, undefined);
  assert.equal(result.series.find(s => s.id === "US_CPI").original_provider, "BLS");
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
    return { ok: true, text: async () => "observation_date,CPIAUCNS\n" };
  };
  const result = await fetchGeoRiskMacroSeries(fakeFetch, new Date("2026-10-04"));
  assert.deepEqual(result.series.find(item => item.id === "ECB_DEPOSIT_RATE").points, [{ date: "2026-10-02", value: 0 }]);
  assert.deepEqual(result.series.find(item => item.id === "EU_HICP").points, [{ date: "2026-09-01", value: 2.2 }]);
  assert.equal(result.series.find(item => item.id === "US_CPI").derived, true);
});


test("FRED CPI gaps never become inflation and malformed series fail explicitly", () => {
  const now = new Date("2026-10-04");
  assert.deepEqual(parseFredCpiCsv("DATE,CPIAUCNS\n2024-02-01,100\n2025-02-01,110\n2024-03-01,.\n2025-03-01,120\n", "CPIAUCNS", now), [{ date: "2025-02-01", value: 10 }]);
  for (const csv of ["<html>error</html>", "DATE,CPIAUCSL\n", "DATE,CPIAUCNS\n2025-01-01,0", "DATE,CPIAUCNS\n2025-01-01,-1", "DATE,CPIAUCNS\n2025-01-01,abc", "DATE,CPIAUCNS\n2025-01-01,100\n2025-01-01,101", "DATE,CPIAUCNS\n2027-01-01,100"]) {
    assert.throws(() => parseFredCpiCsv(csv, "CPIAUCNS", now));
  }
});

test("FRED failure is isolated from the three other macro sources", async () => {
  const result = await fetchGeoRiskMacroSeries(async url => {
    if (String(url).includes("fredgraph")) return { ok: false, status: 429 };
    if (String(url).includes("eurostat")) return { ok: true, json: async () => ({ dimension: { time: { category: { index: { "2026-08": 0 } } } }, value: [2.2] }) };
    return { ok: true, text: async () => "TIME_PERIOD,OBS_VALUE\n2026-10-01,2\n" };
  }, new Date("2026-10-04"));
  assert.equal(result.series.filter(s => s.status === "available").length, 3);
  assert.equal(result.series.find(s => s.id === "US_CPI").error, "FRED HTTP 429");
});

test("production CPI uses the verified asset and flags an old capture", async () => {
  const snapshot = {
    schema_version: 1, provider: "FRED", original_provider: "BLS", series: "CPIAUCNS", seasonal_adjustment: "none",
    source_captured_at: "2026-09-01T00:00:00Z", source_sha256: "a".repeat(64),
    points: [...Array.from({length:12},(_,index)=>({date:`2025-${String(index+1).padStart(2,'0')}-01`,value:100})), {date:"2026-08-01",value:110}],
  };
  const fakeFetch = async url => {
    assert.ok(!String(url).includes("fredgraph"), "production must not call the blocked FRED endpoint");
    if (String(url).includes("eurostat")) return {ok:true,json:async()=>({dimension:{time:{category:{index:{"2026-08":0}}}},value:[2.2]})};
    return {ok:true,text:async()=>"TIME_PERIOD,OBS_VALUE\n2026-10-01,2\n"};
  };
  const env = {ASSETS:{fetch:async()=>Response.json(snapshot)}};
  let result = await fetchGeoRiskMacroSeries(fakeFetch,new Date("2026-10-04"),env);
  const cpi=result.series.find(s=>s.id==="US_CPI");
  assert.equal(cpi.latest.value,10);
  assert.equal(cpi.collection_stale,true);
  assert.equal(cpi.observation_stale,false);
  snapshot.seasonal_adjustment="adjusted";
  result = await fetchGeoRiskMacroSeries(fakeFetch,new Date("2026-10-04"),env);
  assert.equal(result.series.find(s=>s.id==="US_CPI").status,"unavailable");
});
