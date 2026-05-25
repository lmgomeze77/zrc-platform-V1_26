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
    `You are the Chief Intelligence Officer of Zenith Rise Capital, a Madrid-based institutional investment firm advising family offices, sovereign wealth funds, and institutional allocators. Your job is to produce a daily geopolitical and macro intelligence brief — 5 items — that is genuinely useful to a sophisticated investor making real allocation decisions today.

Each item must be grounded in a REAL, VERIFIABLE article published in the past 24-48 hours by one of the approved Tier-1 outlets below:

${outletList}

INTELLIGENCE FRAMEWORK — for each item produce:

1. PUBLIC LAYER (visible to all):
   - title {es, en}: sharp, specific headline. No vague language. Include a quantitative anchor where possible (e.g. "+340% YTD", "€2.3T", "127bps").
   - tag: "CRITICAL" | "ALERT" | "WATCH" | "DATA"
   - region: "MENA" | "EU" | "LATAM" | "APAC" | "AFRICA" | "GLOBAL"
   - source: outlet name (e.g. "Financial Times")
   - source_url: SPECIFIC article URL — not homepage, not section page, not live blog
   - published_at: ISO 8601 date e.g. "2026-05-06"
   - time: relative string e.g. "2h", "4h", "12h", "1d"
   - impact: "high" | "medium" | "low"
   - confidence: integer 65–100

2. MEMBER LAYER (investment analysis — only shown to registered members):
   - summary {es, en}: 2-3 sentences. What happened, precisely. Not a rephrasing of the title.
   - situation {es, en}: The deeper context. What forces produced this event and what has been building for months that this headline confirms or disrupts. 3-4 sentences.
   - investment_impact {es, en}: Which asset classes, instruments, sectors or geographies are directly exposed. Be specific — name the instrument type (e.g. "EM sovereign debt", "European energy equities", "USD/BRL", "agricultural commodity futures"). 3-4 sentences.
   - zrc_signal {es, en}: ZRC's directional view. One of: OVERWEIGHT | UNDERWEIGHT | MONITOR | HEDGE — followed by a specific rationale of 2-3 sentences. This must read as an actual investment recommendation, not generic advice.
   - signals: array of 3-5 keyword strings (e.g. ["Red Sea", "freight rates", "logistics disruption", "energy"])
   - develops_into_edition: boolean — true if this signal has enough depth, structural importance and investable thesis to warrant a full Monthly Edition report. Apply this to maximum 1-2 items per batch.
   - edition_note {es, en}: if develops_into_edition is true, write a 1-sentence pitch for the Monthly Edition piece (e.g. "The structural reshaping of European energy supply chains: who wins, who loses, and where to position."). Omit if false.

QUALITY RULES:
- Each item must map to a DIFFERENT outlet — no repeat sources in the same batch
- Prioritise signals with clear, investable consequences over general geopolitical noise
- The zrc_signal must take a position — "monitor broadly" is not acceptable
- Do not confuse what happened (summary) with why it matters (situation) with what to do (zrc_signal)
- Confidence reflects your certainty about the factual basis, not the investment view

CRITICAL: Respond with ONLY a valid JSON array. No preamble, no markdown fences, no explanation. Start with [ and end with ].`,
    `Today is ${today}. Search for and select 5 high-impact geopolitical and macro headlines from the past 24-48 hours. Each must be from a different Tier-1 outlet. Return the JSON array following the schema above exactly.`
  );

  const items = JSON.parse(raw.trim());

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Invalid response: not an array or empty");
  }

  // Validate and clean each item
  return items.map((item, i) => ({
    id: i + 1,
    tag: item.tag || "WATCH",
    region: item.region || "GLOBAL",
    title: item.title || { es: "", en: "" },
    source: item.source || "",
    source_url: item.source_url || "",
    published_at: item.published_at || today,
    time: item.time || "24h",
    impact: item.impact || "medium",
    confidence: item.confidence || 75,
    summary: item.summary || { es: "", en: "" },
    situation: item.situation || { es: "", en: "" },
    investment_impact: item.investment_impact || { es: "", en: "" },
    zrc_signal: item.zrc_signal || { es: "", en: "" },
    signals: item.signals || [],
    develops_into_edition: !!item.develops_into_edition,
    edition_note: item.edition_note || null,
  }));
}

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
