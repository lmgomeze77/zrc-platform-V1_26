/**
 * ZRC Daily Intelligence Generator
 * 
 * Calls the Anthropic API with web_search to fetch:
 * 1. Real-time geopolitical/macro headlines with source URLs
 * 2. Live market ticker data (FX, indices, commodities, crypto, bonds)
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

// ─── HEADLINES GENERATION ───

const HEADLINES_SYSTEM = `You are ZRC's intelligence desk analyst. Your job is to produce a daily briefing of 5-7 geopolitical and macroeconomic headlines relevant to institutional investors.

For each headline you MUST provide:
- A bilingual title (Spanish and English)
- A bilingual summary (2-3 sentences each, in Spanish and English)
- The source name (e.g. "Reuters", "Financial Times", "Bloomberg")
- The source URL (the actual article URL you found)
- A region tag: one of MENA, EU, LATAM, APAC, AFRICA, US, GLOBAL
- A severity tag: one of CRITICAL, ALERT, MONITOR, EMERGING, STRATEGIC
- An impact level: high, medium, or low
- Signal tags: 2-4 short market impact signals like "OIL +", "EUR -", "BONDS +", "EQUITIES ?"
- A confidence score from 60 to 98
- Time since publication (approximate, like "2h", "4h", "6h", "12h", "1d")

Focus on:
1. Geopolitical events with direct investment implications
2. Central bank policy signals (ECB, Fed, BoE, BoJ)
3. Trade/tariff disruptions and supply chain shifts
4. Emerging market regulatory changes
5. Energy and commodity market movers
6. M&A and capital flow trends

Respond ONLY with valid JSON array of headlines, no markdown, no preamble. Each headline:
{
  "id": 1,
  "tag": "CRITICAL",
  "region": "MENA",
  "title": { "es": "...", "en": "..." },
  "summary": { "es": "...", "en": "..." },
  "source": "Reuters",
  "url": "https://...",
  "time": "2h",
  "impact": "high",
  "signals": ["OIL +", "SHIPPING +"],
  "confidence": 92
}`;

// ─── MARKET TICKER GENERATION ───

const MARKET_SYSTEM = `You are a financial data analyst. Search for the CURRENT market prices right now and return accurate, real-time data for the following instruments. Use web search to find the latest quotes.

Required instruments (in this exact order):
1. EUR/USD exchange rate
2. IBEX 35 index (Spain)
3. Brent Crude Oil price in USD
4. Gold (XAU/USD) price
5. Bitcoin (BTC/USD) price
6. VIX volatility index
7. US 10-Year Treasury yield
8. EUR/GBP exchange rate
9. S&P 500 index
10. DAX 40 index (Germany)

For each instrument provide:
- symbol: the ticker label (e.g. "EUR/USD", "IBEX 35", "BRENT", "GOLD", "BTC", "VIX", "US 10Y", "EUR/GBP", "S&P 500", "DAX 40")
- value: current price/level as a string with appropriate formatting (e.g. "1.0847", "13,245", "$78.32", "$3,042", "$87,412", "18.7", "4.28%", "0.8634", "5,842", "18,320")
- change: percentage or absolute daily change as string (e.g. "+0.12%", "-1.24%", "+0.03")
- up: boolean, true if positive change, false if negative

Respond ONLY with a valid JSON array, no markdown, no preamble. Example:
[
  { "symbol": "EUR/USD", "value": "1.0847", "change": "+0.12%", "up": true },
  ...
]`;

async function callClaude(systemPrompt, userPrompt) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract the final text block
  let jsonText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      jsonText = block.text;
    }
  }

  // Clean markdown fences
  jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return jsonText;
}

async function generateHeadlines(today) {
  console.log("🔍 Fetching geopolitical intelligence...");
  const raw = await callClaude(
    HEADLINES_SYSTEM,
    `Today is ${today}. Search for the latest geopolitical and macroeconomic news from the past 24 hours. Focus on events that matter to institutional investors in European and global markets. Produce 5-7 high-quality headlines with real source URLs. Respond ONLY with a JSON array of headline objects.`
  );

  let headlines;
  try {
    headlines = JSON.parse(raw);
    // Handle if wrapped in { headlines: [...] }
    if (!Array.isArray(headlines) && headlines.headlines) {
      headlines = headlines.headlines;
    }
  } catch (err) {
    console.error("❌ Failed to parse headlines JSON:", err.message);
    console.error("Raw:", raw.slice(0, 500));
    throw err;
  }

  if (!Array.isArray(headlines) || headlines.length === 0) {
    throw new Error("Empty headlines array");
  }

  return headlines.map((h, i) => ({ ...h, id: i + 1 }));
}

async function generateMarketData(today) {
  console.log("📊 Fetching live market data...");
  const raw = await callClaude(
    MARKET_SYSTEM,
    `Today is ${today}. Search for the current, real-time market prices for all the required instruments. Use web search to find the most up-to-date quotes available right now. Respond ONLY with the JSON array.`
  );

  let ticker;
  try {
    ticker = JSON.parse(raw);
    if (!Array.isArray(ticker) && ticker.market_ticker) {
      ticker = ticker.market_ticker;
    }
  } catch (err) {
    console.error("❌ Failed to parse market data JSON:", err.message);
    console.error("Raw:", raw.slice(0, 500));
    throw err;
  }

  if (!Array.isArray(ticker) || ticker.length === 0) {
    throw new Error("Empty ticker array");
  }

  return ticker;
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🏛️  ZRC Intelligence Generator — ${today}\n`);

  let headlines, marketTicker;

  // Run both in parallel for speed
  try {
    [headlines, marketTicker] = await Promise.all([
      generateHeadlines(today),
      generateMarketData(today),
    ]);
  } catch (err) {
    // If parallel fails, try sequentially
    console.warn("⚠️  Parallel fetch failed, trying sequentially...");
    try {
      headlines = await generateHeadlines(today);
    } catch (e) {
      console.error("❌ Headlines generation failed:", e.message);
      process.exit(1);
    }
    try {
      marketTicker = await generateMarketData(today);
    } catch (e) {
      console.warn("⚠️  Market data failed, using empty array");
      marketTicker = [];
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    market_ticker: marketTicker,
    headlines: headlines,
  };

  // Write output
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ Output → ${OUTPUT_FILE}`);
  console.log(`   Headlines: ${headlines.length}`);
  console.log(`   Regions: ${[...new Set(headlines.map((h) => h.region))].join(", ")}`);
  console.log(`   Market instruments: ${marketTicker.length}`);
  console.log(`   Generated at: ${output.generated_at}\n`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
