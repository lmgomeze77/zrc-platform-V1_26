import {useEffect,useState} from "react";
import {GOVERNANCE_INDICATORS,governanceUrl,parseGovernance,qualityOfObservations} from "../../data/georiskGovernanceObservations.js";
export default function GovernanceCountryFacts({iso}){
 const [data,setData]=useState({loading:true,values:{},failed:0});
 useEffect(()=>{
  const ctrl=new AbortController();
  setData({loading:true,values:{},failed:0});
  Promise.all(GOVERNANCE_INDICATORS.map(async item=>{
   try{
    const response=await fetch(governanceUrl(iso,item.code),{signal:ctrl.signal});
    if(!response.ok)throw Error("World Bank");
    return {code:item.code,value:parseGovernance(await response.json()),failed:false};
   }catch(e){return {code:item.code,value:null,failed:!ctrl.signal.aborted};}
  })).then(rows=>{
   if(!ctrl.signal.aborted)setData({loading:false,values:Object.fromEntries(rows.filter(x=>x.value).map(x=>[x.code,x.value])),failed:rows.filter(x=>x.failed).length});
  });
  return ()=>ctrl.abort();
 },[iso]);
 const q=qualityOfObservations(GOVERNANCE_INDICATORS,data.values,new Date().getFullYear());
 return <section className="crp-section" aria-label="Indicadores de gobernanza observados">
  <div className="crp-section-title"><span className="crp-eyebrow">RIESGO INSTITUCIONAL · WGI</span><h2>Gobernanza y estabilidad</h2>
   <p>Estimaciones estandarizadas del Banco Mundial. Valores mayores indican mejores resultados institucionales, no porcentajes, probabilidades de impago ni primas aseguradoras.</p></div>
  <div className="crp-source-strip"><span>Calidad: {data.loading?"Consultando":q.label}</span>
   <span>Datos: {data.loading?"—":q.available+" de "+q.total}</span>
   <span>Recientes: {data.loading?"—":q.recent+" de "+q.total}</span></div>
  <div className="crp-pillar-grid">{GOVERNANCE_INDICATORS.map(item=>{
    const v=data.values[item.code];
    return <article className="crp-pillar" key={item.code}><span className="crp-kicker">{item.label}</span>
     <h3>{data.loading?"Consultando…":v?v.value.toLocaleString("es-ES",{maximumFractionDigits:2}):"N/D"}</h3>
     <p>{v?"Año de referencia: "+v.year:"Sin observación recuperada"}</p>
    </article>;
   })}</div>
  <p>Fuente: <a href="https://www.worldbank.org/en/publication/worldwide-governance-indicators" target="_blank" rel="noreferrer">Banco Mundial · WGI</a>. Datos observados sin recalibrar. {data.failed>0?"Consultas fallidas: "+data.failed+".":""} No se sustituyen datos ausentes.</p>
 </section>;
}
