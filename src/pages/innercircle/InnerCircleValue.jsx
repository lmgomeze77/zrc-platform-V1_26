import {useState} from 'react';
import {IcText} from './icLocale';
import './innerCircle.css';
export default function InnerCircleValue({compact=false}){
 const [expanded,setExpanded]=useState(false);
 return <IcText><div className={`ic-value ${compact?'ic-value-compact':''}`}>
 <div className="ic-value-heading"><span className="ic-kicker">QUÉ APORTA LA MEMBRESÍA</span><span className="ic-badge">Gratuita en esta etapa · aprobación manual</span></div>
 <div className="ic-value-grid"><article><span className="ic-kicker">01 / COMPRENDER</span><h3>El reportaje mensual</h3><p>Una lectura central con criterio ZRC, fuentes primarias y preguntas que conectan el contexto internacional con decisiones empresariales.</p></article><article><span className="ic-kicker">02 / SEGUIR</span><h3>Una agenda relevante</h3><p>Los temas que merecen seguimiento, por qué importan y qué evidencia conviene revisar después.</p></article><article><span className="ic-kicker">03 / ACCEDER</span><h3>Oportunidades ZRC</h3><p>Perfiles seleccionados y un canal directo para solicitar teasers, contrastar encaje y conocer las condiciones de acceso a información adicional.</p></article></div>
 <button className="ic-button ic-button-quiet" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Cerrar detalle −':'Ver qué encontrarás dentro →'}</button>
 {expanded&&<div className="ic-sample"><p>Portada de la edición → reportaje mensual y fuentes → agenda de seguimiento → oportunidades seleccionadas. La ficha personal y los dossiers metodológicos se encuentran en Herramientas.</p></div>}
 <p className="ic-small">La edición completa, la agenda y el espacio de oportunidades están dentro del acceso de miembros. La disponibilidad y la exclusividad de cada operación se confirman con ZRC. Intelligence y Advisory se contratan por separado.</p>
 </div></IcText>;
}
