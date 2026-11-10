import { useEffect,useMemo,useState } from 'react';
import marketSnapshot from '../../public/data/georisk-market-research.json';
import {applyObservedBaselines,readObservedSeries} from '../data/georiskObservedBaselines.js';
const API='https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-forecast';
export function useGeoRiskObservedBaselines(region,defaults){
 const [data,setData]=useState({region:null,series:[],status:'loading'});
 useEffect(()=>{
  let mounted=true;
  const controller=new AbortController();
  setData({region,series:[],status:'loading'});
  fetch(API+'?region='+encodeURIComponent(region),{signal:controller.signal})
   .then(async r=>{if(!r.ok)throw new Error('observed source unavailable');return r.json()})
   .then(result=>{if(mounted)setData({region,series:Array.isArray(result.series)?result.series:[],status:'loaded'})})
   .catch(()=>{if(mounted)setData({region,series:[],status:'unavailable'})});
  return ()=>{mounted=false;controller.abort()};
 },[region]);
 const references=useMemo(()=>[...(data.region===region?data.series:[]),...((marketSnapshot.series||[]).filter(s=>s.id==='DGS10'||s.id==='DCOILBRENTEU'))],[data,region]);
 const variables=useMemo(()=>applyObservedBaselines(defaults,references,region),[defaults,references,region]);
 const context={
  commodities:{label:'Brent',unit:'USD/barril',...readObservedSeries(references,'DCOILBRENTEU')},
  ...(region==='eu'?{sovereign_yield:{label:'Curva de deuda pública de la eurozona a 10 años',unit:'%',...readObservedSeries(references,'ECB_10Y_YIELD')}}:{})
 };
 const observedCount=Object.values(variables).filter(v=>v.base_status==='observed').length;
 return {variables,observedCount,context,status:data.region===region?data.status:'loading'};
}
