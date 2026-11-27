// Public editorial preview. The complete analysis remains behind approved access.
export default function PublicReports({onRead,lang='es'}){
 const es=lang==='es';
 return <article className="ic-public-reports" aria-labelledby="ic-preview-title">
   <div className="ic-preview-dateline"><span>{es?'ANÁLISIS EN PROFUNDIDAD':'IN-DEPTH ANALYSIS'}</span><span>{es?'MATERIALES CRÍTICOS · NOV 2026':'CRITICAL MATERIALS · NOV 2026'}</span></div>
   <div className="ic-preview-body">
     <div className="ic-preview-story">
       <span className="ic-preview-eyebrow">{es?'China · controles de exportación':'China · export controls'}</span>
       <h3 id="ic-preview-title">{es?'La pausa no elimina la dependencia':'A pause does not remove the dependency'}</h3>
       <p className="ic-preview-standfirst">{es?'China ha prorrogado hasta el 10 de enero de 2027 la suspensión de seis anuncios de su paquete de controles de exportación de octubre de 2025. La medida afecta a esos anuncios concretos; no equivale a la retirada general de los controles.':'China has extended the suspension of six notices from its October 2025 export-control package until 10 January 2027. The measure concerns those specific notices; it is not a general repeal of export controls.'}</p>
       <div className="ic-preview-evidence"><span>{es?'HECHO DOCUMENTADO':'DOCUMENTED FACT'}</span><p>{es?'Anuncio 58 del Ministerio de Comercio de China, 9 de noviembre de 2026.':'Notice 58, Chinese Ministry of Commerce, 9 November 2026.'} <a href="https://www.mofcom.gov.cn/zcfb/zc/art/2026/art_2120417f1e21472bbe3efafdfcbd3f43.html" target="_blank" rel="noopener noreferrer">{es?'Fuente oficial':'Official source'}</a></p></div>
     </div>
     <aside className="ic-preview-aside"><span>{es?'LA PREGUNTA PARA LA EMPRESA':'THE BUSINESS QUESTION'}</span><p>{es?'¿Qué referencias dependen de licencias, cuánto tarda homologar un proveedor alternativo y qué inventario protege la producción si cambia el régimen?':'Which components depend on licences, how long would an alternative supplier take to qualify, and what inventory would protect production if the regime changes?'}</p><div className="ic-preview-aside-rule"/><span>{es?'EN LA EDICIÓN COMPLETA':'IN THE FULL EDITION'}</span><p className="ic-preview-aside-small">{es?'Mapa de exposición · escenarios de suministro · efecto sobre compras y capital circulante':'Exposure map · supply scenarios · implications for procurement and working capital'}</p></aside>
   </div>
   <footer className="ic-preview-footer"><span>{es?'Del Observatorio ZRC al análisis de decisión. Lectura completa para miembros aprobados.':'From the ZRC Observatory to decision analysis. Full reading for approved members.'}</span>{onRead&&<button type="button" onClick={onRead}>{es?'Conocer el acceso':'Explore access'}</button>}</footer>
 </article>;
}
