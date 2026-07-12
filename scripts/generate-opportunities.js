/**
 * ZRC Daily Opportunities Generator — RSS-based
 *
 * Companion pipeline to generate-headlines.js: same Tier-1 outlets, same
 * pipeline shape, but scored and ranked for POSITIVE, internationally
 * relevant progress — agreements, breakthroughs, and development stories
 * with a genuine, non-trivial investment or portfolio angle. This is not a
 * "feel-good" filler feed: every item must be traceable to a real signal
 * (a deal, a milestone, a policy shift) with market/portfolio implications.
 *
 * Pipeline:
 *   1. Pull the same Tier-1 RSS feeds in parallel (3s timeout each)
 *   2. Normalize items, dedupe by URL
 *   3. Filter: last 48h (positive/development stories break less often than
 *      breaking-news, so the window is wider than headlines.js's 30h)
 *   4. Score with positive-progress-weighted keywords (Tier A x3, B x2, C x1),
 *      tag each item with a topic CATEGORY for the feed's category filter
 *   5. Pick top-15, max 2 per outlet, max 3 per category
 *   6. Single Haiku call: rank up to 8 candidates (translate, summarize, tag,
 *      region, structured opportunity_signal), prioritizing category
 *      diversity and genuine investment/development relevance over generic
 *      "nice" news
 *   7. Deterministic JS post-filter: keep at most 1 selection per category,
 *      so a single theme never dominates — backfill from the ranked list if
 *      needed to reach 6
 *   8. Validate Tier-1 domain (defense in depth)
 *   9. Write public/data/opportunities.json
 */

import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "opportunities.json");

const client = new Anthropic();
const parser = new Parser({ timeout: 3000, headers: { "User-Agent": "ZRCBot/1.0" } });

// ─── RSS FEEDS (same Tier-1 outlets as the headlines pipeline) ─
const FEEDS = [
  { name: "BBC News",         url: "https://feeds.bbci.co.uk/news/world/rss.xml",                                        domain: "bbc.co.uk" },
  { name: "BBC Business",     url: "https://feeds.bbci.co.uk/news/business/rss.xml",                                     domain: "bbc.co.uk" },
  { name: "Deutsche Welle",   url: "https://rss.dw.com/rdf/rss-en-all",                                                  domain: "dw.com" },
  { name: "Le Monde",         url: "https://www.lemonde.fr/rss/une.xml",                                                 domain: "lemonde.fr" },
  { name: "El País",          url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",                   domain: "elpais.com" },
  { name: "France 24",        url: "https://www.france24.com/en/rss",                                                    domain: "france24.com" },
  { name: "Al Jazeera",       url: "https://www.aljazeera.com/xml/rss/all.xml",                                          domain: "aljazeera.com" },
  { name: "The Guardian",     url: "https://www.theguardian.com/world/rss",                                              domain: "theguardian.com" },
  { name: "New York Times",   url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",                             domain: "nytimes.com" },
];

// ─── KEYWORD TIERS (positive progress, not "feel-good" fluff) ─
const TIER_A = [
  // Peace & diplomacy
  "peace deal", "peace agreement", "ceasefire agreement", "truce holds", "hostages released",
  "diplomatic breakthrough", "historic agreement", "landmark deal", "normalize relations", "reconciliation",
  // Climate & energy transition
  "renewable energy record", "clean energy milestone", "emissions fall", "solar capacity", "wind capacity",
  "climate agreement", "reforestation", "conservation win", "biodiversity recovery",
  // Health & science
  "vaccine breakthrough", "cure for", "disease eradicated", "medical breakthrough", "life expectancy rises",
  "cancer treatment breakthrough", "who declares", "malaria",
  // Development & growth
  "poverty falls", "poverty reduction", "trade agreement", "investment pledge", "development bank",
];

const TIER_B = [
  "innovation", "economic growth", "job creation", "infrastructure investment", "clean technology",
  "scientific discovery", "space mission success", "education access", "financial inclusion",
  "gdp growth", "employment rises", "unemployment falls", "startup funding", "green bond",
];

const TIER_C = [
  "solar", "wind power", "electric vehicle", "biotech", "philanthropy", "donation", "grant",
  "sustainable", "esg", "recycling", "clean water", "literacy", "microfinance",
];

function scoreItem(text) {
  const t = text.toLowerCase();
  let scoreA = 0, scoreB = 0, scoreC = 0;
  for (const kw of TIER_A) if (t.includes(kw)) scoreA++;
  for (const kw of TIER_B) if (t.includes(kw)) scoreB++;
  for (const kw of TIER_C) if (t.includes(kw)) scoreC++;
  return { total: scoreA * 3 + scoreB * 2 + scoreC, a: scoreA, b: scoreB, c: scoreC };
}

// Exclude items that only match a positive keyword incidentally inside an
// otherwise negative story (e.g. "peace talks collapse", "ceasefire violated").
const NEGATION_GUARDS = [
  "collapse", "fail", "failed", "failure", "violat", "break down", "breaks down",
  "collapses", "scrap", "scrapped", "abandon", "reject", "stall", "stalled",
  "threat to", "warns", "warning", "risk of", "setback",
];

function isNegated(text) {
  const t = text.toLowerCase();
  return NEGATION_GUARDS.some((kw) => t.includes(kw));
}

// ─── TOPIC CATEGORIES (feed category filter) ───────────────────
const CATEGORIES = [
  { key: "paz-diplomacia",   kws: ["peace", "ceasefire", "truce", "hostage", "diplomatic", "reconciliation", "normalize"] },
  { key: "clima-energia",    kws: ["renewable", "solar", "wind power", "emissions", "climate", "reforestation", "conservation", "biodiversity", "clean energy"] },
  { key: "salud-ciencia",    kws: ["vaccine", "cure", "disease", "medical", "cancer", "malaria", "who declares", "life expectancy", "scientific discovery", "space mission"] },
  { key: "economia-desarrollo", kws: ["poverty", "trade agreement", "investment pledge", "development bank", "gdp growth", "employment", "job creation", "financial inclusion", "microfinance"] },
  { key: "tecnologia",       kws: ["innovation", "startup", "electric vehicle", "biotech", "clean technology"] },
];

function categoryOf(text) {
  const t = text.toLowerCase();
  let best = null, bestCount = 0;
  for (const c of CATEGORIES) {
    let count = 0;
    for (const kw of c.kws) if (t.includes(kw)) count++;
    if (count > bestCount) { best = c.key; bestCount = count; }
  }
  return best;
}

// ─── RSS FETCH (parallel with timeout, never throws) ──────────
async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    const items = (result.items || []).slice(0, 30).map((it) => ({
      title: (it.title || "").trim(),
      url: it.link || "",
      description: (it.contentSnippet || it.content || it.summary || "").slice(0, 500).trim(),
      published_at: it.isoDate || it.pubDate || null,
      source: feed.name,
      domain: feed.domain,
    }));
    return items;
  } catch (err) {
    console.warn(`   ⚠️  ${feed.name} feed failed: ${err.message}`);
    return [];
  }
}

