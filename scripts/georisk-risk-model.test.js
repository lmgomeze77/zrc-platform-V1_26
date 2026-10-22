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

test('a weekly score with unknown publication vintage cannot be promoted to predictive output',()=>{
 const points=Array.from({length:450},(_,i)=>({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),value:1.1+Math.sin(i/18)*0.01}));
 const r=evaluateRiskModel({id:'EURUSD',frequency:'daily',points},weekly,30,new Date('2026-04-01'));
 assert.equal(r.status,'unavailable');
 assert.equal(r.validation_gate,'missing_point_in_time_publication');
 assert.equal(r.point,undefined);
});
test('weekly features cannot use a print published after forecast origin',()=>{
 const dated=[{week_start:'2025-01-06',index_value:55,source:'weekly_evidence',published_at:'2025-01-22T12:00:00Z'}];
 assert.equal(riskFeature(dated,'2025-01-14'),null);
 assert.equal(riskFeature(dated,'2025-01-23')?.level,55);
});

test('mixed old and properly dated index rows do not contaminate vintage features',()=>{
 const history=[{week_start:'2025-01-06',index_value:99,source:'weekly_evidence'},
 {week_start:'2025-01-13',index_value:45,source:'weekly_evidence',published_at:'2025-01-21T10:00:00Z'}];
 assert.equal(riskFeature(history.filter(x=>x.published_at),'2025-01-22')?.level,45);
});
