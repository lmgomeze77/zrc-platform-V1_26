// Single versioned scenario contract for GeoRisk Dashboard and GeoRisk ML.
// Analyst assumptions: weights, intrinsic risk and impact coefficients are NOT calibrated.
export const GEORISK_SCENARIO_VERSION = 'analyst-scenarios-2026-10-v1';
export const GEORISK_MODEL_CLASSIFICATION = Object.freeze({scenario_weights:'analyst_assumption',intrinsic_risk:'analyst_assumption',impact_coefficients:'analyst_assumption',macro_baselines:'illustrative_fixed_reference'});
export const GEORISK_SCENARIOS = {
  tariff_escalation: {
    label: "Escalada Arancelaria",
    desc: "Tensiones comerciales EE.UU.–China–UE",
    prob: 0.34, risk: 78, color: "#F59E0B",
    impactByRegion: {
      eu:   { interest_rates: 0.35,  inflation_cpi: 0.55, fx: -0.08, commodities: 0.45, sovereign_yield: 0.40,  capital_flows: -0.60 },
      usa:  { interest_rates: 0.15,  inflation_cpi: 0.65, fx: 0.30,  commodities: 0.45, sovereign_yield: 0.25,  capital_flows: 0.35 },
      asia: { interest_rates: -0.10, inflation_cpi: 0.20, fx: 0.55,  commodities: 0.45, sovereign_yield: -0.15, capital_flows: -0.75 },
    }
  },
  mena_instability: {
    label: "Inestabilidad MENA",
    desc: "Conflicto Oriente Medio · Disrupción energética",
    prob: 0.38, risk: 85, color: "#EF4444",
    impactByRegion: {
      eu:   { interest_rates: 0.20, inflation_cpi: 0.75, fx: -0.12, commodities: 0.90, sovereign_yield: 0.30,  capital_flows: -0.45 },
      usa:  { interest_rates: 0.10, inflation_cpi: 0.55, fx: 0.25,  commodities: 0.90, sovereign_yield: 0.15,  capital_flows: 0.30 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.60, fx: 0.30,  commodities: 0.90, sovereign_yield: -0.10, capital_flows: -0.50 },
    }
  },
  eu_fragmentation: {
    label: "Fragmentación Europea",
    desc: "Tensiones soberanas · Spreads periféricos",
    prob: 0.20, risk: 72, color: "#8B5CF6",
    impactByRegion: {
      eu:   { interest_rates: 0.45, inflation_cpi: 0.30, fx: -0.20, commodities: 0.15, sovereign_yield: 0.85,  capital_flows: -0.70 },
      usa:  { interest_rates: 0.05, inflation_cpi: 0.10, fx: 0.35,  commodities: 0.10, sovereign_yield: -0.10, capital_flows: 0.55 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.05, fx: 0.15,  commodities: 0.05, sovereign_yield: -0.05, capital_flows: -0.20 },
    }
  },
  detente: {
    label: "Distensión Geopolítica",
    desc: "Acuerdos diplomáticos · Reducción primas riesgo",
    prob: 0.08, risk: 28, color: "#10B981",
    impactByRegion: {
      eu:   { interest_rates: -0.20, inflation_cpi: -0.30, fx: 0.08,  commodities: -0.35, sovereign_yield: -0.40, capital_flows: 0.50 },
      usa:  { interest_rates: -0.10, inflation_cpi: -0.20, fx: -0.15, commodities: -0.35, sovereign_yield: -0.15, capital_flows: -0.10 },
      asia: { interest_rates: -0.05, inflation_cpi: -0.10, fx: -0.30, commodities: -0.35, sovereign_yield: -0.10, capital_flows: 0.65 },
    }
  },
};


export const GEORISK_SCENARIO_KEYS=Object.keys(GEORISK_SCENARIOS);
export const GEORISK_SCENARIO_WEIGHTS=Object.fromEntries(Object.entries(GEORISK_SCENARIOS).map(([key,value])=>[key,value.prob]));
export function validateScenarioContract(scenarios=GEORISK_SCENARIOS){
 const entries=Object.entries(scenarios),weights=entries.reduce((sum,[,x])=>sum+x.prob,0);
 const variables=['interest_rates','inflation_cpi','fx','commodities','sovereign_yield','capital_flows'];
 return entries.length===4&&Math.abs(weights-1)<1e-9&&entries.every(([k,x])=>k&&x.label&&Number.isFinite(x.prob)&&x.prob>=0&&Number.isFinite(x.risk)&&x.risk>=0&&x.risk<=100&&['eu','usa','asia'].every(region=>variables.every(v=>Number.isFinite(x.impactByRegion?.[region]?.[v])&&Math.abs(x.impactByRegion[region][v])<=1)));
}
