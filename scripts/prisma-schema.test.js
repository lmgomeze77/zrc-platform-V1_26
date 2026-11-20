import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { assertPrismaDocument } from "./prisma-schema.js";

const file = new URL("../public/data/prisma.json", import.meta.url);

test("la edición publicada de prisma.json cumple el contrato", { skip: !existsSync(file) && "aún no hay edición publicada" }, () => {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(assertPrismaDocument(doc), doc);
});

test("rechaza una historia con un solo hecho", () => {
  const story = {
    id: "x", title: { es: "a", en: "a" }, dek: { es: "b", en: "b" }, topics: ["macro"],
    facts: [{ es: "f", en: "f", sources: [0, 1] }], perspectives: { es: "p", en: "p" }, discrepancies: [], zrc: null,
    sources: [0, 1, 2].map((i) => ({ url: `https://x.org/${i}`, region: "europa", line: "centro", type: "generalista" })),
    coverage: { diversity: "baja", outlets: 3 },
  };
  const doc = { generated_at: new Date().toISOString(), phase: "A", public_count: 3, stories: [story], feeds: { total: 1, ok: 1 } };
  assert.throws(() => assertPrismaDocument(doc), /facts/);
  story.facts.push({ es: "g", en: "g", sources: [1, 2] });
  assert.equal(assertPrismaDocument(doc), doc);
});
