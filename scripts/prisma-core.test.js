import test from "node:test";
import assert from "node:assert/strict";
import { OUTLETS, OUTLETS_BY_ID, REGIONS } from "./prisma-outlets.js";
import {
  detectAgency, dedupeItems, extractNumbers, numbersSupported, computeCoverage,
  selectStories, matchPrevious, validateCard, requestCostUsd, withinWindow,
} from "./prisma-core.js";

test("catálogo de fase A: 50 medios con feed y cuotas por región", () => {
  const withFeeds = OUTLETS.filter((o) => o.feeds.length);
  assert.equal(withFeeds.length, 50);
  const by = Object.fromEntries(REGIONS.map((r) => [r, withFeeds.filter((o) => o.region === r).length]));
  assert.deepEqual(by, { norteamerica: 7, europa: 13, eurasia: 3, mena: 7, asia_pacifico: 8, latam: 8, africa: 4 });
  assert.equal(new Set(OUTLETS.map((o) => o.id)).size, OUTLETS.length);
});

test("atribuye piezas de agencia", () => {
  assert.equal(detectAgency("LONDON (Reuters) - The Bank of England raised"), "reuters");
  assert.equal(detectAgency("Madrid, 3 nov (EFE).- El Gobierno"), "efe");
  assert.equal(detectAgency("WASHINGTON (AP) — The Federal Reserve"), "ap");
  assert.equal(detectAgency("The Bank of England raised rates"), null);
});

test("cifras: separadores españoles e ingleses y años ignorados", () => {
  assert.deepEqual(extractNumbers("El Ibovespa cayó un 18,12 % hasta 167.922 puntos en 2026"), [18.12, 167922]);
  assert.deepEqual(extractNumbers("Brent at $94.42, down 8.7%"), [94.42, 8.7]);
  assert.ok(numbersSupported("inflación del 4 %", "Eurozone inflation rose to 4.0% in October"));
  assert.ok(!numbersSupported("inflación del 4,2 %", "Eurozone inflation rose to 4.0% in October"));
});

test("duplicados por URL y por titular dentro del mismo medio efectivo", () => {
  const items = [
    { url: "https://a.com/1", title: "Fed holds rates", effectiveOutletId: "reuters" },
    { url: "https://b.com/9", title: "Fed holds rates!", effectiveOutletId: "reuters" },
    { url: "https://a.com/1#x", title: "Otro", effectiveOutletId: "bbc" },
    { url: "https://c.com/2", title: "Fed holds rates", effectiveOutletId: "bbc" },
  ];
  assert.equal(dedupeItems(items).length, 2);
});

test("cobertura: un medio cuenta una vez y la bandera de concentración", () => {
  const src = [{ outletId: "bbc" }, { outletId: "bbc" }, { outletId: "nyt" }, { outletId: "cnbc" }];
  const c = computeCoverage(src, OUTLETS_BY_ID);
  assert.equal(c.outlets, 3);
  assert.equal(c.regions, 2);
  assert.equal(c.diversity, "baja");
  assert.equal(c.concentrated, true);
  const wide = computeCoverage(["bbc", "nyt", "tass", "aljazeera", "scmp", "folha"].map((outletId) => ({ outletId })), OUTLETS_BY_ID);
  assert.equal(wide.diversity, "alta");
});

const items = [
  { effectiveOutletId: "bbc", region: "europa", title: "BoE raises rate to 4%", desc: "The Bank of England raised Bank Rate to 4% in an 8-1 vote." },
  { effectiveOutletId: "nyt", region: "norteamerica", title: "Bank of England lifts rates to 4%", desc: "First rise since 2023." },
  { effectiveOutletId: "economictimes", region: "asia_pacifico", title: "BoE hikes", desc: "Inflation seen near 5% in 2027." },
  { effectiveOutletId: "bbc", region: "europa", title: "Otro tema", desc: "" },
];

test("selección: mínimo 3 medios distintos y sin artículos repetidos", () => {
  const sel = selectStories([
    { label: "BoE", items: [0, 1, 2], relevance: 80 },
    { label: "dup", items: [0, 1, 3], relevance: 90 },
    { label: "pocos", items: [3, 99], relevance: 99 },
  ], items);
  assert.equal(sel.length, 1);
  assert.equal(sel[0].label, "BoE");
});

test("validación de ficha: descarta hechos con una sola fuente o cifras inventadas", () => {
  const story = { items: [0, 1, 2] };
  const card = {
    title: { es: "El Banco de Inglaterra sube al 4 %", en: "Bank of England raises rate to 4%" },
    dek: { es: "Primera subida desde 2023.", en: "First rise since 2023." },
    perspectives: { es: "Enfoque similar.", en: "Similar framing." },
    facts: [
      { es: "Sube el tipo al 4 %.", en: "Rate rises to 4%.", sources: [0, 1] },
      { es: "Votación 8-1.", en: "8-1 vote.", sources: [0] },
      { es: "La inflación rondará el 6 %.", en: "Inflation near 6%.", sources: [0, 2] },
      { es: "La inflación rondará el 5 %.", en: "Inflation near 5%.", sources: [1, 2] },
    ],
    discrepancies: [],
    topics: ["macro", "inventado"],
  };
  const v = validateCard(card, story, items);
  assert.equal(v.facts.length, 2);
  assert.deepEqual(v.topics, ["macro"]);
  assert.equal(validateCard({ ...card, facts: card.facts.slice(1, 3) }, story, items), null);
});

test("reconoce la misma historia entre ejecuciones por solapamiento de URLs", () => {
  const prev = [{ id: "boe", sources: [{ url: "u1" }, { url: "u2" }, { url: "u3" }] }];
  assert.equal(matchPrevious(["u1", "u2", "u4"], prev)?.id, "boe");
  assert.equal(matchPrevious(["x1", "x2", "u1"], prev), null);
});

test("coste por petición con el recargo de Haiku 5.5 por encima de 100k tokens", () => {
  assert.equal(requestCostUsd("claude-haiku-5-5", { input_tokens: 50_000, output_tokens: 0 }), 0.005);
  assert.equal(requestCostUsd("claude-haiku-5-5", { input_tokens: 200_000, output_tokens: 0 }), 0.1);
  assert.equal(requestCostUsd("claude-sonnet-5-5", { input_tokens: 9000, output_tokens: 1200 }), 0.03);
});

test("ventana temporal", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  assert.ok(withinWindow("2026-11-14T01:00:00Z", 36, now));
  assert.ok(!withinWindow("2026-11-12T01:00:00Z", 36, now));
  assert.ok(!withinWindow(null, 36, now));
});
