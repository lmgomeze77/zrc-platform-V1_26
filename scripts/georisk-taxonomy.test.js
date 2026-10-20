import test from 'node:test';
import assert from 'node:assert/strict';
import {GEORISK_SCENARIOS} from '../src/data/georiskScenarioContract.js';
import {GEORISK_TAXONOMY_VERSION,RISK_FACTORS,SIMULATOR_FACTORS,INDEX_FACTORS,GRI_BASELINE_IDS,validateRiskTaxonomy,explainScenarioBridge,summarizeRiskCoverage} from '../src/data/georiskRiskTaxonomy.js';
test('taxonomic coverage includes every active simulator and historical index fallback key',()=>{
 assert.equal(validateRiskTaxonomy(Object.keys(GEORISK_SCENARIOS),GRI_BASELINE_IDS),true);
 assert.equal(Object.keys(RISK_FACTORS).length,5);
 assert.ok(GEORISK_TAXONOMY_VERSION);
});
test('bridge is qualitative; no synthetic converted risk or probabilities',()=>{
 const bridge=explainScenarioBridge('mena_instability','simulator');
 assert.equal(bridge.status,'qualitative_overlap');
 assert.ok(bridge.connections.some(x=>x.id==='mena_instability'));
 for(const key of ['converted_score','prob','risk','weight'])assert.equal(Object.hasOwn(bridge,key),false);
 const opposite=explainScenarioBridge('russia_ukraine_attrition','index');
 assert.ok(opposite.connections.some(x=>x.id==='mena_instability'));
 assert.ok(opposite.factors.some(x=>x.id==='sovereign_finance'));
});
test('unmapped dynamic scenarios are explicitly unavailable, not silently inferred',()=>{
 const x=explainScenarioBridge('new_event_2027','index');
 assert.equal(x.status,'unmapped');assert.equal(x.connections.length,0);
 assert.equal(validateRiskTaxonomy(Object.keys(GEORISK_SCENARIOS),['new_event_2027']),false);
});
test('factor coverage is exhaustive and identifies at least one model on each factor',()=>{
 for(const x of summarizeRiskCoverage()){assert.ok(x.index.length||x.simulator.length);}
 assert.equal(Object.keys(INDEX_FACTORS).length,4);
 assert.equal(Object.keys(SIMULATOR_FACTORS).length,4);
});
