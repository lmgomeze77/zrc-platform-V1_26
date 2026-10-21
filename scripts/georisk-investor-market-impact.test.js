import test from 'node:test';
import assert from 'node:assert/strict';
import evidence from '../src/data/georisk-asset-evidence.json' with {type:'json'};
const bands=['bajo','moderado','elevado','critico','shock'];
test('Investor market comparison is a complete dated archival dataset',()=>{
 assert.equal(evidence.horizon_months,3);
 assert.match(evidence.current.month,/^\d{4}-\d{2}$/);
 assert.equal(evidence.assets.length,6);
 assert.equal(new Set(evidence.assets.map(a=>a.key)).size,6);
 for(const a of evidence.assets){
  assert.ok(['bp','pct'].includes(a.unit));
  for(const b of bands){
   const x=a.cells[b];
   assert.ok(x&&Number.isInteger(x.n)&&x.n>0);
   for(const k of ['excess','p25','p75','share_up'])assert.equal(Number.isFinite(x[k]),true,`${a.key}/${b}/${k}`);
   assert.ok(x.p25<=x.p75);
   assert.ok(x.share_up>=0&&x.share_up<=100);
   assert.equal(typeof x.significant,'boolean');
  }
 }
});
test('GPR thresholds increase and are not ZRC-GRI thresholds',()=>{
 const t=evidence.gpr_thresholds;
 assert.ok(t.moderado<t.elevado&&t.elevado<t.critico);
 assert.equal(evidence.current.band,'critico');
 assert.ok(evidence.current.gpr>=t.critico);
});
