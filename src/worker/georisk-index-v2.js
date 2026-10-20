// ZRC-GRI 2.0: additive, auditable diagnostics. Do not rewrite legacy scores.
// A score is not an independently calibrated probability of market losses.
export const GRI_METHOD_VERSION='zrc-gri-2.0-diagnostics';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const ms=s=>Date.parse(s+'T00:00:00Z');
const round=n=>Math.round(n*100)/100;
export function validateIndexInputs(scenarios,effectiveDate,asOf=new Date()){
 if(!Array.isArray(scenarios)||scenarios.length!==4)return {ok:false,reason:'Se requieren los cuatro escenarios versionados.'};
 if(!DATE.test(effectiveDate||'')||!Number.isFinite(ms(effectiveDate))||ms(effectiveDate)>asOf.getTime())return {ok:false,reason:'Fecha de vigencia inválida o futura.'};
 const keys=new Set(),rows=[];
 for(const s of scenarios){
  const prob=Number(s.prob),risk=Number(s.risk);
  if(!s.key||keys.has(s.key)||!s.label||!Number.isFinite(prob)||prob<0||prob>1||!Number.isFinite(risk)||risk<0||risk>100)
   return {ok:false,reason:'Escenarios con claves duplicadas, valores inválidos o fuera del rango.'};
  keys.add(s.key);rows.push({key:s.key,label:s.label,prob,risk,contribution:round(prob*risk)});
 }
 if(Math.abs(rows.reduce((sum,r)=>sum+r.prob,0)-1)>0.0001)return {ok:false,reason:'Las probabilidades deben sumar exactamente 1, dentro de tolerancia numérica.'};
 const ageDays=Math.floor((asOf.getTime()-ms(effectiveDate))/86400000);
 return {ok:true,rows,ageDays,stale:ageDays>21,
  value:round(rows.reduce((sum,r)=>sum+r.prob*r.risk,0)),
  dominant:rows.reduce((a,b)=>b.prob>a.prob?b:a),
  largestContributor:[...rows].sort((a,b)=>b.prob*b.risk-a.prob*a.risk)[0]};
}
export function analyzeIndexHistory(history,asOf=new Date()){
 const cleaned=(Array.isArray(history)?history:[])
   .filter(x=>DATE.test(x.week_start||'')&&Number.isFinite(Number(x.index_value))&&
      Number(x.index_value)>=0&&Number(x.index_value)<=100&&ms(x.week_start)<=asOf.getTime())
   .map(x=>({...x,index_value:Number(x.index_value)}))
   .sort((a,b)=>a.week_start.localeCompare(b.week_start));
 const byDate=new Map(cleaned.map(row=>[row.week_start,row]));
 const all=[...byDate.values()],verified=all.filter(r=>r.source!=='fallback_static'&&r.source!=='unknown'&&!!r.source);
 const last=verified.at(-1),prev=verified.at(-2);
 const change=last&&prev&&ms(last.week_start)-ms(prev.week_start)<=14*86400000?round(last.index_value-prev.index_value):null;
 const weeks=verified.length?Math.floor((asOf.getTime()-ms(last.week_start))/86400000):null;
 const comparable=change!==null;
 return {total:all.length,verified:verified.length,excluded:all.length-verified.length,
  last_verified_week:last?.week_start||null,latest_verified_value:last?.index_value??null,
  delta_week:change,trend:!comparable?'insufficient':Math.abs(change)<0.05?'stable':change>0?'rising':'falling',
  history_stale:weeks===null||weeks>14,week_age_days:weeks,
  // Changes in existing index are observations, NOT an 'unexpected surprise'
  // until an ex-ante frozen index forecast and publication timestamps exist.
  surprise_status:'not_calibrated',model_version:GRI_METHOD_VERSION};
}
export function explainIndexInputs(validation){
 if(!validation?.ok)return [];
 return [...validation.rows].sort((a,b)=>b.prob*b.risk-a.prob*a.risk).map(x=>({...x,share_pct:validation.value>0?round(x.prob*x.risk/validation.value*100):0}));
}
