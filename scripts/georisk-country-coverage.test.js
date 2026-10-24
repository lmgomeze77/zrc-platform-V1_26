import test from "node:test";
import assert from "node:assert/strict";
import {COUNTRY_PROFILES} from "../src/data/countryRiskProfiles.js";
import {COUNTRY_EXPANSION_CANDIDATES} from "../src/data/georiskCountryExpansion.js";
test("expanded registry covers 100+ distinct ISO3 jurisdictions", () => {
  const all=[...COUNTRY_PROFILES,...COUNTRY_EXPANSION_CANDIDATES];
  assert.ok(all.length>=100);
  assert.equal(new Set(all.map(p=>p.iso)).size,all.length);
  assert.ok(all.every(p=>/^[A-Z]{3}$/.test(p.iso)));
});
test("pending entries cannot be mistaken for scored editorial research", () => {
  assert.ok(COUNTRY_EXPANSION_CANDIDATES.every(p=>p.status==="pending_editorial" && p.score===undefined));
  assert.ok(COUNTRY_EXPANSION_CANDIDATES.some(p=>p.iso==="EST"));
});
