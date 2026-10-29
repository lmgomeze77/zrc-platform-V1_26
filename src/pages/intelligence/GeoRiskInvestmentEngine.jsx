import {useEffect,useMemo,useState} from "react";
import {COUNTRY_PROFILES} from "../../data/countryRiskProfiles.js";
import {COUNTRY_EXPANSION_CANDIDATES} from "../../data/georiskCountryExpansion.js";
import {applyCountrySensitivity} from "../../data/georiskCountryInvestmentSensitivity.js";
import {calculateInvestmentDecision,DEFAULT_INVESTMENT_INPUTS} from "../../data/georiskInvestmentEngine.js";
import {buildInvestmentEvidence,INVESTMENT_EVIDENCE_VERSION} from "../../data/georiskInvestmentEvidence.js";

const FIELDS=[
  ["capital","Capital invertido","M€",0.1,1000,0.5],
  ["annualCashFlow","Flujo anual libre esperado","M€/año",-100,100,0.1],
  ["terminalValue","Valor terminal al salir","M€",0,1000,0.5],
  ["years","Horizonte","años",1,30,1],
  ["baseDiscountRate","Tasa de descuento base","%",0,50,0.5],
  ["residualRiskPremium","Prima adicional de riesgo residual","pp",0,30,0.5],
  ["insuredShare","Cobertura elegible supuesta","%",0,100,5],
  ["insurancePremiumRate","Prima anual del seguro sobre capital cubierto","%",0,15,0.1],
  ["insuranceDeductible","Franquicia asumida por evento","M€",0,50,0.1],
  ["annualPoliticalLoss","Pérdida política anual esperada antes de cobertura","M€/año",0,50,0.05],
  ["fxHedgeCost","Coste anual de cobertura FX","M€/año",0,20,0.05],
  ["financingGuaranteeCost","Coste anual de garantías","M€/año",0,20,0.05],
  ["stressLoss","Pérdida extraordinaria en estrés","M€",0,100,0.5],
  ["stressCashFlowDrop","Caída de flujo en estrés","%",0,100,5]
];
const fmt=n=>Number.isFinite(n)?n.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2}):"N/D";
const panel={background:"#0D1B30",border:"1px solid #28415F",borderRadius:14,padding:"18px"};
const muted={fontSize:12,color:"#94A3B8",lineHeight:1.65};
export default function GeoRiskInvestmentEngine({countryContext=null,selectedCountry,onCountryChange,selectedProject,onProjectChange}){
  const [inputs,setInputs]=useState({...DEFAULT_INVESTMENT_INPUTS});
  const [mode,setMode]=useState("entry");
  const [localProject,setLocalProject]=useState("");
  const projectName=selectedProject===undefined?localProject:selectedProject;
  const setProjectName=value=>{if(selectedProject===undefined)setLocalProject(value);onProjectChange?.(value);};
  const [editedFields,setEditedFields]=useState([]);
  const [localCountry,setLocalCountry]=useState(countryContext?.name||"");
  const country=selectedCountry===undefined?localCountry:selectedCountry;
  const setCountry=value=>{if(selectedCountry===undefined)setLocalCountry(value);onCountryChange?.(value);};
  const [countryAdjustment,setCountryAdjustment]=useState(false);
  const [sensitivity,setSensitivity]=useState(1);
  useEffect(()=>{if(selectedCountry===undefined)setLocalCountry(countryContext?.name||"");},[countryContext?.name,selectedCountry]);
  const adjusted=useMemo(()=>countryAdjustment?applyCountrySensitivity(inputs,country,sensitivity):{inputs,scenario:null},[inputs,country,countryAdjustment,sensitivity]);
  const result=useMemo(()=>calculateInvestmentDecision(adjusted.inputs),[adjusted.inputs]);
  const unadjusted=useMemo(()=>calculateInvestmentDecision(inputs),[inputs]);
  const set=(key,value)=>{setInputs(prev=>({...prev,[key]:value}));setEditedFields(prev=>prev.includes(key)?prev:[...prev,key]);};
  const evidence=useMemo(()=>buildInvestmentEvidence(inputs,editedFields),[inputs,editedFields]);
  const exportCsv=()=>{
    const rows=[["Concepto","Valor","Unidad"],["Proyecto",projectName,""],["País",country,""],["Versión",result.version,""],["Versión evidencia",INVESTMENT_EVIDENCE_VERSION,""],["Ajuste país activado",countryAdjustment?"Sí":"No",""],["Score editorial país",adjusted.scenario?.score??"Sin cobertura","0-100"],["Fecha perfil país",adjusted.scenario?.asOf??"",""],["Incremento hipotético prima residual",adjusted.scenario?.premiumDeltaPp??0,"pp"],["VAN sin ajuste país",unadjusted.baseNPV,"M€"],
      ...FIELDS.map(([key,label,unit])=>[label,inputs[key],unit]),
      ...evidence.map(item=>["Procedencia · "+item.label,item.statusLabel,item.source]),
      ["Tasa mínima exigida",result.hurdleRate,"%"],["Coste anual de protección",result.protectionAnnualCost,"M€/año"],
      ["Pérdida anual retenida",result.retainedAnnualLoss,"M€/año"],
      ["VAN base",result.baseNPV,"M€"],["VAN estrés",result.stressNPV,"M€"],
      ["Flujo anual de equilibrio",result.breakEvenCashFlow,"M€/año"],
      ["Diagnóstico indicativo",result.decision,""],
      ["Nota","Modelo hipotético sin primas aseguradoras verificadas, sin calibración país y sin recomendación de inversión.",""]];
    const csv="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="ZRC_GeoRisk_Investment_Decision.csv";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  return <section aria-label="GeoRisk Investment Decision Engine" style={{display:"grid",gap:16}}>
    <div style={{...panel,borderColor:"#476184"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:"#93C5FD"}}>ZRC INTELLIGENCE · INVESTMENT DECISION ENGINE · BETA</div>
      <h2 style={{fontSize:23,margin:"8px 0",color:"#F8FAFC"}}>Entrada, permanencia y transferencia del riesgo</h2>
      <p style={{...muted,margin:"0 0 13px"}}>Evalúa flujos de caja, retorno mínimo, coste de protección y escenarios adversos. Los parámetros son editables; no representan cotizaciones de aseguradoras ni estimaciones calibradas para un país.</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["entry","Entrada"],["monitor","Permanencia"],["transfer","Coberturas"]].map(([id,label])=><button key={id} type="button" aria-pressed={mode===id} onClick={()=>setMode(id)} style={{border:"1px solid #355173",background:mode===id?"#24578C":"#142743",color:"#F1F5F9",padding:"9px 14px",borderRadius:9,cursor:"pointer"}}>{label}</button>)}</div>
      <p style={{...muted,margin:"12px 0 0"}}>{mode==="entry"?"Entrada: compara VAN y rentabilidad mínima antes de comprometer capital.":mode==="monitor"?"Permanencia: actualiza flujos, valor de salida y costes de mitigación con la información más reciente del proyecto.":"Coberturas: contrasta primas, límites, franquicias y pérdidas retenidas; las indemnizaciones reales dependen de la póliza."}</p>
    </div>
    <div style={{...panel,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:12}}>
      <label style={{fontSize:12,color:"#CBD5E1"}}>Nombre del proyecto<input maxLength={90} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Proyecto / inversión" style={{display:"block",marginTop:6,width:"100%",boxSizing:"border-box",background:"#081426",color:"#F1F5F9",border:"1px solid #355173",borderRadius:8,padding:10}}/></label>
      <label style={{fontSize:12,color:"#CBD5E1"}}>País de exposición<input list="georisk-investment-countries" maxLength={90} value={country} onChange={e=>setCountry(e.target.value)} placeholder="Selecciona o escribe un país" style={{display:"block",marginTop:6,width:"100%",boxSizing:"border-box",background:"#081426",color:"#F1F5F9",border:"1px solid #355173",borderRadius:8,padding:10}}/></label>
      <datalist id="georisk-investment-countries">{[...COUNTRY_PROFILES,...COUNTRY_EXPANSION_CANDIDATES].map(p=><option key={p.iso} value={p.name}/>)}</datalist>
    </div>
    <div style={{...panel,borderColor:"#4A637B"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,color:"#93C5FD"}}>TRAZABILIDAD · {INVESTMENT_EVIDENCE_VERSION}</div>
      <h3 style={{fontSize:16,margin:"7px 0"}}>Calidad de los supuestos del modelo</h3>
      <p style={muted}>Los valores iniciales son ejemplos de simulación. Los cambios introducidos manualmente siguen siendo hipótesis del usuario, no cifras verificadas. Ningún valor financiero se considera observado sin una fuente contrastada.</p>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <span style={{background:"#1A324B",borderRadius:8,padding:"8px 11px",fontSize:12}}>Hipótesis iniciales: <strong>{evidence.filter(x=>x.status==="example").length}</strong></span>
        <span style={{background:"#1A324B",borderRadius:8,padding:"8px 11px",fontSize:12}}>Editadas: <strong>{evidence.filter(x=>x.status==="user_assumption").length}</strong></span>
        <span style={{background:"#1A324B",borderRadius:8,padding:"8px 11px",fontSize:12}}>Datos financieros verificados: <strong>0</strong></span>
      </div>
      <details style={{marginTop:12,color:"#CBD5E1",fontSize:12}}><summary style={{cursor:"pointer",color:"#BFDBFE"}}>Ver procedencia de cada parámetro</summary>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:8,marginTop:12}}>
          {evidence.map(item=><div key={item.key} style={{background:"#132A41",borderRadius:8,padding:9}}><strong>{item.label}</strong><div style={{color:item.status==="example"?"#FCD34D":"#93C5FD",marginTop:3}}>{item.statusLabel}</div></div>)}
        </div>
      </details>
    </div>
    <div style={{...panel,borderColor:"#476184"}}>
      <h3 style={{fontSize:16,margin:"0 0 9px"}}>Contexto de riesgo país · sensibilidad exploratoria</h3>
      <p style={muted}>El nombre del país ahora se cruza con los perfiles editoriales ZRC disponibles. El ajuste financiero es una <strong>hipótesis explícita de sensibilidad</strong>, no una prima observada, ni una tarifa de aseguradora. Referencia metodológica: score 50/100.</p>
      <label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,color:"#E2E8F0"}}>
        <input type="checkbox" checked={countryAdjustment} onChange={e=>setCountryAdjustment(e.target.checked)}/>
        Activar ajuste editorial exploratorio por país (desactivado por defecto)
      </label>
      <div style={{marginTop:12,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <label style={{fontSize:12,color:"#CBD5E1"}}>Intensidad de la hipótesis
          <select value={sensitivity} onChange={e=>setSensitivity(Number(e.target.value))} style={{display:"block",marginTop:6,background:"#081426",border:"1px solid #355173",color:"#F1F5F9",padding:9,borderRadius:8}}>
            <option value={0.5}>Moderada · 0,5×</option><option value={1}>Base · 1×</option><option value={1.5}>Alta · 1,5×</option><option value={2}>Extrema · 2×</option>
          </select>
        </label>
        <div style={{...muted,flex:"1 1 250px"}}>{COUNTRY_PROFILES.length} países con perfil cuantificado; {COUNTRY_EXPANSION_CANDIDATES.length} adicionales incorporados al catálogo, pendientes de revisión editorial.</div>
      </div>
      {adjusted.scenario ? <div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10}}>
        {[
          ["Riesgo editorial",adjusted.scenario.score+"/100"],
          ["Variación prima residual", (adjusted.scenario.premiumDeltaPp>=0?"+":"")+fmt(adjusted.scenario.premiumDeltaPp)+" pp"],
          ["Variación pérdida anual / 10 M€",(adjusted.scenario.annualLossDeltaPer10m>=0?"+":"")+fmt(adjusted.scenario.annualLossDeltaPer10m)+" M€"],
          ["Variación VAN base", (result.baseNPV-unadjusted.baseNPV>=0?"+":"")+fmt(result.baseNPV-unadjusted.baseNPV)+" M€"]
        ].map(([label,value])=><div key={label} style={{padding:11,background:"#10283A",borderRadius:9}}><div style={{...muted,fontSize:11}}>{label}</div><strong style={{fontSize:16}}>{value}</strong></div>)}
        <p style={{...muted,gridColumn:"1/-1",margin:0}}>Perfil ZRC: {adjusted.scenario.asOf}. Ajuste hipotético respecto a score 50. La prima de seguro introducida manualmente <strong>no cambia</strong> al seleccionar país porque no existe cotización vinculada.</p>
      </div>:<p role="status" style={{...muted,color:"#FBBF24",marginBottom:0}}>{countryAdjustment?(country.trim()?`No hay perfil ZRC validado para «${country}». No se modifica la valoración. Introduce una jurisdicción de la lista o ajusta manualmente las hipótesis.`:"Selecciona un país con perfil disponible para comparar sensibilidades."):"Sensibilidad país desactivada: resultados basados únicamente en tus hipótesis manuales."}</p>}
    </div>
    <div style={{...panel}}>
      <h3 style={{fontSize:16,margin:"0 0 12px"}}>Hipótesis financieras y de protección</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
        {FIELDS.map(([key,label,unit,min,max,step])=><label key={key} style={{fontSize:12,color:"#CBD5E1",display:"grid",gap:6}}>{label}<div style={{display:"flex",alignItems:"center",gap:7}}><input type="number" min={min} max={max} step={step} value={inputs[key]} onChange={e=>set(key,e.target.value===""?0:Number(e.target.value))} style={{width:"100%",minWidth:0,boxSizing:"border-box",padding:"10px",border:"1px solid #355173",borderRadius:8,background:"#081426",color:"#F8FAFC",fontVariantNumeric:"tabular-nums"}}/><span style={{whiteSpace:"nowrap",fontSize:11,color:"#94A3B8"}}>{unit}</span></div></label>)}
      </div>
      <button type="button" onClick={()=>{setInputs({...DEFAULT_INVESTMENT_INPUTS});setEditedFields([]);}} style={{marginTop:15,border:"1px solid #355173",borderRadius:8,padding:"9px 12px",background:"transparent",color:"#CBD5E1",cursor:"pointer"}}>Restablecer hipótesis</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:12}}>
      {[
        ["Retorno mínimo exigido",fmt(result.hurdleRate)+" %"],
        ["Coste anual de protección",fmt(result.protectionAnnualCost)+" M€"],
        ["Pérdida anual retenida",fmt(result.retainedAnnualLoss)+" M€"],
        ["VAN escenario base",fmt(result.baseNPV)+" M€"],
        ["VAN escenario adverso",fmt(result.stressNPV)+" M€"],
        ["Flujo anual de equilibrio",fmt(result.breakEvenCashFlow)+" M€"]
      ].map(([label,value])=><div key={label} style={panel}><div style={{fontSize:11,color:"#94A3B8",marginBottom:8}}>{label}</div><strong style={{fontSize:20,color:"#F8FAFC",fontVariantNumeric:"tabular-nums"}}>{value}</strong></div>)}
    </div>
    <div style={{...panel,borderColor:"#5D704C"}}>
      <div style={{fontSize:11,color:"#93C5FD",letterSpacing:1,fontWeight:700}}>LECTURA DEL MODELO · NO ES RECOMENDACIÓN</div>
      <div style={{fontSize:19,fontWeight:700,marginTop:7}}>{result.decision}</div>
      <p style={muted}>El VAN base incorpora flujos netos de protección y pérdidas anuales retenidas, descontados a la tasa base más la prima de riesgo residual. El estrés supone una reducción sostenida de flujos y una pérdida extraordinaria al salir, neta de cobertura y franquicia supuestas. No se asigna probabilidad al escenario adverso.</p>
      <p style={{...muted,color:"#FBBF24"}}>Evita contar dos veces el mismo riesgo: si una pérdida ya se modela en los flujos, la prima residual debe cubrir únicamente riesgos adicionales no reflejados. No utilizar el score GeoRisk como porcentaje de prima aseguradora.</p>
      <button type="button" onClick={exportCsv} style={{border:0,background:"#24578C",color:"#F8FAFC",borderRadius:9,padding:"11px 16px",fontWeight:700,cursor:"pointer"}}>Exportar análisis CSV</button>
      <p style={{...muted,marginBottom:0}}>Exportación local sin sincronización de cuenta. No introducir datos confidenciales sin una política de tratamiento adecuada. Modelo {result.version}.</p>
    </div>
  </section>;
}
