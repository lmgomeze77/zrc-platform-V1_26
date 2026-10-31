import {IcText,useIcLocale,useIcMemberContent} from './icLocale';
export default function EditorialAgenda({compact=false,onOpen,onRead}){
 const {agenda=[],edition}=useIcMemberContent();const {lang}=useIcLocale();const text=value=>value[lang==='en'?'en':'es'];
 return <IcText><div className={`ic-agenda ${compact?'ic-agenda-compact':''}`}><span className="ic-kicker">LA AGENDA · TEMAS A SEGUIR</span><h2>Qué merece tu atención.</h2><p>Prioridades de seguimiento de esta edición. Una pregunta y una comprobación para cada tema.</p>
 <div className={compact?'ic-agenda-list':'ic-agenda-grid'}>{agenda.map((item,index)=>{const source=edition.sources.find(s=>s.id===item.sourceId);return <article key={item.id} className="ic-agenda-item"><span className="ic-agenda-number">{String(index+1).padStart(2,'0')}</span><div><span className="ic-kicker">{text(item.topic)}</span><h3>{text(item.question)}</h3>{!compact&&<><p>{text(item.focus)}</p><h4>Siguiente comprobación</h4><p>{text(item.next)}</p><p className="ic-small">Fuente de contexto: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher} ↗</a> · {source.published}</p></>}</div></article>;})}</div>
 {compact?<button className="ic-button ic-button-quiet" onClick={onOpen}>Abrir la agenda →</button>:<><p className="ic-small">Corte editorial: {edition.cutoff}. Son temas de seguimiento, no un calendario de eventos confirmados.</p>{onRead&&<button className="ic-button" onClick={onRead}>Leer el análisis que los conecta →</button>}</>}
 </div></IcText>;
}
