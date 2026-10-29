import {DEFAULT_INVESTMENT_INPUTS} from "./georiskInvestmentEngine.js";
import {INVESTMENT_FIELD_LABELS} from "./georiskInvestmentEvidence.js";

export const WORKSPACE_SNAPSHOT_VERSION="zrc-workspace-v1";
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const safeText=(x,max=90)=>typeof x==="string"?x.trim().slice(0,max):"";
const numericKeys=Object.keys(DEFAULT_INVESTMENT_INPUTS);
const scenarioKeys=["tariff_escalation","mena_instability","eu_fragmentation","detente"];
export const DEFAULT_ANNUAL_SETTINGS=Object.freeze({growthRate:0,maintenanceCapex:0,fxExposurePct:0,fxAdverseMovePct:0});
const annualLimits={growthRate:[-90,100],maintenanceCapex:[0,100000],fxExposurePct:[0,100],fxAdverseMovePct:[0,100]};
function validateAnnual(settings={},overrides={}){
 if(!settings||typeof settings!=="object"||Array.isArray(settings)||!overrides||typeof overrides!=="object"||Array.isArray(overrides))throw Error("Escenario anual inválido.");
 const clean={};
 for(const [key,defaultValue] of Object.entries(DEFAULT_ANNUAL_SETTINGS)){
  const value=settings[key]??defaultValue,[min,max]=annualLimits[key];
  if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw Error("Supuesto anual inválido: "+key);
  clean[key]=value;
 }
 const cleanOverrides={};
 if(Object.keys(overrides).length>30)throw Error("Demasiados ejercicios anuales.");
 for(const [year,values] of Object.entries(overrides)){
  if(!/^(?:[1-9]|[12][0-9]|30)$/.test(year)||!values||typeof values!=="object"||Array.isArray(values))throw Error("Año no válido.");
  const row={};
  for(const [key,value] of Object.entries(values)){
   if(!["operatingFCF","capex"].includes(key)||typeof value!=="number"||!Number.isFinite(value)||value<(key==="capex"?0:-100000)||value>100000)throw Error("Flujo anual no válido.");
   row[key]=value;
  }
  cleanOverrides[year]=row;
 }
 return {annualSettings:clean,annualOverrides:cleanOverrides};
}

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
  ...validateAnnual(state.annualSettings,state.annualOverrides),
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
 const annual=validateAnnual(data.annualSettings,data.annualOverrides);
 return {
  project:safeText(data.project),country:safeText(data.country),
  comparison:safeText(data.comparison),region:data.region,sector:data.sector,
  scenarioWeights:normalized,inputs,editedFields:[...new Set(fields)],
  countryAdjustment:financial.countryAdjustment,sensitivity:financial.sensitivity,...annual
 };
}
