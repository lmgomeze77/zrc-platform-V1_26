import {useEffect,useRef,useState} from 'react';
import {IcText,IcLanguageSwitch,navigateIcSection,useIcMemberContent} from './icLocale';
import MonthlyEdition from './MonthlyEdition';
import EditorialPhoto from './EditorialPhoto';
import EditorialAgenda from './EditorialAgenda';
import CuratedOpportunities from './CuratedOpportunities';
import WorkingLibrary from './WorkingLibrary';
import './innerCircle.css';

export default function InnerCircle({onBack,onLogout}){
 const {edition}=useIcMemberContent();
 const [view,setView]=useState('issue');const root=useRef(null);
 useEffect(()=>{const scroller=root.current?.closest('[data-ic-overlay]');if(scroller)scroller.scrollTo({top:0,behavior:'auto'});},[view]);
 const views=[['issue','Esta edición'],['report','Reportaje mensual'],['agenda','Agenda'],['opportunities','Oportunidades ZRC'],['tools','Herramientas']];
 return <IcText><main ref={root} className="ic-desk ic-editorial-desk" onClick={navigateIcSection}>
   <header><div><span className="ic-kicker">ZENITH RISE CAPITAL</span><div className="ic-wordmark">The Inner Circle</div></div><span className="ic-badge">MIEMBRO · ACCESO APROBADO</span><IcLanguageSwitch/>
     <nav aria-label="Secciones Inner Circle">{views.map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</nav>
     <label className="ic-mobile-nav"><span className="ic-kicker">Contenidos</span><select className="ic-field" aria-label="Contenidos" value={view} onChange={e=>setView(e.target.value)}>{views.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
     <div className="ic-account-actions">{onLogout&&<button className="ic-text-button" onClick={onLogout}>Cerrar sesión</button>}{onBack&&<button className="ic-text-button" onClick={onBack}>← Volver a ZRC</button>}</div>
   </header>
   {view==='issue'&&<>
     <section className="ic-issue-intro"><div className="ic-issue-dateline"><span className="ic-kicker">EDICIÓN {edition.edition} / {edition.month}</span><span className="ic-small">Una lectura central. Una agenda. Acceso a ZRC.</span></div>
       <div className="ic-issue-feature"><EditorialPhoto subject="trade" variant="ic-photo-feature"/><div className="ic-feature-copy"><span className="ic-kicker">EL REPORTAJE DEL MES</span><h1>{edition.title}</h1><p className="ic-lead">{edition.subtitle}</p><p>Ormuz, acceso comercial y sanciones: quién puede interrumpir una operación, cómo reconocer una escalada y qué decisiones preparar antes de perder margen de maniobra.</p><p className="ic-small">{edition.author}</p><div className="ic-actions"><button className="ic-button" onClick={()=>setView('report')}>Leer el reportaje →</button><button className="ic-button ic-button-quiet" onClick={()=>setView('agenda')}>Consultar la agenda →</button></div></div></div>
     </section>
     <section className="ic-issue-next"><EditorialAgenda compact onOpen={()=>setView('agenda')}/><div className="ic-issue-opportunities"><span className="ic-kicker">ACCESO A ZRC</span><h2>Oportunidades seleccionadas.</h2><p>Explora los perfiles corporativos publicados por ZRC y solicita un teaser para contrastar el encaje. El equipo confirma disponibilidad, documentación y condiciones de acceso.</p><button className="ic-button" onClick={()=>setView('opportunities')}>Explorar oportunidades ZRC →</button><p className="ic-small">Información adicional bajo solicitud y confidencialidad.</p></div></section>
   </>}
   {view!=='issue'&&<div className="ic-view-guide"><button className="ic-text-button" onClick={()=>setView('issue')}>← Volver a esta edición</button><span className="ic-kicker">{views.find(([id])=>id===view)?.[1]}</span></div>}
   {view==='report'&&<MonthlyEdition onDecision={()=>setView('tools')}/>}
   {view==='agenda'&&<section><EditorialAgenda onRead={()=>setView('report')}/></section>}
   {view==='opportunities'&&<section><CuratedOpportunities/></section>}
   {view==='tools'&&<><section className="ic-tools-intro"><span className="ic-kicker">DEL ANÁLISIS A TU REUNIÓN</span><h1>Trabaja tu decisión.</h1><p>La ficha personal, los dossiers metodológicos y el caso numérico quedan aquí para profundizar después de la lectura.</p></section><WorkingLibrary/></>}
   <footer>ZRC · The Inner Circle · Análisis para contrastar decisiones.<br/>Contenido informativo y metodológico. No constituye oferta de inversión ni asesoramiento personalizado.</footer>
 </main></IcText>;
}
