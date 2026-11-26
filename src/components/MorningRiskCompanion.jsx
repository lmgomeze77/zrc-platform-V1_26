import { useEffect, useState } from "react";
import { C } from "../theme/palette";

const API = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-morning-risk";
const BODY = "var(--zrc-font-body, 'Outfit', sans-serif)";

export default function MorningRiskCompanion({ lang = "es" }) {
  const en = lang === "en";
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [windowDays, setWindowDays] = useState(30);
  useEffect(() => {
    const controller = new AbortController();
    fetch(API, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error("Morning Intelligence feed unavailable");
      return r.json();
    }).then(setResult).catch(e => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, []);
  const latestDate = result?.latest?.date;
  const cutoff = latestDate ? Date.parse(latestDate) - (windowDays - 1) * 86400000 : 0;
  const points = (result?.history || []).filter(p => Date.parse(p.date) >= cutoff);
  const first = points[0], last = points.at(-1);
  const prior = points.length > 1 ? points[0] : null;
  const x = p => first && last && first.date !== last.date ? 16 + (Date.parse(p.date) - Date.parse(first.date)) / (Date.parse(last.date) - Date.parse(first.date)) * 668 : 350;
  const y = p => 158 - p.value * 1.25;
  const paths = [];
  let segment = [];
  for (const p of points) {
    if (segment.length && Date.parse(p.date) - Date.parse(segment.at(-1).date) > 2 * 86400000) {
      if (segment.length > 1) paths.push(segment);
      segment = [];
    }
    segment.push(p);
  }
  if (segment.length > 1) paths.push(segment);
  return <section style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:"20px clamp(16px,3vw,28px)", marginBottom:20, background:C.surface, fontFamily:BODY }}>
    <div style={{ display:"flex", justifyContent:"space-between", gap:14, flexWrap:"wrap", alignItems:"baseline" }}>
      <div><p style={{ color:"#9C3047", fontSize:11, letterSpacing:2, fontWeight:700, margin:"0 0 7px" }}>ZRC MORNING INTELLIGENCE</p>
        <h3 style={{ fontFamily:"var(--zrc-font-display)", color:C.text, fontSize:"clamp(22px,3vw,30px)", margin:0 }}>{en?"Daily market-risk signal":"Señal diaria de riesgo de mercado"}</h3></div>
      {last && <div style={{ textAlign:"right" }}><strong style={{ fontFamily:"var(--zrc-font-figures)", color:C.text, fontSize:34 }}>{last.value}<span style={{fontSize:14}}> / 100</span></strong><div style={{fontSize:11,color:C.textMuted}}>{last.date}</div></div>}
    </div>
    <p style={{ fontSize:13, color:C.textSec, lineHeight:1.65, maxWidth:850 }}>{en ? "The published daily briefing tracks aggregate capital-markets risk. It has a different scale and methodology from the weekly geopolitical scenario index above; the two readings must not be spliced into one series." : "El briefing publicado mide el riesgo agregado de mercados. Su escala y metodología difieren de las del índice semanal de escenarios geopolíticos anterior; ambas lecturas no forman una misma serie."}</p>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:12}}>
      <span style={{fontSize:11,color:C.textMuted}}>{en?"Published history":"Histórico publicado"}</span>
      {[30,90].map(d=><button key={d} type="button" aria-pressed={windowDays===d} onClick={()=>setWindowDays(d)} style={{border:`1px solid ${windowDays===d?"#7A1426":C.border}`,background:windowDays===d?"#7A1426":C.surface2,color:windowDays===d?"#fff":C.textSec,borderRadius:6,padding:"9px 13px",minHeight:40,cursor:"pointer",fontFamily:BODY,fontWeight:windowDays===d?650:450}}>{d} {en?"days":"días"}</button>)}
      {prior && last && <span aria-live="polite" style={{fontSize:12,color:C.textSec,marginLeft:"auto"}}>{points.length} {en?"published readings":"lecturas publicadas"} · {prior.date}–{last.date} · {en?"change":"variación"} {last.value-prior.value>0?"+":""}{last.value-prior.value} {en?"pts":"pts"}</span>}
    </div>
    {error ? <p role="status" style={{color:C.textMuted,fontSize:13}}>{en?"Daily source temporarily unavailable.":"Fuente diaria temporalmente no disponible."}</p> : !result ? <p role="status" style={{color:C.textMuted,fontSize:13}}>{en?"Loading published observations…":"Cargando observaciones publicadas…"}</p> : <>
      {result.stale && <p role="status" style={{ borderLeft:"3px solid #9C3047", padding:"8px 13px", color:C.textSec, background:C.surface2, fontSize:12 }}>{en ? `No new daily briefing since ${last?.date || "the last publication"}. The displayed value is historical, not today's reading.` : `No hay briefing nuevo desde ${last?.date || "la última publicación"}. El valor mostrado es histórico, no una lectura de hoy.`}</p>}
      {points.length > 1 && <div style={{overflowX:"auto"}}><svg role="img" aria-label={en?"Published daily market-risk history with gaps shown":"Histórico diario publicado de riesgo de mercado, con huecos visibles"} viewBox="0 0 700 190" style={{width:"100%",minWidth:320,maxHeight:270}}>
        {[30,50,70].map(v=><g key={v}><line x1="16" x2="684" y1={158-v*1.25} y2={158-v*1.25} stroke={C.border}/><text x="18" y={151-v*1.25} fontSize="10" fill={C.textMuted}>{v}</text></g>)}
        {paths.map((s,i)=><polyline key={i} points={s.map(p=>`${x(p)},${y(p)}`).join(" ")} fill="none" stroke="#8B213B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
        {points.map(p=><circle key={p.date} cx={x(p)} cy={y(p)} r="2.6" fill="#8B213B"><title>{p.date}: {p.value}/100</title></circle>)}
        <text x="16" y="184" fontSize="10" fill={C.textMuted}>{first.date}</text><text x="684" y="184" textAnchor="end" fontSize="10" fill={C.textMuted}>{last.date}</text>
      </svg></div>}
      <p style={{ fontSize:11, color:C.textMuted, lineHeight:1.6 }}>{en?"Only published readings are plotted. Missing publication dates remain gaps; no values are reconstructed.":"Solo se muestran lecturas publicadas. Los días sin publicación quedan como huecos; no se reconstruyen valores."}</p>
    </>}
  </section>;
}
