import test from "node:test";
import assert from "node:assert/strict";
import {parseGovernance,qualityOfObservations,GOVERNANCE_INDICATORS} from "../src/data/georiskGovernanceObservations.js";
test("WGI parser retains negative standardized estimates and reference years",()=>{
 assert.deepEqual(parseGovernance([{},[{value:-0.75,date:"2024"}]]),{value:-0.75,year:2024});
 assert.equal(parseGovernance([{},[{value:null,date:"2025"}]]),null);
});
test("evidence quality never treats missing indicators as recent",()=>{
 const q=qualityOfObservations(GOVERNANCE_INDICATORS,{"GOV_WGI_GE_EST":{value:0.5,year:2021}},2026);
 assert.equal(q.available,1);assert.equal(q.recent,0);assert.equal(q.total,3);
});
