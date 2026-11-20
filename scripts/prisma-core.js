/**
 * Prisma — funciones puras del pipeline (sin red ni API), cubiertas por
 * scripts/prisma-core.test.js.
 */

import { REGIONS, LINES, TYPES, AGENCY_PATTERNS } from "./prisma-outlets.js";

export const TOPICS = ["geopolitica", "macro", "energia", "mercados", "empresa", "latam", "mena", "iberia"];

// Precios por millón de tokens (USD) a 14 nov 2026, platform.claude.com/docs/en/about-claude/pricing.
// Haiku 5.5 cobra 5x por encima de 100k tokens de entrada en una petición.
export const PRICES = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5, inLong: 0.5, outLong: 2.5, longFrom: 100_000 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
};

export function requestCostUsd(model, usage) {
  const p = PRICES[model];
  if (!p || !usage) return 0;
  const inTok = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
  const long = p.longFrom && inTok > p.longFrom;
  const pin = long ? p.inLong : p.in;
  const pout = long ? p.outLong : p.out;
  return ((usage.input_tokens || 0) * pin + (usage.output_tokens || 0) * pout) / 1e6;
}

export function normalizeTitle(t) {
  return String(t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectAgency(text) {
  const s = String(text || "").trim();
  for (const p of AGENCY_PATTERNS) if (p.re.test(s)) return p.id;
  return null;
}

/** Quita duplicados por URL y por titular normalizado dentro del mismo medio efectivo. */
export function dedupeItems(items) {
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const it of items) {
    if (!it.url || !it.title) continue;
    const url = it.url.split("#")[0];
    if (seenUrl.has(url)) continue;
    const tk = `${it.effectiveOutletId}|${normalizeTitle(it.title)}`;
    if (seenTitle.has(tk)) continue;
    seenUrl.add(url);
    seenTitle.add(tk);
    out.push({ ...it, url });
  }
  return out;
}

export function withinWindow(iso, hours, now = Date.now()) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t <= now + 3600_000 && t >= now - hours * 3600_000;
}

/** Recuentos por región, línea y tipo; un medio cuenta una vez por historia. */
export function computeCoverage(sources, outletsById) {
  const region = Object.fromEntries(REGIONS.map((k) => [k, 0]));
  const line = Object.fromEntries(LINES.map((k) => [k, 0]));
  const type = Object.fromEntries(TYPES.map((k) => [k, 0]));
  const seen = new Set();
  for (const s of sources) {
    const id = s.outletId;
    if (seen.has(id)) continue;
    seen.add(id);
    const o = outletsById[id];
    if (!o) continue;
    region[o.region]++;
    line[o.line]++;
    type[o.type]++;
  }
  const outlets = seen.size;
  const regions = Object.values(region).filter((n) => n > 0).length;
  const lines = Object.values(line).filter((n) => n > 0).length;
  // Entropía de Shannon por región, normalizada entre 0 y 1.
  let h = 0;
  for (const n of Object.values(region)) if (n > 0) { const p = n / outlets; h -= p * Math.log(p); }
  const entropy = outlets > 0 ? h / Math.log(REGIONS.length) : 0;
  const diversity = regions >= 5 && lines >= 2 ? "alta" : regions >= 3 ? "media" : "baja";
  return { region, line, type, outlets, regions, lines, entropy: Math.round(entropy * 100) / 100, diversity, concentrated: regions <= 2 };
}

/** Cifras de un texto (enteros, decimales con punto o coma, porcentajes). */
export function extractNumbers(text) {
  const m = String(text || "").match(/\d+(?:[.,]\d+)*/g) || [];
  return m
    .map((x) => x.replace(/[.,](?=\d{3}(?:\D|$))/g, "").replace(",", "."))
    .map(Number)
    .filter((n) => Number.isFinite(n) && !(n >= 1900 && n <= 2100 && Number.isInteger(n)) && n !== 0);
}

/** true si cada cifra del texto aparece en el material de origen. */
export function numbersSupported(text, sourceText) {
  const src = new Set(extractNumbers(sourceText).map((n) => n.toFixed(4)));
  return extractNumbers(text).every((n) => src.has(n.toFixed(4)));
}

/**
 * Filtra y ordena las agrupaciones de la IA: índices válidos, sin artículos
 * repetidos entre historias, mínimo `minOutlets` medios distintos.
 */
export function selectStories(clusters, items, { minOutlets = 3, max = 10 } = {}) {
  const used = new Set();
  const out = [];
  for (const c of clusters || []) {
    const idx = [...new Set((c.items || []).filter((i) => Number.isInteger(i) && i >= 0 && i < items.length && !used.has(i)))];
    const outlets = new Set(idx.map((i) => items[i].effectiveOutletId));
    if (outlets.size < minOutlets) continue;
    idx.forEach((i) => used.add(i));
    const regions = new Set(idx.map((i) => items[i].region)).size;
    const relevance = Math.max(0, Math.min(100, Number(c.relevance) || 0));
    out.push({ ...c, items: idx, outletCount: outlets.size, score: relevance * (1 + 0.15 * (regions - 1)) + outlets.size });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}

/** Similitud de Jaccard entre conjuntos de URLs, para reconocer una historia de una ejecución a otra. */
export function matchPrevious(urls, previousStories, threshold = 0.4) {
  const a = new Set(urls);
  let best = null, bestScore = 0;
  for (const p of previousStories || []) {
    const b = new Set((p.sources || []).map((s) => s.url));
    const inter = [...a].filter((u) => b.has(u)).length;
    const union = new Set([...a, ...b]).size || 1;
    const j = inter / union;
    if (j > bestScore) { bestScore = j; best = p; }
  }
  return bestScore >= threshold ? best : null;
}

export function slugify(s) {
  return normalizeTitle(s).split(" ").slice(0, 8).join("-").slice(0, 60) || "historia";
}

/** Une las coberturas de todas las historias publicadas en un balance del feed. */
export function feedBalance(stories) {
  const sum = (k, keys) => Object.fromEntries(keys.map((x) => [x, stories.reduce((a, s) => a + (s.coverage?.[k]?.[x] || 0), 0)]));
  return { region: sum("region", REGIONS), line: sum("line", LINES), type: sum("type", TYPES) };
}

/** Valida la ficha de la IA: hechos con 2 medios distintos y cifras presentes en el origen. */
export function validateCard(card, story, items) {
  const srcText = story.items.map((i) => `${items[i].title} ${items[i].desc}`).join(" ");
  const effOf = (k) => items[story.items[k]]?.effectiveOutletId;
  const okRefs = (refs) => Array.isArray(refs) && refs.every((k) => Number.isInteger(k) && k >= 0 && k < story.items.length);
  const bi = (v) => v && typeof v.es === "string" && v.es.trim() && typeof v.en === "string" && v.en.trim();
  const supported = (v) => numbersSupported(v.es, srcText) && numbersSupported(v.en, srcText);

  const facts = (card.facts || []).filter((f) =>
    bi(f) && okRefs(f.sources) && new Set(f.sources.map(effOf)).size >= 2 && supported(f));
  const discrepancies = (card.discrepancies || []).filter((d) => bi(d) && okRefs(d.sources) && supported(d));
  if (!bi(card.title) || !bi(card.dek) || !bi(card.perspectives) || facts.length < 2) return null;
  if (!supported(card.title) || !supported(card.dek) || !supported(card.perspectives)) return null;
  const topics = (card.topics || []).filter((t) => TOPICS.includes(t)).slice(0, 3);
  return { ...card, facts, discrepancies, topics: topics.length ? topics : ["macro"] };
}
