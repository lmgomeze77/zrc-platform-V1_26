// Observed World Bank WDI values. No transformation into risk scores or prices.
export const COUNTRY_FACT_INDICATORS = Object.freeze([
  {code:"NY.GDP.MKTP.CD",label:"PIB nominal",unit:"usd"},
  {code:"NY.GDP.MKTP.KD.ZG",label:"Crecimiento real del PIB",unit:"pct"},
  {code:"FP.CPI.TOTL.ZG",label:"Inflación IPC",unit:"pct"},
  {code:"GC.DOD.TOTL.GD.ZS",label:"Deuda del Gobierno central / PIB",unit:"pct"},
  {code:"BN.CAB.XOKA.GD.ZS",label:"Cuenta corriente / PIB",unit:"pct"}
]);
export const COUNTRY_FACT_SOURCE="Banco Mundial · World Development Indicators";
export function parseCountryFact(payload){
  if(!Array.isArray(payload)||!Array.isArray(payload[1]))return null;
  const row=payload[1].find(r=>r&&typeof r.value==="number"&&Number.isFinite(r.value)&&/^\d{4}$/.test(String(r.date)));
  return row?{value:row.value,year:Number(row.date)}:null;
}
export function countryFactUrl(iso3,indicator){
  if(!/^[A-Z]{3}$/.test(iso3)||!COUNTRY_FACT_INDICATORS.some(x=>x.code===indicator))throw Error("Unsupported country or indicator");
  return "https://api.worldbank.org/v2/country/"+iso3+"/indicator/"+indicator+"?format=json&source=2&per_page=12&date=2019:2026";
}
export function countryFactCoverage(facts,referenceYear){
  const count=COUNTRY_FACT_INDICATORS.filter(x=>facts?.[x.code]).length;
  const dated=COUNTRY_FACT_INDICATORS.map(x=>facts?.[x.code]?.year).filter(Number.isFinite);
  const oldest=dated.length?Math.min(...dated):null;
  const newest=dated.length?Math.max(...dated):null;
  return {count,total:COUNTRY_FACT_INDICATORS.length,oldest,newest,stale:oldest!==null&&referenceYear-oldest>3};
}
