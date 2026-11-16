import {readFileSync} from "node:fs";
const data=JSON.parse(readFileSync(new URL("../public/data/georisk-weekly-brief.json",import.meta.url),"utf8"));
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T00:00:00Z"));
if(!date(data.published_at)||!date(data.valid_until))throw Error("Missing valid publication dates");
const span=(Date.parse(data.valid_until+"T00:00:00Z")-Date.parse(data.published_at+"T00:00:00Z"))/86400000;
if(span<5||span>8)throw Error("Weekly edition must have a 5–8 day window");
if(!Array.isArray(data.signals)||data.signals.length<3)throw Error("At least three dated signals required");
for(const signal of data.signals){
  if(!signal.fact||!signal.implication||!signal.source||!date(signal.date)||!/^https:\/\//.test(signal.url))throw Error("Signal lacks dated evidence: "+signal.id);
}
if(process.argv.includes("--fresh")&&Date.now()>Date.parse(data.valid_until+"T23:59:59Z"))throw Error("GeoRisk weekly brief is stale: "+data.version);
console.log("GeoRisk weekly brief checked: "+data.version);
