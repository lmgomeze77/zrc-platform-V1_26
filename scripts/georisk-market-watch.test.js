import test from 'node:test';
import assert from 'node:assert/strict';
import evidence from '../src/data/georisk-asset-evidence.json' with {type:'json'};
import {marketWatchRow,validateMarketWatchMatches} from '../src/data/georiskMarketWatch.js';
test('Only explicitly matched market series can be displayed as an observation or outlook',()=>{
 assert.equal(validateMarketWatchMatches(evidence.assets),true);
 const brent=evidence.assets.find(x=>x.key==='brent');
 const d={market_observed:[{id:'DCOILBRENTEU',status:'observed',latest:{date:'2026-10-20',value:72.3},unit:'USD/barrel',provider:'EIA/FRED',source_url:'https://fred.stlouisfed.org/series/DCOILBRENTEU'}],series:[]};
 const r=marketWatchRow(brent,'critico',d,30);
 assert.equal(r.observed.value,72.3);assert.equal(r.forecast,null);
 assert.equal(r.evidence_index,'external_GPR');
 assert.equal(r.coverage,'observed_no_statistical_outlook');
});
test('EUR/USD can display an independent forecast but never claim it is conditioned on GRI',()=>{
 const asset=evidence.assets.find(x=>x.key==='eurusd');
 const h={horizon:30,status:'available',point:1.12,lower:1.08,upper:1.16,validation:{samples:18}};
 const r=marketWatchRow(asset,'critico',{series:[{id:'EURUSD',status:'available',latest:{date:'2026-10-20',value:1.11},unit:'USD per EUR',provider:'ECB',source_url:'https://data.ecb.europa.eu',horizons:[h]}]},30);
 assert.equal(r.forecast.value,1.12);
 assert.equal(r.forecast_kind,'unconditioned_statistical');
 assert.equal(marketWatchRow(asset,'critico',{series:[]},90).forecast,null);
});
test('No snapshots means historical evidence only; missing series cannot invent levels',()=>{
 for(const asset of evidence.assets){
  const r=marketWatchRow(asset,'elevado',null,90);
  assert.equal(r.coverage,'historical_only');
  assert.equal(r.observed,null);assert.equal(r.forecast,null);
  assert.ok(Number.isFinite(r.excess));
 }
});
test('An unavailable or invalid forecast never becomes a target',()=>{
 const asset=evidence.assets.find(x=>x.key==='eurusd');
 const r=marketWatchRow(asset,'bajo',{series:[{id:'EURUSD',status:'available',latest:{date:'2026-10-20',value:1.12},unit:'USD per EUR',provider:'ECB',horizons:[{horizon:30,status:'available',point:0,lower:1,upper:2}]}]},30);
 assert.equal(r.forecast,null);
});
