/**
 * ZRC Daily Intelligence Generator v6 — RSS-based
 *
 * Pipeline:
 *   1. Pull 10 Tier-1 RSS feeds in parallel (3s timeout each)
 *   2. Normalize items, dedupe by URL
 *   3. Filter: last 30h
 *   4. Score with geopolitical-weighted keywords (Tier A x3, B x2, C x1),
 *      tag each item with a topic CLUSTER for anti-duplication
 *   5. Pick top-15, max 2 per outlet, max 3 per cluster
 *   6. Single Haiku call: rank up to 10 candidates (translate, summarize, tag,
 *      region, structured market_impact), prioritizing topic diversity and
 *      at least one under-the-radar (non-front-page) item when available
 *   7. Deterministic JS post-filter: keep at most 1 selection per cluster,
 *      so the same underlying story (e.g. a single conflict) never produces
 *      more than one signal — backfill from the ranked list if needed to
 *      reach 6
 *   8. Validate Tier-1 domain (defense in depth)
 *   9. Write public/data/headlines.json
 */

import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "headlines.json");

const client = new Anthropic();
const parser = new Parser({ timeout: 3000, headers: { "User-Agent": "ZRCBot/1.0" } });

// ─── LLAMADA A LA API CON REINTENTOS ──────────────────────────
// Un fallo de la API dejaba el feed congelado sin señal visible: el pipeline
// hacía exit(1) y headlines.json conservaba la ultima tanda buena, que en el
// front se ve igual que una tanda fresca. Ahora se reintentan los errores
// transitorios y se distinguen los que no tienen arreglo automatico (saldo
// agotado, API key invalida) con un mensaje accionable.
const RETRYABLE_STATUS = [408, 409, 429, 500, 502, 503, 504, 529];

function classifyApiError(err) {
  const status = err?.status;
  const msg = err?.message || String(err);
  if (/credit balance/i.test(msg)) {
    return {
      retryable: false,
      hint: "SALDO AGOTADO — recarga creditos en console.anthropic.com → Plans & Billing",
    };
  }
  if (status === 401 || status === 403) {
    return {
      retryable: false,
      hint: "API key rechazada — revisa el secret ANTHROPIC_API_KEY del repositorio",
    };
  }
  // Sin status = fallo de red/timeout: merece reintento.
  return { retryable: status === undefined || RETRYABLE_STATUS.includes(status), hint: null };
}

