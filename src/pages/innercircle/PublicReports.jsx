import {IcText} from './icLocale';
// A short public contents preview. Full editorial material is returned by the
// member endpoint only after a signed session and current approval are checked.
export default function PublicReports({onRead,cta='Ver cómo acceder →'}){
 return <IcText><div className="ic-public-reports ic-panel">
   <span className="ic-kicker">UN AVANCE DE LA EDICIÓN</span>
   <h2>El poder de interrumpir</h2>
   <p>¿Qué dependencias estratégicas se esconden detrás de una cadena de suministro? La edición conecta materias primas, tecnología y rutas críticas con decisiones de inversión y expansión.</p>
   <p className="ic-small">La lectura, sus fuentes, el tablero y los dossiers se reservan para miembros aprobados.</p>
   {onRead&&<button type="button" className="ic-button ic-button-quiet" onClick={onRead}>{cta}</button>}
 </div></IcText>;
}
