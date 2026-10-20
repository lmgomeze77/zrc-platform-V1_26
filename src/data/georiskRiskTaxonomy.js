// P0.2 — Semantic factor taxonomy for two DIFFERENT legacy scenario systems.
// This is a descriptive crosswalk only. Never use it to transform probabilities,
// weights, risk scores or time series; those require a separately approved model.
export const GEORISK_TAXONOMY_VERSION='zrc-risk-taxonomy-2026-10-v1';
export const RISK_FACTORS=Object.freeze({
 conflict_energy:{label:'Conflicto y seguridad energética',channel:'Suministro de energía, rutas marítimas, seguros y costes'},
 trade_policy:{label:'Comercio y restricciones',channel:'Aranceles, exportaciones, suministros y actividad'},
 sovereign_finance:{label:'Estabilidad soberana y financiación',channel:'Spreads, crédito, liquidez y coste de capital'},
 political_social:{label:'Estabilidad política y social',channel:'Migración, gobernanza, políticas y demanda'},
 diplomacy:{label:'Distensión y cooperación',channel:'Desescalada, acuerdos y reapertura de mercados'}
});
export const SIMULATOR_FACTORS=Object.freeze({
 tariff_escalation:['trade_policy'],
 mena_instability:['conflict_energy'],
 eu_fragmentation:['sovereign_finance','political_social'],
 detente:['diplomacy','trade_policy','conflict_energy']
});
export const INDEX_FACTORS=Object.freeze({
 mena_instability:['conflict_energy'],
 russia_ukraine_attrition:['conflict_energy','sovereign_finance'],
 trade_stabilization:['trade_policy','diplomacy'],
 southern_europe_migration:['political_social']
});
export const GRI_BASELINE_IDS=Object.freeze(Object.keys(INDEX_FACTORS));
export const SIMULATOR_IDS=Object.freeze(Object.keys(SIMULATOR_FACTORS));
export function validateRiskTaxonomy(simulatorKeys=SIMULATOR_IDS,indexKeys=GRI_BASELINE_IDS){
 const factorExists=id=>Object.hasOwn(RISK_FACTORS,id);
 const wellDefined=map=>Object.values(map).every(f=>Array.isArray(f)&&f.length>0&&new Set(f).size===f.length&&f.every(factorExists));
 const exact=(a,b)=>a.length===b.length&&a.every(k=>b.includes(k));
 return wellDefined(SIMULATOR_FACTORS)&&wellDefined(INDEX_FACTORS)&&
  exact(simulatorKeys,SIMULATOR_IDS)&&exact(indexKeys,GRI_BASELINE_IDS);
}
export function explainScenarioBridge(key,origin='simulator'){
 const source=origin==='index'?INDEX_FACTORS:SIMULATOR_FACTORS;
 if(!Object.hasOwn(source,key))return {status:'unmapped',factors:[],connections:[],reason:'Escenario no catalogado en esta versión. Revisión editorial necesaria.'};
 const destination=origin==='index'?SIMULATOR_FACTORS:INDEX_FACTORS;
 const other=Object.entries(destination).map(([id,factors])=>{
  const common=source[key].filter(f=>factors.includes(f));
  return {id,shared_factors:common};
 }).filter(x=>x.shared_factors.length);
 return {status:other.length?'qualitative_overlap':'no_overlap',factors:source[key].map(id=>({id,...RISK_FACTORS[id]})),connections:other,
  reason:'Coincidencia temática cualitativa: no es equivalencia de sucesos, probabilidades, puntuaciones ni series históricas.'};
}
export function summarizeRiskCoverage(){
 return Object.entries(RISK_FACTORS).map(([id,factor])=>({
  id,...factor,simulator:Object.keys(SIMULATOR_FACTORS).filter(k=>SIMULATOR_FACTORS[k].includes(id)),
  index:Object.keys(INDEX_FACTORS).filter(k=>INDEX_FACTORS[k].includes(id))
 }));
}
