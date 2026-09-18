import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertHeadlinesDocument, assertMarketTicker } from "./headlines-schema.js";

const current = JSON.parse(readFileSync(new URL("../public/data/headlines.json", import.meta.url), "utf8"));

test("current headlines document satisfies the schema", () => {
  assert.equal(assertHeadlinesDocument(current), current);
});

test("rejects the reduced ticker previously emitted by the headlines job", () => {
  assert.throws(
    () => assertMarketTicker(current.market_ticker.slice(0, 10)),
    /must contain 15 instruments/
  );
});

test("rejects absolute changes and direction mismatches", () => {
  const ticker = structuredClone(current.market_ticker);
  ticker[0] = { ...ticker[0], change: "+0.0012", up: false };
  assert.throws(() => assertMarketTicker(ticker), /signed percentage/);
});

test("headlines-only output preserves ticker payload and timestamp", () => {
  const output = {
    ...current,
    generated_at: new Date().toISOString(),
    headlines: [{ id: 1 }],
  };
  assert.equal(assertHeadlinesDocument(output), output);
  assert.deepEqual(output.market_ticker, current.market_ticker);
  assert.equal(output.market_updated_at, current.market_updated_at);
});
