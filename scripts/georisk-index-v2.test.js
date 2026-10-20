import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIndexInputs,analyzeIndexHistory,explainIndexInputs} from '../src/worker/georisk-index-v2.js';
const now=new Date('2026-10-21T08:00:00Z');
const scenarios=[
 {key:'mena',label:'MENA',prob:.4,risk:80},
 {key:'europe',label:'Europa',prob:.3,risk:70},
 {key:'trade',label:'Comercio',prob:.2,risk:40},
 {key:'migration',label:'Migración',prob:.1,risk:50},
];
test('preserve original weighted index and explain additive contributors',()=>{
 const x=validateIndexInputs(scenarios,'2026-10-19',now);
 assert.equal(x.ok,true);assert.equal(x.value,66);
 assert.equal(explainIndexInputs(x)[0].key,'mena');
 assert.equal(explainIndexInputs(x).reduce((a,b)=>a+b.contribution,0),66);
});
test('reject invalid/future or contradictory inputs without normalizing silently',()=>{
 assert.equal(validateIndexInputs(scenarios.map((r,i)=>({...r,prob:i===0?.5:r.prob})),'2026-10-19',now).ok,false);
 assert.equal(validateIndexInputs(scenarios,'2026-10-22',now).ok,false);
 assert.equal(validateIndexInputs([scenarios[0],scenarios[0],...scenarios.slice(2)],'2026-10-19',now).ok,false);
 assert.equal(validateIndexInputs(scenarios.map((r,i)=>({...r,risk:i===0?110:r.risk})),'2026-10-19',now).ok,false);
});
test('freshness is visibly separate from valid weights',()=>{
 const x=validateIndexInputs(scenarios,'2026-09-01',now);
 assert.equal(x.ok,true);assert.equal(x.stale,true);
});
test('verified weekly momentum excludes static fallback and no nonconsecutive comparison',()=>{
 const history=[
 {week_start:'2026-09-28',index_value:40,source:'weekly_evidence'},
 {week_start:'2026-10-05',index_value:99,source:'fallback_static'},
 {week_start:'2026-10-12',index_value:45,source:'weekly_evidence'},
 {week_start:'2026-10-19',index_value:48,source:'weekly_evidence'}
 ];
 const x=analyzeIndexHistory(history,now);assert.equal(x.excluded,1);assert.equal(x.delta_week,3);assert.equal(x.trend,'rising');
 assert.equal(x.surprise_status,'not_calibrated');
 assert.equal(analyzeIndexHistory(history.slice(0,3),now).delta_week,null);
});
