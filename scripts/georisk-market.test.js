import test from "node:test";
import assert from "node:assert/strict";
import { parseECBHistory, compareECBArchive, getECBArchiveHistory } from "../src/worker/georisk-market.js";
const now = new Date("2026-10-04T10:00:00Z");
const xml = `<Envelope><Cube>
<Cube time="2026-10-02"><Cube rate="1.1225" currency="USD"/><Cube currency='GBP' rate='0.85033'/><Cube currency="CNY" rate="7.5259"/></Cube>
<Cube time="2026-10-01"><Cube currency="USD" rate="1.12"/><Cube currency="GBP" rate="0.85"/></Cube>
<Cube time="2020-01-01"><Cube currency="USD" rate="1.2"/></Cube><Cube time="2026-10-05"><Cube currency="USD" rate="1.3"/></Cube>
</Cube></Envelope>`;
test("ECB observations are ordered, bounded, and crosses use matching dates", () => {
 const s=parseECBHistory(xml,now); assert.deepEqual(s[0].points,[{date:"2026-10-01",value:1.12},{date:"2026-10-02",value:1.1225}]);
 assert.equal(s[0].latest.date,"2026-10-02"); assert.equal(s[3].points.length,1);
 assert.equal(s[3].latest.value,7.5259/1.1225); assert.equal(s[3].derived,true);
});
test("incremental capture distinguishes new dates from revised data", () => {
 const s=parseECBHistory(xml,now); const old=new Map([["EURUSD",new Map([["2026-10-01",1.12],["2026-10-02",1.12]])]]);
 const out=compareECBArchive(s.slice(0,1),old); assert.deepEqual(out.observations,[]);
 assert.deepEqual(out.revisions.map(x=>[x.point.date,x.oldValue,x.point.value]),[["2026-10-02",1.12,1.1225]]);
 assert.equal(compareECBArchive(s.slice(1,2),old).observations.length,2);
});
test("missing, invalid, duplicate and delayed inputs are handled explicitly", () => {
 const s=parseECBHistory(`<Cube time="2026-09-01"><Cube currency="USD" rate="1.1"/><Cube currency="CNY" rate="0"/><Cube currency="GBP" rate="oops"/></Cube>`,now);
 assert.equal(s[0].status,"stale"); assert.equal(s[1].status,"unavailable"); assert.equal(s[3].latest,null);
 assert.throws(()=>parseECBHistory("<error/>",now)); assert.equal(parseECBHistory(xml+xml,now)[0].points.length,2);
});
test("BCE mandate currencies are parsed and accepted by the history endpoint", async () => {
 const extra = `<Cube time="2026-10-02"><Cube currency="MXN" rate="20.5806"/><Cube currency="BRL" rate="5.8610"/><Cube currency="TRY" rate="55.1650"/><Cube currency="ILS" rate="3.4408"/><Cube currency="ZAR" rate="18.7839"/></Cube>`;
 const data=parseECBHistory(extra,now);
 for(const id of ["EURMXN","EURBRL","EURTRY","EURILS","EURZAR"]){
  assert.ok(data.find(item=>item.id===id).latest?.value>0);
  assert.equal((await getECBArchiveHistory(null,new Request("https://example.com/history?series="+id))).status,503);
 }
});
