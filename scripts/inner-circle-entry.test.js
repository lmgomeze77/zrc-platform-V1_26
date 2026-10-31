import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import worker from '../src/worker/index.js';

test('visitor sees the proposition, sample and application route before credentials',async()=>{
 const result=await build({stdin:{contents:"export {default} from './src/pages/innercircle/InnerCircleAccess.jsx';export {default as Member} from './src/pages/innercircle/InnerCircle.jsx';export {IcLocaleProvider} from './src/pages/innercircle/icLocale.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,packages:'external',format:'esm',jsx:'automatic',loader:{'.css':'empty'},write:false});
 const path=new URL('./.ic-entry-qa.mjs',import.meta.url);
 await writeFile(path,result.outputFiles[0].text);
 globalThis.localStorage={getItem:()=>null};
 try{
  const {default:Access,Member,IcLocaleProvider}=await import(path.href+'?qa=1');
  const html=renderToStaticMarkup(React.createElement(Access));
  assert.match(html,/Solicitar membresía gratuita/);assert.match(html,/Ya soy miembro/);assert.match(html,/Ver un ejemplo/);assert.match(html,/Cómo funciona el acceso/);assert.doesNotMatch(html,/type="password"/);assert.doesNotMatch(html,/PREGUNTA PRIORITARIA/);
  assert.match(html,/La evidencia de octubre/);assert.match(html,/1. La continuidad de la actividad/);
  const en=renderToStaticMarkup(React.createElement(IcLocaleProvider,{lang:'en'},React.createElement(Access)));
  assert.match(en,/Read the monthly report/);assert.match(en,/October’s evidence/);assert.match(en,/1. Continued activity/);assert.match(en,/Resilience comes at a cost/);assert.doesNotMatch(en,/La resiliencia|Membresía|Corte de información|730\.000/);
  const member=renderToStaticMarkup(React.createElement(IcLocaleProvider,{lang:'en'},React.createElement(Member,{useAuth:()=>({})})));
  assert.match(member,/What are you deciding/);assert.match(member,/Expand a business/);assert.match(member,/bringing production closer/i);assert.doesNotMatch(member,/Prepara tu próxima|Ventas a crédito|¿Qué debe/);
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
