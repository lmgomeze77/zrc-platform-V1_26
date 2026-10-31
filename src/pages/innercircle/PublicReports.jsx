import {IcText} from './icLocale';
// A short public contents preview. Full editorial material is returned by the
// member endpoint only after a signed session and current approval are checked.
export default function PublicReports({onRead,cta='Ver cómo acceder →'}){
 return <IcText><div className="ic-public-reports ic-panel">
   <span className="ic-kicker">AVANCE DE CONTENIDOS · OCTUBRE DE 2026</span>
   <h2>El poder de interrumpir</h2>
   <p>China–UE, tecnología, cables y acceso europeo: cuatro fricciones para revisar dependencias que pueden quedar ocultas detrás del proveedor directo. Incluye escenarios combinados y pruebas para el comité.</p>
   <div className="ic-three"><div><span className="ic-kicker">MATERIAS PRIMAS</span><h3>El origen que comparten tus proveedores</h3></div><div><span className="ic-kicker">TECNOLOGÍA Y PERMISOS</span><h3>La venta que todavía no puede ejecutarse</h3></div><div><span className="ic-kicker">CONECTIVIDAD Y ACCESO</span><h3>Las dependencias físicas y documentales</h3></div></div>
   <p className="ic-small">Resumen público · corte del 31 de octubre de 2026. La edición completa, los dossiers y la ficha personal están dentro del espacio de miembros.</p>
   {onRead&&<button type="button" className="ic-button ic-button-quiet" onClick={onRead}>{cta}</button>}
 </div></IcText>;
}
