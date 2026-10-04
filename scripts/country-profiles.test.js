import test from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_PROFILES, COUNTRY_PROFILE_UPDATED_AT, PILLAR_META } from "../src/data/countryRiskProfiles.js";

test("country profiles publish the intended first cohort", () => {
  assert.equal(COUNTRY_PROFILES.length, 15);
  assert.deepEqual([...new Set(COUNTRY_PROFILES.map(country => country.region))].sort(), ["Iberia", "LATAM", "MENA"]);
  assert.equal(new Set(COUNTRY_PROFILES.map(country => country.slug)).size, COUNTRY_PROFILES.length);
});

test("every profile has five bounded pillars, dated sources and investor sections", () => {
  const pillarIds = Object.keys(PILLAR_META).sort();
  for (const country of COUNTRY_PROFILES) {
    assert.match(country.slug, /^[a-z0-9-]+$/);
    assert.ok(country.score >= 0 && country.score <= 100);
    assert.deepEqual(Object.keys(country.pillars).sort(), pillarIds);
    for (const value of Object.values(country.pillars)) assert.ok(value.score >= 0 && value.score <= 100);
    assert.ok(country.watch.length >= 3);
    assert.ok(country.implications.length >= 3);
    assert.match(country.source.href, /^https:\/\//);
  }
  for (const pillar of Object.values(PILLAR_META)) {
    assert.ok(pillar.sourceDate);
    assert.match(pillar.href, /^https:\/\//);
  }
  assert.match(COUNTRY_PROFILE_UPDATED_AT, /^\d{4}-\d{2}-\d{2}$/);
});
