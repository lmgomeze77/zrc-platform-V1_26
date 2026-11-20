/**
 * Prisma — generador del feed de cobertura comparada (fase A).
 *
 * 1. Lee los feeds del catálogo (scripts/prisma-outlets.js) en paralelo.
 * 2. Ventana de 36 h, atribución de piezas de agencia y duplicados fuera.
 * 3. Claude Haiku 5.5 agrupa los titulares en historias (un hecho concreto,
 *    no un tema) y puntúa su relevancia para un inversor internacional.
 * 4. Se publican las historias con al menos 3 medios distintos (máx. 10).
 * 5. Claude Haiku 5.5 redacta cada ficha en español e inglés: hechos comunes
 *    (cada uno con 2 fuentes como mínimo), diferencias de enfoque y
 *    discrepancias de cifras. Cada cifra se comprueba contra el texto de origen.
 * 6. Claude Sonnet 5.5 escribe la Lectura ZRC de las 3 historias principales,
 *    solo en la primera ejecución del día; después se reutiliza.
 * 7. La cobertura (región, línea editorial, tipo) se calcula aquí, nunca con IA.
 * 8. Escribe public/data/prisma.json con el coste estimado de la ejecución.
 *
 * Variables: ANTHROPIC_API_KEY · PRISMA_MAX_STORIES (10) · PRISMA_PUBLIC_STORIES (3)
 * PRISMA_ZRC_READINGS (3) · PRISMA_ZRC=auto|always|never · PRISMA_WINDOW_HOURS (36)
 */

import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { OUTLETS, OUTLETS_BY_ID } from "./prisma-outlets.js";
import {
  TOPICS, requestCostUsd, detectAgency, dedupeItems, withinWindow, computeCoverage,
  validateCard, selectStories, matchPrevious, slugify, feedBalance,
} from "./prisma-core.js";
import { assertPrismaDocument } from "./prisma-schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "prisma.json");
// Datos operativos (coste y feeds caídos): fuera de public/, no se sirven en la web.
const OPS_DIR = join(__dirname, "..", "ops");
const OPS_FILE = join(OPS_DIR, "prisma-run.json");

const env = (k, d) => (process.env[k] ?? d);
const MAX_STORIES = Number(env("PRISMA_MAX_STORIES", 10));
const PUBLIC_STORIES = Number(env("PRISMA_PUBLIC_STORIES", 3));
const ZRC_READINGS = Number(env("PRISMA_ZRC_READINGS", 3));
const ZRC_MODE = env("PRISMA_ZRC", "auto");
const WINDOW_HOURS = Number(env("PRISMA_WINDOW_HOURS", 36));
const HAIKU = env("PRISMA_HAIKU_MODEL", "claude-haiku-5-5");
const SONNET = env("PRISMA_SONNET_MODEL", "claude-sonnet-5-5");
const MAX_ITEMS = 1200;

const client = new Anthropic();
const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; ZRCPrisma/1.0; +https://zenithrisecapital.com)" },
});

let runCost = 0;
const calls = { haiku: 0, sonnet: 0 };

// ─── API con reintentos (mismo criterio que generate-headlines.js) ───
const RETRYABLE = [408, 409, 429, 500, 502, 503, 504, 529];
async function callModel(model, params, label) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await client.messages.create({ model, ...params });
      runCost += requestCostUsd(model, res.usage);
      if (model === SONNET) calls.sonnet++; else calls.haiku++;
      return res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    } catch (err) {
      last = err;
      const msg = err?.message || String(err);
      if (/credit balance/i.test(msg)) throw new Error("SALDO AGOTADO — recarga créditos en console.anthropic.com");
      if (err?.status === 401 || err?.status === 403) throw new Error("API key rechazada — revisa ANTHROPIC_API_KEY");
      const retry = err?.status === undefined || RETRYABLE.includes(err.status);
      if (!retry || attempt === 3) break;
      console.warn(`   ⚠️  ${label}: intento ${attempt} falló (${msg}); reintento`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw last;
}

function parseJson(text) {
  const t = String(text).replace(/```json\s*|```/g, "").trim();
  const start = t.search(/[{[]/);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start === -1 || end <= start) throw new Error("respuesta sin JSON");
  return JSON.parse(t.slice(start, end + 1));
}

async function pool(list, n, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) { const k = i++; out[k] = await fn(list[k], k); }
  }));
  return out;
}

