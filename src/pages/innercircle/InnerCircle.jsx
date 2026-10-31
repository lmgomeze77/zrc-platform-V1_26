import {useEffect,useRef,useState} from 'react';
import {IcText,IcLanguageSwitch,navigateIcSection,useIcMemberContent} from './icLocale';
import MonthlyEdition from './MonthlyEdition';
import IntelligenceBoard from './IntelligenceBoard';
import EditorialAgenda from './EditorialAgenda';
import CuratedOpportunities from './CuratedOpportunities';
import WorkingLibrary from './WorkingLibrary';
import './innerCircle.css';

export default function InnerCircle({onBack,onLogout}){
 const {edition}=useIcMemberContent();
 const [view,setView]=useState('issue');const root=useRef(null);
 useEffect(()=>{const scroller=root.current?.closest('[data-ic-overlay]');if(scroller)scroller.scrollTo({top:0,behavior:'auto'});},[view]);
 const views=[['issue','Tablero de inteligencia'],['report','Reportaje mensual'],['agenda','Agenda'],['opportunities','Oportunidades ZRC'],['tools','Herramientas']];
 return <IcText><main ref={root} className="ic-desk ic-editorial-desk" onClick={navigateIcSection}>
   <header><div><span className="ic-kicker">ZENITH RISE CAPITAL</span><div className="ic-wordmark">The Inner Circle</div></div><span className="ic-badge">MIEMBRO · ACCESO APROBADO</span><IcLanguageSwitch/>
     <nav aria-label="Secciones Inner Circle">{views.map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</nav>
     <label className="ic-mobile-nav"><span className="ic-kicker">Contenidos</span><select className="ic-field" aria-label="Contenidos" value={view} onChange={e=>setView(e.target.value)}>{views.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
     <div className="ic-account-actions">{onLogout&&<button className="ic-text-button" onClick={onLogout}>Cerrar sesión</button>}{onBack&&<button className="ic-text-button" onClick={onBack}>← Volver a ZRC</button>}</div>
   </header>
   {view==='issue'&&<IntelligenceBoard onOpenView={setView}/>}
   {view!=='issue'&&<div className="ic-view-guide"><button className="ic-text-button" onClick={()=>setView('issue')}>← Volver al tablero</button><span className="ic-kicker">{views.find(([id])=>id===view)?.[1]}</span></div>}
   {view==='report'&&<MonthlyEdition onDecision={()=>setView('tools')}/>}
   {view==='agenda'&&<section><EditorialAgenda onRead={()=>setView('report')}/></section>}
   {view==='opportunities'&&<section><CuratedOpportunities/></section>}
   {view==='tools'&&<><section className="ic-tools-intro"><span className="ic-kicker">DEL ANÁLISIS A TU REUNIÓN</span><h1>Trabaja tu decisión.</h1><p>La ficha personal, los dossiers metodológicos y el caso numérico quedan aquí para profundizar después de la lectura.</p></section><WorkingLibrary/></>}
   <footer>ZRC · The Inner Circle · Análisis para contrastar decisiones.<br/>Contenido informativo y metodológico. No constituye oferta de inversión ni asesoramiento personalizado.</footer>
 </main></IcText>;
}
