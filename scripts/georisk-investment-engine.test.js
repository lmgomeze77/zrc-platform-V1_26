import test from "node:test";
import assert from "node:assert/strict";
import {calculateInvestmentDecision,DEFAULT_INVESTMENT_INPUTS} from "../src/data/georiskInvestmentEngine.js";

test("base NPV uses discounted net cash flows and terminal value",()=>{
 const r=calculateInvestmentDecision({capital:10,annualCashFlow:2,terminalValue:0,years:1,
 baseDiscountRate:0,residualRiskPremium:0,insuredShare:0,annualPoliticalLoss:0,
 fxHedgeCost:0,financingGuaranteeCost:0});
 assert.equal(r.baseNPV,-8);
 assert.equal(r.breakEvenCashFlow,10);
});
test("insurance premium is charged only on covered capital",()=>{
 const r=calculateInvestmentDecision({capital:10,insuredShare:50,insurancePremiumRate:2,
 fxHedgeCost:0,financingGuaranteeCost:0,annualPoliticalLoss:0});
 assert.ok(Math.abs(r.insuranceAnnualCost-0.1)<1e-9);
});
test("uninsured expected losses reduce NPV and coverage does not create money",()=>{
 const base={capital:10,years:2,annualPoliticalLoss:1,insuranceDeductible:0,
 insurancePremiumRate:0,fxHedgeCost:0,financingGuaranteeCost:0};
 const uncovered=calculateInvestmentDecision({...base,insuredShare:0});
 const covered=calculateInvestmentDecision({...base,insuredShare:100});
 assert.ok(covered.baseNPV>uncovered.baseNPV);
 assert.equal(covered.retainedAnnualLoss,0);
 assert.equal(uncovered.retainedAnnualLoss,1);
});
test("larger residual premium lowers NPV, without altering expected loss",()=>{
 const a=calculateInvestmentDecision({...DEFAULT_INVESTMENT_INPUTS,residualRiskPremium:0});
 const b=calculateInvestmentDecision({...DEFAULT_INVESTMENT_INPUTS,residualRiskPremium:10});
 assert.ok(b.baseNPV<a.baseNPV);
 assert.equal(a.retainedAnnualLoss,b.retainedAnnualLoss);
});
test("stress case is no more optimistic for nonnegative cash flow",()=>{
 const r=calculateInvestmentDecision(DEFAULT_INVESTMENT_INPUTS);
 assert.ok(r.stressNPV<=r.baseNPV);
});
test("invalid and extreme input values produce finite output",()=>{
 const r=calculateInvestmentDecision({capital:-100,years:999,annualCashFlow:"bad",insurancePremiumRate:10000});
 for(const key of ["baseNPV","stressNPV","breakEvenCashFlow","hurdleRate"])assert.ok(Number.isFinite(r[key]));
 assert.equal(r.years,30);
});
