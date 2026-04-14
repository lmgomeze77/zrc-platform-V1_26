/**
 * update-market.js v2
 * Fetches live market data via Claude Haiku + web_search.
 * Robust JSON extraction + debug logging.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "headlines.json");

const client = new Anthropic();

function extractJSON(text) {
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(text); } catch (_) {}

  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  if (arrStart === -1 && objStart === -1) return null;

  let start = arrStart === -1 ? objStart : objStart === -1 ? arrStart : Math.min(arrStart, objStart);
  const openChar = text[start];
  const closeChar = openChar === "[" ? "]" : "}";
  let depth = 0, end = -1;

  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) depth--;
    if (depth === 0) { end = i + 1; break; }
  }

  if (end === -1) return null;
  try { return JSON.parse(text.slice(start, end)); } catch (_) { return null; }
}

async function fetchMarketData() {
  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toISOString().split("T")[1].slice(0, 5);

  console.log(`📊 Fetching live market data — ${today} ${time} UTC\n`);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: `You are a financial data terminal. Your ONLY job is to search for current market prices and return a JSON array. After searching, respond with ONLY the raw JSON array — no explanations, no preamble, no markdown fences. Just [ ... ].`,
    messages: [{
      role: "user",
      content: `Search for today's current market prices (${today}) for these 15 instruments and return ONLY a JSON array.

Each object: { "symbol": "...", "value": "...", "change": "...%", "up": true/false }

Instruments in order:
1. EUR/USD  2. IBEX 35  3. BRENT crude  4. WTI crude  5. GOLD (XAU/USD)
6. BTC/USD  7. VIX  8. US 10Y yield  9. S&P 500  10. DAX 40
11. EUR/GBP  12. DXY dollar index  13. Natural Gas  14. Copper  15. USD/CNY

IMPORTANT: After searching, your complete response must be ONLY the JSON array. Start your response with [ and end with ]. No other text.`
    }]
  });

  // Debug: log all content block types
  console.log(`   Response blocks: ${response.content.map(b => b.type).join(", ")}`);

  // Try extracting JSON from ALL text blocks
  let result = null;
  for (const block of response.content) {
    if (block.type === "text" && block.text) {
      console.log(`   Text block (${block.text.length} chars): ${block.text.substring(0, 80)}...`);
      const parsed = extractJSON(block.text);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        result = parsed;
      } else if (parsed && parsed.market_ticker) {
        result = parsed.market_ticker;
      }
    }
  }

  if (result && result.length > 0) {
    console.log(`   ✅ Got ${result.length} instruments`);
    return result;
  }

  // Fallback: concatenate ALL text and try once more
  const allText = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  console.log(`   Concatenated text (${allText.length} chars), trying extraction...`);
  const fallback = extractJSON(allText);

  if (fallback && Array.isArray(fallback) && fallback.length > 0) {
    console.log(`   ✅ Fallback extraction got ${fallback.length} instruments`);
    return fallback;
  }

  // Log what we got for debugging
  console.error(`   Raw response text:\n${allText.substring(0, 500)}`);
  throw new Error("Could not extract market data from response");
}

async function main() {
  let marketTicker;
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`   Attempt ${attempt}/${MAX_RETRIES}...`);
      marketTicker = await fetchMarketData();
      break;
    } catch (err) {
      console.error(`   ❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        console.log("   Retrying in 3s...");
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error("❌ All attempts failed. Exiting.");
        process.exit(1);
      }
    }
  }

  // Read existing headlines.json to preserve headline data
  let existing = {};
  if (existsSync(OUTPUT_FILE)) {
    try { existing = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8")); } catch (_) {}
  }

  const output = {
    ...existing,
    market_ticker: marketTicker,
    market_updated_at: new Date().toISOString(),
    generated_at: existing.generated_at || new Date().toISOString(),
    headlines: existing.headlines || [],
  };

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✅ Market ticker updated → ${OUTPUT_FILE}`);
  console.log(`   Instruments: ${marketTicker.map(m => m.symbol).join(", ")}\n`);
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
