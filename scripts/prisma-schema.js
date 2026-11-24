/**
 * Prisma — contrato de public/data/prisma.json. El pipeline lo valida antes
 * de escribir y el test lo valida contra el fichero publicado.
 */

import { REGIONS, LINES, TYPES } from "./prisma-outlets.js";
import { TOPICS } from "./prisma-core.js";

function fail(msg) { throw new Error(`prisma.json inválido: ${msg}`); }
const isBi = (v) => v && typeof v.es === "string" && v.es.trim() && typeof v.en === "string" && v.en.trim();

export function assertPrismaDocument(doc) {
  if (!doc || typeof doc !== "object") fail("no es un objeto");
  if (Number.isNaN(Date.parse(doc.generated_at))) fail("generated_at");
  if (!["A", "B", "C"].includes(doc.phase)) fail("phase");
  if (!Number.isInteger(doc.public_count) || doc.public_count < 0) fail("public_count");
  if (!Array.isArray(doc.stories) || doc.stories.length < 1) fail("stories vacío");
  const ids = new Set();
  doc.stories.forEach((s, i) => {
    const at = `stories[${i}]`;
    if (!s.id || ids.has(s.id)) fail(`${at}.id`);
    ids.add(s.id);
    if (!isBi(s.title) || !isBi(s.dek)) fail(`${at} title/dek`);
    if (!Array.isArray(s.topics) || s.topics.some((t) => !TOPICS.includes(t))) fail(`${at}.topics`);
    if (!Array.isArray(s.facts) || s.facts.length < 2) fail(`${at}.facts`);
    s.facts.forEach((f, j) => { if (!isBi(f) || !Array.isArray(f.sources) || f.sources.length < 2) fail(`${at}.facts[${j}]`); });
    if (!isBi(s.perspectives)) fail(`${at}.perspectives`);
    if (!Array.isArray(s.discrepancies)) fail(`${at}.discrepancies`);
    if (s.zrc != null && !(Array.isArray(s.zrc.es) && Array.isArray(s.zrc.en))) fail(`${at}.zrc`);
    if (!Array.isArray(s.sources) || s.sources.length < 3) fail(`${at}.sources`);
    s.sources.forEach((src, j) => {
      if (!/^https?:\/\//.test(src.url)) fail(`${at}.sources[${j}].url`);
      if (!REGIONS.includes(src.region) || !LINES.includes(src.line) || !TYPES.includes(src.type)) fail(`${at}.sources[${j}] clasificación`);
    });
    const c = s.coverage;
    if (!c || !["alta", "media", "baja"].includes(c.diversity) || c.outlets < 3) fail(`${at}.coverage`);
  });
  if (!doc.feeds || !Number.isInteger(doc.feeds.total) || !Number.isInteger(doc.feeds.ok)) fail("feeds");
  return doc;
}
