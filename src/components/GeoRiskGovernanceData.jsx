import { useEffect, useState } from "react";
const endpoint="https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-wgi-data";
const countries=[["ESP","España"],["PRT","Portugal"],["MEX","México"],["COL","Colombia"],["BRA","Brasil"],["CHL","Chile"],["ARG","Argentina"],["PER","Perú"],["URY","Uruguay"],["PAN","Panamá"],["MAR","Marruecos"],["SAU","Arabia Saudí"],["ARE","Emiratos Árabes Unidos"],["TUR","Türkiye"],["ISR","Israel"]];
const fmt=value=>new Intl.NumberFormat("es-ES",{maximumFractionDigits:1}).format(value);
const card={background:"#101f30",border:"1px solid #334155",borderRadius:9,padding:14};
export default function GeoRiskGovernanceData(){
 const [country,setCountry]=useState("ESP"),[data,setData]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");setData(null);
  fetch(endpoint+"?country="+country,{signal:controller.signal}).then(async response=>{const json=await response.json();if(!response.ok)throw new Error(json.error||"No se pudieron cargar los datos.");setData(json);})
   .catch(err=>{if(err.name!=="AbortError")setError(err.message);}).finally(()=>setLoading(false));
  return()=>controller.abort();
 },[country]);
 return <section aria-labelledby="wgi-title" style={{marginTop:18,padding:20,color:"#CBD5E1",background:"#0d1826",border:"1px solid #334155",borderRadius:12}}>
  <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
   <div><h2 id="wgi-title" style={{fontSize:20,margin:"0 0 6px"}}>Instituciones y gobernanza</h2>
    <p style={{fontSize:13,lineHeight:1.65,maxWidth:840,margin:"0 0 12px"}}>Seis referencias para entender el contexto institucional de largo plazo. No miden un suceso de esta semana ni cambian la puntuación GeoRisk.</p></div>
   <label style={{fontSize:13}}>País{" "}<select value={country} onChange={event=>setCountry(event.target.value)} style={{marginLeft:6,padding:"8px 10px",background:"#101f30",color:"#E2E8F0",border:"1px solid #475569",borderRadius:6}}>
    {countries.map(([code,label])=><option key={code} value={code}>{label}</option>)}
   </select></label>
  </div>
  {loading&&<p role="status">Consultando Banco Mundial…</p>}
  {error&&<p role="alert" style={{color:"#FBBF24"}}>{error}</p>}
  {data&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10,marginTop:12}}>
   {data.dimensions.map(item=>{const latest=item.latest,previous=item.points.length>1?item.points[item.points.length-2]:null;
    return <article key={item.id} style={card}><div style={{fontSize:14,fontWeight:650}}>{item.label}</div>
     <div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>{item.simple}</div>
     {latest?<><div style={{fontSize:27,fontWeight:700,marginTop:10}}>{fmt(latest.value)}<span style={{fontSize:12,fontWeight:400,color:"#94A3B8"}}> / 100</span></div>
      <div style={{fontSize:12,color:"#94A3B8"}}>Último año publicado: {latest.year}{previous?" · "+previous.year+": "+fmt(previous.value):""}</div></>:<div style={{fontSize:13,marginTop:12}}>Sin dato publicado</div>}
    </article>;
   })}
  </div><p style={{fontSize:11,color:"#94A3B8",lineHeight:1.6,margin:"14px 0 0"}}>Una cifra más alta refleja una percepción más favorable en esa dimensión, no “menos riesgo” automáticamente. El WGI combina encuestas y evaluaciones expertas; puede tener incertidumbre y revisiones, y no debe usarse como calificación crediticia ni como criterio único de inversión. Fuente: <a href={data.source_url} target="_blank" rel="noopener noreferrer" style={{color:"#93C5FD"}}>Banco Mundial</a> · licencia CC BY 4.0 · consultado {new Date(data.fetched_at).toLocaleDateString("es-ES")}.</p></>}
 </section>;
}
