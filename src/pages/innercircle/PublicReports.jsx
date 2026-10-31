import {IcText} from './icLocale';
// A short public contents preview. Full editorial material is returned by the
// member endpoint only after a signed session and current approval are checked.
export default function PublicReports({onRead,cta='Ver cómo acceder →'}){
 return <IcText><div className="ic-public-reports ic-panel">
   <span className="ic-kicker">AVANCE DE CONTENIDOS · OCTUBRE DE 2026</span>
   <h2>La resiliencia tiene un límite</h2>
   <p>Ormuz, presión comercial y sanciones: la edición examina qué puede interrumpir una operación, qué señales vigilar y qué decisiones preparar. Incluye hechos documentados, escenarios y fuentes primarias.</p>
   <div className="ic-three"><div><span className="ic-kicker">ORMUZ · RUTAS</span><h3>Quién puede interrumpir el suministro</h3></div><div><span className="ic-kicker">T-MEC · MÉXICO</span><h3>La dependencia política del acceso comercial</h3></div><div><span className="ic-kicker">SANCIONES Y CAJA</span><h3>Contrato, cobro y continuidad: tres pruebas distintas</h3></div></div>
   <p className="ic-small">Resumen público · corte del 31 de octubre de 2026. La edición completa, los dossiers y la ficha personal están dentro del espacio de miembros.</p>
   {onRead&&<button type="button" className="ic-button ic-button-quiet" onClick={onRead}>{cta}</button>}
 </div></IcText>;
}