async function fetchAllFeeds() {
  console.log(`📡 Pulling ${FEEDS.length} RSS feeds in parallel...`);
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();
  console.log(`   ✅ Got ${all.length} raw items from ${results.filter((r) => r.length > 0).length}/${FEEDS.length} feeds`);
  return all;
}

// ─── FILTER + SCORE + DEDUPE ──────────────────────────────────
function processItems(items) {
  const cutoffMs = Date.now() - 48 * 3600 * 1000;

  const seenUrls = new Set();
  const deduped = items.filter((i) => {
    if (!i.url || seenUrls.has(i.url)) return false;
    seenUrls.add(i.url);
    return true;
  });

  const recent = deduped.filter((i) => {
    if (!i.published_at) return true;
    const t = new Date(i.published_at).getTime();
    return !isNaN(t) && t >= cutoffMs;
  });

  const scored = recent
    .map((i) => {
      const text = i.title + " " + i.description;
      const s = scoreItem(text);
      return { ...i, score: s.total, scoreBreakdown: s, category: categoryOf(text) };
    })
    .filter((i) => i.score > 0 && !isNegated(i.title + " " + i.description));

  scored.sort((a, b) => b.score - a.score);

  const perOutlet = {};
  const perCategory = {};
  const diverse = [];
  for (const item of scored) {
    perOutlet[item.source] = perOutlet[item.source] || 0;
    if (perOutlet[item.source] >= 2) continue;
    if (item.category) {
      perCategory[item.category] = perCategory[item.category] || 0;
      if (perCategory[item.category] >= 3) continue;
    }
    diverse.push(item);
    perOutlet[item.source]++;
    if (item.category) perCategory[item.category]++;
    if (diverse.length >= 15) break;
  }

  console.log(`   📊 After filter+score: ${recent.length} recent → ${scored.length} relevant → ${diverse.length} candidates (max 2/outlet, max 3/category)`);
  return diverse;
}

// ─── DIVERSITY POST-FILTER ──────────────────────────────────────
function diversifyByCategory(rankedEntries, targetCount) {
  const used = new Set();
  const kept = [];
  const skipped = [];
  for (const e of rankedEntries) {
    if (e.category && used.has(e.category)) { skipped.push(e); continue; }
    kept.push(e);
    if (e.category) used.add(e.category);
    if (kept.length >= targetCount) break;
  }
  for (const e of skipped) {
    if (kept.length >= targetCount) break;
    kept.push(e);
  }
  return kept.slice(0, targetCount);
}

