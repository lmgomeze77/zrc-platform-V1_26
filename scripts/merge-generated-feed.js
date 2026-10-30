/**
 * Reapply one generated section on top of the latest public feed.
 *
 * This prevents the market and headlines workflows from overwriting each other
 * when both update public/data/headlines.json concurrently.
 *
 * Usage:
 *   node scripts/merge-generated-feed.js <generated-json> headlines|market
 */

import { readFileSync, writeFileSync } from "node:fs";
import { assertHeadlinesDocument, assertMarketTicker } from "./headlines-schema.js";

const [, , generatedPath, section] = process.argv;
const targetPath = "public/data/headlines.json";

if (!generatedPath || !["headlines", "market"].includes(section)) {
  throw new Error("Usage: merge-generated-feed.js <generated-json> headlines|market");
}

const latest = JSON.parse(readFileSync(targetPath, "utf8"));
const generated = JSON.parse(readFileSync(generatedPath, "utf8"));
let merged;

if (section === "headlines") {
  if (!Array.isArray(generated.headlines) || generated.headlines.length < 3) {
    throw new Error("Generated payload does not contain at least 3 headlines");
  }
  if (!generated.generated_at || Number.isNaN(Date.parse(generated.generated_at))) {
    throw new Error("Generated payload has an invalid generated_at");
  }

  merged = {
    ...latest,
    generated_at: generated.generated_at,
    headlines: generated.headlines,
  };
} else {
  const marketTicker = assertMarketTicker(
    generated.market_ticker,
    "generated market_ticker",
  );
  if (!generated.market_updated_at || Number.isNaN(Date.parse(generated.market_updated_at))) {
    throw new Error("Generated payload has an invalid market_updated_at");
  }

  merged = {
    ...latest,
    market_ticker: marketTicker,
    market_updated_at: generated.market_updated_at,
  };
}

assertHeadlinesDocument(merged);
writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n");

console.log(
  `Merged ${section} payload onto latest feed without changing the other section`,
);
