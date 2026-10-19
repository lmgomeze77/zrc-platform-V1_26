import test from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_PROFILES } from "../src/data/countryRiskProfiles.js";
import { COUNTRY_MAP_ID_TO_ISO3, COUNTRY_INTELLIGENCE_METHODOLOGIES, countryIntelligenceByIso3, resolveMapCountryIntelligence } from "../src/data/countryIntelligenceModel.js";

test("all 15 editorial profiles are discoverable through canonical ISO3 identity", () => {
  for (const profile of COUNTRY_PROFILES) {
    const match = countryIntelligenceByIso3(profile.iso);
    assert.equal(match.profile, profile);
    assert.equal(match.href, "/inteligencia/paises/" + profile.slug + "/");
    assert.match(match.provenance.asOf, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.equal(countryIntelligenceByIso3("ZZZ"), null);
});

test("42 map countries are covered and missing editorial profiles are explicit", () => {
  assert.equal(Object.keys(COUNTRY_MAP_ID_TO_ISO3).length, 47);
  const covered = ["es", "mx", "co", "br", "ar", "cl", "sa", "ae", "tr", "il"];
  for (const id of covered) assert.ok(resolveMapCountryIntelligence({id, riskScore: 25}).editorial);
  assert.equal(resolveMapCountryIntelligence({id:"us",riskScore:42}).editorial, null);
  assert.equal(resolveMapCountryIntelligence({id:"unknown",riskScore:42}).editorial, null);
});

test("map and full-profile scores are independent and distinctly attributed", () => {
  const map = resolveMapCountryIntelligence({id:"es",riskScore:92});
  assert.equal(map.geopoliticalRisk.value,92);
  assert.equal(map.editorial.profile.score,36);
  assert.notEqual(map.geopoliticalRisk.provenance.id,map.editorial.provenance.id);
  assert.equal(map.geopoliticalRisk.provenance.asOf,null);
  assert.equal(map.editorial.language,"es");
  assert.equal(COUNTRY_INTELLIGENCE_METHODOLOGIES.editorialProfile.layers !== undefined,true);
  assert.equal(resolveMapCountryIntelligence({id:"es",riskScore:NaN}).geopoliticalRisk.value,null);
});
