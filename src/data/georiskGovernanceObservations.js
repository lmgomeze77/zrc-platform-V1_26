// WGI estimates are standardized institutional indicators, NOT sovereign CDS or insurance quotes.
export const GOVERNANCE_INDICATORS=Object.freeze([
 {code:"GOV_WGI_GE_EST",label:"Efectividad del Gobierno"},
 {code:"GOV_WGI_RL_EST",label:"Estado de derecho"},
 {code:"GOV_WGI_PV_EST",label:"Estabilidad política"}
]);
export function governanceUrl(iso,code){
 if(!/^[A-Z]{3}$/.test(iso)||!GOVERNANCE_INDICATORS.some(x=>x.code===code))throw Error("Invalid WGI request");
 return "https://api.worldbank.org/v2/country/"+iso+"/indicator/"+code+"?format=json&per_page=20&mrnev=1";
}
export function parseGovernance(payload){
 if(!Array.isArray(payload)||!Array.isArray(payload[1]))return null;
 const item=payload[1].find(x=>x&&Number.isFinite(x.value)&&/^[0-9]{4}$/.test(String(x.date)));
 return item?{value:item.value,year:Number(item.date)}:null;
}
export function qualityOfObservations(indicators,observations,nowYear){
 const available=indicators.map(x=>observations?.[x.code]).filter(x=>x&&Number.isFinite(x.value)&&Number.isInteger(x.year));
 const recent=available.filter(x=>nowYear-x.year<=2&&nowYear>=x.year);
 const years=available.map(x=>x.year);
 return {available:available.length,total:indicators.length,recent:recent.length,
   latest:years.length?Math.max(...years):null,oldest:years.length?Math.min(...years):null,
   label:available.length===0?"Sin datos":available.length===indicators.length&&recent.length===indicators.length?"Completa y reciente":"Parcial o desactualizada"};
}
