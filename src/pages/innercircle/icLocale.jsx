import {createContext,useContext,Children,isValidElement,cloneElement} from 'react';
import english from '../../data/innercircle/english.json';
const Locale=createContext({lang:'es',setLang:()=>{}});
export function IcLocaleProvider({lang='es',onChange,children}){return <Locale.Provider value={{lang,setLang:onChange||(()=>{})}}>{children}</Locale.Provider>;}
export const useIcLocale=()=>useContext(Locale);
export function translateIc(text,lang){
 if(lang!=='en'||typeof text!=='string')return text;
 const clean=text.replace(/\s+/g,' ').trim();
 if(english[clean])return text.replace(text.trim(),english[clean]);
 const patterns=[[/^Último guardado: /,'Last saved: '],[/^Hay cambios sin guardar\.$/,'There are unsaved changes.'],[/ de /,' of '],[/ puntos revisados$/,' checks reviewed']];
 if(/^Último guardado: |^\d+ de \d+ puntos revisados$/.test(text))return patterns.reduce((s,[a,b])=>s.replace(a,b),text);
 return text;
}
function translateNode(node,lang){
 if(typeof node==='string')return translateIc(node,lang);
 if(!isValidElement(node))return node;
 const props={};
 for(const key of ['placeholder','aria-label','title','alt'])if(typeof node.props[key]==='string')props[key]=translateIc(node.props[key],lang);
 if(node.props.children!==undefined)props.children=Children.map(node.props.children,child=>translateNode(child,lang));
 return cloneElement(node,props);
}
export function IcText({children}){const {lang}=useIcLocale();const node=translateNode(children,lang);return isValidElement(node)&&typeof node.type==='string'?cloneElement(node,{lang}):node;}
export function IcLanguageSwitch(){const {lang,setLang}=useIcLocale();return <div className="ic-language-switch" aria-label="Language / Idioma">{['es','en'].map(code=><button type="button" key={code} aria-pressed={lang===code} className="ic-button ic-button-quiet" onClick={()=>setLang(code)}>{code.toUpperCase()}</button>)}</div>;}
// Keep overlay navigation within its own scroll container; do not change the app route/hash.
export function navigateIcSection(event){
 const link=event.target.closest?.('a[href^="#"]');if(!link)return;
 const id=link.getAttribute('href').slice(1);const target=Array.from(event.currentTarget.querySelectorAll('[id]')).find(el=>el.id===id);
 if(!target)return;
 event.preventDefault();
 const scroller=event.currentTarget.closest('[data-ic-overlay]');
 const header=event.currentTarget.querySelector('header');
 if(scroller)scroller.scrollTo({top:Math.max(0,scroller.scrollTop+target.getBoundingClientRect().top-scroller.getBoundingClientRect().top-(header?.offsetHeight||0)-20),behavior:'auto'});
 else target.scrollIntoView({behavior:'auto',block:'start'});
}
