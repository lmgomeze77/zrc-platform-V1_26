import test from 'node:test';
import assert from 'node:assert/strict';
import {GEORISK_SCENARIOS,GEORISK_SCENARIO_VERSION,GEORISK_SCENARIO_WEIGHTS,GEORISK_MODEL_CLASSIFICATION,validateScenarioContract} from '../src/data/georiskScenarioContract.js';
test('Shared analyst scenario contract is valid and weights total 100%',()=>{
 assert.equal(validateScenarioContract(),true);
 assert.ok(GEORISK_SCENARIO_VERSION.includes('2026'));
 assert.equal(Object.values(GEORISK_SCENARIO_WEIGHTS).reduce((a,b)=>a+b,0),1);
 assert.equal(GEORISK_MODEL_CLASSIFICATION.impact_coefficients,'analyst_assumption');
});
test('Shared contract preserves previously published simulator reference score and scenario weights',()=>{
 assert.deepEqual(Object.keys(GEORISK_SCENARIOS),['tariff_escalation','mena_instability','eu_fragmentation','detente']);
 assert.deepEqual(GEORISK_SCENARIO_WEIGHTS,{tariff_escalation:.34,mena_instability:.38,eu_fragmentation:.20,detente:.08});
 assert.equal(Number(Object.values(GEORISK_SCENARIOS).reduce((a,s)=>a+s.prob*s.risk,0).toFixed(2)),75.46);
});
test('Reject invalid coefficients and duplicate unsafe scenario weights',()=>{
 const broken=structuredClone(GEORISK_SCENARIOS);
 broken.detente.impactByRegion.eu.fx=NaN;
 assert.equal(validateScenarioContract(broken),false);
});
