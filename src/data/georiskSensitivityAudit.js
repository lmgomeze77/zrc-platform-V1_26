// P0.4: one explicit, auditable set of *uncalibrated* asset coefficients.
// These numbers are legacy heuristic sensitivity points; NOT percentage
// returns, percentage-point changes, estimated elasticities or betas.
export const SENSITIVITY_VERSION='zrc-sensitivity-audit-v1';
export const SENSITIVITY_STATUS='analyst_heuristic_not_calibrated';
export const SENSITIVITY_COEFFICIENTS={
 'Deuda soberana core':{interest_rates:-9,sovereign_yield:-11,capital_flows:2},
 'Renta fija High Yield':{interest_rates:-6,sovereign_yield:-7,capital_flows:4,inflation_cpi:-2},
 'Real estate prime':{interest_rates:-8,sovereign_yield:-5,capital_flows:7},
 'Materias primas':{commodities:12,inflation_cpi:3},
 'Efectivo / Money Market':{interest_rates:3,sovereign_yield:1}
};
export const ASSET_SENSITIVITY_BY_REGION={
 eu:{...SENSITIVITY_COEFFICIENTS,'Equity exportador':{fx:-35,capital_flows:4}},
 usa:{...SENSITIVITY_COEFFICIENTS,'Equity exportador':{fx:-35,capital_flows:4}},
 asia:{...SENSITIVITY_COEFFICIENTS,'Equity exportador':{fx:35,capital_flows:4}}
};
export function decomposeAssetSensitivity(asset,impactVector,region='eu'){
 const map=ASSET_SENSITIVITY_BY_REGION[region]?.[asset];
 if(!map)return {status:'unavailable',score:null,terms:[],classification:SENSITIVITY_STATUS};
 const terms=Object.entries(map).map(([variable,coefficient])=>{
  const impact=impactVector?.[variable];
  if(!Number.isFinite(impact))return {variable,coefficient,impact:null,contribution:null};
  return {variable,coefficient,impact,contribution:coefficient*impact};
 });
 if(terms.some(t=>t.contribution===null))return {status:'unavailable',score:null,terms,classification:SENSITIVITY_STATUS};
 return {status:'illustrative',score:terms.reduce((n,t)=>n+t.contribution,0),terms,classification:SENSITIVITY_STATUS,unit:'arbitrary_sensitivity_points'};
}
export function estimatePriceImpact(asset,impactVector,region='eu'){
 // Backward-compatible arithmetic, reclassified as illustrative index units.
 const outcome=decomposeAssetSensitivity(asset,impactVector,region);
 return outcome.status==='illustrative'?outcome.score:null;
}
export function validateSensitivityContract(){
 const regions=['eu','usa','asia'],variables=['interest_rates','sovereign_yield','capital_flows','inflation_cpi','commodities','fx'];
 return regions.every(r=>Object.keys(ASSET_SENSITIVITY_BY_REGION[r]).length===6&&
  Object.values(ASSET_SENSITIVITY_BY_REGION[r]).every(coeffs=>Object.entries(coeffs).every(([k,v])=>variables.includes(k)&&Number.isFinite(v)&&Math.abs(v)<=50)));
}
