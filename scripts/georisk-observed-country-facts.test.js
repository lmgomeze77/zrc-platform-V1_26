import test from "node:test";
import assert from "node:assert/strict";
import {parseCountryFact,countryFactCoverage} from "../src/data/georiskObservedCountryFacts.js";
import {COUNTRY_EXPANSION_CANDIDATES} from "../src/data/georiskCountryExpansion.js";
test("observations retain their published reference year",()=>{
 assert.deepEqual(parseCountryFact([{},[{date:"2025",value:null},{date:"2024",value:132.5}]]),{value:132.5,year:2024});
 assert.equal(parseCountryFact(null),null);
});
test("coverage preserves missingness and warns about old observations",()=>{
 const x=countryFactCoverage({"NY.GDP.MKTP.CD":{value:1e12,year:2022}},2026);
 assert.equal(x.count,1);assert.equal(x.total,5);assert.equal(x.stale,true);
});
test("pending country slugs are unique and Estonia is reachable",()=>{
 const slugs=COUNTRY_EXPANSION_CANDIDATES.map(x=>x.slug);
 assert.equal(new Set(slugs).size,slugs.length);
 assert.equal(COUNTRY_EXPANSION_CANDIDATES.find(x=>x.iso==="EST").slug,"estonia");
});