// ─── 1-2. Ingesta ────────────────────────────────────────────
async function fetchAll() {
  const jobs = OUTLETS.flatMap((o) => o.feeds.map((url) => ({ outlet: o, url })));
  const failed = [];
  const results = await pool(jobs, 12, async ({ outlet, url }) => {
    try {
      const feed = await parser.parseURL(url);
      return (feed.items || []).slice(0, 40).map((it) => {
        const desc = String(it.contentSnippet || it.summary || it.content || "").replace(/\s+/g, " ").trim().slice(0, 300);
        const title = String(it.title || "").replace(/\s+/g, " ").trim();
        const agency = detectAgency(desc) || detectAgency(title);
        const eff = agency && agency !== outlet.id ? OUTLETS_BY_ID[agency] : outlet;
        return {
          outletId: outlet.id, effectiveOutletId: eff.id, region: eff.region,
          title, desc, url: it.link || "", published_at: it.isoDate || it.pubDate || null, lang: outlet.lang,
        };
      });
    } catch (err) {
      failed.push({ outlet: outlet.name, url, error: String(err.message || err).slice(0, 120) });
      return [];
    }
  });
  const raw = results.flat();
  const items = dedupeItems(raw.filter((i) => withinWindow(i.published_at, WINDOW_HOURS)))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, MAX_ITEMS);
  const okOutlets = new Set(raw.map((i) => i.outletId));
  console.log(`📡 ${jobs.length - failed.length}/${jobs.length} feeds OK · ${raw.length} piezas · ${items.length} en ventana de ${WINDOW_HOURS} h`);
  if (failed.length) failed.forEach((f) => console.warn(`   ⚠️  ${f.outlet}: ${f.error}`));
  return {
    items,
    feeds: { total: jobs.length, ok: jobs.length - failed.length, outlets_ok: okOutlets.size, outlets_total: OUTLETS.filter((o) => o.feeds.length).length },
    failed,
  };
}

// ─── 3. Agrupación ───────────────────────────────────────────
async function clusterItems(items) {
  const list = items.map((it, i) => `[${i}] ${it.region} | ${it.title}`).join("\n");
  const system = `You group news headlines from many outlets and languages into STORIES for Prisma, the news-coverage product of Zenith Rise Capital, an investment advisory firm covering Iberia, Latin America and MENA.

A story is ONE specific event or development (e.g. "Bank of England raises rate to 4%"), never a broad theme (e.g. "inflation in Europe"). Headlines in different languages about the same event belong together.

Only return stories relevant to international investors: macroeconomics and central banks, geopolitics and international politics, energy and commodities, financial markets, companies, M&A and investment, and notable developments in Latin America, MENA, Spain or Portugal. Ignore sport, celebrities, crime, weather, lifestyle and purely local news.

Return ONLY JSON: {"stories":[{"label":"short English label","items":[indices],"relevance":0-100}]}
- relevance = importance for an international investor today.
- Each headline index appears in at most one story.
- Include only stories with at least 3 headlines. At most 30 stories.`;
  const text = await callModel(HAIKU, {
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: `Headlines (index | outlet region | title):\n\n${list}` }],
  }, "agrupación");
  const parsed = parseJson(text);
  return Array.isArray(parsed.stories) ? parsed.stories : [];
}

