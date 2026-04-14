/**
 * update-market.js
 * 
 * Lightweight market data updater for the ZRC platform ticker.
 * Uses Claude Haiku + web_search to fetch current prices.
 * Runs every 4 hours via GitHub Actions — cost: ~$1-2/month.
 * 
 * Updates ONLY the market_ticker in headlines.json,
 * preserving existing headlines data.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "headlines.json");

const client = new Anthropic();

// Robust JSON extractor — handles preamble text from Claude
function extractJSON(text) {
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(text); } catch (_) {}

  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  if (arrStart === -1 && objStart === -1) throw new Error("No JSON found");

  let start = arrStart === -1 ? objStart : objStart === -1 ? arrStart : Math.min(arrStart, objStart);
  const openChar = text[start];
  const closeChar = openChar === "[" ? "]" : "}";
  let depth = 0, end = -1;

  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) depth--;
    if (depth === 0) { end = i + 1; break; }
  }

  if (end === -1) throw new Error("Unbalanced JSON");
  return JSON.parse(text.slice(start, end));
}

async function fetchMarketData() {
  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toISOString().split("T")[1].slice(0, 5);

  console.log(`📊 Fetching live market data — ${today} ${time} UTC\n`);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: `You are a financial data terminal. Search for CURRENT market prices and return accurate data. Respond ONLY with a raw JSON array — no text before or after, no markdown. Just the [ ... ] array.

Each object must have exactly these fields:
- symbol (string): ticker label
- value (string): current price with appropriate formatting
- change (string): daily change with + or - prefix  
- up (boolean): true if positive, false if negative

Required instruments IN THIS EXACT ORDER:
1. EUR/USD — current exchange rate (e.g. "1.1345")
2. IBEX 35 — Spanish index level (e.g. "12,830")
3. BRENT — Brent crude in USD (e.g. "$95.20")
4. WTI — WTI crude in USD (e.g. "$91.50")
5. GOLD — XAU/USD spot price (e.g. "$3,238")
6. BTC — Bitcoin in USD (e.g. "$81,620")
7. VIX — CBOE volatility index (e.g. "28.4")
8. US 10Y — US Treasury yield (e.g. "4.38%")
9. S&P 500 — index level (e.g. "5,268")
10. DAX 40 — German index level (e.g. "20,374")
11. EUR/GBP — exchange rate (e.g. "0.8612")
12. DXY — US Dollar Index (e.g. "100.3")
13. NAT GAS — Henry Hub or TTF in USD/EUR (e.g. "$3.42")
14. COPPER — price per lb in USD (e.g. "$4.52")
15. USD/CNY — exchange rate (e.g. "7.24")

CRITICAL: Respond with ONLY the JSON array. No other text.`,
    messages: [{
      role: "user",
      content: `Today is ${today}, time is ${time} UTC. Search for the current live market prices for ALL 15 instruments listed. Return ONLY the JSON array.`
    }]
  });

  let jsonText = "";
  for (const block of response.content) {
    if (block.type === "text") jsonText = block.text;
  }

  const ticker = extractJSON(jsonText);
  const arr = Array.isArray(ticker) ? ticker : [];

  if (arr.length === 0) throw new Error("No market data returned");

  console.log(`   ✅ Got ${arr.length} instruments`);
  return arr;
}

async function main() {
  let marketTicker;

  try {
    marketTicker = await fetchMarketData();
  } catch (err) {
    console.error(`❌ Market data fetch failed: ${err.message}`);
    process.exit(1);
  }

  // Read existing headlines.json to preserve headline data
  let existing = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
    } catch (_) {}
  }

  // Update only market_ticker and timestamp
  const output = {
    ...existing,
    market_ticker: marketTicker,
    market_updated_at: new Date().toISOString(),
    // Preserve generated_at and headlines from daily run
    generated_at: existing.generated_at || new Date().toISOString(),
    headlines: existing.headlines || [],
  };

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✅ Market ticker updated → ${OUTPUT_FILE}`);
  console.log(`   Instruments: ${marketTicker.map(m => m.symbol).join(", ")}\n`);
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
