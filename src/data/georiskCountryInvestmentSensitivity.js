import {COUNTRY_PROFILES,COUNTRY_PROFILE_UPDATED_AT} from "./countryRiskProfiles.js";

// Research scenario mapping, not actuarial, credit-market or insurer calibration.
// Anchor to a reference editorial score of 50. No country data => no adjustments.
export const COUNTRY_SCENARIO_MAPPING_VERSION="ZRC-IDE-country-sensitivity-v1";
export function countryInvestmentSensitivity(countryName, strength=1) {
  const country=COUNTRY_PROFILES.find(p=>p.name.toLocaleLowerCase("es")===String(countryName||"").trim().toLocaleLowerCase("es"));
  if(!country) return null;
  const intensity=Math.max(0,Math.min(2,Number(strength)||0));
  const score=Math.max(0,Math.min(100,country.score));
  const delta=(score-50)/50*intensity;
  return {
    country,score,asOf:COUNTRY_PROFILE_UPDATED_AT,version:COUNTRY_SCENARIO_MAPPING_VERSION,
    // Exploratory additive adjustments: illustrative 0.0-4.0pp risk premium
    // and 0.0-0.3% annual loss per 10M exposure. Not observed prices.
    premiumDeltaPp:Number((delta*2).toFixed(3)),
    annualLossDeltaPer10m:Number((delta*0.15).toFixed(4)),
    stressDropDeltaPp:Number((delta*10).toFixed(3))
  };
}
export function applyCountrySensitivity(inputs,countryName,strength=1) {
  const scenario=countryInvestmentSensitivity(countryName,strength);
  if(!scenario) return {inputs:{...inputs},scenario:null};
  const capital=Number(inputs.capital)||0;
  return {scenario,inputs:{
    ...inputs,
    residualRiskPremium:Math.max(0,Number(inputs.residualRiskPremium)+scenario.premiumDeltaPp),
    annualPoliticalLoss:Math.max(0,Number(inputs.annualPoliticalLoss)+scenario.annualLossDeltaPer10m*capital/10),
    stressCashFlowDrop:Math.max(0,Math.min(100,Number(inputs.stressCashFlowDrop)+scenario.stressDropDeltaPp))
  }};
}
