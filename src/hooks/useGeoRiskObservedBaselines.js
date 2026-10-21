import { useEffect,useMemo,useState } from 'react';
import {applyObservedBaselines} from '../data/georiskObservedBaselines.js';
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
 const variables=useMemo(()=>applyObservedBaselines(defaults,data.region===region?data.series:[],region),[defaults,data,region]);
 const observedCount=Object.values(variables).filter(v=>v.base_status==='observed').length;
 return {variables,observedCount,status:data.region===region?data.status:'loading'};
}
