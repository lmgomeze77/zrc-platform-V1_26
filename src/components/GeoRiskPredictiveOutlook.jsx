import { useEffect, useMemo, useState } from 'react';
const API='https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-forecast';
const number=(value,id)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:/^(EUR|USD)/.test(id)?4:2}).format(value);
const labels={eu:'Zona Euro',usa:'Estados Unidos',asia:'China'};
const groups={ECB_DEPOSIT_RATE:'Tipos y bonos',ECB_10Y_YIELD:'Tipos y bonos',US_CPI:'Inflación',EU_HICP:'Inflación',EURUSD:'Divisas',EURGBP:'Divisas',EURCNY:'Divisas',USDCNY:'Divisas',EURMXN:'Divisas',EURBRL:'Divisas',EURTRY:'Divisas',EURILS:'Divisas',EURZAR:'Divisas'};
const descriptions={persistence:'El modelo mantiene el último valor observado. Es una referencia, no una señal direccional.',trend:'El modelo prolonga una tendencia histórica; no tiene en cuenta decisiones inesperadas.'};
const groupNames=['Todos','Inflación','Tipos y bonos','Divisas'];
const tone={background:'#102219',border:'1px solid #244433',borderRadius:12,padding:16};
const watch={ECB_DEPOSIT_RATE:'Próxima decisión del BCE y nueva comunicación de política monetaria.',EU_HICP:'Próxima publicación del IPC armonizado y cambios en energía e inflación subyacente.',US_CPI:'Próxima publicación del IPC de BLS y cambios en energía e inflación subyacente.',EURUSD:'Decisiones del BCE y la Fed; sorpresas de inflación y movimientos del dólar.',USDCNY:'Fijación del renminbi, decisiones del PBoC y cambios en tensiones comerciales.',ECB_10Y_YIELD:'Decisiones del BCE, inflación y cambios en la prima de plazo.'};
const implications={ECB_DEPOSIT_RATE:'Revisar sensibilidad de financiación y efectivo ante una decisión distinta del escenario de continuidad.',EU_HICP:'Contrastar márgenes, poder de fijación de precios y exposición a costes energéticos.',US_CPI:'Revisar exposición a duración y sensibilidad a cambios en la política monetaria estadounidense.',EURUSD:'Revisar exposición cambiaria de ingresos y costes; contrastar la banda con las coberturas existentes.',USDCNY:'Revisar exposición al renminbi y sensibilidad de costes de importación y exportación.',ECB_10Y_YIELD:'Contrastar duración y coste de financiación. Esta serie no es un diferencial de crédito ni un Bund individual.'};
export default function GeoRiskPredictiveOutlook({region,onRegionChange}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const [horizon,setHorizon]=useState(30),[group,setGroup]=useState('Todos'),[selected,setSelected]=useState(null),[details,setDetails]=useState(false);
 useEffect(()=>{const controller=new AbortController();setData(null);setLoading(true);setError('');
  fetch(`${API}?region=${region}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo obtener la previsión.');if(d.region!==region||!Array.isArray(d.series))throw new Error('La respuesta predictiva no corresponde a la región solicitada.');setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[region,attempt]);
 const ready=data?.region===region?data:null;
 const control={background:'#142a20',color:'#E2E8F0',border:'1px solid #475569',borderRadius:7,padding:'9px 12px',cursor:'pointer'};
 const covered=ready?.series.filter(s=>s.horizons?.some(h=>h.status==='available')).length||0;
 const filtered=useMemo(()=>ready?.series.filter(s=>group==='Todos'||groups[s.id]===group)||[],[ready,group]);
 const active=filtered.find(s=>s.id===selected)||filtered.find(s=>s.horizons?.some(h=>h.status==='available'))||filtered[0];
 const chosen=active?.horizons?.find(h=>h.horizon===horizon);
 const activeGroup=groups[active?.id]||'Indicadores';
 const summary=h=>h?.direction==='up'?'Tendencia al alza':h?.direction==='down'?'Tendencia a la baja':'Sin cambio previsto';
 const cards=ready?.series||[];
 return <section aria-label="Previsión macroeconómica y de mercados" style={{lineHeight:1.5}}>
  <div className="grml-card" style={{padding:20,marginBottom:16}}>
   <div style={{fontSize:12,color:'#6EE7B7',letterSpacing:1}}>GEORISK · PERSPECTIVAS</div>
   <h2 style={{margin:'6px 0 8px',fontSize:24}}>Qué puede pasar en los próximos 30 o 90 días</h2>
   <p style={{color:'#CBD5E1',fontSize:14,marginTop:0}}>Consulta el último dato, la estimación y su margen de error. Selecciona un indicador para ver qué factores pueden cambiar el resultado.</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'12px 0'}}>{Object.entries(labels).map(([key,label])=><button key={key} aria-pressed={region===key} style={{...control,borderColor:region===key?'#A78BFA':'#475569',background:region===key?'#2A2340':control.background}} onClick={()=>{setSelected(null);setGroup('Todos');onRegionChange(key)}}>{label}</button>)}</div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',margin:'12px 0'}}>
    <span style={{color:'#94A3B8',fontSize:13}}>Horizonte:</span>
    {[30,90].map(n=><button key={n} aria-pressed={horizon===n} style={{...control,padding:'7px 13px',background:horizon===n?'#234A35':control.background,borderColor:horizon===n?'#4ADE80':'#475569'}} onClick={()=>setHorizon(n)}>{n} días</button>)}
    <button style={{...control,marginLeft:'auto'}} disabled={loading} onClick={()=>setAttempt(n=>n+1)}>↻ Actualizar datos</button>
   </div>
   {loading&&<p role="status">Consultando fuentes y calculando estimaciones…</p>}
   {error&&<p role="alert" style={{color:'#FBBF24'}}>{error} No se muestran cifras inventadas.</p>}
   {ready&&<p style={{fontSize:12,color:'#94A3B8',marginBottom:0}}>Consultado: {new Date(ready.generated_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})} · {covered} de {cards.length} indicadores con previsión disponible · Modelo {ready.version}</p>}
  </div>
  {ready&&<>
   <div className="grml-card" style={{padding:20,marginBottom:16}}>
    <h3 style={{margin:'0 0 8px',fontSize:19}}>Explora los indicadores</h3>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{groupNames.map(name=><button key={name} onClick={()=>{setGroup(name);setSelected(null)}} aria-pressed={group===name} style={{...control,padding:'7px 11px',background:group===name?'#234A35':control.background,borderColor:group===name?'#4ADE80':'#475569'}}>{name}</button>)}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:10}}>
     {filtered.map(item=>{const h=item.horizons?.find(h=>h.horizon===horizon);const available=h?.status==='available';return <button type="button" key={item.id} onClick={()=>{setSelected(item.id);setDetails(false)}} aria-pressed={active?.id===item.id} style={{...tone,color:'#E2E8F0',cursor:'pointer',textAlign:'left',borderColor:active?.id===item.id?'#A78BFA':'#244433'}}>
      <div style={{fontSize:12,color:'#94A3B8'}}>{groups[item.id]||'Indicador'}</div>
      <div style={{fontWeight:700,margin:'4px 0'}}>{item.label}</div>
      <div style={{fontSize:18,fontWeight:700}}>{item.latest?number(item.latest.value,item.id):'—'} <span style={{fontSize:11,fontWeight:400}}>{item.unit}</span></div>
      <div style={{fontSize:12,color:available?'#C4B5FD':'#FBBF24',marginTop:6}}>{available?summary(h):'Previsión no disponible'}</div>
     </button>})}
    </div>
    {!filtered.length&&<p style={{color:'#FBBF24'}}>Todavía no hay indicadores conectados a esta categoría para esta región.</p>}
   </div>
   {active&&<article className="grml-card" style={{padding:20,marginBottom:16}}>
    <div style={{fontSize:12,color:'#6EE7B7'}}>{activeGroup} · {labels[region]}</div>
    <h3 style={{fontSize:21,margin:'6px 0 12px'}}>{active.label}</h3>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10}}>
     <div style={tone}><div style={{color:'#94A3B8',fontSize:12}}>Último dato publicado</div><div style={{fontSize:23,fontWeight:700}}>{active.latest?number(active.latest.value,active.id):'—'}</div><div style={{fontSize:12}}>{active.unit} · {active.latest?.date||'Sin fecha'}</div></div>
     <div style={tone}><div style={{color:'#94A3B8',fontSize:12}}>Estimación a {horizon} días</div><div style={{fontSize:23,fontWeight:700}}>{chosen?.status==='available'?number(chosen.point,active.id):'—'}</div><div style={{fontSize:12,color:'#C4B5FD'}}>{chosen?.status==='available'?summary(chosen):'Sin estimación validada'}</div></div>
     <div style={tone}><div style={{color:'#94A3B8',fontSize:12}}>Margen histórico</div><div style={{fontSize:18,fontWeight:700}}>{chosen?.status==='available'?`${number(chosen.lower,active.id)} – ${number(chosen.upper,active.id)}`:'—'}</div><div style={{fontSize:12}}>Rango basado en errores anteriores</div></div>
    </div>
    {chosen?.status==='available'?<>
     <div style={{marginTop:16,padding:16,background:'#122A22',borderLeft:'3px solid #A78BFA',borderRadius:8}}>
      <strong style={{color:'#D8B4FE'}}>Interpretación sencilla</strong>
      <p style={{margin:'6px 0',fontSize:14}}>{chosen.basis?.includes('continuidad')?descriptions.persistence:descriptions.trend} Para {chosen.target_date}, el modelo sitúa la referencia en <b>{number(chosen.point,active.id)} {active.unit}</b>. El rango observado en pruebas históricas va de <b>{number(chosen.lower,active.id)} a {number(chosen.upper,active.id)}</b>.</p>
      {chosen.validation_warning&&<p style={{color:'#FBBF24',fontSize:13}}>{chosen.validation_warning}</p>}
     </div>
     <p style={{fontSize:14}}><b>Qué puede moverlo:</b> {watch[active.id]||'Cambios en política económica, mercados o entorno geopolítico.'}</p>
     <p style={{fontSize:14}}><b>Para empresas e inversores:</b> {implications[active.id]||'Valorar la exposición al indicador, los escenarios alternativos y las coberturas.'}</p>
     <button style={control} aria-expanded={details} onClick={()=>setDetails(x=>!x)}>{details?'Ocultar detalle técnico':'Ver fiabilidad y metodología'} {details?'−':'+'}</button>
     {details&&<div style={{fontSize:13,color:'#CBD5E1',marginTop:12}}>
      <p><b>Modelo:</b> {chosen.basis}. <b>Pruebas retrospectivas:</b> {chosen.validation.samples}; <b>error medio:</b> {number(chosen.validation.mae,active.id)} {active.unit}; <b>error manteniendo el último dato:</b> {number(chosen.validation.baseline_mae,active.id)} {active.unit}.</p>
      <p>El rango se obtiene de los errores del histórico, no constituye una banda de confianza calibrada ni garantiza cobertura futura. Periodo de evaluación: {chosen.validation.start} a {chosen.validation.end}.</p>
     </div>}
    </>:<p role="status" style={{color:'#FBBF24',marginTop:16}}>No se puede publicar esta estimación: {chosen?.reason||active.reason||'No hay suficiente histórico validado.'}</p>}
    <p style={{fontSize:12,color:'#94A3B8',marginTop:16}}>Dato observado: {active.frequency==='monthly'?'periodo':'fecha'} {active.latest?.date||'no disponible'}. {active.source_url&&<a href={active.source_url} target="_blank" rel="noopener noreferrer" style={{color:'#93C5FD'}}>Consultar fuente: {active.provider}</a>}</p>
   </article>}
   <div className="grml-card" style={{padding:20,marginBottom:16}}>
    <div style={{fontSize:11,letterSpacing:1,color:'#6EE7B7'}}>MERCADOS · DATOS PUBLICADOS</div>
    <h3 style={{fontSize:19,margin:'6px 0 8px'}}>Precios e indicadores adicionales</h3>
    <p style={{fontSize:13,color:'#CBD5E1'}}>Brent, WTI, gas natural Henry Hub y bono estadounidense a diez años. Cotizaciones históricas de referencia, no precios en tiempo real ni predicciones automáticas.</p>
    {ready.market_observed?.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}>
      {ready.market_observed.map(m=><div key={m.id} style={tone}>
        <div style={{color:'#94A3B8',fontSize:12}}>{m.label}</div>
        <div style={{fontSize:21,fontWeight:700,marginTop:6}}>{number(m.latest.value,m.id)} <span style={{fontSize:11,fontWeight:400}}>{m.unit}</span></div>
        <div style={{color:'#94A3B8',fontSize:12}}>Dato: {m.latest.date} · {m.observations} observaciones</div>
        <a target="_blank" rel="noopener noreferrer" href={m.source_url} style={{color:'#93C5FD',fontSize:12}}>Fuente: {m.provider}</a>
      </div>)}
    </div>:<p role="status" style={{color:'#FBBF24',fontSize:13}}>La nueva cesta todavía no tiene una captura verificada publicada. No se muestran valores de sustitución.</p>}
   </div>}
   <details style={{border:'1px solid #2F5240',background:'#0D2017',borderRadius:12,marginBottom:16,padding:'10px 14px'}}>
    <summary style={{cursor:'pointer',fontSize:13,color:'#A7F3D0',fontWeight:700,padding:'5px 0'}}>ⓘ Investigación ZRC-GRI · ¿aporta valor predictivo adicional?</summary>
    <div style={{paddingTop:12}}>
   {ready.risk_research&&<div className="grml-card" style={{padding:20,marginBottom:16}}>
    <div style={{fontSize:11,letterSpacing:1,color:'#6EE7B7'}}>LABORATORIO · ZRC-GRI</div>
    <h3 style={{margin:'6px 0 10px',fontSize:20}}>¿El riesgo geopolítico mejora la previsión?</h3>
    <p style={{fontSize:14,color:'#CBD5E1'}}>Contrastamos el índice semanal de ZRC con el comportamiento posterior de las divisas. Solo mostramos una señal experimental cuando mejora al modelo de precio sin cambios en pruebas fuera de muestra. Las estimaciones principales no se alteran.</p>
    {(()=>{const research=ready.risk_research.series?.find(r=>r.id===active?.id)?.horizons.find(h=>h.horizon===horizon);return research?<div style={tone}>
     <div style={{color:research.status==='research_validated'?'#6EE7B7':'#FBBF24',fontWeight:700,fontSize:14}}>{research.status==='research_validated'?'Señal experimental validada':'Aún sin evidencia predictiva suficiente'}</div>
     {research.index&&<p style={{fontSize:13}}>Último ZRC-GRI admisible: <b>{number(research.index.value,'')}</b>/100 · cambio semanal {number(research.index.weekly_change,'')} puntos · semana {research.index.week}.</p>}
     {research.status==='research_validated'?<p style={{fontSize:14}}>Estimación condicionada: <b>{number(research.point,active.id)} {active.unit}</b> · mejora fuera de muestra: {(research.improvement*100).toFixed(1)}% frente a mantener el precio.</p>:<p style={{fontSize:13,color:'#CBD5E1'}}>{research.reason} {Number.isFinite(research.improvement)?`Mejora medida: ${(research.improvement*100).toFixed(1)}%.`:''}</p>}
    </div>:<p style={{fontSize:13,color:'#94A3B8'}}>Este indicador aún no participa en las pruebas del modelo condicionado por el índice.</p>})()}
    <p style={{fontSize:12,color:'#94A3B8'}}>Investigación, no señal de inversión. Se excluyen snapshots de respaldo; la evaluación emplea ventanas no solapadas y puntuaciones disponibles antes de cada predicción.</p>
   </div>}

   <div className="grml-card" style={{padding:18,marginBottom:16}}><h3 style={{margin:'0 0 8px'}}>Indicadores por incorporar</h3><p style={{fontSize:14,color:'#CBD5E1',margin:0}}>{ready.missing?.join(' · ')||'Sin información sobre cobertura pendiente'}. Se mostrarán como series reales cuando estén conectadas y validadas.</p></div>

    </div>
   </details>
  </>}
  <details style={{padding:14,border:'1px solid #37503F',borderRadius:10,color:'#D3E9D8',background:'#102118',fontSize:12}}><summary style={{cursor:'pointer',fontWeight:700}}>ⓘ Cómo interpretar estos pronósticos</summary><div style={{paddingTop:10}}>Estas cifras son referencias estadísticas, no predicciones seguras. La continuidad puede ser el modelo escogido cuando obtiene mejores resultados históricos. No se anticipan decisiones de bancos centrales ni shocks geopolíticos. Las pruebas usan el histórico disponible hoy, no reconstruyen la información conocida en cada publicación.</div></details>
 </section>;
}
