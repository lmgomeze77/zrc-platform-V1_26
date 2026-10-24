import test from "node:test";
import assert from "node:assert/strict";
import {applyCountrySensitivity,countryInvestmentSensitivity} from "../src/data/georiskCountryInvestmentSensitivity.js";
import {calculateInvestmentDecision,DEFAULT_INVESTMENT_INPUTS} from "../src/data/georiskInvestmentEngine.js";
test("unsupported countries do not silently receive fabricated calibration",()=>{
 const x=applyCountrySensitivity(DEFAULT_INVESTMENT_INPUTS,"Estonia");
 assert.equal(x.scenario,null);
 assert.deepEqual(x.inputs,DEFAULT_INVESTMENT_INPUTS);
});
test("supported country has documented editorial score and dated provenance",()=>{
 const x=countryInvestmentSensitivity("España");
 assert.equal(x.country.iso,"ESP");
 assert.ok(Number.isFinite(x.score));
 assert.match(x.asOf,/^20\d{2}-\d{2}-\d{2}$/);
});
test("different supported countries affect exploratory valuation",()=>{
 const a=applyCountrySensitivity(DEFAULT_INVESTMENT_INPUTS,"España");
 const b=applyCountrySensitivity(DEFAULT_INVESTMENT_INPUTS,"Argentina");
 assert.notEqual(a.scenario.score,b.scenario.score);
 assert.notEqual(calculateInvestmentDecision(a.inputs).baseNPV,calculateInvestmentDecision(b.inputs).baseNPV);
});
test("zero intensity produces baseline and preserves insurance quotation input",()=>{
 const x=applyCountrySensitivity(DEFAULT_INVESTMENT_INPUTS,"España",0);
 assert.equal(x.inputs.residualRiskPremium,DEFAULT_INVESTMENT_INPUTS.residualRiskPremium);
 assert.equal(x.inputs.insurancePremiumRate,DEFAULT_INVESTMENT_INPUTS.insurancePremiumRate);
});
