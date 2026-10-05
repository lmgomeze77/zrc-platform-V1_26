import { fetchGeoRiskMacroSeries } from './georisk-macro.js';
import { ECB_HISTORY_URL, ECB_SOURCE_URL, parseECBHistory } from './georisk-market.js';
const DAY = 86400000;
export const FORECAST_VERSION = 'observed-outlook-1.0';
const quantile = (values, q) => [...values].sort((a,b)=>a-b)[Math.min(values.length-1, Math.ceil(q*values.length)-1)];
function estimate(points, days, method, monthly) {
  const last = points.at(-1);
  if (method === 'persistence') return last.value;
  const first = points[Math.max(0, points.length-(monthly ? 12 : 60))];
  const span = monthly ? (Number(last.date.slice(0,4))-Number(first.date.slice(0,4)))*12+Number(last.date.slice(5,7))-Number(first.date.slice(5,7)) : (Date.parse(last.date)-Date.parse(first.date))/DAY;
  return last.value + (span ? (last.value-first.value)*days/span : 0);
}
export function forecastSeries(item, now = new Date()) {
  const monthly = item.frequency === 'monthly';
  const unique = new Map();
  for (const p of item.points || []) if (/^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value) && Date.parse(p.date)<=now.getTime()) unique.set(p.date,p);
  const points = [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const latest = points.at(-1);
  const base = { id:item.id, label:item.label, unit:item.unit, provider:item.provider, source_url:item.source_url, frequency:item.frequency, source_captured_at:item.source_captured_at, latest };
  if (!latest) return {...base, status:'unavailable', reason:'No hay observaciones verificables disponibles.'};
  if (item.collection_stale || item.observation_stale || (now.getTime()-Date.parse(latest.date))/DAY > (monthly ? 75 : 10)) return {...base,status:'unavailable',reason:'La referencia está desactualizada para emitir un pronóstico.'};
  const horizons = [30,90].map(horizon => {
    const targetDay = new Date(now.getTime()+horizon*DAY).toISOString().slice(0,10);
    const target = monthly ? targetDay.slice(0,7)+'-01' : targetDay;
    const days = monthly ? (Number(target.slice(0,4))-Number(latest.date.slice(0,4)))*12+Number(target.slice(5,7))-Number(latest.date.slice(5,7)) : (Date.parse(target)-Date.parse(latest.date))/DAY;
    // Origins use only observations available by that date. Outcome is the first
    // published period at/after the target; monthly tests retain monthly resolution.
    const trials=[];
    const stride=monthly?1:10, start=monthly?12:60;
    for(let i=start; i<points.length-1; i+=stride){
      const origin=new Date(points[i].date);
      const end=monthly ? Date.UTC(origin.getUTCFullYear(),origin.getUTCMonth()+days,1) : Date.parse(points[i].date)+days*DAY;
      const actual=points.find((p,j)=>j>i && Date.parse(p.date)>=end);
      if(!actual) break;
      const history=points.slice(0,i+1);
      trials.push({ origin:points[i].date, outcome:actual.date, actual:actual.value, persistence:estimate(history,days,'persistence',monthly), trend:estimate(history,days,'trend',monthly) });
    }
    const split=Math.floor(trials.length*2/3), validation=trials.slice(split);
    const selection=trials.slice(0,split).filter(t=>t.outcome < validation[0]?.origin);
    if(selection.length<12 || validation.length<12) return {horizon,target_date:target,status:'unavailable',reason:'Histórico insuficiente para una validación separada.'};
    const mae=(rows,method)=>rows.reduce((s,r)=>s+Math.abs(r.actual-r[method]),0)/rows.length;
    // Policy rate forecasts retain the unchanged-rate benchmark; historical drift
    // cannot predict discrete central-bank decisions.
    const method=item.id==='ECB_DEPOSIT_RATE' || mae(selection,'persistence')<=mae(selection,'trend') ? 'persistence':'trend';
    const errors=validation.map(r=>Math.abs(r.actual-r[method]));
    const radius=quantile(errors,.8);
    const point=estimate(points,days,method,monthly);
    const positive=/^(EUR|USD)/.test(item.id);
    if(!Number.isFinite(point) || (positive && point<=0)) return {horizon,target_date:target,status:'unavailable',reason:'La extrapolación no produce un nivel válido.'};
    return {horizon,target_date:target,status:'available',point,lower:positive?Math.max(0,point-radius):point-radius,upper:point+radius,
      direction:point>latest.value+radius*.1?'up':point<latest.value-radius*.1?'down':'stable',
      basis:method==='persistence'?'Escenario de continuidad del último nivel observado':'Proyección de tendencia histórica',
      validation:{samples:validation.length,mae:mae(validation,method),baseline_mae:mae(validation,'persistence'),coverage:errors.filter(e=>e<=radius).length/errors.length,
        start:validation[0].origin,end:validation.at(-1).outcome},
      validation_warning:mae(validation,method)>mae(validation,'persistence')?'La proyección no supera el escenario de continuidad en el periodo de validación.':null};
  });
  return {...base,status:'available',horizons};
}
export function buildOutlook(series, region, now = new Date()) {
  const ids = region==='eu'?['ECB_DEPOSIT_RATE','EU_HICP','EURUSD','ECB_10Y_YIELD']:region==='usa'?['US_CPI','EURUSD']:['USDCNY'];
  return {version:FORECAST_VERSION,region,generated_at:now.toISOString(),series:ids.map(id=>forecastSeries(series.find(s=>s.id===id)||{id,label:id},now)),
    missing:region==='eu'?['Materias primas','Flujos de inversión extranjera','Diferenciales de crédito']:region==='usa'?['Tipo oficial de la Fed','Rendimiento del Treasury a 10 años','Materias primas','Flujos de inversión extranjera']:['Inflación de China','Tipo oficial de China','Rendimiento soberano','Materias primas','Flujos de inversión extranjera']};
}
export async function handleGeoRiskForecast(request, env, fetchImpl=fetch, now=new Date()) {
  const region=new URL(request.url).searchParams.get('region')||'eu';
  if(!['eu','usa','asia'].includes(region)) return new Response(JSON.stringify({error:'Región no válida'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  const results=await Promise.allSettled([
    fetchGeoRiskMacroSeries(fetchImpl,now,env),
    (async()=>{const r=await fetchImpl(ECB_HISTORY_URL,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('ECB unavailable');return {series:parseECBHistory(await r.text(),now).map(s=>({...s,provider:'BCE',source_url:ECB_SOURCE_URL,frequency:'daily'}))};})()
  ]);
  const series=results.flatMap(r=>r.status==='fulfilled'?r.value.series:[]);
  return new Response(JSON.stringify(buildOutlook(series,region,now)),{headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=1800'}});
}
