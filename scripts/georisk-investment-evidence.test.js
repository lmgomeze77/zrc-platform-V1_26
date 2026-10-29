import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEFAULT_INVESTMENT_INPUTS} from "../src/data/georiskInvestmentEngine.js";
import {buildInvestmentEvidence,INVESTMENT_EVIDENCE_VERSION} from "../src/data/georiskInvestmentEvidence.js";

test("all financial inputs are classified as unverified examples by default",()=>{
 const register=buildInvestmentEvidence(DEFAULT_INVESTMENT_INPUTS);
 assert.equal(register.length,Object.keys(DEFAULT_INVESTMENT_INPUTS).length);
 assert.equal(new Set(register.map(x=>x.key)).size,register.length);
 assert.ok(register.every(x=>x.status==="example"&&x.value===DEFAULT_INVESTMENT_INPUTS[x.key]));
 assert.match(INVESTMENT_EVIDENCE_VERSION,/v1/);
});
test("editing one value changes only its provenance to an unverified user assumption",()=>{
 const register=buildInvestmentEvidence(DEFAULT_INVESTMENT_INPUTS,["capital"]);
 assert.equal(register.find(x=>x.key==="capital").status,"user_assumption");
 assert.equal(register.find(x=>x.key==="annualCashFlow").status,"example");
 assert.ok(register.every(x=>!["verified","observed"].includes(x.status)));
});
test("investment workspace keeps shared operation and country and defaults editorial adjustment off",()=>{
 const dashboard=readFileSync(new URL("../src/pages/intelligence/GeoRiskDashboard.jsx",import.meta.url),"utf8");
 const engine=readFileSync(new URL("../src/pages/intelligence/GeoRiskInvestmentEngine.jsx",import.meta.url),"utf8");
 assert.match(dashboard,/selectedProject=\{dealName\} onProjectChange=\{setDealName\}/);
 assert.match(dashboard,/setDealName\(brief\.name \|\| ""\)/);
 assert.match(dashboard,/setPrimaryCountry\(brief\.country \|\| ""\)/);
 assert.match(engine,/useState\(false\)/);
 assert.match(engine,/buildInvestmentEvidence\(inputs,editedFields\)/);
});
