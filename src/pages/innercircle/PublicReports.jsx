import {IcText} from './icLocale';
// A short public contents preview. Full editorial material is returned by the
// member endpoint only after a signed session and current approval are checked.
export default function PublicReports({onRead,cta='Ver cómo acceder →'}){
 return <IcText><div className="ic-public-reports ic-panel">
   <span className="ic-kicker">AVANCE DE CONTENIDOS · OCTUBRE DE 2026</span>
   <h2>La resiliencia tiene un coste</h2>
   <p>La edición analiza cómo energía, financiación y circulante afectan a la caja de una expansión internacional. Incluye nota editorial, comentario mensual, cinco fuentes primarias y preguntas para comité.</p>
   <div className="ic-three"><div><span className="ic-kicker">MÉXICO</span><h3>Expandirse con hitos verificables</h3></div><div><span className="ic-kicker">COLOMBIA</span><h3>Financiar en otra moneda exige mirar la caja</h3></div><div><span className="ic-kicker">ENERGÍA Y EMPRESA</span><h3>La resiliencia también consume capital</h3></div></div>
   <p className="ic-small">Resumen público · corte del 31 de octubre de 2026. La edición completa, los dossiers y la ficha personal están dentro del espacio de miembros.</p>
   {onRead&&<button type="button" className="ic-button ic-button-quiet" onClick={onRead}>{cta}</button>}
 </div></IcText>;
}
