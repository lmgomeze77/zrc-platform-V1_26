const TRUSTED_ORIGINS=new Set(['https://www.zenithrisecapital.com','https://zenithrisecapital.com','https://zenith-risecapital.lmgomeze77.workers.dev']);
const COOKIE='__Host-zrc_ic_session';
const TTL=86400;
const encoder=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const key=env=>crypto.subtle.importKey('raw',encoder.encode(env.SUPABASE_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
export function icPrivateJson(body,status=200,cookie){
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Cookie'};
 if(cookie)headers['Set-Cookie']=cookie;
 return new Response(JSON.stringify(body),{status,headers});
}
export function icSameOrigin(request){const origin=request.headers.get('Origin');return !origin||origin===new URL(request.url).origin||TRUSTED_ORIGINS.has(origin);}
export async function startIcSession(email,env){
 const payload=encode(encoder.encode(JSON.stringify({purpose:'zrc-inner-circle-v1',email,exp:Math.floor(Date.now()/1000)+TTL,nonce:crypto.randomUUID()})));
 const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),encoder.encode(payload))));
 return icPrivateJson({status:'approved',session_token:payload+'.'+signature},200,`${COOKIE}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`);
}
export async function readIcSession(request,env){
 try{
  if(!env.SUPABASE_SERVICE_KEY)return null;
  const bearer=request.headers.get('Authorization');
  const token=bearer?.startsWith('Bearer ')?bearer.slice(7):(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token)return null;
  const [payload,signature,extra]=token.split('.');if(!payload||!signature||extra)return null;
  if(!await crypto.subtle.verify('HMAC',await key(env),decode(signature),encoder.encode(payload)))return null;
  const data=JSON.parse(new TextDecoder().decode(decode(payload)));
  return data.purpose==='zrc-inner-circle-v1'&&Number.isInteger(data.exp)&&data.exp>Math.floor(Date.now()/1000)&&typeof data.email==='string'?data.email:null;
 }catch{return null;}
}
export function endIcSession(request){
 if(!icSameOrigin(request))return icPrivateJson({status:'denied'},403);
 return icPrivateJson({ok:true},200,`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function icCorsResponse(response,request){
 const origin=request.headers.get('Origin');const headers=new Headers(response.headers);
 headers.delete('Access-Control-Allow-Origin');
 if(origin&&TRUSTED_ORIGINS.has(origin)){
  headers.set('Access-Control-Allow-Origin',origin);
  headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');
 }
 headers.set('Vary','Cookie, Origin');
 headers.set('Cache-Control','private, no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
