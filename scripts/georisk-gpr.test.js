import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/worker/index.js";
import { archiveGprDataset, validateGprDataset } from "../src/worker/georisk-gpr.js";
import { storeGeoRiskMacroSeries } from "../src/worker/georisk-macro.js";

const dataset = JSON.parse(await readFile(new URL("../public/data/georisk-gpr.json", import.meta.url), "utf8"));
const now = new Date(Date.parse(dataset.source_captured_at) + 3600000);

test("official GPR snapshot preserves distinct country units, source hashes and observation dates", () => {
  const valid = validateGprDataset(dataset, new Date(Math.max(Date.now(), Date.parse(dataset.source_captured_at))));
  assert.equal(valid.series.length, 17);
  assert.ok(valid.source_files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.ok(valid.series.find(item => item.id === "GPRC_ESP").unit.includes("%"));
  assert.ok(valid.series.find(item => item.id === "GPR").unit.includes("100"));
  assert.ok(valid.series.every(item => item.latest.date === item.points.at(-1).date));
});

test("GPR rejects invented dates, invalid values, duplicates and future capture dates", () => {
  const cases = [data => { data.series[0].points[0].value = -1; },
    data => { data.series[0].points[1].date = data.series[0].points[0].date; },
    data => { data.source_captured_at = "2099-01-01"; },
    data => { data.series[0].points[0].date = "2026-99-99"; }];
  for (const mutate of cases) { const data = structuredClone(dataset); mutate(data); assert.throws(() => validateGprDataset(data, now)); }
  assert.equal(validateGprDataset(dataset, new Date(now.getTime() + 100 * 86400000)).collection_stale, true);
});

test("Worker exposes GPR source data even if archive is temporarily unavailable", async () => {
  const env = { ASSETS: { fetch: async () => Response.json(dataset) } };
  const result = await worker.fetch(new Request("https://example.com/api/georisk-gpr-data"), env, { waitUntil() {} });
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.provider, "Caldara-Iacoviello GPR");
  assert.equal(body.archive.status, "unavailable");
});

test("macro history route rejects an invalid series rather than returning a routing 404", async () => {
  const result = await worker.fetch(new Request("https://example.com/api/georisk-macro-data/history?series=invalid"), {}, {});
  assert.equal(result.status, 400);
});

function sqliteBinding() {
  const sql = new DatabaseSync(":memory:");
  const db = {
    prepare(query) {
      let parameters = [];
      return { bind(...values) { parameters = values; return this; },
        all() { return { results: sql.prepare(query).all(...parameters) }; },
        run() { return sql.prepare(query).run(...parameters); } };
    },
    batch(statements) {
      sql.exec("BEGIN IMMEDIATE");
      try { const result = statements.map(statement => statement.run()); sql.exec("COMMIT"); return result; }
      catch (error) { sql.exec("ROLLBACK"); throw error; }
    },
  };
  return { sql, db };
}

test("SQLite archive preserves first capture and writes revisions once across retries", async () => {
  const { sql, db } = sqliteBinding();
  try {
    const data = structuredClone(dataset), points = data.series.reduce((n,item) => n + item.points.length, 0);
    const first = await archiveGprDataset(db, data, now);
    assert.equal(first.new_observations, points);
    assert.equal((await archiveGprDataset(db, data, now)).new_observations, 0);
    const original = data.series[0].points[0]; original.value += 1;
    const next = new Date(now.getTime() + 86400000);
    await Promise.all([archiveGprDataset(db, data, next), archiveGprDataset(db, data, next)]);
    await archiveGprDataset(db, data, next);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM georisk_market_observations").get().n, points);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM georisk_market_revisions").get().n, 1);
    const row = sql.prepare("SELECT first_collected_at,last_revised_at,value FROM georisk_market_observations WHERE series_id='GPR' AND observation_date=?").get(original.date);
    assert.equal(row.first_collected_at, now.toISOString());
    assert.equal(row.last_revised_at, next.toISOString());
    assert.equal(row.value, original.value);
  } finally { sql.close(); }
});

test("official macro archive records corrected historical values without losing first capture", async () => {
  const { sql, db } = sqliteBinding();
  try {
    const data = { series: [{ id: "EU_HICP", provider: "Eurostat", unit: "% interanual", source_url: "https://ec.europa.eu/eurostat", status: "available", points: [{ date: "2026-09-01", value: 2.1 }] }] };
    await storeGeoRiskMacroSeries(db, data, now);
    data.series[0].points[0].value = 2.2;
    await storeGeoRiskMacroSeries(db, data, new Date(now.getTime() + 86400000));
    await storeGeoRiskMacroSeries(db, data, new Date(now.getTime() + 86400000));
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM georisk_market_revisions").get().n, 1);
    assert.equal(sql.prepare("SELECT first_collected_at FROM georisk_market_observations").get().first_collected_at, now.toISOString());
  } finally { sql.close(); }
});