async function callAnthropic(params, { label, attempts = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastErr = err;
      const { retryable, hint } = classifyApiError(err);
      if (hint) {
        console.error(`   ❌ ${label}: ${hint}`);
        throw new Error(hint);
      }
      if (!retryable || attempt === attempts) break;
      const waitMs = 2000 * 2 ** (attempt - 1); // 2s, 4s
      console.warn(`   ⚠️  ${label} intento ${attempt}/${attempts} fallo (${err.message}) — reintento en ${waitMs / 1000}s`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

// ─── RSS FEEDS ────────────────────────────────────────────────
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

// ─── KEYWORD TIERS ────────────────────────────────────────────
const TIER_A = [
  // Conflict & security
  "war", "conflict", "military", "nato", "missile", "drone", "ceasefire", "escalation", "troops", "naval", "strike", "warship", "deployment",
  // Strategic actors & rivalries
  "russia", "ukraine", "china", "taiwan", "iran", "israel", "north korea", "houthi", "hezbollah", "hamas", "putin", "xi jinping", "erdogan",
  // Diplomacy & international order
  "sanctions", "embargo", "treaty", "summit", "alliance", "brics", "g7", "g20", "un security council",
  // Strategic chokepoints
  "strait of hormuz", "suez", "red sea", "south china sea", "black sea", "bosporus", "panama canal", "bab el-mandeb", "taiwan strait",
  // Energy as geopolitical weapon
  "opec", "opec+", "gas pipeline", "nord stream", "lng", "energy security",
  // Tech sovereignty
  "semiconductor", "semiconductors", "chips act", "export controls", "critical minerals", "rare earths", "lithium", "cobalt", "supply chain",
];

const TIER_B = [
  // Monetary policy
  "ecb", "bce", "federal reserve", "fed", "boj", "central bank", "rate hike", "rate cut", "yield", "dedollarization",
  // Fiscal & sovereign
  "fiscal", "deficit", "sovereign debt", "imf", "downgrade", "default", "eurobond",
  // Tariffs & trade
  "tariff", "trade war", "wto", "decoupling", "friend-shoring", "reshoring",
  // Strategic FX
  "dollar", "euro", "yuan", "ruble",
];

const TIER_C = [
  // Geopolitically sensitive commodities
  "crude", "brent", "wti", "gold", "natural gas", "wheat", "uranium",
  // Strategic cross-border M&A
  "cross-border merger", "foreign investment screening", "cfius", "fdi block",
];

// Under-the-radar regions/themes: rarely front-page but geopolitically and
// macro-relevant (critical minerals supply chains, secondary conflict zones,
// transit corridors). Weighted like Tier A so they can compete for a slot
// instead of being drowned out by mega-story volume.
const TIER_UNDERREPORTED = [
  "sahel", "mali", "niger", "burkina faso", "wagner", "africa corps", "sudan",
  "drc", "congo", "cobalt", "rwanda", "m23", "mozambique", "gulf of guinea",
  "caucasus", "armenia", "azerbaijan", "nagorno-karabakh", "zangezur",
  "central asia", "kazakhstan", "uzbekistan", "arctic council",
  "cyberattack", "cyber warfare", "submarine cable", "venezuela", "maduro",
];

function scoreItem(text) {
  const t = text.toLowerCase();
  let scoreA = 0, scoreB = 0, scoreC = 0, scoreU = 0;
  for (const kw of TIER_A) if (t.includes(kw)) scoreA++;
  for (const kw of TIER_B) if (t.includes(kw)) scoreB++;
  for (const kw of TIER_C) if (t.includes(kw)) scoreC++;
  for (const kw of TIER_UNDERREPORTED) if (t.includes(kw)) scoreU++;
  return { total: scoreA * 3 + scoreB * 2 + scoreC + scoreU * 3, a: scoreA, b: scoreB, c: scoreC, u: scoreU };
}

// ─── TOPIC CLUSTERS (anti-duplication) ─────────────────────────
// Groups candidates by underlying story so the same event (e.g. a single
// conflict flare-up covered by five outlets) can't fill most of the feed.
const CLUSTERS = [
  { key: "iran-israel",         kws: ["iran", "israel", "gaza", "hormuz", "houthi", "hezbollah", "tehran", "idf", "hamas"] },
  { key: "russia-ukraine",      kws: ["russia", "ukraine", "putin", "kremlin", "donbas", "kyiv", "zelensky"] },
  { key: "china-taiwan",        kws: ["china", "taiwan", "beijing", "xi jinping", "south china sea", "taiwan strait"] },
  { key: "nato-europe-defense", kws: ["nato", "alliance", "article 5", "european defense", "bundeswehr"] },
  { key: "trade-tech",          kws: ["tariff", "trade war", "wto", "decoupling", "friend-shoring", "reshoring", "export controls", "semiconductor", "chips act"] },
  { key: "monetary-policy",     kws: ["ecb", "bce", "federal reserve", "fed", "boj", "central bank", "rate hike", "rate cut"] },
  { key: "sovereign-fiscal",    kws: ["fiscal", "deficit", "sovereign debt", "imf", "downgrade", "default", "eurobond"] },
  { key: "energy-security",     kws: ["opec", "opec+", "gas pipeline", "nord stream", "lng", "energy security"] },
  { key: "africa-minerals",     kws: ["sahel", "mali", "niger", "burkina faso", "wagner", "africa corps", "sudan", "drc", "congo", "cobalt", "rwanda", "m23", "lithium", "rare earths"] },
  { key: "caucasus-c-asia",     kws: ["caucasus", "armenia", "azerbaijan", "nagorno-karabakh", "zangezur", "central asia", "kazakhstan", "uzbekistan"] },
  { key: "latam-politics",      kws: ["venezuela", "maduro", "brazil", "selic", "argentina", "mexico"] },
];

function clusterOf(text) {
  const t = text.toLowerCase();
  let best = null, bestCount = 0;
  for (const c of CLUSTERS) {
    let count = 0;
    for (const kw of c.kws) if (t.includes(kw)) count++;
    if (count > bestCount) { best = c.key; bestCount = count; }
  }
  return best; // null if no cluster keywords matched (treated as unique topic)
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
  const cutoffMs = Date.now() - 30 * 3600 * 1000;

  // Dedupe by URL
  const seenUrls = new Set();
  const deduped = items.filter((i) => {
    if (!i.url || seenUrls.has(i.url)) return false;
    seenUrls.add(i.url);
    return true;
  });

  // Time filter (30h window)
  const recent = deduped.filter((i) => {
    if (!i.published_at) return true; // keep undated, RSS sometimes omits
    const t = new Date(i.published_at).getTime();
    return !isNaN(t) && t >= cutoffMs;
  });

  // Score everything + tag topic cluster
  const scored = recent
    .map((i) => {
      const text = i.title + " " + i.description;
      const s = scoreItem(text);
      return { ...i, score: s.total, scoreBreakdown: s, cluster: clusterOf(text) };
    })
    .filter((i) => i.score > 0); // drop items without any keyword match

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score);

  // Diversity: max 2 per outlet, max 3 per topic cluster — prevents a single
  // mega-story (e.g. one conflict covered by every outlet) from consuming
  // most of the candidate pool before it even reaches Haiku.
  const perOutlet = {};
  const perCluster = {};
  const diverse = [];
  for (const item of scored) {
    perOutlet[item.source] = perOutlet[item.source] || 0;
    if (perOutlet[item.source] >= 2) continue;
    if (item.cluster) {
      perCluster[item.cluster] = perCluster[item.cluster] || 0;
      if (perCluster[item.cluster] >= 3) continue;
    }
    diverse.push(item);
    perOutlet[item.source]++;
    if (item.cluster) perCluster[item.cluster]++;
    if (diverse.length >= 15) break;
  }

  console.log(`   📊 After filter+score: ${recent.length} recent → ${scored.length} relevant → ${diverse.length} candidates (max 2/outlet, max 3/cluster)`);
  return diverse;
}

// ─── DIVERSITY POST-FILTER (anti-duplication safeguard) ───────
// Ranked entries come back in priority order. Keep at most one per topic
// cluster (entries with no cluster are always unique) so a single dominant
// story can't consume most of the final feed. Backfill from skipped
// duplicate-cluster entries, in rank order, only if still short of target.
function diversifyByCluster(rankedEntries, targetCount) {
  const used = new Set();
  const kept = [];
  const skipped = [];
  for (const e of rankedEntries) {
    if (e.cluster && used.has(e.cluster)) { skipped.push(e); continue; }
    kept.push(e);
    if (e.cluster) used.add(e.cluster);
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
      return `[${i}] ${c.source} | ${c.published_at || "undated"} | CLUSTER: ${c.cluster || "unique"}
TITLE: ${c.title}
URL: ${c.url}
DESC: ${c.description.slice(0, 300)}`;
    })
    .join("\n\n");

  const systemPrompt = `You are an institutional intelligence analyst at ZRC, a geopolitical investment firm. From the candidate news items provided, rank up to 10 items (best first) for a sophisticated investor audience focused on GEOPOLITICAL intelligence with macro/market implications. Only 6 will ultimately be published, so your ranking order matters — the top of your list should be the 6 you would run today.

PRIORITY ORDER for selection:
1. Geopolitical events with clear market implications (conflicts, sanctions, strategic chokepoints, tech sovereignty, energy security)
2. Macro/policy events with geopolitical context (central bank divergence tied to political tensions, sovereign debt crises, tariffs)
3. Pure markets/M&A only if cross-border and strategically significant

ANTI-DUPLICATION RULE (critical): each candidate is tagged with a CLUSTER. Never rank two items from the SAME cluster back-to-back near the top — if a single story (e.g. one conflict) dominates the candidates, select only its single best/most complete item high in the ranking, then move to OTHER clusters for the rest. Do not let one underlying event fill most of the list.

DIVERSITY RULE: across your ranked list, aim to cover distinct themes — e.g. one conflict/security item, one monetary/fiscal policy item, one trade/tariffs or tech-sovereignty item — and if any candidate concerns a secondary/regional theme not covered by the mainstream mega-story clusters (e.g. Sahel, Caucasus, Central Asia, critical minerals corridors, African security, Latin American politics), include it even if its raw prominence is lower than the top headlines. Prioritize geopolitical/macro significance over mainstream prominence for these under-the-radar items.

For each ranked item, return a JSON object with:
- index (number): the [N] index from the candidate list
- tag (string): "CRITICAL" (war/sanctions/major escalation), "ALERT" (high-impact policy), "WATCH" (developing), "DATA" (significant data release)
- region (string): "MENA", "EU", "LATAM", "APAC", "AFRICA", "EURASIA", "US", or "GLOBAL"
- title (object): { "es": "...", "en": "..." } — keep close to original headline, translate accurately, no embellishment
- summary (object): { "es": "...", "en": "..." } — 2-3 sentences, neutral analytical tone, focus on portfolio/macro implications
- impact (string): "high", "medium", or "low"
- market_impact (array of 2-4 objects): structured price/macro impact, each { "asset": "Brent crude" | "EUR/USD" | "Gold" | "US 10Y Treasury" | "European equities" | "EM currencies" | etc (specific asset/instrument name), "direction": "up" | "down" | "mixed", "magnitude": "high" | "medium" | "low", "note": { "es": "...", "en": "..." } } — note is a short (<12 words) causal rationale per asset
- confidence (number 60-95): your confidence in the investment relevance

CRITICAL RULES:
- DO NOT invent details. The summary must be inferable from title + description provided.
- DO NOT change source URLs (you don't return them, the script keeps the originals).
- Translate accurately. If the headline is "X happened", do not turn it into "X may happen".
- Return ONLY a JSON array of up to 10 ranked objects, no preamble, no markdown fences.`;

  const userPrompt = `Today is ${new Date().toISOString().split("T")[0]}. Here are ${candidates.length} candidate news items pre-filtered by geopolitical relevance:

${candidateList}

Return ONLY the JSON array of up to 10 ranked items (best first).`;

  console.log(`🤖 Calling Sonnet to rank+enrich up to 10 from ${candidates.length} candidates...`);

  const response = await callAnthropic(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 4500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    },
    { label: "ranking de titulares" }
  );

  // Concatenate all text blocks
  const jsonText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Extract JSON
  const cleaned = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Haiku did not return a JSON array");
  }
  const ranked = JSON.parse(cleaned.slice(start, end + 1));

  // Re-attach source_url, source, published_at, cluster from candidates by index
  const enriched = ranked
    .map((e) => {
      const candidate = candidates[e.index];
      if (!candidate) return null;
      return {
        id: 0, // assigned below
        tag: e.tag,
        region: e.region,
        title: e.title,
        summary: e.summary,
        impact: e.impact,
        market_impact: e.market_impact,
        confidence: e.confidence,
        source: candidate.source,
        source_url: candidate.url,
        published_at: candidate.published_at ? candidate.published_at.split("T")[0] : null,
        time: relativeTime(candidate.published_at),
        cluster: candidate.cluster, // deterministic, JS-computed — not trusted from Haiku
      };
    })
    .filter((x) => x !== null);

  const final = diversifyByCluster(enriched, 6).map(({ cluster, ...h }) => h);

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

