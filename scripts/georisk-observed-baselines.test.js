import test from 'node:test';
import assert from 'node:assert/strict';
import {applyObservedBaselines,selectObservedReference,REFERENCE_SERIES} from '../src/data/georiskObservedBaselines.js';
const now=new Date('2026-10-21T06:00:00Z');
const entry=(id,value,date,provider='ECB')=>({id,latest:{value,date},provider,source_url:'https://data.ecb.europa.eu/test',status:'available'});
test('live official observation replaces exactly matching baseline and preserves model volatility',()=>{
 const result=applyObservedBaselines({interest_rates:{base:4.75,volatility:.15,unit:'%'},inflation_cpi:{base:3.2}},[entry('ECB_DEPOSIT_RATE',2.0,'2026-10-20')],'eu',now);
 assert.equal(result.interest_rates.base,2);
 assert.equal(result.interest_rates.base_status,'observed');
 assert.equal(result.interest_rates.volatility,.15);
 assert.equal(result.inflation_cpi.base_status,'illustrative');
 assert.equal(result.inflation_cpi.base,3.2);
});
test('missing equivalence cannot map EURUSD to DXY or a US yield to a Bund',()=>{
 assert.equal(REFERENCE_SERIES.usa.fx,undefined);
 assert.equal(selectObservedReference([entry('EURUSD',1.2,'2026-10-20')],'usa','fx',now).status,'unavailable');
 assert.equal(selectObservedReference([entry('DGS10',3.5,'2026-10-20')],'eu','sovereign_yield',now).status,'unavailable');
});
test('stale and future observations cannot silently replace fixed inputs',()=>{
 assert.equal(selectObservedReference([entry('ECB_DEPOSIT_RATE',2,'2026-09-01')],'eu','interest_rates',now).status,'unavailable');
 assert.equal(selectObservedReference([entry('ECB_DEPOSIT_RATE',2,'2026-10-22')],'eu','interest_rates',now).status,'unavailable');
 assert.equal(selectObservedReference([entry('EU_HICP',2.1,'2026-08-01','Eurostat')],'eu','inflation_cpi',now).status,'unavailable');
});
test('valid monthly and daily sources preserve timestamps, providers and data',()=>{
 const a=selectObservedReference([entry('US_CPI',2.3,'2026-09-01','FRED')],'usa','inflation_cpi',now);
 assert.equal(a.status,'observed');assert.equal(a.date,'2026-09-01');assert.equal(a.source,'FRED');
 assert.equal(a.frequency,'monthly');
 assert.equal(selectObservedReference([entry('US_CPI',2.3,'2026-09-01','')],'usa','inflation_cpi',now).status,'unavailable');
});
