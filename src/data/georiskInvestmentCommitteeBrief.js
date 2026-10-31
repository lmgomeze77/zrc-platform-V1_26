import {projectCashFlows,ANNUAL_MODEL_VERSION} from "./georiskAnnualCashFlow.js";
import {buildInvestmentEvidence,INVESTMENT_EVIDENCE_VERSION} from "./georiskInvestmentEvidence.js";

export const COMMITTEE_BRIEF_VERSION="ZRC-ICB-1.0-draft";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=value=>Number.isFinite(value)?value.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2}):"N/D";
const label=(value,fallback="No definido")=>esc(String(value??"").trim().slice(0,100)||fallback);
const fieldRows=evidence=>evidence.map(x=>`<tr><td>${esc(x.label)}</td><td class="right">${number(x.value)}</td><td>${esc(x.statusLabel)}</td></tr>`).join("");
const cashRows=rows=>rows.map(x=>`<tr><th scope="row">${x.year}</th><td class="right">${number(x.operatingFCF)}</td><td class="right">${number(x.capex)}</td><td class="right">${number(x.terminal)}</td><td class="right">${number(x.netFCF)}</td><td class="right">${number(x.stressNetFCF)}</td></tr>`).join("");

export function buildInvestmentCommitteeBrief({project,country,inputs,annualSettings,annualOverrides,editedFields=[],countryAdjustment=false,createdAt}={}){
 if(!inputs||!annualSettings)throw Error("Faltan los parámetros del expediente.");
 const calc=projectCashFlows({...inputs,...annualSettings},annualOverrides||{});
 const evidence=buildInvestmentEvidence(inputs,editedFields);
 const date=typeof createdAt==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(createdAt)?createdAt:new Date().toISOString().slice(0,10);
 const npvSignal=calc.baseNPV>=0?"VAN base no negativo bajo los supuestos":"VAN base negativo bajo los supuestos";
 const notes=[
  "Modelo de flujos de caja libres operativos, antes de financiación. Impuestos y capital circulante solo si están incluidos en las cifras introducidas.",
  "El CAPEX adicional se deduce anualmente y la recuperación terminal solo se incorpora en el último ejercicio.",
  "El escenario adverso aplica caídas de FCF positivo y sensibilidad a FX; no tiene probabilidad calibrada y no constituye una previsión.",
  "No se han aplicado automáticamente pérdidas políticas, primas de seguro, ratings soberanos ni cotizaciones externas.",
  "La prima residual es una hipótesis introducida en el modelo. Se debe verificar que no duplica pérdidas ya reflejadas en los flujos.",
  "La tabla de resultados corresponde al motor plurianual, separado del motor simplificado de protección. Las cifras no son intercambiables.",
  "El documento es un borrador analítico para revisión del profesional responsable y no es una recomendación de inversión."
 ];
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZRC | Investment Committee Brief</title><style>
 :root{color-scheme:light}*{box-sizing:border-box}body{font:14px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#19304b;background:#fff;max-width:1050px;margin:35px auto;padding:0 30px}header{border-bottom:3px solid #c29a55;padding-bottom:20px}.brand{font-size:11px;letter-spacing:.16em;color:#254a73;font-weight:800;text-transform:uppercase}h1{font-size:31px;line-height:1.15;margin:12px 0 8px;color:#12243c}h2{font-size:18px;color:#122c4a;border-bottom:1px solid #cbd5e1;margin:30px 0 10px;padding-bottom:7px}p{margin:8px 0 14px}.subtitle,.muted{color:#5a6c7d}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:20px 0}.metric{padding:14px;border:1px solid #d6e0ea;border-radius:10px;background:#f6f9fc}.metric span{display:block;font-size:11px;color:#546b81}.metric strong{font-size:20px;line-height:1.3}table{width:100%;border-collapse:collapse;margin:12px 0 20px;font-size:12px}th,td{padding:8px 9px;border-bottom:1px solid #d9e2ed;text-align:left;vertical-align:top}th{background:#eff4f9;color:#193c62}.right{text-align:right;font-variant-numeric:tabular-nums}.warning{background:#fff8e8;border-left:4px solid #c29a55;padding:14px 17px;border-radius:4px}footer{border-top:1px solid #dbe2ea;padding-top:15px;margin-top:35px;color:#62758a;font-size:11px}li{margin:6px 0}.table-scroll{overflow-x:auto}@media(max-width:720px){body{padding:0 15px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metric strong{font-size:17px}h1{font-size:25px}}@media print{body{margin:0;max-width:none;padding:0}section,.metric{break-inside:avoid}thead{display:table-header-group}.metrics{grid-template-columns:repeat(4,minmax(0,1fr))}}
 </style></head><body>
 <header><div class="brand">Zenith Rise Capital · Risk & Investment Advisory</div><h1>Investment Committee Brief</h1><p class="subtitle">Evaluación cuantitativa preliminar · ${label(project,"Operación sin nombre")} · ${label(country,"País no seleccionado")}</p><p class="muted">Fecha del documento: ${esc(date)} · Versión: ${esc(COMMITTEE_BRIEF_VERSION)}</p></header>
 <section><h2>1 · Resumen de la simulación</h2><p><strong>${esc(npvSignal)}.</strong> La cifra depende enteramente de las hipótesis del modelo y requiere validación antes de una decisión corporativa.</p><div class="metrics">
 <div class="metric"><span>Inversión inicial</span><strong>${number(calc.capital)} M€</strong></div>
 <div class="metric"><span>VAN base</span><strong>${number(calc.baseNPV)} M€</strong></div>
 <div class="metric"><span>VAN adverso</span><strong>${number(calc.stressNPV)} M€</strong></div>
 <div class="metric"><span>TIR base</span><strong>${calc.irr===null?"N/D":number(calc.irr)+" %"}</strong></div></div>
 <p class="muted">Horizonte: ${calc.years} años · Descuento total asumido: ${number(calc.hurdleRate)} % · Valores en millones de euros.</p></section>
 <section><h2>2 · Flujos de caja anuales</h2><div class="table-scroll"><table><thead><tr><th>Año</th><th class="right">FCF operativo</th><th class="right">CAPEX adicional</th><th class="right">Valor terminal</th><th class="right">FCF neto</th><th class="right">FCF adverso</th></tr></thead><tbody>${cashRows(calc.rows)}</tbody></table></div>
 <p class="muted">El capital inicial se desembolsa en el año 0 y se descuenta con la tasa indicada. VAN = −CAPEX inicial + suma de flujos descontados. La TIR se omite cuando no hay una raíz única interpretable.</p></section>
 <section><h2>3 · Hipótesis específicas de sensibilidad</h2><div class="table-scroll"><table><thead><tr><th>Parámetro</th><th class="right">Hipótesis</th></tr></thead><tbody>
 <tr><td>Crecimiento anual FCF</td><td class="right">${number(annualSettings.growthRate)} %</td></tr><tr><td>CAPEX adicional estándar</td><td class="right">${number(annualSettings.maintenanceCapex)} M€/año</td></tr><tr><td>Exposición FX positiva</td><td class="right">${number(annualSettings.fxExposurePct)} %</td></tr><tr><td>Shock FX adverso</td><td class="right">${number(annualSettings.fxAdverseMovePct)} %</td></tr><tr><td>Caída del flujo en estrés</td><td class="right">${number(inputs.stressCashFlowDrop)} %</td></tr><tr><td>Sensibilidad editorial por país</td><td class="right">${countryAdjustment?"Activada en motor simplificado; no aplicada al FCFF anual":"Desactivada"}</td></tr>
 </tbody></table></div></section>
 <section><h2>4 · Trazabilidad y calidad de los inputs</h2><div class="table-scroll"><table><thead><tr><th>Variable</th><th class="right">Valor</th><th>Procedencia</th></tr></thead><tbody>${fieldRows(evidence)}</tbody></table></div><p class="muted">Estado de verificación: 0 inputs financieros verificados. Todos los parámetros se clasifican como ejemplo o hipótesis del usuario. Versión del registro: ${esc(INVESTMENT_EVIDENCE_VERSION)}.</p></section>
 <section><h2>5 · Condiciones antes de decidir</h2><div class="warning"><strong>Revisión necesaria:</strong> validar información financiera del proyecto, flujos, CAPEX, costes, riesgos legales/regulatorios, exposición FX, financiación, tasa de descuento y mitigantes con fuentes documentadas. Este documento no incluye due diligence de contraparte ni una opinión legal.</div><ul>${notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></section>
 <footer>Generado localmente desde GeoRisk Intelligence · Motor ${esc(ANNUAL_MODEL_VERSION)} · Uso interno · No se han consultado fuentes externas para elaborar este documento.</footer>
 </body></html>`;
}

export function downloadInvestmentCommitteeBrief(data){
 const html=buildInvestmentCommitteeBrief(data);
 const blob=new Blob([html],{type:"text/html;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;
 a.download="ZRC_Investment_Committee_Brief_"+String(data.project||"operacion").normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,45)+".html";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
