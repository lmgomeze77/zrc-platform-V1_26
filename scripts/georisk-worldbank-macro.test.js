import test from "node:test";
import assert from "node:assert/strict";
import { WB_COUNTRY_ISO3, WB_INDICATORS, worldBankIndicatorUrl, latestWorldBankObservation, WB_GOVERNANCE_INDICATORS, worldBankGovernanceUrl } from "../src/pages/intelligence/worldBankCountryMacro.js";

test("All 42 world map economies have a World Bank ISO mapping", () => {
  assert.equal(Object.keys(WB_COUNTRY_ISO3).length,42);
  assert.equal(new Set(Object.values(WB_COUNTRY_ISO3)).size,42);
  for(const code of Object.values(WB_COUNTRY_ISO3)) assert.match(code,/^[A-Z]{3}$/);
});

test("World Bank URLs use HTTPS, v2, WDI source and latest nonempty value", () => {
  const url=worldBankIndicatorUrl("ESP","NY.GDP.MKTP.CD");
  assert.match(url,/^https:\/\/api\.worldbank\.org\/v2\/country\/ESP\/indicator\/NY\.GDP\.MKTP\.CD\?/);
  assert.match(url,/source=2/);
  assert.match(url,/mrnev=1/);
  assert.equal(WB_INDICATORS.length,3);
});

test("Parser handles missing data and only accepts numeric dated observations", () => {
  assert.deepEqual(latestWorldBankObservation([{page:1},[{date:"2024",value:null},{date:"2023",value:100}]]),{year:"2023",value:100});
  assert.equal(latestWorldBankObservation([{page:1},[{date:"2024",value:null}]]),null);
  assert.equal(latestWorldBankObservation({message:"not available"}),null);
  assert.equal(latestWorldBankObservation([{page:1},[{date:"NA",value:2}]]),null);
});

test("Institutional indicators use World Bank current WGI identifiers",()=>{
 assert.deepEqual(WB_GOVERNANCE_INDICATORS.map(i=>i.code),["GOV_WGI_GE_EST","GOV_WGI_RL_EST","GOV_WGI_PV_EST"]);
 const url=worldBankGovernanceUrl("ESP","GOV_WGI_GE_EST");
 assert.ok(url.includes("api.worldbank.org"));
 assert.match(url,/mrnev=1/);
});
