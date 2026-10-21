// Shared P0.3 reference catalogue: only identical geography, instrument and
// units may replace illustrative scenario starting levels. Forecasts do not
// become calibrated merely because an observed baseline is used.
export const OBSERVED_REFERENCE_VERSION='macro-baseline-v1';
export const REFERENCE_SERIES={
 eu:{interest_rates:'ECB_DEPOSIT_RATE',inflation_cpi:'EU_HICP',fx:'EURUSD'},
 usa:{inflation_cpi:'US_CPI'},
 asia:{fx:'USDCNY'}
};
const MONTHLY=new Set(['EU_HICP','US_CPI']);
const DAY=86400000;
export function referenceAgeDays(date,now=new Date()){
 const at=Date.parse(date||'');
 return Number.isFinite(at)?Math.floor((now.getTime()-at)/DAY):null;
}
export function selectObservedReference(series,region,variable,now=new Date()){
 const id=REFERENCE_SERIES[region]?.[variable];
 if(!id)return {status:'unavailable',reason:'Sin serie oficial equivalente y comparable conectada.'};
 const item=(Array.isArray(series)?series:[]).find(x=>x.id===id);
 if(!item)return {status:'unavailable',id,reason:'El proveedor no ha entregado una observación.'};
 const value=item.latest?.value,date=item.latest?.date,age=referenceAgeDays(date,now);
 const maxAge=MONTHLY.has(id)?75:10;
 if(!Number.isFinite(value)||age===null||age<0||age>maxAge||item.status==='unavailable'&&/desactualizada|stale/i.test(item.reason||''))
  return {status:'unavailable',id,reason:'Observación ausente, futura o desactualizada.'};
 if(!item.provider||!/^https:\/\//.test(item.source_url||''))
  return {status:'unavailable',id,reason:'Proveedor o URL de fuente no verificable.'};
 return {status:'observed',id,value,date,age_days:age,source:item.provider,source_url:item.source_url,frequency:MONTHLY.has(id)?'monthly':'daily'};
}
export function applyObservedBaselines(referenceVariables,series,region,now=new Date()){
 return Object.fromEntries(Object.entries(referenceVariables).map(([key,original])=>{
  const observed=selectObservedReference(series,region,key,now);
  return [key,observed.status==='observed'?{
   ...original,base:observed.value,observed,base_status:'observed',source:observed.source
  }:{
   ...original,base_status:'illustrative',observed:null,reference_warning:observed.reason||'Sin dato observado verificable'
  }];
 }));
}
