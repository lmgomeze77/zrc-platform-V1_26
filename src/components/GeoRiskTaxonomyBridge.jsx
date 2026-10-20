import { useState } from 'react';
import { GEORISK_TAXONOMY_VERSION, RISK_FACTORS, summarizeRiskCoverage, explainScenarioBridge } from '../data/georiskRiskTaxonomy.js';
import { GEORISK_SCENARIOS } from '../data/georiskScenarioContract.js';
// Crosswalk is descriptive; does NOT alter published GRI or any scenario values.
const INDEX_LABELS={
 mena_instability:'Inestabilidad MENA',russia_ukraine_attrition:'Rusia-Ucrania',
 trade_stabilization:'Estabilización comercial',southern_europe_migration:'Migración sur de Europa'
};
export default function GeoRiskTaxonomyBridge({ origin='simulator',lang='es' }){
 const [expanded,setExpanded]=useState(false);
 const [selected,setSelected]=useState(origin==='index'?'mena_instability':'tariff_escalation');
 const es=lang!=='en',coverage=summarizeRiskCoverage();
 const left=origin==='index'?INDEX_LABELS:Object.fromEntries(Object.entries(GEORISK_SCENARIOS).map(([k,v])=>[k,v.label]));
 const opposite=origin==='index'?Object.fromEntries(Object.entries(GEORISK_SCENARIOS).map(([k,v])=>[k,v.label])):INDEX_LABELS;
 const active=Object.hasOwn(left,selected)?selected:Object.keys(left)[0];
 const bridge=explainScenarioBridge(active,origin);
 return <section aria-label={es?'Taxonomía común de riesgos':'Common risk taxonomy'} style={{border:'1px solid #3F5E50',borderRadius:16,padding:'16px 18px',margin:'16px 0',background:'#0C2119',color:'#DCECE4',fontFamily:'inherit'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
   <div style={{flex:'1 1 260px'}}>
    <div style={{fontSize:10,letterSpacing:1.3,color:'#86EFAC',fontWeight:700}}>{es?'MARCO COMPARTIDO DE RIESGOS':'SHARED RISK FRAMEWORK'}</div>
    <h3 style={{fontSize:17,margin:'6px 0 7px',fontWeight:650}}>{es?'Cómo se relacionan los escenarios y el índice ZRC-GRI':'How scenarios and the ZRC-GRI relate'}</h3>
    <p style={{fontSize:12,lineHeight:1.6,opacity:.85,margin:0}}>{es?'Comparten factores de riesgo, pero describen conjuntos de escenarios distintos. Sus pesos, puntuaciones y probabilidades no son intercambiables.':'They share risk factors but describe different scenario sets. Weights, scores and probabilities are not interchangeable.'}</p>
   </div>
   <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} style={{border:'1px solid #4D8062',borderRadius:9,padding:'8px 12px',background:'transparent',color:'#A7F3D0',cursor:'pointer'}}>{expanded?(es?'Ocultar mapa':'Hide mapping'):(es?'Explorar correspondencias':'Explore mapping')}</button>
  </div>
  {expanded&&<div style={{marginTop:14}}>
   <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
    {Object.entries(left).map(([key,label])=><button key={key} type="button" onClick={()=>setSelected(key)} aria-pressed={active===key} style={{padding:'7px 9px',borderRadius:8,border:'1px solid #3F5E50',background:active===key?'#24543C':'#112A20',color:'#E4F3EA',cursor:'pointer',fontSize:12}}>{label}</button>)}
   </div>
   <div style={{fontSize:12,lineHeight:1.7}}>
    <strong>{es?'Canales de riesgo identificados:':'Identified risk channels:'}</strong>
    <ul style={{margin:'6px 0 12px',paddingLeft:22}}>{bridge.factors.map(f=><li key={f.id}>{f.label}: {f.channel}</li>)}</ul>
    <strong>{es?'Coincidencias temáticas en el otro sistema:':'Thematic overlap in the other system:'}</strong>
    <div style={{marginTop:6}}>{bridge.connections.length?bridge.connections.map(x=><div key={x.id} style={{padding:'5px 0'}}>{opposite[x.id]||x.id} <span style={{opacity:.72}}>({x.shared_factors.map(f=>RISK_FACTORS[f].label).join(', ')})</span></div>):es?'Sin correspondencia directa.':'No direct match.'}</div>
    <p style={{color:'#F4D29A',margin:'12px 0 0',fontSize:11}}>{es?'Correspondencia cualitativa, no transformación numérica. No implica causalidad ni una probabilidad estimada.':'Qualitative mapping, not a numerical conversion. It does not imply causality or estimated probability.'}</p>
    <details style={{marginTop:12}}><summary style={{cursor:'pointer'}}>{es?'Ver cobertura completa de factores':'View full factor coverage'}</summary><div style={{marginTop:9}}>{coverage.map(f=><div key={f.id} style={{padding:'7px 0',borderBottom:'1px solid #284737'}}><strong>{f.label}</strong><div style={{opacity:.8}}>{es?'Simulador':'Simulator'}: {f.simulator.length} · ZRC-GRI: {f.index.length}</div></div>)}</div></details>
    <div style={{opacity:.6,fontSize:10,marginTop:12}}>{GEORISK_TAXONOMY_VERSION}</div>
   </div>
  </div>}
 </section>;
}
