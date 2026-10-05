import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastSeries, buildOutlook, handleGeoRiskForecast } from '../src/worker/georisk-forecast.js';
const now=new Date('2026-10-05T12:00:00Z');
const monthly=Array.from({length:84},(_,i)=>({date:new Date(Date.UTC(2019,10+i,1)).toISOString().slice(0,10),value:2+i*.02}));
const daily=Array.from({length:1600},(_,i)=>({date:new Date(now.getTime()-(1599-i)*86400000).toISOString().slice(0,10),value:1+i*.0001}));
test('monthly outlook has observed dates, actual future periods, held-out error and distinct horizons',()=>{
 const r=forecastSeries({id:'EU_HICP',frequency:'monthly',points:monthly},now);
 assert.equal(r.latest.date,'2026-10-01');
 for(const h of r.horizons){assert.equal(h.status,'available');assert.ok(h.validation.mae<1e-12);assert.ok(h.validation.samples>=12);assert.match(h.target_date,/-01$/);assert.ok(h.point>r.latest.value);}
 assert.ok(r.horizons[1].point>r.horizons[0].point);
});
test('policy rate stays on explicit continuity benchmark despite historical trend',()=>{
 const r=forecastSeries({id:'ECB_DEPOSIT_RATE',frequency:'daily',points:daily},now);
 assert.ok(r.horizons.every(h=>h.status==='available' && h.point===r.latest.value && h.basis.includes('continuidad')));
});
test('future observations never enter predictions or validation',()=>{
 const item={id:'EURUSD',frequency:'daily',points:daily};
 assert.deepEqual(forecastSeries({...item,points:[...daily,{date:'2027-01-01',value:999}]},now),forecastSeries(item,now));
});
test('missing, stale and short histories never produce invented forecasts',()=>{
 assert.equal(forecastSeries({id:'X'},now).status,'unavailable');
 assert.equal(forecastSeries({id:'X',points:[{date:'2020-01-01',value:2}]},now).status,'unavailable');
 const short=forecastSeries({id:'EURUSD',points:daily.slice(-10)},now);
 assert.ok(short.horizons.every(h=>h.status==='unavailable'));
});
test('region selects real matching series and explicitly identifies missing coverage',()=>{
 const series=[{id:'EU_HICP',frequency:'monthly',points:monthly},{id:'USDCNY',points:daily}];
 const eu=buildOutlook(series,'eu',now),asia=buildOutlook(series,'asia',now);
 assert.equal(eu.series.length,4);assert.equal(asia.series.length,1);assert.equal(asia.series[0].id,'USDCNY');assert.ok(asia.missing.includes('Inflación de China'));
});
test('source failure gives unavailable coverage and endpoint rejects unknown region',async()=>{
 const fail=async()=>{throw new Error('offline');};
 const r=await handleGeoRiskForecast(new Request('https://test/api/georisk-forecast?region=eu'),{},fail,now);
 const d=await r.json();assert.equal(r.status,200);assert.ok(d.series.every(s=>s.status==='unavailable'));
 assert.equal((await handleGeoRiskForecast(new Request('https://test/api/georisk-forecast?region=invalid'),{},fail,now)).status,400);
});
