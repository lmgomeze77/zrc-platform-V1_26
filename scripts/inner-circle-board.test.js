import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {writeFile,unlink} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import content from '../src/worker/inner-circle-content.js';

test('intelligence workstreams preserve evidence and source provenance in an editable bilingual brief',async()=>{
 const compiled=await build({stdin:{contents:"export {default,intelligenceEntries,buildIntelligenceBrief} from './src/pages/innercircle/IntelligenceBoard.jsx';export {IcLocaleProvider,IcMemberContentProvider} from './src/pages/innercircle/icLocale.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,packages:'external',format:'esm',jsx:'automatic',loader:{'.css':'empty'},write:false});
 const path=new URL('./.ic-board-test.mjs',import.meta.url);await writeFile(path,compiled.outputFiles[0].text);
 try{
 const {default:Board,intelligenceEntries,buildIntelligenceBrief,IcLocaleProvider,IcMemberContentProvider}=await import(path.href);
 for(const lang of ['es','en']){
  const groups=intelligenceEntries(content,lang);assert.equal(groups.radar.length,4);assert.equal(groups.diplomacy.length,2);assert.equal(groups.advocacy.length,2);
  const chosen=[groups.radar[0],groups.advocacy[1]];const brief=buildIntelligenceBrief({entries:chosen,objective:'Board decision: enter Mexico?',lang,cutoff:'2026-10-31'});
  assert.match(brief,/Board decision: enter Mexico\?/);assert.match(brief,/2026-10-31/);
  for(const entry of chosen){assert.ok(brief.includes(entry.basis));assert.ok(brief.includes(entry.angle));assert.ok(brief.includes(entry.action));for(const source of entry.sources)assert.ok(brief.includes(source.url));}
  assert.ok(!brief.includes(groups.diplomacy[0].title));
  for(const initialDesk of ['radar','diplomacy','advocacy','resources']){
   const html=renderToStaticMarkup(React.createElement(IcLocaleProvider,{lang},React.createElement(IcMemberContentProvider,{content},React.createElement(Board,{initialDesk}))));
   assert.match(html,/disabled=""/);assert.match(html,lang==='es'?/Descargar brief/:/Download brief/);
   if(lang==='en')assert.doesNotMatch(html,/Añadir al brief|Qué comprobar|Base documental|¿Quién|Próxima|Cabildeo/);
   if(initialDesk==='resources')for(const resource of content.edition.intelligenceBoard.resources)assert.ok(html.includes(resource.url));
  }
 }
 // Only the signed-session content endpoint imports the editorial data.
 assert.doesNotMatch(compiled.outputFiles[0].text,/De la barrera comercial al expediente defendible|Who decides, who implements and who can block/);
 }finally{await unlink(path);}
});
