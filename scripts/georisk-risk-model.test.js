import test from 'node:test';
import assert from 'node:assert/strict';
import {riskFeature,evaluateRiskModel,loadWeeklyRiskHistory} from '../src/worker/georisk-risk-model.js';
const weekly=Array.from({length:65},(_,i)=>({week_start:new Date(Date.UTC(2025,0,6+i*7)).toISOString().slice(0,10),index_value:40+i/4,source:'weekly_evidence'}));
test('weekly print cannot be used before end of its week',()=>{
 assert.equal(riskFeature(weekly,'2025-01-06'),null);
 assert.equal(riskFeature(weekly,'2025-01-12'),null);
 assert.equal(riskFeature(weekly,'2025-01-13').source_date,'2025-01-06');
});
test('fallback index snapshots are never used as evidence',()=>{
 const rows=[{week_start:'2025-01-06',index_value:99,source:'fallback_static'},...weekly.slice(1)];
 assert.equal(riskFeature(rows,'2025-01-13'),null);
});
test('insufficient history never fabricates a risk model forecast',()=>{
 const points=Array.from({length:40},(_,i)=>({date:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),value:1+i*.001}));
 const r=evaluateRiskModel({id:'EURUSD',points},weekly,30,new Date('2026-02-09'));
 assert.equal(r.status,'unavailable');
 assert.equal(r.point,undefined);
});
test('missing credentials fail closed without exposing database details',async()=>{
 assert.deepEqual(await loadWeeklyRiskHistory({}),[]);
});