// ─── MARKET DATA (kept simple, Haiku) ─────────────────────────
async function generateMarketData() {
  console.log("📊 Fetching live market data via Haiku + web_search...");

  const today = new Date().toISOString().split("T")[0];
  const response = await callAnthropic(
    {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `You are a market data feed. Return ONLY a raw JSON array, no preamble, no markdown.

Each object: { "symbol": string, "value": string, "change": string with + or -, "up": boolean }

10 instruments in this exact order:
1. EUR/USD  2. IBEX 35  3. BRENT  4. GOLD  5. BTC
6. VIX  7. US 10Y  8. EUR/GBP  9. S&P 500  10. DAX 40`,
      messages: [{ role: "user", content: `Today is ${today}. Fetch latest prices. Return JSON array only.` }],
    },
    { label: "datos de mercado" }
  );

  const jsonText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const cleaned = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1) throw new Error("Market data: no JSON array");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🏛️  ZRC Intelligence Generator v6 (RSS) — ${today}\n`);

  // Estado previo: nunca se sobrescribe con vacio. Si una de las dos mitades
  // falla, la otra se publica y la que falla conserva su ultimo valor bueno.
  let previous = {};
  if (existsSync(OUTPUT_FILE)) {
    try { previous = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8")); } catch (_) {}
  }

  let headlines = null;
  let marketTicker = null;

  // Headlines pipeline (hard fail if it breaks — better keep yesterday's data)
  try {
    const raw = await fetchAllFeeds();
    if (raw.length === 0) throw new Error("All RSS feeds returned empty");

    const candidates = processItems(raw);
    if (candidates.length < 6) {
      throw new Error(`Only ${candidates.length} candidates after scoring (need ≥6)`);
    }

    headlines = await enrichWithHaiku(candidates);

    if (headlines.length < 3) {
      throw new Error(`Haiku returned only ${headlines.length} headlines (need ≥3)`);
    }

    console.log(`   ✅ Headlines: ${headlines.length}`);
    headlines.forEach((h) => {
      console.log(`      · [${h.source}] ${h.title.en.slice(0, 70)}...`);
    });

    const sources = [...new Set(headlines.map((h) => h.source))];
    console.log(`   ℹ️  Source diversity: ${sources.length} outlets (${sources.join(", ")})`);
  } catch (err) {
    console.error(`   ❌ Headlines pipeline failed: ${err.message}`);
    const staleDays = previous.generated_at
      ? Math.floor((Date.now() - new Date(previous.generated_at)) / 86400000)
      : null;
    if (staleDays !== null) {
      console.error(`   ⚠️  El Observatorio seguira mostrando los titulares del ${previous.generated_at.split("T")[0]} (${staleDays}d de antiguedad).`);
    }
    process.exit(1);
  }

  // Market data (soft fail — se conserva el ticker anterior, nunca se vacia)
  try {
    marketTicker = await generateMarketData();
    console.log(`   ✅ Market instruments: ${marketTicker.length}`);
  } catch (err) {
    console.warn(`   ⚠️  Market data failed: ${err.message} — se conserva el ticker anterior`);
  }

  const output = {
    ...previous,
    generated_at: new Date().toISOString(),
    market_ticker: marketTicker ?? previous.market_ticker ?? [],
    headlines: headlines,
  };
  if (marketTicker) output.market_updated_at = new Date().toISOString();

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ Output saved → ${OUTPUT_FILE}`);
  console.log(`   Generated: ${output.generated_at}\n`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