// ─── 5. Ficha de cada historia ───────────────────────────────
function sourceBlock(story, items) {
  return story.items.map((i, k) => {
    const it = items[i];
    const o = OUTLETS_BY_ID[it.effectiveOutletId];
    return `[${k}] ${o.name} · ${o.region} · ${o.line} · ${o.type}\nTITLE: ${it.title}\nEXCERPT: ${it.desc || "(none)"}`;
  }).join("\n\n");
}

async function synthesize(story, items) {
  const system = `You write the coverage card for one news story in Prisma, by Zenith Rise Capital. Readers are investors who want to see how outlets from different regions and editorial lines report the same event.

Use ONLY the titles and excerpts provided. Never add facts, figures, names or dates that are not in them. Paraphrase; do not quote.

Return ONLY JSON with this shape, every text field in Spanish (es, formal European Spanish) and English (en):
{
 "title": {"es","en"}            // neutral headline, max 14 words
 "dek": {"es","en"}              // one sentence, max 30 words
 "facts": [{"es","en","sources":[source numbers]}]   // 2-5 facts that at least TWO different sources state
 "perspectives": {"es","en"}     // 2-3 sentences on how framing differs by region or editorial line, naming outlets. If framing is similar, say so.
 "discrepancies": [{"es","en","sources":[source numbers]}]  // figures that differ between sources; [] if none
 "topics": [${TOPICS.map((t) => `"${t}"`).join(", ")}]  // 1-3 of these
}`;
  const text = await callModel(HAIKU, {
    max_tokens: 3000,
    system,
    messages: [{ role: "user", content: `Story: ${story.label}\n\nSources:\n\n${sourceBlock(story, items)}` }],
  }, `ficha «${story.label}»`);
  return parseJson(text);
}

