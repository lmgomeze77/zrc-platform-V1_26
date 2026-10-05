import { useEffect, useState } from 'react';
const API='https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-forecast';
const number=(value,id)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:/^(EUR|USD)/.test(id)?4:2}).format(value);
const labels={eu:'Zona Euro',usa:'Estados Unidos',asia:'Asia · China'};
const watch={ECB_DEPOSIT_RATE:'Próxima decisión del BCE y nueva comunicación de política monetaria.',EU_HICP:'Próxima publicación del IPC armonizado y cambios en energía e inflación subyacente.',US_CPI:'Próxima publicación del IPC de BLS y cambios en energía e inflación subyacente.',EURUSD:'Decisiones del BCE y la Fed; sorpresas de inflación y movimientos del dólar.',USDCNY:'Fijación del renminbi, decisiones del PBoC y cambios en tensiones comerciales.',ECB_10Y_YIELD:'Decisiones del BCE, inflación y cambios en la prima de plazo.'};
const implications={ECB_DEPOSIT_RATE:'Revisar sensibilidad de financiación y efectivo ante una decisión distinta del escenario de continuidad.',EU_HICP:'Contrastar márgenes, poder de fijación de precios y exposición a costes energéticos.',US_CPI:'Revisar exposición a duración y sensibilidad a cambios en la política monetaria estadounidense.',EURUSD:'Revisar exposición cambiaria de ingresos y costes; contrastar la banda con las coberturas existentes.',USDCNY:'Revisar exposición al renminbi y sensibilidad de costes de importación y exportación.',ECB_10Y_YIELD:'Contrastar duración y coste de financiación. Esta serie no es un diferencial de crédito ni un Bund individual.'};
export default function GeoRiskPredictiveOutlook({region,onRegionChange}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setData(null);setLoading(true);setError('');
  fetch(`${API}?region=${region}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo obtener la previsión.');if(d.region!==region||!Array.isArray(d.series))throw new Error('La respuesta predictiva no corresponde a la región solicitada.');setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[region,attempt]);
 const ready=data?.region===region?data:null;
 const control={background:'#142a20',color:'#E2E8F0',border:'1px solid #475569',borderRadius:7,padding:'9px 12px',cursor:'pointer'};
 const covered=ready?.series.filter(s=>s.horizons?.some(h=>h.status==='available')).length||0;
 return <section aria-label="Perspectiva predictiva" style={{lineHeight:1.65}}>
  <div className="grml-card" style={{padding:20,marginBottom:16}}>
   <h2 style={{margin:'0 0 8px',fontSize:23}}>Pronóstico de parámetros · 30 y 90 días</h2>
   <p style={{color:'#CBD5E1',fontSize:14}}>GeoRisk muestra lo observado. Esta perspectiva estima niveles futuros a partir de las mismas series oficiales y contrasta sus errores con resultados históricos. El score de escenarios se consulta en Supuestos; no se convierte en una probabilidad de este pronóstico.</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{Object.entries(labels).map(([key,label])=><button key={key} aria-pressed={region===key} style={{...control,borderColor:region===key?'#A78BFA':'#475569'}} onClick={()=>onRegionChange(key)}>{label}</button>)}<button style={control} disabled={loading} onClick={()=>setAttempt(n=>n+1)}>Actualizar pronóstico</button></div>
   {loading&&<p role="status">Consultando referencias y contrastando el histórico…</p>}
   {error&&<p role="alert" style={{color:'#FBBF24'}}>{error} Reintenta la consulta; no se generan cifras de sustitución.</p>}
   {ready&&<p style={{fontSize:12,color:'#94A3B8'}}>Emitido: {new Date(ready.generated_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})} · {labels[region]} · {covered} parámetros con pronóstico disponible · {ready.version}</p>}
  </div>
  {ready?.series.map(item=><article key={item.id} className="grml-card" style={{padding:20,marginBottom:16}}>
   <h3 style={{fontSize:18,margin:'0 0 8px'}}>{item.label}</h3>
   <p style={{margin:'0 0 12px',color:'#CBD5E1'}}>Referencia observada: <b>{item.latest?`${number(item.latest.value,item.id)} ${item.unit}`:'No disponible'}</b>{item.latest&&<> · {item.frequency==='monthly'?'Periodo':'Fecha'}: <b>{item.frequency==='monthly'?item.latest.date.slice(0,7):item.latest.date}</b></>}. {item.source_url&&<a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{color:'#93C5FD'}}>Fuente: {item.provider}</a>}</p>
   {item.source_captured_at&&<p style={{fontSize:12,color:'#94A3B8'}}>Captura de la fuente: {new Date(item.source_captured_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}. La fecha de emisión no actualiza el periodo observado.</p>}
   {item.status==='unavailable'?<p role="status" style={{color:'#FBBF24'}}>Sin pronóstico: {item.reason}</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>{item.horizons.map(h=><div key={h.horizon} style={{background:'#102219',padding:16,borderRadius:8,border:'1px solid #244433'}}>
    <div style={{fontSize:12,color:'#A78BFA'}}>A {h.horizon} DÍAS · {item.frequency==='monthly'?`periodo ${h.target_date.slice(0,7)}`:h.target_date}</div>
    {h.status!=='available'?<p style={{color:'#FBBF24'}}>Sin pronóstico: {h.reason}</p>:<>
     <strong style={{fontSize:25}}>{number(h.point,item.id)} <span style={{fontSize:13}}>{item.unit}</span></strong>
     <div style={{color:'#C4B5FD'}}>{h.direction==='up'?'↑ Al alza':h.direction==='down'?'↓ A la baja':'→ Continuidad'} · {h.basis}</div>
     <p style={{fontSize:13}}>Banda de error histórico: <b>{number(h.lower,item.id)} – {number(h.upper,item.id)}</b> {item.unit}</p>
     <p style={{fontSize:12,color:'#94A3B8'}}>Validación retrospectiva: {h.validation.samples} pronósticos · error absoluto medio {number(h.validation.mae,item.id)} {item.unit}. Referencia de continuidad: {number(h.validation.baseline_mae,item.id)} {item.unit}. Periodo: {h.validation.start} a {h.validation.end}.</p>
     {h.validation_warning&&<p style={{fontSize:12,color:'#FBBF24'}}>{h.validation_warning}</p>}
    </>}
   </div>)}</div>}
   <p style={{fontSize:13,marginBottom:4}}><b>Qué vigilar en 30 días:</b> {watch[item.id]}</p>
   <p style={{fontSize:13,marginTop:4}}><b>Implicación para la inversión:</b> {implications[item.id]}</p>
  </article>)}
  {ready&&<div className="grml-card" style={{padding:20,marginBottom:16}}><h3 style={{marginTop:0}}>Cobertura pendiente</h3><p>{ready.missing.join(' · ')}. Estos parámetros requieren series adecuadas antes de publicar un pronóstico.</p></div>}
  <div role="note" style={{padding:16,border:'1px solid #7C5A1B',borderRadius:8,color:'#FDE68A',background:'#2A2112',fontSize:12}}>Pronóstico estadístico de referencia; no es una probabilidad calibrada ni una predicción de decisiones de bancos centrales. La banda resume el 80% de los errores del periodo histórico evaluado; no garantiza cobertura futura. La inflación se proyecta por periodo mensual. Las revisiones de datos no se reconstruyen por fecha de publicación: la validación utiliza las series actualmente disponibles. Un cambio de régimen, conflicto o decisión monetaria puede invalidar la proyección. Los supuestos de escenarios y el sector no alteran estas cifras automáticamente.</div>
 </section>;
}
