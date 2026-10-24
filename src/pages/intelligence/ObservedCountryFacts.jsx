import {useEffect,useState} from "react";
import {COUNTRY_FACT_INDICATORS,COUNTRY_FACT_SOURCE,countryFactUrl,parseCountryFact,countryFactCoverage} from "../../data/georiskObservedCountryFacts.js";

const num=(value,decimals=1)=>value.toLocaleString("es-ES",{maximumFractionDigits:decimals});
function show(value,unit){
 if(unit==="usd")return value>=1e12?num(value/1e12,2)+" USD tn":num(value/1e9,1)+" USD bn";
 return num(value,2)+" %";
}
export default function ObservedCountryFacts({iso,name}){
 const [state,setState]=useState({loading:true,facts:{},errors:0});
 useEffect(()=>{
   const ctrl=new AbortController();
   setState({loading:true,facts:{},errors:0});
   Promise.all(COUNTRY_FACT_INDICATORS.map(async indicator=>{
     try{
       const res=await fetch(countryFactUrl(iso,indicator.code),{signal:ctrl.signal});
       if(!res.ok)throw Error("WDI "+res.status);
       const observation=parseCountryFact(await res.json());
       return {code:indicator.code,observation,error:false};
     }catch(error){
       if(ctrl.signal.aborted)return null;
       return {code:indicator.code,observation:null,error:true};
     }
   })).then(rows=>{
     if(ctrl.signal.aborted)return;
     const facts=Object.fromEntries(rows.filter(Boolean).filter(row=>row.observation).map(row=>[row.code,row.observation]));
     setState({loading:false,facts,errors:rows.filter(row=>row?.error).length});
   });
   return ()=>ctrl.abort();
 },[iso]);
 const coverage=countryFactCoverage(state.facts,new Date().getFullYear());
 return <section className="crp-section" aria-label={"Indicadores macro observados de "+name}>
   <div className="crp-section-title"><span className="crp-eyebrow">DATOS OBSERVADOS · BANCO MUNDIAL</span><h2>Economía y fundamentos</h2>
   <p>Indicadores independientes del score editorial ZRC. Cada dato incluye su año de referencia. No son proyecciones, primas soberanas ni cotizaciones de seguros.</p></div>
   <div className="crp-source-strip">
     <span>Cobertura: {state.loading?"consultando":coverage.count+" de "+coverage.total+" indicadores"}</span>
     <span>Antigüedad: {state.loading?"—":coverage.oldest===null?"sin datos":coverage.oldest+"–"+coverage.newest}</span>
     <span>{coverage.stale?"Al menos un dato tiene más de 3 años":"Revisar fecha individual"}</span>
   </div>
   <div className="crp-pillar-grid">
     {COUNTRY_FACT_INDICATORS.map(indicator=>{
       const observation=state.facts[indicator.code];
       return <article className="crp-pillar" key={indicator.code}>
         <span className="crp-kicker">{indicator.label}</span>
         <h3 style={{margin:"12px 0 6px",fontSize:"clamp(1.1rem,2vw,1.6rem)"}}>{state.loading?"Consultando…":observation?show(observation.value,indicator.unit):"N/D"}</h3>
         <p>{observation?"Año de referencia: "+observation.year:state.loading?"Fuente externa":"No hay observación recuperada; no se estima."}</p>
       </article>;
     })}
   </div>
   <p style={{fontSize:12,opacity:.8}}>Fuente: <a href="https://data.worldbank.org/" target="_blank" rel="noreferrer">{COUNTRY_FACT_SOURCE}</a>. Consulta directa de la API WDI al abrir la ficha. Las series tienen calendarios de publicación distintos y pueden no estar disponibles temporalmente. {state.errors>0?"No se pudieron consultar "+state.errors+" indicadores.":""}</p>
 </section>;
}
