import test from "node:test";
import assert from "node:assert/strict";
import { calculateYearOverYearCpi, fetchGeoRiskMacroSeries } from "../src/worker/georisk-macro.js";

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
  assert.equal(result.series.length, 3);
  assert.equal(result.series.find(s => s.id === "US_CPI").latest.value, 10);
  assert.equal(result.series.find(s => s.id === "ECB_DEPOSIT_RATE").latest.value, 2);
  assert.ok(calls.find(call => call.options.method === "POST" && call.options.body.includes("CUUR0000SA0")));
  assert.ok(result.series.every(item => item.source_url && item.unit));
});
