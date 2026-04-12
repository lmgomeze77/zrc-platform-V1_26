/**
 * ZRC Daily Headlines Generator
 * 
 * Calls the Anthropic API with web_search to fetch real-time
 * geopolitical and macro news, then structures it as JSON
 * for the ZRC platform frontend.
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

const SYSTEM_PROMPT = `You are ZRC's intelligence desk analyst. Your job is to produce a daily briefing of 5-7 geopolitical and macroeconomic headlines relevant to institutional investors.

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

Respond ONLY with valid JSON, no markdown, no preamble. Use this exact structure:

{
  "generated_at": "ISO timestamp",
  "headlines": [
    {
      "id": 1,
      "tag": "CRITICAL",
      "region": "MENA",
      "title": {
        "es": "Título en español",
        "en": "Title in English"
      },
      "summary": {
        "es": "Resumen en español...",
        "en": "Summary in English..."
      },
      "source": "Reuters",
      "url": "https://www.reuters.com/...",
      "time": "2h",
      "impact": "high",
      "signals": ["OIL +", "SHIPPING +", "EUR -"],
      "confidence": 92
    }
  ]
}`;

async function generateHeadlines() {
  console.log("🔍 Fetching latest geopolitical intelligence...");

  const today = new Date().toISOString().split("T")[0];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
      },
    ],
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Search for the latest geopolitical and macroeconomic news from the past 24 hours. Focus on events that matter to institutional investors in European and global markets. Produce 5-7 high-quality headlines with real source URLs. Remember: respond ONLY with the JSON object, no other text.`,
      },
    ],
  });

  // Extract the final text block (after all tool uses)
  let jsonText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      jsonText = block.text;
    }
  }

  // Clean potential markdown fences
  jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    console.error("❌ Failed to parse JSON response:", err.message);
    console.error("Raw response:", jsonText.slice(0, 500));
    process.exit(1);
  }

  // Validate structure
  if (!data.headlines || !Array.isArray(data.headlines) || data.headlines.length === 0) {
    console.error("❌ Invalid headlines structure");
    process.exit(1);
  }

  // Ensure IDs are sequential
  data.headlines = data.headlines.map((h, i) => ({ ...h, id: i + 1 }));
  data.generated_at = new Date().toISOString();

  // Write output
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Generated ${data.headlines.length} headlines → ${OUTPUT_FILE}`);
  console.log(`   Regions: ${[...new Set(data.headlines.map((h) => h.region))].join(", ")}`);
  console.log(`   Tags: ${[...new Set(data.headlines.map((h) => h.tag))].join(", ")}`);
}

generateHeadlines().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