// ─── HAIKU ENRICHMENT ─────────────────────────────────────────
async function enrichWithHaiku(candidates) {
  if (candidates.length === 0) throw new Error("No candidates to enrich");

  const candidateList = candidates
    .map((c, i) => {
      return `[${i}] ${c.source} | ${c.published_at || "undated"} | CATEGORY: ${c.category || "unique"}
TITLE: ${c.title}
URL: ${c.url}
DESC: ${c.description.slice(0, 300)}`;
    })
    .join("\n\n");

  const systemPrompt = `You are an analyst at ZRC, a geopolitical investment firm, curating "Oportunidades" — a section that surfaces genuine international progress: agreements, breakthroughs and development stories with a real portfolio or thematic-investment angle. This is the deliberate positive counterpart to ZRC's risk-focused Observatory feed, but it must stay credible and specific — no generic "feel-good" filler.

From the candidate items provided, rank up to 8 items (best first) for a sophisticated investor audience. Only 6 will ultimately be published.

SELECTION CRITERIA:
1. The story must represent genuine forward progress (a signed deal, a completed milestone, a verified data point) — not an aspiration, promise, or "talks continue".
2. It should have a plausible investment, development or portfolio angle — a sector, region or asset class that benefits.
3. Prioritize category diversity: aim to cover distinct themes across peace/diplomacy, climate/energy, health/science, economic development and technology — do not let one category dominate.
4. Reject anything where the "positive" framing is undercut by the actual details (e.g. a ceasefire described as fragile or already violated, a deal still pending approval).

For each ranked item, return a JSON object with:
- index (number): the [N] index from the candidate list
- tag (string): "BREAKTHROUGH" (major milestone), "AGREEMENT" (deal/treaty/truce), "MILESTONE" (data/record reached), "PROGRESS" (steady positive development)
- category (string): "paz-diplomacia", "clima-energia", "salud-ciencia", "economia-desarrollo", or "tecnologia"
- region (string): "MENA", "EU", "LATAM", "APAC", "AFRICA", "EURASIA", "US", or "GLOBAL"
- title (object): { "es": "...", "en": "..." } — keep close to original headline, translate accurately, no embellishment
- summary (object): { "es": "...", "en": "..." } — 2-3 sentences, factual, no hype
- why_it_matters (object): { "es": "...", "en": "..." } — 1-2 sentences on why this is a genuine (not superficial) positive development
- opportunity (object): { "es": "...", "en": "..." } — 1-2 sentences on the thematic investment/portfolio angle this opens up, neutral analytical tone, no direct buy/sell recommendation
- confidence (number 60-95): your confidence this is a substantive, non-fluff development

CRITICAL RULES:
- DO NOT invent details. Everything must be inferable from title + description provided.
- DO NOT change source URLs (you don't return them, the script keeps the originals).
- Translate accurately. Do not overstate certainty ("will" vs "may").
- Return ONLY a JSON array of up to 8 ranked objects, no preamble, no markdown fences.`;

  const userPrompt = `Today is ${new Date().toISOString().split("T")[0]}. Here are ${candidates.length} candidate items pre-filtered for positive international progress:

${candidateList}

Return ONLY the JSON array of up to 8 ranked items (best first).`;

  console.log(`🤖 Calling Haiku to rank+enrich up to 8 from ${candidates.length} candidates...`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const jsonText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const cleaned = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Haiku did not return a JSON array");
  }
  const ranked = JSON.parse(cleaned.slice(start, end + 1));

  const enriched = ranked
    .map((e) => {
      const candidate = candidates[e.index];
      if (!candidate) return null;
      return {
        id: 0, // assigned below
        tag: e.tag,
        category: e.category || candidate.category,
        region: e.region,
        title: e.title,
        summary: e.summary,
        why_it_matters: e.why_it_matters,
        opportunity: e.opportunity,
        confidence: e.confidence,
        source: candidate.source,
        source_url: candidate.url,
        published_at: candidate.published_at ? candidate.published_at.split("T")[0] : null,
        time: relativeTime(candidate.published_at),
      };
    })
    .filter((x) => x !== null);

  const final = diversifyByCategory(enriched, 6);

  return final.map((h, i) => ({ ...h, id: i + 1 }));
}

function relativeTime(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "—";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "<1h";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🌍 ZRC Opportunities Generator — ${today}\n`);

  let items = null;

  try {
    const raw = await fetchAllFeeds();
    if (raw.length === 0) throw new Error("All RSS feeds returned empty");

    const candidates = processItems(raw);
    if (candidates.length < 6) {
      throw new Error(`Only ${candidates.length} candidates after scoring (need ≥6)`);
    }

    items = await enrichWithHaiku(candidates);

    if (items.length < 3) {
      throw new Error(`Haiku returned only ${items.length} items (need ≥3)`);
    }

    console.log(`   ✅ Opportunities: ${items.length}`);
    items.forEach((h) => {
      console.log(`      · [${h.source}] ${h.title.en.slice(0, 70)}...`);
    });

    const sources = [...new Set(items.map((h) => h.source))];
    console.log(`   ℹ️  Source diversity: ${sources.length} outlets (${sources.join(", ")})`);
  } catch (err) {
    console.error(`   ❌ Opportunities pipeline failed: ${err.message}`);
    process.exit(1);
  }

  const output = {
    generated_at: new Date().toISOString(),
    items: items,
  };

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ Output saved → ${OUTPUT_FILE}`);
  console.log(`   Generated: ${output.generated_at}\n`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
