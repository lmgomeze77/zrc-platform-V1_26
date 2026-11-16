import {useEffect,useState} from "react";

const colors={amber:"#F2C879",red:"#FF9A92",blue:"#9CCBFA"};
const card={background:"#10253B",border:"1px solid #375778",borderRadius:14,padding:16};
const day=24*60*60*1000;

export default function GeoRiskWeeklyBrief({onOpenTariffs}){
  const [brief,setBrief]=useState(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/data/georisk-weekly-brief.json",{signal:controller.signal,cache:"no-cache"})
      .then(r=>{if(!r.ok)throw Error("brief unavailable");return r.json()})
      .then(d=>setBrief(d))
      .catch(()=>{if(!controller.signal.aborted)setError(true)});
    return ()=>controller.abort();
  },[]);
  if(error)return <section role="status" style={card}>No se pudo cargar la lectura semanal. Consulta las series observadas en Mercados.</section>;
  if(!brief)return <p role="status">Cargando lectura semanal…</p>;
  const stale=Date.now()>Date.parse(brief.valid_until+"T23:59:59Z");
  const age=Math.max(0,Math.floor((Date.now()-Date.parse(brief.published_at+"T00:00:00Z"))/day));
  return <section aria-label="Lectura semanal de riesgo" style={{color:"#E9F1FA"}}>
    <header style={{...card,background:"linear-gradient(135deg,#173958,#10253B)",marginBottom:14}}>
      <div style={{fontSize:11,letterSpacing:1.5,fontWeight:800,color:"#A6D3FC"}}>ZRC · LECTURA SEMANAL · {brief.published_at}</div>
      <h2 style={{fontSize:"clamp(21px,3vw,29px)",lineHeight:1.2,margin:"9px 0"}}>{brief.headline}</h2>
      <p style={{fontSize:15,lineHeight:1.55,margin:"0 0 10px",color:"#D6E4F1"}}>{brief.summary}</p>
      <span role="status" style={{fontSize:12,color:stale?"#F2C879":"#A6D3FC"}}>{stale?"Edición caducada · pendiente de actualización":`Edición de hace ${age} día${age===1?"":"s"} · corte editorial semanal`}</span>
    </header>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:12}}>
      {brief.signals.map(item=><article key={item.id} style={card}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline"}}>
          <h3 style={{fontSize:17,margin:"0 0 10px"}}>{item.label}</h3>
          <strong style={{color:colors[item.tone]||colors.blue,fontSize:13,whiteSpace:"nowrap"}}>{item.direction}</strong>
        </div>
        <p style={{fontSize:14,lineHeight:1.5,margin:"0 0 12px"}}><b>Dato.</b> {item.fact}</p>
        <p style={{fontSize:14,lineHeight:1.5,color:"#C7D9E9",margin:"0 0 12px"}}><b>Para decidir.</b> {item.implication}</p>
        <a href={item.url} target="_blank" rel="noreferrer" style={{color:"#A6D3FC",fontSize:12}}>{item.source} · {item.date} ↗</a>
      </article>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:12,marginTop:14}}>
      <section style={card}>
        <h3 style={{fontSize:17,margin:"0 0 8px"}}>Qué vigilar esta semana</h3>
        <ol style={{fontSize:14,lineHeight:1.55,paddingLeft:20,margin:"0 0 4px"}}>{brief.watch.map(x=><li key={x} style={{marginBottom:6}}>{x}</li>)}</ol>
      </section>
      <section style={card}>
        <h3 style={{fontSize:17,margin:"0 0 8px"}}>Índice ZRC · control editorial</h3>
        <p style={{fontSize:14,lineHeight:1.55,margin:"0 0 9px"}}>Última observación indicada en el briefing: <b>{brief.proposed_index.previous.toFixed(2)}</b> ({brief.proposed_index.previous_date}). Su estado público debe comprobarse antes de citarla como vigente.</p>
        <p style={{fontSize:14,lineHeight:1.55,margin:"0 0 9px"}}><b>{brief.proposed_index.value.toFixed(2)}</b> es una propuesta de actualización, <b>no un índice publicado</b>.</p>
        <p style={{fontSize:12,lineHeight:1.5,color:"#B6C9DA",margin:0}}>{brief.proposed_index.note}</p>
      </section>
    </div>
    <details style={{...card,marginTop:14}}>
      <summary style={{cursor:"pointer",fontSize:15,fontWeight:700}}>¿Cuándo sirve el mapa de costes de importación?</summary>
      <p style={{fontSize:14,lineHeight:1.55}}>Cuando ya sabes qué producto compras y desde qué país. Permite contrastar rutas y calcular una sensibilidad de derechos aduaneros. No sustituye esta lectura semanal ni incluye automáticamente flete, seguros, IVA o requisitos de origen.</p>
      <button type="button" onClick={onOpenTariffs} style={{background:"#D6B166",color:"#10243B",border:0,borderRadius:8,padding:"10px 14px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Abrir herramienta de importación</button>
    </details>
  </section>;
}
