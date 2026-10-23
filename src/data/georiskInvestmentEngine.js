// GeoRisk Investment Decision Engine v1 — deterministic scenario analysis, NOT calibrated country pricing.
// All money values are in millions of EUR. No observed country scores or insurer quotations are inferred.
export const INVESTMENT_ENGINE_VERSION = "ZRC-IDE-1.0-illustrative";
export const DEFAULT_INVESTMENT_INPUTS = Object.freeze({
  capital: 10, annualCashFlow: 2.7, terminalValue: 8, years: 5,
  baseDiscountRate: 11, residualRiskPremium: 3,
  insuredShare: 70, insurancePremiumRate: 1.2, insuranceDeductible: 0.3,
  annualPoliticalLoss: 0.25, stressLoss: 3, stressCashFlowDrop: 30,
  fxHedgeCost: 0.15, financingGuaranteeCost: 0.05
});
const finite = (value, fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bounded = (value,min,max,fallback) => Math.max(min,Math.min(max,finite(value,fallback)));
export function calculateInvestmentDecision(raw={}) {
  const x={...DEFAULT_INVESTMENT_INPUTS,...raw};
  const capital=bounded(x.capital,0.01,100000,10);
  const years=Math.round(bounded(x.years,1,30,5));
  const annualCashFlow=bounded(x.annualCashFlow,-100000,100000,2.7);
  const terminalValue=bounded(x.terminalValue,0,100000,8);
  const baseRate=bounded(x.baseDiscountRate,0,100,11)/100;
  const residualPremium=bounded(x.residualRiskPremium,0,100,3)/100;
  const insuredShare=bounded(x.insuredShare,0,100,70)/100;
  const insurancePremiumRate=bounded(x.insurancePremiumRate,0,50,1.2)/100;
  const deductible=bounded(x.insuranceDeductible,0,100000,0.3);
  const annualLoss=bounded(x.annualPoliticalLoss,0,100000,0.25);
  const stressLoss=bounded(x.stressLoss,0,100000,3);
  const stressDrop=bounded(x.stressCashFlowDrop,0,100,30)/100;
  const fxCost=bounded(x.fxHedgeCost,0,100000,0.15);
  const guaranteeCost=bounded(x.financingGuaranteeCost,0,100000,0.05);
  // User-supplied expected annual loss is before protection. Deductible is assumed to
  // apply to the modeled annual loss; no insurer pricing, claim probability or indemnity is inferred.
  const annualRecovered=Math.min(annualLoss,Math.max(0,annualLoss-deductible)*insuredShare);
  const retainedAnnualLoss=annualLoss-annualRecovered;
  const insuranceAnnualCost=capital*insuredShare*insurancePremiumRate;
  const protectionAnnualCost=insuranceAnnualCost+fxCost+guaranteeCost;
  const annualNetCashFlow=annualCashFlow-protectionAnnualCost-retainedAnnualLoss;
  const hurdleRate=baseRate+residualPremium;
  const npv=(cash,exit)=>-capital+Array.from({length:years},(_,i)=>
    (cash+(i===years-1?exit:0))/Math.pow(1+hurdleRate,i+1)).reduce((a,b)=>a+b,0);
  const baseNPV=npv(annualNetCashFlow,terminalValue);
  // Stress is a full-horizon conservative sensitivity, not a probability-weighted forecast.
  const stressRecovery=Math.min(stressLoss,Math.max(0,stressLoss-deductible)*insuredShare);
  const stressRetainedLoss=stressLoss-stressRecovery;
  const stressNPV=npv(annualCashFlow*(1-stressDrop)-protectionAnnualCost-retainedAnnualLoss,Math.max(0,terminalValue-stressRetainedLoss));
  const annualProtectionShare=protectionAnnualCost/capital*100;
  const breakEvenCashFlow= (capital-terminalValue/Math.pow(1+hurdleRate,years))/
    Array.from({length:years},(_,i)=>1/Math.pow(1+hurdleRate,i+1)).reduce((a,b)=>a+b,0)
    +protectionAnnualCost+retainedAnnualLoss;
  const decision=baseNPV<0?"REVISAR / NO ENTRAR":stressNPV<0?"ENTRAR SOLO CON MITIGACIÓN":"UMBRAL SUPERADO";
  return {version:INVESTMENT_ENGINE_VERSION,capital,years,hurdleRate:hurdleRate*100,
    insuranceAnnualCost,protectionAnnualCost,annualProtectionShare,
    retainedAnnualLoss,annualRecovered,annualNetCashFlow,baseNPV,stressNPV,
    stressRetainedLoss,breakEvenCashFlow,decision,
    inputs:{...x,capital,years}};
}
