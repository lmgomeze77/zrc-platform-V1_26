// Market Impact comparison contract. Treat historical GPR evidence, observed
// prices and standalone statistical outlooks as different kinds of information.
export const MARKET_WATCH_VERSION='zrc-market-watch-v1';
export const MARKET_MATCHES=Object.freeze({
 gold:{market_id:null,forecast_id:null},
 brent:{market_id:'DCOILBRENTEU',forecast_id:null},
 equity_us:{market_id:'SP500',forecast_id:null},
 bund10:{market_id:null,forecast_id:null},
 ust10:{market_id:'DGS10',forecast_id:null},
 eurusd:{market_id:null,forecast_id:'EURUSD'}
});
export function marketWatchRow(asset,evidenceBand,data,horizon=30){
 const cell=asset?.cells?.[evidenceBand],match=MARKET_MATCHES[asset?.key];
 if(!cell||!match)return null;
 const market=data?.market_observed?.find(s=>s.id===match.market_id);
 const forecastSeries=data?.series?.find(s=>s.id===match.forecast_id);
 const latest=market?.latest||forecastSeries?.latest;
 const observed=latest&&Number.isFinite(latest.value)&&/^\d{4}-\d{2}-\d{2}$/.test(latest.date||'')&&
  (market?.status==='observed'||forecastSeries?.status==='available');
 const h=forecastSeries?.horizons?.find(x=>x.horizon===horizon);
 const forecast=h?.status==='available'&&Number.isFinite(h.point)&&Number.isFinite(h.lower)&&Number.isFinite(h.upper)&&
 h.lower<=h.point&&h.point<=h.upper ? {value:h.point,lower:h.lower,upper:h.upper,direction:h.direction,validation:h.validation,
  target_date:h.target_date,model_basis:h.basis}:null;
 return {
  key:asset.key,label:asset.label,unit:asset.unit,excess:cell.excess,n:cell.n,significant:cell.significant,share_up:cell.share_up,
  p25:cell.p25,p75:cell.p75,observed:observed?{
   value:latest.value,date:latest.date,unit:market?.unit||forecastSeries?.unit||null,
   provider:market?.provider||forecastSeries?.provider||null,
   source_url:market?.source_url||forecastSeries?.source_url||null
  }:null,
  forecast,
  coverage:!observed?'historical_only':forecast?'observed_and_statistical_outlook':'observed_no_statistical_outlook',
  // Crucially no ZRC-GRI-to-GPR band equivalence, no inferred asset price prediction.
  evidence_index:'external_GPR',forecast_kind:forecast?'unconditioned_statistical':null
 };
}
export function validateMarketWatchMatches(assets){
 const ids=new Set((assets||[]).map(a=>a.key));
 return ids.size===Object.keys(MARKET_MATCHES).length&&
  Object.keys(MARKET_MATCHES).every(k=>ids.has(k))&&
  Object.values(MARKET_MATCHES).every(x=>!x.market_id||!x.forecast_id);
}
