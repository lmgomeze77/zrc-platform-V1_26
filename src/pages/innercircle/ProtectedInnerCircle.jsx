import {IC_API,IC_SESSION_KEY,icSessionHeaders,clearIcSession} from './icSession';
import {useEffect,useState} from 'react';
import InnerCircle from './InnerCircle';
import {IcText,IcMemberContentProvider} from './icLocale';

export default function ProtectedInnerCircle({onBack,onUnauthorized,useAuth}){
 const [content,setContent]=useState(null);
 const [denied,setDenied]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!localStorage.getItem(IC_SESSION_KEY)){setDenied(true);return;}
  const controller=new AbortController();
  fetch(IC_API+'/api/inner-circle/content',{headers:icSessionHeaders(),cache:'no-store',signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error('unauthorised');return response.json();})
   .then(data=>{if(data.status!=='approved'||!data.content?.edition||!Array.isArray(data.content?.dossiers))throw new Error('invalid content');setContent(data.content);})
   .catch(error=>{if(error.name!=='AbortError'){clearIcSession();setDenied(true);}});
  return ()=>controller.abort();
 },[]);
 useEffect(()=>{if(denied)(onUnauthorized||onBack)?.();},[denied,onUnauthorized,onBack]);
 const logout=async()=>{
  try{const response=await fetch(IC_API+'/api/inner-circle/logout',{method:'POST',headers:icSessionHeaders()});if(!response.ok)throw new Error('logout');clearIcSession();setContent(null);setDenied(true);}
  catch{setMessage('No se pudo cerrar la sesión. Inténtalo de nuevo.');}
 };
 if(denied)return null;
 if(!content)return <IcText><p role="status" style={{padding:32,color:'#E8E0CC'}}>Comprobando acceso…</p></IcText>;
 return <IcMemberContentProvider content={content}>{message&&<IcText><p role="alert">{message}</p></IcText>}<InnerCircle onBack={onBack} onLogout={logout} useAuth={useAuth}/></IcMemberContentProvider>;
}
