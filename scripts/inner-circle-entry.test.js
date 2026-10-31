import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import worker from '../src/worker/index.js';
import content from '../src/worker/inner-circle-content.js';

test('visitor sees the proposition, sample and application route before credentials',async()=>{
 const result=await build({stdin:{contents:"export {default} from './src/pages/innercircle/InnerCircleAccess.jsx';export {default as Member} from './src/pages/innercircle/InnerCircle.jsx';export {IcLocaleProvider,IcMemberContentProvider} from './src/pages/innercircle/icLocale.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,packages:'external',format:'esm',jsx:'automatic',loader:{'.css':'empty'},write:false});
 const path=new URL('./.ic-entry-qa.mjs',import.meta.url);
 await writeFile(path,result.outputFiles[0].text);
 globalThis.localStorage={getItem:()=>null};
 try{
  const {default:Access,Member,IcLocaleProvider,IcMemberContentProvider}=await import(path.href+'?qa=1');
  const html=renderToStaticMarkup(React.createElement(Access));
  assert.match(html,/Solicitar membresía gratuita/);assert.match(html,/Ya soy miembro/);assert.match(html,/Ver un ejemplo/);assert.match(html,/Cómo funciona el acceso/);assert.match(html,/AVANCE DE CONTENIDOS/);assert.match(html,/No hay renovación de pago automática/);assert.doesNotMatch(html,/type="password"/);assert.doesNotMatch(html,/PREGUNTA PRIORITARIA/);
  assert.doesNotMatch(html,/La evidencia de octubre|1. La continuidad de la actividad|type="password"/);
  assert.doesNotMatch(result.outputFiles[0].text,/At October’s close, our reading|Al cierre de octubre, nuestra lectura/);
  const en=renderToStaticMarkup(React.createElement(IcLocaleProvider,{lang:'en'},React.createElement(Access)));
  assert.match(en,/CONTENTS PREVIEW/);assert.match(en,/No automatic paid renewal/);assert.doesNotMatch(en,/October’s evidence|1. Continued activity/);assert.match(en,/Resilience comes at a cost/);assert.doesNotMatch(en,/La resiliencia|Membresía|Corte de información|730\.000/);
  const member=renderToStaticMarkup(React.createElement(IcLocaleProvider,{lang:'en'},React.createElement(IcMemberContentProvider,{content},React.createElement(Member,{useAuth:()=>({})}))));
  assert.match(member,/MEMBER · APPROVED ACCESS/);assert.doesNotMatch(member,/Apply for free membership/);assert.match(member,/What are you deciding/);assert.match(member,/Expand a business/);assert.match(member,/bringing production closer/i);assert.doesNotMatch(member,/Prepara tu próxima|Ventas a crédito|¿Qué debe/);
 }finally{delete globalThis.localStorage;await unlink(path);}
});

test('approved status alone cannot authenticate a passwordless account',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json([{status:'approved',password_hash:null}]);};
 try{
  const res=await worker.fetch(new Request('https://example.test/api/inner-circle/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'member@example.test',password:'test-password'})}),{SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_KEY:'test'},{});
  assert.equal((await res.json()).status,'denied');assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

test('password-configured accounts still require successful server verification',async()=>{
 const original=globalThis.fetch;
 try{
  for(const valid of [false,true]){
   globalThis.fetch=async url=>url.includes('/rpc/')?Response.json(valid):Response.json([{status:'approved',password_hash:'configured'}]);
   const res=await worker.fetch(new Request('https://example.test/api/inner-circle/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'member@example.test',password:'test-password'})}),{SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_KEY:'test'},{});
   assert.equal((await res.json()).status,valid?'approved':'denied');
  }
 }finally{globalThis.fetch=original;}
});


test('full content requires a signed session and current membership approval',async()=>{
 const original=globalThis.fetch;
 const env={SUPABASE_URL:'https://database.example.test',SUPABASE_SERVICE_KEY:'test-session-secret-only'};
 let approved=true;
 globalThis.fetch=async url=>url.includes('/rpc/')?Response.json(true):Response.json([{status:approved?'approved':'pending',password_hash:'configured'}]);
 try{
  const anonymous=await worker.fetch(new Request('https://example.test/api/inner-circle/content'),env,{});
  assert.equal(anonymous.status,401);assert.equal((await anonymous.json()).content,undefined);
  const emailOnly=await worker.fetch(new Request('https://example.test/api/inner-circle/check?email=member@example.test'),env,{});
  assert.equal(emailOnly.status,401);
  const login=await worker.fetch(new Request('https://example.test/api/inner-circle/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'member@example.test',password:'test-password'})}),env,{});
  const loginData=await login.json();assert.equal(loginData.status,'approved');assert.ok(loginData.session_token);
  const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);assert.match(cookie,/Max-Age=86400/);
  const token=cookie.split(';')[0];
  const bearer=await worker.fetch(new Request('https://example.test/api/inner-circle/content',{headers:{Authorization:`Bearer ${loginData.session_token}`,Origin:'https://www.zenithrisecapital.com'}}),env,{});
  assert.equal(bearer.status,200);assert.equal(bearer.headers.get('access-control-allow-origin'),'https://www.zenithrisecapital.com');
  const preflight=await worker.fetch(new Request('https://example.test/api/inner-circle/content',{method:'OPTIONS',headers:{Origin:'https://www.zenithrisecapital.com','Access-Control-Request-Headers':'authorization'}}),env,{});
  assert.match(preflight.headers.get('access-control-allow-headers'),/Authorization/);
  const request=()=>new Request('https://example.test/api/inner-circle/content',{headers:{cookie:token}});
  const authorised=await worker.fetch(request(),env,{});assert.equal(authorised.status,200);assert.match(authorised.headers.get('cache-control'),/no-store/);
  const data=await authorised.json();assert.equal(data.content.edition.editorial.paragraphs.length,6);assert.equal(data.content.dossiers.length,3);assert.ok(data.content.translations[data.content.edition.thesis]);
  const forged=await worker.fetch(new Request('https://example.test/api/inner-circle/content',{headers:{cookie:token+'forged'}}),env,{});assert.equal(forged.status,401);
  approved=false;assert.equal((await worker.fetch(request(),env,{})).status,401);approved=true;
  const now=Date.now;try{Date.now=()=>now()+86401000;assert.equal((await worker.fetch(request(),env,{})).status,401);}finally{Date.now=now;}
  const logout=await worker.fetch(new Request('https://example.test/api/inner-circle/logout',{method:'POST'}),env,{});assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{globalThis.fetch=original;}
});

test('a cross-origin login cannot create a member session',async()=>{
 const response=await worker.fetch(new Request('https://example.test/api/inner-circle/login',{method:'POST',headers:{origin:'https://unrelated.example','content-type':'application/json'},body:'{}'}),{},{});
 assert.equal(response.status,403);assert.equal(response.headers.get('set-cookie'),null);
});
