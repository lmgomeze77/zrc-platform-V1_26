// Research-only, risk-conditioned FX forecasts. No model is promoted to production
// unless it improves on the unchanged-price benchmark out of sample.
// Weekly index prints are conservatively available only 7 days after week_start;
// snapshots marked fallback_static are excluded from fitting and evaluation.
const DAY=86400000;
const day=t=>Date.parse(t+'T00:00:00Z');
const average=a=>a.reduce((n,x)=>n+x,0)/a.length;
const horizonPoint=(points,origin,days)=>{
 const target=day(origin.date)+days*DAY;
 return points.find(p=>day(p.date)>=target&&day(p.date)<=target+7*DAY);
};
export function riskFeature(history,date){
 const cutoff=day(date)-7*DAY;
 const past=history.filter(x=>x.source!=='fallback_static'&&Number.isFinite(Number(x.index_value))&&day(x.week_start)<=cutoff&&day(x.week_start)>cutoff-28*DAY&&(!x.published_at||(Number.isFinite(Date.parse(x.published_at))&&Date.parse(x.published_at)<=day(date)))).sort((a,b)=>a.week_start.localeCompare(b.week_start));
 if(!past.length)return null;
 const latest=past.at(-1);
 const prior=past.length>1?past.at(-2):null;
 return {level:Number(latest.index_value),change:prior?Number(latest.index_value)-Number(prior.index_value):0,source_date:latest.week_start};
}
function ridgeFit(rows){
 const meanLevel=average(rows.map(x=>x.level));
 const meanChange=average(rows.map(x=>x.change));
 const meanY=average(rows.map(x=>x.y));
 // Strong ridge shrinkage, centered predictors. Intercept is not penalized.
 let a=16,b=0,c=16,d=0,e=0;
 for(const r of rows){
  const x=(r.level-meanLevel)/20,z=(r.change-meanChange)/10,y=r.y-meanY;
  a+=x*x;b+=x*z;c+=z*z;d+=x*y;e+=z*y;
 }
 const det=a*c-b*b;
 return {meanLevel,meanChange,meanY,betaLevel:(d*c-b*e)/det,betaChange:(a*e-b*d)/det};
}
const predict=(fit,r)=>fit.meanY+fit.betaLevel*(r.level-fit.meanLevel)/20+fit.betaChange*(r.change-fit.meanChange)/10;
const stableReturns=rows=>rows.every(r=>Math.abs(r.y)<0.7&&Number.isFinite(r.y));
export function evaluateRiskModel(item,indexHistory,horizon,now=new Date()){
 if(item.frequency==='monthly'||!Array.isArray(item.points)||!Array.isArray(indexHistory))return {status:'unavailable',reason:'Se requieren precios diarios e índice semanal verificable.'};
 const points=item.points.filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(p.value)&&p.value>0&&day(p.date)<=now.getTime()).sort((a,b)=>a.date.localeCompare(b.date));
 const history=indexHistory.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.week_start)&&r.source!=='fallback_static'&&Number.isFinite(Number(r.index_value))&&Number(r.index_value)>=0&&Number(r.index_value)<=100&&day(r.week_start)<=now.getTime());
 const last=points.at(-1);
 const current=last&&riskFeature(history,last.date);
 const base={status:'unavailable',horizon,index:current?{value:current.level,weekly_change:current.change,week:current.source_date}:null};
 if(!last||!current)return {...base,reason:'No hay suficiente histórico reciente del índice ZRC-GRI.'};
 // A retrospectively reconstructed weekly value is not evidence that the value
 // was available to investors on that date. Do not promote without vintages.
 if(history.some(x=>!x.published_at||!Number.isFinite(Date.parse(x.published_at))))return {...base,reason:'Se requieren fechas de publicación verificables (vintages) para evitar sesgo retrospectivo.',validation_gate:'missing_point_in_time_publication'};
 const origins=[];
 let lastOrigin=-Infinity;
 for(let i=0;i<points.length;i++){
  const p=points[i],t=day(p.date);
  if(t-lastOrigin<horizon*DAY)continue; // nonoverlapping evaluation windows
  const feat=riskFeature(history,p.date);
  const target=horizonPoint(points,p,horizon);
  if(!feat||!target)continue;
  origins.push({...feat,date:p.date,y:Math.log(target.value/p.value),observed:target.date});
  lastOrigin=t;
 }
 const split=Math.floor(origins.length*.65),train=origins.slice(0,split),validation=origins.slice(split);
 if(train.length<16||validation.length<12||!stableReturns(origins))return {...base,samples:origins.length,reason:'Histórico temporal insuficiente o no apto para una validación independiente.'};
 const fit=ridgeFit(train);
 const baseline=average(validation.map(v=>Math.abs(v.y)));
 const modelError=average(validation.map(v=>Math.abs(v.y-predict(fit,v))));
 // Strict improvement and enough independent observations: no prediction
 // published when index fails to beat the naïve no-change forecast.
 const improvement=baseline>0?(baseline-modelError)/baseline:0;
 if(!(improvement>=.05))return {...base,samples:origins.length,validation_samples:validation.length,baseline_mae:baseline,model_mae:modelError,improvement,reason:'El índice aún no mejora al modelo sin cambios al menos un 5% fuera de muestra.'};
 const finalFit=ridgeFit(origins);
 const predictedReturn=predict(finalFit,current);
 const point=last.value*Math.exp(predictedReturn);
 if(!Number.isFinite(point)||point<=0)return {...base,reason:'Resultado numérico no válido.'};
 return {status:'research_validated',horizon,point,expected_change_pct:(Math.exp(predictedReturn)-1)*100,index:base.index,validation_samples:validation.length,baseline_mae:baseline,model_mae:modelError,improvement,method:'walk_forward_holdout_ridge',note:'Proyección experimental condicionada por ZRC-GRI. No sustituye la previsión de referencia.'};
}
export async function loadWeeklyRiskHistory(env,fetchImpl=fetch){
 if(!env?.SUPABASE_URL||!env?.SUPABASE_SERVICE_KEY)return [];
 try{
  const resp=await fetchImpl(env.SUPABASE_URL+'/rest/v1/georisk_index_weekly?select=week_start,index_value,source&order=week_start.asc&limit=1000',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY},signal:AbortSignal.timeout(6000)});
  if(!resp.ok)return [];
  const rows=await resp.json();
  return Array.isArray(rows)?rows:[];
 }catch{return [];}
}
