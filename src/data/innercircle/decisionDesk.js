export const decisionTypes = {
  expansion: { title:'Expandir un negocio', question:'¿Qué debe estar resuelto antes del primer desembolso?', evidence:['Demanda acreditada: pedidos, contratos o piloto comercial.','Permisos, suministros y capacidad local comprobados.','Presupuesto de entrada con caja de transición y circulante.'], action:'Definir un piloto y condicionar el siguiente desembolso a demanda y capacidad verificadas.' },
  acquisition: { title:'Adquirir una empresa', question:'¿Qué parte del resultado se convierte en caja sostenible?', evidence:['Conciliación de EBITDA con caja y partidas no recurrentes.','Capital circulante normalizado y deuda financiera y asimilada.','Clientes, contratos y contingencias contrastados en diligencia.'], action:'Preparar un puente de EBITDA a flujo de caja y una lista de ajustes al precio antes de negociar una oferta vinculante.' },
  financing: { title:'Financiar un proyecto', question:'¿La moneda y el vencimiento de la deuda encajan con los cobros?', evidence:['Calendario de cobros y pagos por moneda.','Ofertas de financiación con comisiones, garantías y covenants.','Caja mínima y servicio de deuda bajo estrés conjunto.'], action:'Comparar ofertas sobre la misma moneda, plazo y cobertura; identificar el mes de menor liquidez.' },
};
export const countryQuestions = {
  MX:'México: acreditar permisos y disponibilidad de suministros del emplazamiento; contrastar las condiciones comerciales y de origen aplicables al producto concreto con asesores locales.',
  CO:'Colombia: contrastar ofertas reales de financiación en pesos y euros, plazos de cobro y capacidad contractual de repercutir costes; comprobar la caja distribuible a la matriz.',
  ES:'España: comprobar margen después de energía y logística, necesidades de circulante y condiciones efectivas de financiación.',
  OTHER:'Otra geografía: identificar permisos, fiscalidad, moneda de cobro y pago y condiciones de distribución de caja con especialistas locales.',
};
export const defaultDecision = {name:'Mi decisión',type:'expansion',country:'MX',reviewDate:'',creditSales:0,extraDays:15,fxPayments:0,fxIncrease:10,checked:[],nextStep:''};
const positive = (v,max) => Math.min(max,Math.max(0,Number(v)||0));
export function normalizeDecision(raw = {}) {
  return {...defaultDecision,name:String(raw.name||defaultDecision.name).slice(0,100),type:decisionTypes[raw.type]?raw.type:'expansion',country:countryQuestions[raw.country]?raw.country:'MX',reviewDate:/^\d{4}-\d{2}-\d{2}$/.test(raw.reviewDate||'')?raw.reviewDate:'',creditSales:positive(raw.creditSales,1e12),extraDays:positive(raw.extraDays,365),fxPayments:positive(raw.fxPayments,1e12),fxIncrease:positive(raw.fxIncrease,100),checked:Array.isArray(raw.checked)?[...new Set(raw.checked.filter(i=>Number.isInteger(i)&&i>=0&&i<3))]:[],nextStep:String(raw.nextStep||'').slice(0,1200)};
}
export function cashSensitivity(raw) {
  const d=normalizeDecision(raw);
  return {receivables:d.creditSales/365*d.extraDays,fxCost:d.fxPayments*d.fxIncrease/100};
}
export function buildDecisionMarkdown(raw, sources = [], savedAt = '') {
  const d=normalizeDecision(raw), play=decisionTypes[d.type], amounts=cashSensitivity(d);
  const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  return [`# Inner Circle · Ficha de decisión`,d.name,`Operación: ${play.title} · País: ${d.country}`,`Fecha de revisión: ${d.reviewDate||'Por definir'}`,savedAt?`Versión guardada: ${savedAt}`:'Versión de trabajo sin guardar',`## Pregunta prioritaria`,play.question,`## Comprobación local`,countryQuestions[d.country],`## Evidencia pendiente`,...play.evidence.map((e,i)=>`- [${d.checked.includes(i)?'x':' '}] ${e}`),`## Sensibilidades introducidas por el miembro`,`Ventas anuales a crédito: ${money(d.creditSales)}. Retraso adicional: ${d.extraDays} días. Caja adicional inmovilizada: ${money(amounts.receivables)} (ventas anuales / 365 × días adicionales). No es un gasto anual recurrente.`,`Coste anual actual en euros de los pagos en divisa: ${money(d.fxPayments)}. Encarecimiento supuesto en euros: ${d.fxIncrease} %. Sobrecoste anual: ${money(amounts.fxCost)}. Supone volumen constante y ausencia de coberturas.`,`No se suman ambas cifras: una es necesidad de circulante; la otra es gasto anual. No son una valoración ni una estimación del tipo de cambio.`,`## Próximo paso`,d.nextStep||play.action,`## Contexto editorial · corte 31 de octubre de 2026`,`Lectura de referencia; no comprobación actualizada del proyecto.`,...sources.map(s=>`- [${s.title}](${s.url}) · ${s.published}`),`Contenido de trabajo del miembro. La evidencia marcada no ha sido validada por ZRC.`].join('\n\n')+'\n';
}
