/**
 * ZRC Daily Intelligence Generator v4
 *
 * Calls the Anthropic API with web_search to fetch:
 * 1. Tier-1 sourced geopolitical/macro headlines (12 outlets across geographies)
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

// ─── TIER-1 OUTLET REGISTRY ───
// Each entry: outlet name (as appears in `source`), accepted domain suffixes
const TIER1_OUTLETS = [
  // Anglo financial (5)
  { name: "Financial Times",        domains: ["ft.com"] },
  { name: "Reuters",                domains: ["reuters.com"] },
  { name: "Bloomberg",              domains: ["bloomberg.com"] },
  { name: "Wall Street Journal",    domains: ["wsj.com"] },
  { name: "The Economist",          domains: ["economist.com"] },
  // Anglo broadsheet (3)
  { name: "New York Times",         domains: ["nytimes.com"] },
  { name: "Washington Post",        domains: ["washingtonpost.com"] },
  { name: "Politico",               domains: ["politico.com", "politico.eu"] },
  // Continental Europe (2)
  { name: "Le Monde",               domains: ["lemonde.fr"] },
  { name: "Handelsblatt",           domains: ["handelsblatt.com"] },
  // APAC specialists (2)
  { name: "Nikkei",                 domains: ["nikkei.com", "asia.nikkei.com"] },
  { name: "South China Morning Post", domains: ["scmp.com"] },
];

const TIER1_DOMAINS = TIER1_OUTLETS.flatMap((o) => o.domains);

// ─── ROBUST JSON EXTRACTOR ───
function extractJSON(text) {
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(text);
  } catch (_) {
    // ignore
  }

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

// ─── API CALL ───
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
  console.log("🔍 Fetching geopolitical intelligence (Tier-1, 12 outlets)...");

  const outletList = TIER1_OUTLETS.map(
    (o) => `- ${o.name} (${o.domains.join(" or ")})`
  ).join("\n");

  const raw = await callClaude(
    `You are a financial intelligence analyst at an institutional investment firm. Your job: search the web for today's top geopolitical and macroeconomic news and return a JSON array of headlines, each backed by a Tier-1 source.

TIER-1 SOURCES — APPROVED LIST (use ONLY these outlets, nothing else):
${outletList}

If a story is only available on aggregators (Yahoo Finance, MSN, ZeroHedge, CNBC, BBC, etc.), DISCARD it. Only include stories where you can cite one of the 12 approved outlets directly. If you cannot find an approved source for a story, do not include that story.

DIVERSITY RULE — CRITICAL:
- Aim for 5-6 headlines from at least 4 DIFFERENT outlets.
- Maximum 2 headlines from any single outlet.
- Prefer outlet diversity matching topic geography: Le Monde or Handelsblatt for European stories, Nikkei or SCMP for APAC, NYT/WaPo/Politico for US policy, FT/Reuters/Bloomberg/WSJ/Economist for global financial.

Each object in the array must have these exact fields:
- id (number, leave as 0; will be reassigned)
- tag (string: "CRITICAL", "ALERT", "MONITOR", "EMERGING", or "STRATEGIC")
- region (string: "MENA", "EU", "LATAM", "APAC", "AFRICA", "US", or "GLOBAL")
- title (object with "es" and "en" string fields)
- summary (object with "es" and "en" string fields, 2-3 sentences each, neutral analytical tone)
- source (string: exact outlet name from the approved list above)
- source_url (string: direct article URL on the outlet's domain — must be a SPECIFIC ARTICLE, not a homepage or live blog)
- published_at (string: ISO 8601 date of publication, e.g. "2026-05-01")
- time (string: relative time e.g. "2h", "4h", "12h")
- impact (string: "high", "medium", or "low")
- signals (array of strings like "OIL +", "EUR -", "EQUITIES ?")
- confidence (number 60-98)

VALIDATION CHECKLIST before returning:
1. Every source_url is on one of the approved domains
2. Every source name matches one of the 12 approved outlets exactly
3. Every published_at is within the last 48 hours
4. No two headlines share the same source_url (no duplicates)
5. At least 4 different outlets across the array

CRITICAL: Your entire response must be ONLY the JSON array — no preamble, no markdown fences, no explanations. Start with [ and end with ].`,
    `Today is ${today}. Find 5-6 high-quality headlines from the past 24-48 hours, each backed by an approved Tier-1 source. Use diverse outlets matching topic geography. Topics: macro policy (central banks, fiscal), geopolitical events with market impact, major M&A, energy/commodities, sovereign debt, FX. Return ONLY the JSON array, nothing else.`
  );

  const headlines = extractJSON(raw);
  const arr = Array.isArray(headlines) ? headlines : headlines.headlines || [];

  if (arr.length === 0) throw new Error("No headlines generated");

  // ─── Validation: domain check + dedupe ───
  const seenUrls = new Set();
  const validated = arr.filter((h) => {
    if (!h.source_url) {
      console.warn(`   ⚠️  Discarded (no source_url): ${h.source || "?"}`);
      return false;
    }
    let url;
    try {
      url = new URL(h.source_url);
    } catch (_) {
      console.warn(`   ⚠️  Discarded invalid URL: ${h.source_url}`);
      return false;
    }
    const isTier1 = TIER1_DOMAINS.some((d) => url.hostname.endsWith(d));
    if (!isTier1) {
      console.warn(`   ⚠️  Discarded non-Tier-1: ${h.source} (${url.hostname})`);
      return false;
    }
    if (seenUrls.has(h.source_url)) {
      console.warn(`   ⚠️  Discarded duplicate URL: ${h.source_url}`);
      return false;
    }
    seenUrls.add(h.source_url);
    return true;
  });

  if (validated.length === 0) {
    throw new Error("No headlines passed Tier-1 validation");
  }

  // ─── Diversity report ───
  const sourceCounts = {};
  validated.forEach((h) => {
    sourceCounts[h.source] = (sourceCounts[h.source] || 0) + 1;
  });
  const uniqueOutlets = Object.keys(sourceCounts).length;
  console.log(`   ℹ️  Diversity: ${uniqueOutlets} unique outlets`);
  if (uniqueOutlets < 3) {
    console.warn(`   ⚠️  Low diversity: only ${uniqueOutlets} outlet(s). Consider re-running.`);
  }

  return validated.map((h, i) => ({ ...h, id: i + 1 }));
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

  try {
    headlines = await generateHeadlines(today);
    console.log(`   ✅ Headlines: ${headlines.length} (Tier-1 validated)`);
    headlines.forEach((h) => console.log(`      · [${h.source}] ${h.title.en.slice(0, 70)}...`));
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
  console.log(`   Sources: ${[...new Set(headlines.map((h) => h.source))].join(", ")}`);
  console.log(`   Generated: ${output.generated_at}\n`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
