import test from "node:test";
import assert from "node:assert/strict";
import { fetchWgiCountry, parseWgiResponse, WGI_DIMENSIONS } from "../src/worker/georisk-wgi.js";

test("WGI parser keeps valid scores from 0 to 100 and ignores missing or invalid values",()=>{
 const parsed=parseWgiResponse([{},[
  {date:"2025",value:"72.5",countryiso3code:"ESP",country:{value:"Spain"}},
  {date:"2024",value:null},{date:"2023",value:"101"},{date:"1996",value:"61"}
]],WGI_DIMENSIONS[0]);
 assert.deepEqual(parsed.map(row=>[row.year,row.value]),[["1996",61],["2025",72.5]]);
});

test("WGI fetch validates country and returns six sourced dimensions with actual latest year",async()=>{
 const calls=[];
 const fakeFetch=async url=>{calls.push(String(url));return {ok:true,json:async()=>[{},[{date:"2025",value:"64.2",countryiso3code:"ESP",country:{value:"Spain"}}]]};};
 const result=await fetchWgiCountry("esp",fakeFetch,new Date("2026-10-04T00:00:00Z"));
 assert.equal(result.country,"ESP");
 assert.equal(result.dimensions.length,6);
 assert.equal(result.dimensions[0].latest.value,64.2);
 assert.ok(result.source_url.includes("worldwide-governance-indicators"));
 assert.equal(calls.length,6);
 await assert.rejects(()=>fetchWgiCountry("XXX",fakeFetch),/País no disponible/);
});
