import { useState } from "react";
import evidence from "../data/georisk-asset-evidence.json";
import GeoRiskAssetEvidence from "./GeoRiskAssetEvidence.jsx";
import { C } from "../theme/palette";

const regimes=[
 {key:"bajo",es:"Bajo",en:"Low",color:"var(--zrc-risk-low)"},
 {key:"moderado",es:"Moderado",en:"Moderate",color:"var(--zrc-risk-mod)"},
 {key:"elevado",es:"Elevado",en:"Elevated",color:"var(--zrc-risk-high)"},
 {key:"critico",es:"Crítico",en:"Critical",color:"var(--zrc-risk-crit)"}
];
const assetIcons={gold:"◈",brent:"◉",equity_us:"▥",bund10:"≋",ust10:"≋",eurusd:"⇄"};
const english={Oro:"Gold",Brent:"Brent","S&P 500":"S&P 500","Bund 10a":"Bund 10y","Treasury 10a":"Treasury 10y","EUR/USD":"EUR/USD"};
const fmt=(x,es,dec=1)=>new Intl.NumberFormat(es?"es-ES":"en-GB",{maximumFractionDigits:dec,minimumFractionDigits:dec,signDisplay:"exceptZero"}).format(x);
const signal=(cell,asset,es)=>{
 if(!cell?.significant)return es?"Sin diferencia robusta":"No robust difference";
 if(asset.unit==="bp")return cell.excess<0?(es?"Rentabilidad inferior a lo habitual":"Lower-than-usual yield"):(es?"Rentabilidad superior a lo habitual":"Higher-than-usual yield");
 return cell.excess>0?(es?"Por encima de lo habitual":"Above usual"):(es?"Por debajo de lo habitual":"Below usual");
};
export default function GeoRiskMarketImpact({lang="es"}){
 const es=lang!=="en";
 const [assetId,setAssetId]=useState("brent");
 const [regime,setRegime]=useState("critico");
 const asset=evidence.assets.find(x=>x.key===assetId)||evidence.assets[0];
 const cell=asset.cells[regime];
 const notable=evidence.assets.filter(a=>a.cells[regime]?.significant);
 const months=evidence.horizon_months;
 const isYield=asset.unit==="bp";
 const followup=isYield?(es?"Contrastar duración, cambios de rentabilidad y exposición a tipos.":"Review duration, yield moves and rate exposure.")
 :asset.key==="brent"?(es?"Revisar costes de energía y coberturas; el resultado histórico puede sorprender.":"Review energy costs and hedges; the historical relationship may be counterintuitive.")
 :asset.key==="eurusd"?(es?"Revisar sensibilidad de ingresos, costes y coberturas de divisa.":"Review revenues, costs and FX hedges.")
 :asset.key==="gold"?(es?"Contrastar el peso del oro y la correlación de la cartera.":"Review gold allocation and portfolio correlation.")
 :(es?"Revisar la exposición y el horizonte de inversión antes de actuar.":"Review exposure and investment horizon before acting.");
 return <section aria-label={es?"Impacto histórico en mercados":"Historical market impact"} style={{margin:"0 0 22px",fontFamily:"'Outfit','Helvetica Neue',sans-serif"}}>
  <div style={{padding:"20px clamp(16px,4vw,28px)",border:`1px solid ${C.border}`,borderRadius:20,background:C.surface}}>
   <div style={{fontSize:10,letterSpacing:".14em",color:C.gold,fontWeight:700}}>{es?"MARKET IMPACT · HISTORIA Y DECISIONES":"MARKET IMPACT · EVIDENCE & DECISIONS"}</div>
   <h3 style={{fontFamily:"var(--zrc-font-display)",fontSize:"clamp(22px,5vw,30px)",margin:"7px 0 7px",color:C.text}}>{es?"¿Qué ha pasado con cada activo cuando aumentó el riesgo?":"How did assets behave when risk increased?"}</h3>
   <p style={{fontSize:13,color:C.textSec,lineHeight:1.55,margin:"0 0 15px",maxWidth:690}}>
     {es?"Selecciona un activo y un régimen de riesgo GPR para consultar su comportamiento histórico a tres meses, la amplitud de resultados y la solidez de la diferencia.":"Select an asset and a GPR risk regime to review its historical three-month outcome, dispersion and strength of evidence."}
   </p>
   <div style={{display:"flex",gap:7,overflowX:"auto",padding:"2px 0 10px",scrollSnapType:"x proximity"}}>
    {evidence.assets.map(a=><button type="button" key={a.key} aria-pressed={a.key===assetId} onClick={()=>setAssetId(a.key)} style={{flex:"0 0 auto",scrollSnapAlign:"start",cursor:"pointer",padding:"9px 12px",borderRadius:11,border:`1px solid ${a.key===assetId?C.gold:C.border}`,background:a.key===assetId?C.goldDim:C.surface2,color:C.text,fontSize:12,fontWeight:a.key===assetId?700:500}}>{assetIcons[a.key]} {es?a.label:english[a.label]||a.label}</button>)}
   </div>
   <div style={{display:"flex",flexWrap:"wrap",gap:7,margin:"5px 0 16px"}}>
    {regimes.map(r=><button type="button" key={r.key} aria-pressed={r.key===regime} onClick={()=>setRegime(r.key)} style={{cursor:"pointer",border:`1px solid ${r.key===regime?r.color:C.border}`,background:r.key===regime?C.surface2:"transparent",color:r.key===regime?r.color:C.textSec,padding:"7px 11px",borderRadius:99,fontSize:11,fontWeight:r.key===regime?700:400}}>{es?r.es:r.en}</button>)}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
    <div style={{border:`1px solid ${C.border}`,background:C.surface2,borderRadius:15,padding:16}}>
     <div style={{fontSize:11,color:C.textMuted}}>{es?"Diferencia histórica frente a la mediana":"Historical difference vs median"}</div>
     <div style={{fontFamily:"var(--zrc-font-figures)",fontSize:37,color:cell.significant?(cell.excess>0?C.green:C.red):C.text,lineHeight:1.2,marginTop:6}}>
      {cell.significant?"":"≈ "}{fmt(cell.excess,es,isYield?0:1)} <span style={{fontSize:15}}>{isYield?"pb":"pp"}</span>
     </div>
     <div style={{fontSize:11,color:cell.significant?C.textSec:C.textMuted,marginTop:8}}>{signal(cell,asset,es)}</div>
    </div>
    <div style={{border:`1px solid ${C.border}`,background:C.surface2,borderRadius:15,padding:16}}>
     <div style={{fontSize:11,color:C.textMuted}}>{es?"Frecuencia de subidas":"Share of rising observations"}</div>
     <div style={{fontFamily:"var(--zrc-font-figures)",fontSize:37,color:C.text,marginTop:6}}>{cell.share_up}%</div>
     <div style={{fontSize:11,color:C.textMuted,marginTop:8}}>{es?`Sobre ${cell.n} episodios; en bonos son subidas de rentabilidad, no de precio.`:`Across ${cell.n} observations; for bonds this means yields rising, not prices.`}</div>
    </div>
    <div style={{border:`1px solid ${C.border}`,background:C.surface2,borderRadius:15,padding:16}}>
     <div style={{fontSize:11,color:C.textMuted}}>{es?"Rango central del resultado":"Central range of outcomes"}</div>
     <div style={{fontFamily:"var(--zrc-font-figures)",fontSize:24,color:C.text,marginTop:10}}>{fmt(cell.p25,es,1)} → {fmt(cell.p75,es,1)} <span style={{fontSize:12}}>{isYield?"pb":"%"}</span></div>
     <div style={{fontSize:11,color:C.textMuted,marginTop:13}}>{es?"Percentiles 25 a 75 de la variación observada":"25th–75th percentile of observed change"}</div>
    </div>
   </div>
   <div style={{marginTop:14,borderLeft:`3px solid ${C.gold}`,padding:"11px 13px",background:C.goldDim,borderRadius:9,fontSize:13,color:C.textSec,lineHeight:1.55}}>
    <strong style={{color:C.text}}>{es?"Lectura para el inversor: ":"Investor takeaway: "}</strong>
    {cell.significant
      ?(es?"El estudio detecta una diferencia histórica, pero no demuestra causalidad ni permite anticipar el siguiente episodio. ":"Historical differences were detected, but causality and future repetition are unproven. " )
      :(es?"No aparece una diferencia estadísticamente consistente para esta combinación. ":"No statistically consistent difference was found for this combination. ")}
    {followup}
   </div>
   <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:12,fontSize:11,color:C.textMuted}}>
    <span>{es?`GPR externo · muestra ${evidence.gpr_sample[0]} a ${evidence.gpr_sample[1]} · horizonte ${months} meses`:`External GPR · sample ${evidence.gpr_sample[0]}–${evidence.gpr_sample[1]} · ${months}-month horizon`}</span>
    <span>{es?"Última referencia GPR archivada":"Last archived GPR reference"}: {evidence.current.month}</span>
   </div>
   <details style={{marginTop:13,borderTop:`1px solid ${C.border}`,paddingTop:13}}>
    <summary style={{fontSize:12,color:C.text,fontWeight:650,cursor:"pointer"}}>{es?"ⓘ Ver tabla completa, método y fuentes":"ⓘ View full table, method and sources"}</summary>
    <div style={{paddingTop:14}}><GeoRiskAssetEvidence lang={lang}/></div>
   </details>
  </div>
  <div style={{fontSize:11,color:C.textMuted,lineHeight:1.55,margin:"10px 3px 0"}}>{es?"El GPR de Caldara–Iacoviello y el ZRC-GRI son índices distintos: seleccionar una banda GPR no convierte automáticamente la lectura actual del ZRC-GRI en una estimación del mercado. No es una previsión ni una recomendación de inversión.":"Caldara–Iacoviello GPR and ZRC-GRI are different indices. Selecting a GPR band does not convert today's ZRC-GRI into a market forecast. Not investment advice."}</div>
 </section>;
}
