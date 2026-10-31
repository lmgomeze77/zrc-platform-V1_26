import {useMemo,useState} from "react";
import {projectCashFlows,ANNUAL_MODEL_VERSION} from "../../data/georiskAnnualCashFlow.js";
import {DEFAULT_ANNUAL_SETTINGS} from "../../data/georiskWorkspaceSnapshot.js";
import {downloadInvestmentCommitteeBrief} from "../../data/georiskInvestmentCommitteeBrief.js";

const card={background:"#0D1B30",border:"1px solid #355173",borderRadius:14,padding:16};
const fmt=x=>Number.isFinite(x)?x.toLocaleString("es-ES",{maximumFractionDigits:2,minimumFractionDigits:2}):"N/D";
const fields=[
 ["growthRate","Crecimiento anual del FCF","%",-90,100,1],
 ["maintenanceCapex","CAPEX adicional anual","M€",0,100000,.1],
 ["fxExposurePct","FCF positivo expuesto a FX","%",0,100,5],
 ["fxAdverseMovePct","Shock adverso FX supuesto","%",0,100,5]
];
export default function GeoRiskAnnualModel({inputs,annualSettings,onAnnualSettingsChange,annualOverrides,onAnnualOverridesChange,project,country,editedFields,countryAdjustment}){
 const [expanded,setExpanded]=useState(true);
 const settings=annualSettings??DEFAULT_ANNUAL_SETTINGS;
 const overrides=annualOverrides??{};
 const onSettings=(key,value)=>onAnnualSettingsChange?.({...settings,[key]:value});
 const onOverride=(year,key,value)=>onAnnualOverridesChange?.({...overrides,[year]:{...overrides[year],[key]:value}});
 const outcome=useMemo(()=>{
  try{return {value:projectCashFlows({...inputs,...settings},overrides),error:null};}
  catch(error){return {value:null,error:error.message};}
 },[inputs,settings,overrides]);
 const result=outcome.value;
 return <section aria-label="Modelo de flujos plurianuales" style={{...card,display:"grid",gap:14}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <div><div style={{fontSize:10,letterSpacing:1.2,fontWeight:700,color:"#93C5FD"}}>ZRC · INVESTMENT CASH FLOW MODEL · {ANNUAL_MODEL_VERSION}</div>
   <h3 style={{fontSize:18,color:"#F1F5F9",margin:"6px 0"}}>Valoración plurianual · FCFF, VAN y TIR</h3></div>
   <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)} style={{background:"#1A3B5D",border:"1px solid #4A7095",borderRadius:9,padding:"9px 13px",color:"#F8FAFC"}}>{expanded?"Contraer":"Mostrar modelo"}</button>
  </div>
  <p style={{color:"#CBD5E1",fontSize:12,lineHeight:1.7,margin:0}}>Modelo independiente del escenario simplificado superior. Parte del capital, flujo anual inicial, valor terminal, horizonte y tasa de descuento del expediente; permite crecimiento y CAPEX adicional por año. Todos los parámetros son hipótesis no verificadas. No incorpora por defecto primas de seguro, pérdidas políticas, deuda, impuestos o capital circulante fuera de los flujos introducidos.</p>
  {outcome.error?<p role="alert" style={{color:"#FCA5A5"}}>{outcome.error}</p>:result&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,170px),1fr))",gap:9}}>
    {[["VAN base",fmt(result.baseNPV)+" M€"],["VAN estrés",fmt(result.stressNPV)+" M€"],["TIR",result.irr===null?"N/D":fmt(result.irr)+" %"],["Tasa exigida",fmt(result.hurdleRate)+" %"]].map(([label,value])=><div key={label} style={{background:"#132B42",borderRadius:9,padding:12}}><div style={{fontSize:11,color:"#AFC3D8"}}>{label}</div><strong style={{fontSize:19,color:"#F1F5F9",fontVariantNumeric:"tabular-nums"}}>{value}</strong></div>)}
   </div>}
  {result&&<div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><button type="button" onClick={()=>downloadInvestmentCommitteeBrief({project,country,inputs,annualSettings:settings,annualOverrides:overrides,editedFields,countryAdjustment})} style={{background:"#24578C",color:"#FFFFFF",border:"1px solid #4E82B7",borderRadius:9,padding:"11px 15px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Exportar Investment Committee Brief</button><span style={{fontSize:11,color:"#AFC3D8"}}>HTML imprimible a PDF · borrador sin datos financieros verificados</span></div>}
  {expanded&&<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:12}}>
    {fields.map(([key,label,unit,min,max,step])=><label key={key} style={{display:"grid",gap:5,fontSize:12,color:"#CBD5E1"}}>{label}
      <div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={settings[key]} min={min} max={max} step={step} onChange={e=>onSettings(key,e.target.value===""?0:Number(e.target.value))} style={{background:"#081426",color:"#F8FAFC",border:"1px solid #466788",padding:10,borderRadius:8,minWidth:0,width:"100%"}}/><span>{unit}</span></div>
    </label>)}
   </div>
   <div style={{overflowX:"auto"}}>
    <table style={{borderCollapse:"collapse",width:"100%",minWidth:620,fontSize:12,color:"#E2E8F0"}}>
     <thead><tr style={{background:"#1C3956"}}>{["Año","FCF operativo · M€","CAPEX adicional · M€","Terminal · M€","Flujo neto · M€","Estrés · M€"].map(label=><th key={label} scope="col" style={{padding:10,textAlign:"right",whiteSpace:"nowrap"}}>{label}</th>)}</tr></thead>
     <tbody>{result?.rows.map(row=><tr key={row.year} style={{borderBottom:"1px solid #2C4965"}}>
      <th scope="row" style={{padding:"8px 10px",textAlign:"right"}}>{row.year}</th>
      {["operatingFCF","capex"].map(key=><td key={key} style={{padding:6}}><input aria-label={(key==="capex"?"CAPEX":"FCF")+" año "+row.year} type="number" step=".1" min={key==="capex"?0:undefined} value={overrides[row.year]?.[key]??row[key]} onChange={e=>onOverride(row.year,key,e.target.value===""?0:Number(e.target.value))} style={{width:110,maxWidth:"100%",padding:8,borderRadius:7,border:"1px solid #466788",color:"#F8FAFC",background:overrides[row.year]?.[key]!==undefined?"#274668":"#10273D",textAlign:"right"}}/></td>)}
      <td style={{textAlign:"right",padding:9}}>{fmt(row.terminal)}</td><td style={{textAlign:"right",padding:9}}>{fmt(row.netFCF)}</td><td style={{textAlign:"right",padding:9}}>{fmt(row.stressNetFCF)}</td>
     </tr>)}</tbody>
    </table>
   </div>
   <button type="button" onClick={()=>{onAnnualSettingsChange?.({...DEFAULT_ANNUAL_SETTINGS});onAnnualOverridesChange?.({});}} style={{justifySelf:"start",background:"transparent",color:"#BFDBFE",border:"1px solid #45678B",padding:"9px 12px",borderRadius:8,cursor:"pointer"}}>Restablecer crecimiento, CAPEX y flujos anuales</button>
   <p style={{fontSize:11,lineHeight:1.7,color:"#9FB4CD",margin:0}}>Año 0: desembolso de capital inicial; años 1–N: FCF operativo menos CAPEX adicional, más valor terminal exclusivamente en el último año. El estrés aplica una caída de flujo positiva y un shock FX adverso proporcional a la exposición indicada. La TIR aparece como N/D si no hay una raíz única económicamente interpretable. El editor admite cambios por año, que se conservan al cambiar de pestaña y en el expediente JSON exportable.</p>
  </>}
 </section>;
}
