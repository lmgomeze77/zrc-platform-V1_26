import {DEFAULT_INVESTMENT_INPUTS} from "./georiskInvestmentEngine.js";
import {INVESTMENT_FIELD_LABELS} from "./georiskInvestmentEvidence.js";

export const WORKSPACE_SNAPSHOT_VERSION="zrc-workspace-v1";
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const safeText=(x,max=90)=>typeof x==="string"?x.trim().slice(0,max):"";
const numericKeys=Object.keys(DEFAULT_INVESTMENT_INPUTS);
const scenarioKeys=["tariff_escalation","mena_instability","eu_fragmentation","detente"];

export function createWorkspaceSnapshot(state){
 const financial=Object.fromEntries(numericKeys.map(key=>[key,Number(state.inputs?.[key]??DEFAULT_INVESTMENT_INPUTS[key])]));
 return {
  schema:WORKSPACE_SNAPSHOT_VERSION,
  exportedAt:new Date().toISOString(),
  project:safeText(state.project),
  country:safeText(state.country),
  comparison:safeText(state.comparison),
  region:safeText(state.region,30),
  sector:safeText(state.sector,30),
  scenarioWeights:Object.fromEntries(scenarioKeys.map(key=>[key,Number(state.scenarioWeights?.[key]??0)])),
  financial:{
   inputs:financial,
   editedFields:state.editedFields?.filter(key=>own(INVESTMENT_FIELD_LABELS,key))??[],
   countryAdjustment:state.countryAdjustment===true,
   sensitivity:state.sensitivity??1
  },
  note:"Escenario hipotético: no se ha verificado ningún input financiero. Archivo local; proteger como documento de trabajo."
 };
}

export function parseWorkspaceSnapshot(data){
 if(!data||typeof data!=="object"||Array.isArray(data)||data.schema!==WORKSPACE_SNAPSHOT_VERSION)throw Error("Formato de expediente no compatible.");
 const financial=data.financial;
 if(!financial||typeof financial!=="object"||!financial.inputs||typeof financial.inputs!=="object")throw Error("Faltan los supuestos financieros.");
 const inputs={};
 for(const key of numericKeys){
  const value=financial.inputs[key];
  if(typeof value!=="number"||!Number.isFinite(value))throw Error("Valor financiero inválido: "+key);
  const low=key==="annualCashFlow"?-100000:key==="capital"?0.01:0;
  if(value<low||value>100000)throw Error("Valor financiero fuera de rango: "+key);
  inputs[key]=value;
 }
 const weights=data.scenarioWeights;
 if(!weights||typeof weights!=="object")throw Error("Faltan los pesos de escenario.");
 const normalized={};let total=0;
 for(const key of scenarioKeys){
  const value=weights[key];
  if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>1)throw Error("Peso de escenario inválido: "+key);
  normalized[key]=value;total+=value;
 }
 if(total<0.999||total>1.001)throw Error("Los pesos de escenario deben sumar 100 %.");
 if(!["eu","usa","asia"].includes(data.region))throw Error("Región no compatible.");
 if(typeof data.sector!=="string"||data.sector.length>30)throw Error("Sector no compatible.");
 const fields=financial.editedFields;
 if(!Array.isArray(fields)||fields.some(key=>!own(INVESTMENT_FIELD_LABELS,key)))throw Error("Procedencia financiera inválida.");
 if(typeof financial.countryAdjustment!=="boolean")throw Error("Ajuste país inválido.");
 if(![0.5,1,1.5,2].includes(financial.sensitivity))throw Error("Intensidad no compatible.");
 return {
  project:safeText(data.project),country:safeText(data.country),
  comparison:safeText(data.comparison),region:data.region,sector:data.sector,
  scenarioWeights:normalized,inputs,editedFields:[...new Set(fields)],
  countryAdjustment:financial.countryAdjustment,sensitivity:financial.sensitivity
 };
}
