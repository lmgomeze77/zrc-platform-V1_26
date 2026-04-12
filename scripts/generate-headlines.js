/**
 * ZRC Daily Intelligence Generator v2
 * 
 * Calls the Anthropic API with web_search to fetch:
 * 1. Real-time geopolitical/macro headlines with source URLs
 * 2. Live market ticker data
 * 
 * Output: public/data/headlines.json
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "headlines.json");

const client = new Anthropic();

// ─── ROBUST JSON EXTRACTOR ───
// Claude sometimes adds preamble text before the JSON.
// This function finds and extracts the JSON array or object.
function extractJSON(text) {
  // Remove markdown fences
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // ignore
  }

  // Find first [ or { and extract from there
  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");

  let start = -1;
  let isArray = false;

  if (arrStart === -1 && objStart === -1) {
    throw new Error("No JSON found in response");
  } else if (arrStart === -1) {
    start = objStart;
    isArray = false;
  } else if (objStart === -1) {
    start = arrStart;
    isArray = true;
  } else {
    start = Math.min(arrStart, objStart);
    isArray = arrStart < objStart;
  }

  // Find matching closing bracket
  const openChar = isArray ? "[" : "{";
  const closeChar = isArray ? "]" : "}";
  let depth = 0;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  if (end === -1) {
    throw new Error("Unbalanced JSON brackets");
  }

  const jsonStr = text.slice(start, end);
  return JSON.parse(jsonStr);
}

// ─── API CALL WITH TIMEOUT ───
async function callClaude(systemPrompt, userPrompt, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    clearTimeout(timer);

    // Extract the final text block
    let jsonText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        jsonText = block.text;
      }
    }

    return jsonText;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── HEADLINES ───
async function generateHeadlines(today) {
  console.log("🔍 Fetching geopolitical intelligence...");

  const raw = await callClaude(
    `You are a financial intelligence analyst. Search for today's top geopolitical and macroeconomic news relevant to institutional investors. Return ONLY a raw JSON array — no text before or after it, no explanations, no markdown. Just the [ ... ] array.

Each object in the array must have these exact fields:
- id (number)
- tag (string: "CRITICAL", "ALERT", "MONITOR", "EMERGING", or "STRATEGIC")
- region (string: "MENA", "EU", "LATAM", "APAC", "AFRICA", "US", or "GLOBAL")
- title (object with "es" and "en" string fields)
- summary (object with "es" and "en" string fields, 2-3 sentences each)
- source (string: news outlet name)
- url (string: article URL)
- time (string: e.g. "2h", "4h", "6h")
- impact (string: "high", "medium", or "low")
- signals (array of strings like "OIL +", "EUR -")
- confidence (number 60-98)

CRITICAL: Your entire response must be ONLY the JSON array. Do NOT write any text before or after it.`,
    `Today is ${today}. Find 5-6 real headlines from the past 24 hours. Return ONLY the JSON array, nothing else.`
  );

  const headlines = extractJSON(raw);
  const arr = Array.isArray(headlines) ? headlines : headlines.headlines || [];

  if (arr.length === 0) throw new Error("No headlines generated");

  return arr.map((h, i) => ({ ...h, id: i + 1 }));
}

// ─── MARKET DATA ───
async function generateMarketData(today) {
  console.log("📊 Fetching live market data...");

  const raw = await callClaude(
    `You are a financial data provider. Search for current market prices and return ONLY a raw JSON array — no text before or after it, no explanations, no markdown. Just the [ ... ] array.

Each object must have: symbol (string), value (string), change (string with + or -), up (boolean).

Required instruments in this order:
1. EUR/USD  2. IBEX 35  3. BRENT  4. GOLD  5. BTC  6. VIX  7. US 10Y  8. EUR/GBP  9. S&P 500  10. DAX 40

CRITICAL: Your entire response must be ONLY the JSON array. Do NOT write any text before or after it.`,
    `Today is ${today}. Search for the latest market prices right now. Return ONLY the JSON array, nothing else.`
  );

  const ticker = extractJSON(raw);
  const arr = Array.isArray(ticker) ? ticker : ticker.market_ticker || [];

  if (arr.length === 0) throw new Error("No market data generated");

  return arr;
}

// ─── MAIN ───
async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🏛️  ZRC Intelligence Generator — ${today}\n`);

  let headlines = null;
  let marketTicker = null;

  // Run sequentially to avoid overloading
  try {
    headlines = await generateHeadlines(today);
    console.log(`   ✅ Headlines: ${headlines.length}`);
  } catch (err) {
    console.error(`   ❌ Headlines failed: ${err.message}`);
    process.exit(1);
  }

  try {
    marketTicker = await generateMarketData(today);
    console.log(`   ✅ Market instruments: ${marketTicker.length}`);
  } catch (err) {
    console.warn(`   ⚠️  Market data failed: ${err.message} — using empty array`);
    marketTicker = [];
  }

  const output = {
    generated_at: new Date().toISOString(),
    market_ticker: marketTicker,
    headlines: headlines,
  };

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ Output saved → ${OUTPUT_FILE}`);
  console.log(`   Regions: ${[...new Set(headlines.map((h) => h.region))].join(", ")}`);
  console.log(`   Generated: ${output.generated_at}\n`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
