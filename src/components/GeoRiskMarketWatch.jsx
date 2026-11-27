import { useEffect, useState } from "react";
import evidence from "../data/georisk-asset-evidence.json";
import { marketWatchRow } from "../data/georiskMarketWatch.js";
import { C } from "../theme/palette";

const API = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-forecast?region=eu";
const names = { Oro:"Gold", Brent:"Brent", "S&P 500":"S&P 500", "Bund 10a":"Bund 10y", "Treasury 10a":"Treasury 10y", "EUR/USD":"EUR/USD" };
const fmt = (v, es, d=2) => new Intl.NumberFormat(es?"es-ES":"en-GB", { minimumFractionDigits:d, maximumFractionDigits:d, signDisplay:"exceptZero" }).format(v);
const BODY = "var(--zrc-font-body, 'Outfit', sans-serif)";

export default function GeoRiskMarketWatch({ lang="es" }) {
  const es = lang === "es";
  const [band,setBand] = useState("critico");
  const [data,setData] = useState(null), [state,setState] = useState("loading"), [retry,setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setState("loading");
    fetch(API,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error("market feed");return r.json()})
      .then(d=>{setData(d?.region === "eu" ? d : null);setState(d?.region === "eu" ? "ready" : "error")})
      .catch(e=>{if(e.name!=="AbortError"){setData(null);setState("error")}});
    return ()=>abort.abort();
  },[retry]);
  const rows = evidence.assets.map(a=>marketWatchRow(a,band,state==="ready"?data:null,30)).filter(Boolean);
  const choose = (active) => ({border:`1px solid ${active?"#7A1426":C.border}`,background:active?"#7A1426":C.surface2,color:active?"#fff":C.textSec,borderRadius:6,padding:"9px 13px",fontFamily:BODY,fontSize:12,fontWeight:active?650:450,cursor:"pointer",minHeight:42});
  return <section style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"clamp(18px,3vw,32px)",marginBottom:20,fontFamily:BODY}}>
    <p style={{fontSize:10,letterSpacing:2,color:"#9C3047",fontWeight:700,margin:"0 0 10px"}}>ZRC MARKET WATCH · 06</p>
    <h3 style={{fontFamily:"var(--zrc-font-display)",fontSize:"clamp(25px,3.3vw,38px)",color:C.text,margin:"0 0 8px",lineHeight:1.15}}>{es?"Seis activos, una lectura clara":"Six assets, one clear view"}</h3>
    <p style={{fontSize:13,color:C.textSec,lineHeight:1.65,maxWidth:870,margin:"0 0 22px"}}>{es?"Compara evidencia histórica del GPR externo, precios observados y perspectivas estadísticas independientes. Los datos llevan su fecha y cobertura.":"Compare external GPR history, observed prices and independent statistical outlooks. Each figure shows its date and coverage."}</p>
    <div style={{display:"flex",justifyContent:"space-between",gap:18,flexWrap:"wrap",padding:"16px 0",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
      <div><span style={{display:"block",color:C.textMuted,fontSize:11,marginBottom:8}}>{es?"Régimen GPR histórico":"Historical GPR regime"}</span><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["bajo","moderado","elevado","critico"].map(k=><button key={k} type="button" aria-pressed={band===k} onClick={()=>setBand(k)} style={choose(band===k)}>{({bajo:es?"Bajo":"Low",moderado:es?"Moderado":"Moderate",elevado:es?"Elevado":"Elevated",critico:es?"Crítico":"Critical"})[k]}</button>)}</div></div>
      <div style={{alignSelf:"center",fontSize:11,color:C.textMuted,maxWidth:280,lineHeight:1.5}}>{es?"Histórico: variación en los tres meses posteriores. Perspectiva: 30 días cuando exista una serie validada.":"History: change over the following three months. Outlook: 30 days when a validated series exists."}</div>
    </div>
    {state==="loading"&&<p role="status" style={{fontSize:12,color:C.textMuted}}>{es?"Cargando observaciones…":"Loading observations…"}</p>}
    {state==="error"&&<p role="status" style={{fontSize:12,color:C.textSec}}>{es?"No hay datos recientes; se conserva el histórico sin sustituir precios.":"Recent observations unavailable; historical evidence is kept without placeholder prices."} <button type="button" onClick={()=>setRetry(n=>n+1)} style={choose(false)}>{es?"Reintentar":"Retry"}</button></p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:12}}>
      {rows.map(r=>{const unit=r.unit==="bp"?(es?"pb":"bp"):(es?"pp":"pp");const obs=r.observed;const forecast=r.forecast;const difference=fmt(r.excess,es,r.unit==="bp"?0:1);
        return <article key={r.key} style={{border:"1px solid #D4D8DD",borderLeft:"3px solid #A7B7C9",borderRadius:9,background:"#E9EDF1",padding:"20px",minWidth:0,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"baseline",flexWrap:"wrap"}}><h4 style={{color:C.text,fontSize:18,margin:0}}>{es?r.label:names[r.label]||r.label}</h4><span style={{color:r.significant?"#9C3047":C.textMuted,fontSize:11}}>{r.significant?(es?"Diferencia detectada":"Difference detected"):(es?"Sin señal robusta":"No robust signal")}</span></div>
          <div style={{margin:"20px 0 6px",display:"flex",alignItems:"baseline",gap:9,flexWrap:"wrap"}}><strong style={{fontFamily:"var(--zrc-font-figures)",fontWeight:450,fontSize:"clamp(29px,4vw,42px)",color:C.text,lineHeight:1}}>{r.significant?"":"≈ "}{difference}</strong><span style={{fontSize:12,color:C.textMuted}}>{unit} {es?"frente a mediana histórica":"versus historical median"}</span></div>
          <div aria-label={`${es?"Frecuencia histórica de subidas":"Historical frequency of increases"}: ${r.share_up}%`} style={{height:4,background:C.border,borderRadius:5,margin:"14px 0 10px",position:"relative"}}><div style={{position:"absolute",left:"50%",width:1,height:10,top:-3,background:C.textMuted}}/><div style={{width:`${r.share_up}%`,height:4,background:r.significant?"#7A1426":C.textMuted,borderRadius:4}}/></div>
          <p style={{color:C.textMuted,fontSize:11,margin:"0 0 17px"}}>{es?"Muestra":"Sample"} n={r.n} · {es?"subidas":"increases"} {r.share_up}%{r.unit==="bp"?" (yield)":""}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:14,borderTop:`1px solid ${C.border}`,paddingTop:15,marginTop:"auto"}}>
            <div><span style={{display:"block",fontSize:10,color:C.textMuted,marginBottom:6}}>{es?"Último nivel":"Last observed"}</span><strong style={{fontSize:16,color:C.text,fontWeight:650}}>{obs?`${fmt(obs.value,es,r.key==="eurusd"?4:2)} ${obs.unit||""}`:"—"}</strong><span style={{display:"block",fontSize:10,color:C.textMuted,marginTop:5,lineHeight:1.45}}>{obs?`${obs.date} · ${obs.provider}`:(es?"Serie no conectada":"No connected series")}</span></div>
            <div><span style={{display:"block",fontSize:10,color:C.textMuted,marginBottom:6}}>{es?"Perspectiva · 30 días":"Outlook · 30 days"}</span><strong style={{fontSize:16,color:C.text,fontWeight:650}}>{forecast?`${fmt(forecast.value,es,r.key==="eurusd"?4:2)} ${obs?.unit||""}`:"—"}</strong><span style={{display:"block",fontSize:10,color:C.textMuted,marginTop:5,lineHeight:1.45}}>{forecast?(es?"Modelo independiente; no objetivo":"Independent model; not a target"):(es?"No validada":"Not validated")}</span></div>
          </div>
          {obs?.source_url&&<a href={obs.source_url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#9C3047",fontWeight:650,marginTop:15}}>{es?"Consultar fuente":"View source"}</a>}
        </article>})}
    </div>
    <p style={{margin:"18px 0 0",color:C.textMuted,fontSize:11,lineHeight:1.65}}>{es?"El GPR histórico, los precios observados y las perspectivas independientes no constituyen una predicción conjunta ni una calibración del ZRC-GRI. La diferencia histórica no implica causalidad o rentabilidad futura.":"Historical GPR, observed prices and independent outlooks are not a combined forecast or a calibration of ZRC-GRI. Historical differences do not imply causality or future returns."}</p>
  </section>;
}