// ─── 6. Lectura ZRC ──────────────────────────────────────────
async function zrcReading(card) {
  const system = `You are the analyst desk of Zenith Rise Capital (ZRC), a Madrid-based advisory firm in M&A, special situations, real estate and geopolitical intelligence across Iberia, Latin America and MENA.

Write the "Lectura ZRC" for a news story: 2-3 bullet points on what it means for investors and companies active in those markets (cost of capital, real estate, energy, trade, deal flow, currencies). Base it on the facts given plus widely known context. Be politically neutral. No recommendations to buy or sell specific securities. Max 40 words per bullet.

Return ONLY JSON: {"es":["...","..."],"en":["...","..."]}`;
  const facts = card.facts.map((f) => `- ${f.en}`).join("\n");
  const text = await callModel(SONNET, {
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: `Story: ${card.title.en}\n${card.dek.en}\n\nFacts:\n${facts}\n\nHow coverage differs: ${card.perspectives.en}` }],
  }, `Lectura ZRC «${card.title.en}»`);
  const r = parseJson(text);
  if (!Array.isArray(r.es) || !Array.isArray(r.en) || !r.es.length) throw new Error("Lectura ZRC sin formato");
  return { es: r.es.slice(0, 3), en: r.en.slice(0, 3) };
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  const now = new Date();
  console.log(`\n🔺 Prisma · fase A · ${now.toISOString()}\n`);

  let previous = null;
  if (existsSync(OUTPUT_FILE)) { try { previous = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8")); } catch (_) {} }
  let prevOps = null;
  if (existsSync(OPS_FILE)) { try { prevOps = JSON.parse(readFileSync(OPS_FILE, "utf-8")); } catch (_) {} }

  const { items, feeds, failed } = await fetchAll();
  if (items.length < 30) throw new Error(`Solo ${items.length} piezas en ventana: revisa los feeds`);

  const clusters = await clusterItems(items);
  const selected = selectStories(clusters, items, { minOutlets: 3, max: MAX_STORIES + 3 });
  console.log(`🧩 ${clusters.length} agrupaciones · ${selected.length} con 3 medios o más`);

  const cards = await pool(selected, 3, async (story) => {
    try {
      const card = validateCard(await synthesize(story, items), story, items);
      if (!card) console.warn(`   ⚠️  «${story.label}» descartada en validación`);
      return card ? { story, card } : null;
    } catch (err) {
      console.warn(`   ⚠️  «${story.label}»: ${err.message}`);
      return null;
    }
  });

  const firstRunOfDay = now.getUTCHours() < 9;
  const stories = [];
  for (const entry of cards.filter(Boolean).slice(0, MAX_STORIES)) {
    const { story, card } = entry;
    const sources = story.items.map((i) => {
      const it = items[i];
      const eff = OUTLETS_BY_ID[it.effectiveOutletId];
      const via = it.outletId !== it.effectiveOutletId ? OUTLETS_BY_ID[it.outletId].name : null;
      return {
        outletId: eff.id, outlet: eff.name, via, region: eff.region, line: eff.line, type: eff.type,
        lang: it.lang, title: it.title, url: it.url, published_at: it.published_at,
      };
    });
    const prev = matchPrevious(sources.map((s) => s.url), previous?.stories);
    const dates = sources.map((s) => s.published_at).filter(Boolean).sort();
    stories.push({
      id: prev?.id || `${slugify(card.title.en)}-${now.toISOString().slice(0, 10)}`,
      title: card.title, dek: card.dek, topics: card.topics,
      first_seen: prev?.first_seen || dates[0] || now.toISOString(),
      updated_at: dates.at(-1) || now.toISOString(),
      relevance: story.relevance,
      facts: card.facts, perspectives: card.perspectives, discrepancies: card.discrepancies,
      zrc: prev?.zrc || null,
      sources,
      coverage: computeCoverage(sources, OUTLETS_BY_ID),
    });
  }
  if (stories.length < 3) throw new Error(`Solo ${stories.length} historias válidas (mínimo 3)`);

  const wantZrc = ZRC_MODE === "always" || (ZRC_MODE === "auto" && (firstRunOfDay || !previous));
  if (ZRC_MODE !== "never") {
    for (const s of stories.slice(0, ZRC_READINGS)) {
      if (s.zrc && ZRC_MODE !== "always") continue;
      if (!wantZrc) continue;
      try { s.zrc = await zrcReading(s); } catch (err) { console.warn(`   ⚠️  Lectura ZRC: ${err.message}`); }
    }
  }

  const doc = {
    generated_at: now.toISOString(),
    phase: "A",
    window_hours: WINDOW_HOURS,
    public_count: PUBLIC_STORIES,
    stories,
    balance: feedBalance(stories),
    feeds,
  };
  assertPrismaDocument(doc);
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(doc, null, 2), "utf-8");

  const month = now.toISOString().slice(0, 7);
  const sameMonth = prevOps?.cost?.month === month;
  const ops = {
    generated_at: doc.generated_at,
    feeds_failed: failed,
    cost: {
      month,
      run_usd: Math.round(runCost * 10000) / 10000,
      month_usd: Math.round(((sameMonth ? prevOps.cost.month_usd : 0) + runCost) * 10000) / 10000,
      runs_month: (sameMonth ? prevOps.cost.runs_month : 0) + 1,
      calls,
      models: { haiku: HAIKU, sonnet: SONNET },
    },
  };
  if (!existsSync(OPS_DIR)) mkdirSync(OPS_DIR, { recursive: true });
  writeFileSync(OPS_FILE, JSON.stringify(ops, null, 2), "utf-8");

  console.log(`\n✅ ${stories.length} historias → ${OUTPUT_FILE}`);
  stories.forEach((s) => console.log(`   · [${s.coverage.outlets} medios · ${s.coverage.regions} regiones] ${s.title.es}`));
  console.log(`💶 Coste estimado: ${ops.cost.run_usd} $ esta ejecución · ${ops.cost.month_usd} $ en ${month}\n`);
}

main().catch((err) => {
  console.error(`❌ Prisma: ${err.message}`);
  console.error("   El Observatorio sigue mostrando la última edición válida de prisma.json.");
  process.exit(1);
});
