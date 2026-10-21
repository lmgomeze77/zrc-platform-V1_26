import { useEffect,useState } from 'react';
import evidence from '../data/georisk-asset-evidence.json';
import {marketWatchRow,validateMarketWatchMatches} from '../data/georiskMarketWatch.js';
import { C } from '../theme/palette';
const API='https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-forecast?region=eu';
const enNames={Oro:'Gold',Brent:'Brent','S&P 500':'S&P 500','Bund 10a':'Bund 10y','Treasury 10a':'Treasury 10y','EUR/USD':'EUR/USD'};
const f=(v,es,d=2)=>new Intl.NumberFormat(es?'es-ES':'en-GB',{maximumFractionDigits:d,minimumFractionDigits:d,signDisplay:'exceptZero'}).format(v);
export default function GeoRiskMarketWatch({lang='es'}){
 const es=lang==='es';
 const [band,setBand]=useState('critico'),[horizon,setHorizon]=useState(30),[data,setData]=useState(null),[state,setState]=useState('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;const abort=new AbortController();setState('loading');
 fetch(API,{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('API');return r.json()}).then(d=>{if(active){setData(d?.region==='eu'?d:null);setState(d?.region==='eu'?'ready':'error')}}).catch(()=>{if(active){setData(null);setState('error')}});
 return ()=>{active=false;abort.abort()};},[retry]);
 const rows=evidence.assets.map(a=>marketWatchRow(a,band,state==='ready'?data:null,horizon)).filter(Boolean);
 const statusColor=row=>row.significant?C.gold:C.textMuted;
 return <section style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:'20px clamp(16px,4vw,27px)',marginBottom:20,fontFamily:"'Outfit','Helvetica Neue',sans-serif"}}>
  <div style={{fontFamily:"'IBM Plex Mono',monospace",letterSpacing:1.2,fontSize:10,color:C.gold,fontWeight:700}}>ZRC MARKET WATCH</div>
  <h3 style={{fontFamily:'var(--zrc-font-display)',fontSize:'clamp(22px,5vw,29px)',color:C.text,margin:'8px 0'}}>{es?'Compara seis activos en una sola vista':'Compare six assets at a glance'}</h3>
  <p style={{fontSize:13,color:C.textSec,margin:'0 0 15px',lineHeight:1.6}}>{es?'Evidencia histórica por régimen GPR, última referencia de mercado disponible y perspectiva estadística a 30/90 días cuando exista una serie comparable.':'Historical evidence by GPR regime, latest available market observations and 30/90-day statistical outlooks when comparable.'}</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',marginBottom:15}}>
    <span style={{fontSize:11,color:C.textMuted}}>{es?'Riesgo GPR histórico':'Historical GPR regime'}</span>
    {['bajo','moderado','elevado','critico'].map(x=><button key={x} type='button' onClick={()=>setBand(x)} aria-pressed={band===x} style={{border:`1px solid ${band===x?C.gold:C.border}`,color:C.text,background:band===x?C.goldDim:C.surface2,padding:'8px 10px',borderRadius:10,fontSize:11,cursor:'pointer',fontWeight:band===x?700:400}}>{({bajo:es?'Bajo':'Low',moderado:es?'Moderado':'Moderate',elevado:es?'Elevado':'Elevated',critico:es?'Crítico':'Critical'})[x]}</button>)}
    <span style={{fontSize:11,color:C.textMuted,marginLeft:'auto'}}>{es?'Referencia':'Horizon'}</span>
    {[30,90].map(d=><button type='button' aria-pressed={horizon===d} key={d} onClick={()=>setHorizon(d)} style={{border:`1px solid ${horizon===d?C.gold:C.border}`,color:C.text,background:horizon===d?C.goldDim:C.surface2,padding:'8px 10px',borderRadius:10,fontSize:11,cursor:'pointer'}}>{d} {es?'días':'days'}</button>)}
  </div>
  {state==='loading'&&<p role='status' style={{fontSize:12,color:C.textMuted}}>{es?'Consultando últimas observaciones…':'Loading latest observations…'}</p>}
  {state==='error'&&<div role='status' style={{fontSize:12,color:C.textSec,marginBottom:12}}>{es?'Datos recientes no disponibles: se conserva la evidencia histórica, sin precios sustitutos.':'Recent observations unavailable; historical evidence remains, without placeholder prices.'} <button type='button' onClick={()=>setRetry(n=>n+1)} style={{marginLeft:8,border:`1px solid ${C.border}`,background:C.surface2,color:C.text,borderRadius:8,padding:'6px 9px',cursor:'pointer'}}>{es?'Reintentar':'Retry'}</button></div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:10}}>
  {rows.map(r=><article key={r.key} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:13,padding:'13px 15px',minWidth:0}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
      <strong style={{fontSize:14,color:C.text}}>{es?r.label:enNames[r.label]||r.label}</strong>
      <span style={{fontSize:10,color:statusColor(r)}}>{r.significant?(es?'Diferencia detectada':'Difference detected'):(es?'Sin señal robusta':'No robust signal')}</span>
    </div>
    <div style={{marginTop:11,display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
      <span style={{fontSize:25,fontFamily:'var(--zrc-font-figures)',color:C.text}}>{r.significant?'':'≈ '}{f(r.excess,es,r.unit==='bp'?0:1)}</span>
      <span style={{fontSize:12,color:C.textMuted}}>{r.unit==='bp'?'pb':'pp'} · {es?'vs. mediana histórica':'vs. historical median'}</span>
    </div>
    <div style={{fontSize:11,color:C.textMuted,marginTop:7}}>{es?'Muestra':'Sample'} n={r.n} · {es?'subidas':'increases'} {r.share_up}%{r.unit==='bp'?' (yield)':''}</div>
    <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:10}}>
      <div style={{fontSize:10,color:C.textMuted}}>{es?'Último nivel observado':'Latest observed level'}</div>
      <div style={{fontSize:15,fontWeight:650,color:C.text,marginTop:3}}>{r.observed?f(r.observed.value,es,r.key==='eurusd'?4:2)+' '+(r.observed.unit||''):'—'}</div>
      <div style={{fontSize:10,color:C.textMuted}}>{r.observed?r.observed.date+' · '+r.observed.provider:(es?'Sin serie equivalente conectada':'No matching series connected')}</div>
    </div>
    <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:10}}>
      <div style={{fontSize:10,color:C.textMuted}}>{es?'Perspectiva estadística':'Statistical outlook'} · {horizon} {es?'días':'days'}</div>
      <div style={{fontSize:15,fontWeight:650,color:C.text,marginTop:3}}>{r.forecast?f(r.forecast.value,es,4)+' '+(r.observed?.unit||''):'—'}</div>
      <div style={{fontSize:10,color:C.textMuted}}>{r.forecast?(es?'Modelo sin condicionamiento GRI · no es precio objetivo':'Not GRI-conditioned · not a target price'):(es?'Sin previsión comparable validada':'No comparable validated outlook')}</div>
    </div>
    {r.observed?.source_url&&<a href={r.observed.source_url} target='_blank' rel='noopener noreferrer' style={{fontSize:10,color:C.gold,display:'inline-block',marginTop:10}}>{es?'Ver fuente':'Source'} ↗</a>}
  </article>)}
  </div>
  <div style={{marginTop:14,fontSize:11,color:C.textMuted,lineHeight:1.6}}>{es?'Importante: las columnas no constituyen una predicción conjunta. El histórico compara regímenes del GPR externo; los precios son observaciones fechadas, y los pronósticos disponibles son modelos estadísticos independientes. No se infiere causalidad, rentabilidad futura ni equivalencia con ZRC-GRI.':'Important: these figures are not a combined forecast. Historical regimes use external GPR, market levels are dated observations, and any outlook is an independent statistical model. No causality, future return or ZRC-GRI equivalence is implied.'}</div>
 </section>;
}
