// Independent project-level FCFF schedule: analytical assumptions, not market-calibrated.
// Money in M EUR, percentage inputs in percentage points. No financing cash flows.
export const ANNUAL_MODEL_VERSION="ZRC-annual-FCFF-v1";
const finite=(n,name)=>{if(typeof n!=="number"||!Number.isFinite(n))throw Error("Parámetro inválido: "+name);return n;};
const bounded=(n,min,max,name)=>{finite(n,name);if(n<min||n>max)throw Error("Fuera de rango: "+name);return n;};
export function projectCashFlows(config,overrides={}){
 const capital=bounded(config.capital,0.01,100000,"capital");
 const years=bounded(config.years,1,30,"years");
 if(!Number.isInteger(years))throw Error("El horizonte debe ser entero.");
 const initialFCF=bounded(config.annualCashFlow,-100000,100000,"annualCashFlow");
 const terminal=bounded(config.terminalValue,0,100000,"terminalValue");
 const growth=bounded(config.growthRate,-90,100,"growthRate")/100;
 const maintenance=bounded(config.maintenanceCapex,0,100000,"maintenanceCapex");
 const baseRate=bounded(config.baseDiscountRate,0,100,"baseDiscountRate")/100;
 const residual=bounded(config.residualRiskPremium,0,100,"residualRiskPremium")/100;
 const fxShare=bounded(config.fxExposurePct,0,100,"fxExposurePct")/100;
 const fxMove=bounded(config.fxAdverseMovePct,0,100,"fxAdverseMovePct")/100;
 const stressDrop=bounded(config.stressCashFlowDrop,0,100,"stressCashFlowDrop")/100;
 const rate=baseRate+residual;
 const rows=Array.from({length:years},(_,index)=>{
  const year=index+1;
  const supplied=overrides[year]??{};
  const scheduledFCF=initialFCF*Math.pow(1+growth,index);
  const operatingFCF=supplied.operatingFCF===undefined?scheduledFCF:bounded(supplied.operatingFCF,-100000,100000,"operatingFCF");
  const capex=supplied.capex===undefined?maintenance:bounded(supplied.capex,0,100000,"capex");
  const exit=year===years?terminal:0;
  const netFCF=operatingFCF-capex+exit;
  // Shock represents adverse conversion of the exposed positive operating flows.
  // It does not automatically increase losses on negative operating flows.
  const stressOperatingFCF=operatingFCF>=0?operatingFCF*(1-stressDrop)*(1-fxShare*fxMove):operatingFCF;
  const stressNetFCF=stressOperatingFCF-capex+exit;
  return {year,operatingFCF,capex,terminal:exit,netFCF,stressNetFCF};
 });
 const npv=(key,discount)=>-capital+rows.reduce((sum,row)=>sum+row[key]/Math.pow(1+discount,row.year),0);
 const baseNPV=npv("netFCF",rate),stressNPV=npv("stressNetFCF",rate);
 const cash=[-capital,...rows.map(x=>x.netFCF)];
 const irr=calculateIrr(cash);
 const grossFuture=rows.reduce((sum,row)=>sum+row.netFCF,0);
 return {version:ANNUAL_MODEL_VERSION,capital,years,hurdleRate:rate*100,rows,
  baseNPV,stressNPV,irr,undiscountedNet:grossFuture-capital,
  note:"FCFF hipotéticos antes de financiación. No incluye seguros, pérdidas políticas adicionales, impuestos ni working capital salvo que estén incluidos en los FCFF introducidos. Los cambios FX y de estrés no son probabilidades."
 };
}
export function calculateIrr(cashFlows){
 if(!Array.isArray(cashFlows)||cashFlows.length<2||cashFlows.some(v=>typeof v!=="number"||!Number.isFinite(v)))return null;
 // Multiple sign changes can produce multiple roots. Return N/D rather than a misleading single IRR.
 const signs=cashFlows.filter(v=>Math.abs(v)>1e-12).map(v=>Math.sign(v));
 const changes=signs.slice(1).filter((v,i)=>v!==signs[i]).length;
 if(changes!==1)return null;
 const f=r=>cashFlows.reduce((sum,v,i)=>sum+v/Math.pow(1+r,i),0);
 let lo=-0.9999,hi=1;
 let flo=f(lo),fhi=f(hi);
 while(fhi>0&&hi<1e6){hi=hi*2+1;fhi=f(hi);}
 if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)return null;
 for(let i=0;i<160;i++){const mid=(lo+hi)/2,fm=f(mid);if(flo*fm>0){lo=mid;flo=fm;}else hi=mid;}
 return (lo+hi)/2*100;
}
