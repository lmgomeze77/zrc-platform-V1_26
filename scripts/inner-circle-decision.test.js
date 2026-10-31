import test from 'node:test';
import assert from 'node:assert/strict';
import { cashSensitivity, normalizeDecision, buildDecisionMarkdown } from '../src/data/innercircle/decisionDesk.js';

test('collection stress and FX expenses remain separate quantities',()=>{
 const result=cashSensitivity({creditSales:730000,extraDays:15,fxPayments:100000,fxIncrease:10});
 assert.equal(result.receivables,30000);assert.equal(result.fxCost,10000);
 assert.deepEqual(Object.keys(result).sort(),['fxCost','receivables']);
});
test('empty exposure produces zero rather than fictitious estimates',()=>{
 assert.deepEqual(cashSensitivity({}),{receivables:0,fxCost:0});
});
test('stored input rejects unknown selections, negative exposure and invalid check markers',()=>{
 const d=normalizeDecision({country:'<script>',type:'unknown',creditSales:-20,extraDays:500,checked:[0,0,2,7,'1'],reviewDate:'tomorrow'});
 assert.equal(d.country,'MX');assert.equal(d.type,'expansion');assert.equal(d.creditSales,0);assert.equal(d.extraDays,365);assert.deepEqual(d.checked,[0,2]);assert.equal(d.reviewDate,'');
});
test('a saved brief round-trips and exports member edits and dated sources',()=>{
 const original=normalizeDecision({name:'Compra industrial',type:'acquisition',country:'CO',reviewDate:'2026-11-30',checked:[1],nextStep:'Reconciliar deuda y capital circulante.'});
 const restored=normalizeDecision(JSON.parse(JSON.stringify(original)));
 assert.deepEqual(restored,original);
 const text=buildDecisionMarkdown(restored,[{title:'Fuente de octubre',url:'https://example.org/source',published:'30 de octubre de 2026'}],'2026-10-31T16:00:00Z');
 assert.match(text,/Adquirir una empresa/);assert.match(text,/Reconciliar deuda y capital circulante/);assert.match(text,/\[x\] Capital circulante/);assert.match(text,/https:\/\/example.org\/source/);assert.match(text,/No se suman ambas cifras/);
});

test('English brief exports translated guidance while preserving member input',()=>{
 const text=buildDecisionMarkdown({name:'Operación propia',nextStep:'Mi siguiente paso'},[], '', 'en',s=>s==='Expandir un negocio'?'Expand a business':s);
 assert.match(text,/# Inner Circle · Decision brief/);assert.match(text,/Transaction: Expand a business/);assert.match(text,/Operación propia/);assert.match(text,/Mi siguiente paso/);assert.match(text,/These figures are not added/);
});
