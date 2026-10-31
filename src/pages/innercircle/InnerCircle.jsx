import { useState } from 'react';
import InnerCircleValue from './InnerCircleValue';
import './innerCircle.css';

// Evergreen analytical cases. These are not live deals, verified market signals,
// investment recommendations or scheduled events.
const dossiers = [
  {
    id:'supply', region:'IBERIA · AMÉRICA LATINA', title:'Acercar producción sin destruir margen',
    question:'¿Cuándo compensa sustituir una cadena global por un proveedor regional?',
    thesis:'La proximidad puede reducir inventario, incertidumbre y necesidad de caja. Sin embargo, el coste industrial más alto y la inversión de transición pueden absorber todo el ahorro. La decisión requiere comparar el coste total puesto en destino y la caja liberada, no solo la distancia.',
    transmission:'Flete y plazo → inventario en tránsito → capital circulante → flujo de caja libre. Separar el ahorro recurrente de costes del cobro único que resulta de reducir existencias.',
    evidence:'Solicitar doce meses de facturas logísticas, plazos reales por ruta, tasa de incidencias, inventario medio, pedidos y capacidad del nuevo proveedor. Contrastar origen aduanero, certificaciones y dependencia de un único cliente o suministrador.',
    scenarios:[['Continuidad','Menor plazo, coste unitario algo mayor.','Medir ahorro neto anual y liberación inicial de caja.'],['Estrés','El proveedor regional falla o el ahorro de flete se normaliza.','Modelizar inventario de seguridad, doble proveedor y costes de parada.'],['Mejora','Escala local y entregas fiables reducen el coste total.','Exigir evidencia operativa antes de ampliar capacidad.']],
    invalidation:'Rechazar una tesis que solo funciona con fletes de crisis, subvenciones no concedidas o ausencia de fallos de transición. El ahorro de inventario no puede contabilizarse como ingreso anual recurrente.',
    diligence:'¿Quién asume el transporte y el riesgo bajo el Incoterm? ¿Qué parte del inventario es realmente reducible? ¿Existe capacidad contratada? ¿Cuánto cuesta mantener dos cadenas durante la transición?',
    decision:'Pilotar una familia de productos. Comparar coste total y nivel de servicio contra la cadena actual durante un periodo representativo. Escalar solo si el ahorro sobrevive al escenario de estrés.',
  },
  {
    id:'energy', region:'IBERIA · MENA', title:'Energía contratada, riesgo que permanece',
    question:'¿Un contrato a largo plazo convierte un proyecto energético en un flujo estable?',
    thesis:'Un PPA puede reducir exposición al precio spot, pero deja riesgos de volumen, perfil horario, contraparte, red y ejecución. La calidad del ingreso depende del contrato completo y del activo que lo respalda.',
    transmission:'Disponibilidad y generación → ingresos efectivamente cobrados → servicio de deuda → caja distribuible. Un precio atractivo no compensa necesariamente restricciones de vertido, costes de balance o retrasos de conexión.',
    evidence:'Revisar contrato ejecutado y solvencia del comprador, derechos de conexión, permisos, recurso energético, producción horaria, garantías del EPC y modelo de deuda. Distinguir autorizaciones obtenidas de trámites pendientes.',
    scenarios:[['Continuidad','Producción y disponibilidad según modelo técnico.','Conciliar volumen contratado, perfil de entrega y costes de balance.'],['Estrés','Menor producción, retraso y sobrecoste de inversión.','Calcular caja mínima, cobertura de deuda y necesidad de equity adicional.'],['Mejora','Mayor disponibilidad o ingresos complementarios.','Excluir ingresos no contratados del caso que soporta la deuda.']],
    invalidation:'La tesis pierde fuerza si el retorno depende de ingresos accesorios no contratados, fechas de conexión no acreditadas o garantías sin capacidad económica detrás.',
    diligence:'¿Quién soporta el desvío entre generación y entrega? ¿Hay cláusula de precios negativos? ¿Qué ocurre si el comprador incumple? ¿Las indemnizaciones cubren la caja perdida o solo parte del daño?',
    decision:'Condicionar el compromiso a revisión técnica, legal y crediticia independiente. Comparar el valor del contrato con su coste de cobertura y el riesgo de reemplazar a la contraparte.',
  },
  {
    id:'capital', region:'EMPRESA · INVERSIÓN INTERNACIONAL', title:'Crecer en otra moneda sin perder caja',
    question:'¿La expansión internacional mejora el negocio o añade una exposición financiera oculta?',
    thesis:'El crecimiento de ventas en moneda local puede convivir con caída de margen y tensión de caja si compras, deuda o dividendos están denominados en otra moneda. Analizar por separado exposición transaccional, de conversión y de repatriación.',
    transmission:'Tipo de cambio → margen operativo → necesidades de circulante → capacidad de servicio de deuda. La conversión contable de una filial no equivale al efectivo que puede distribuir a la matriz.',
    evidence:'Inventariar cobros y pagos por divisa y vencimiento, contratos de deuda, política de precios, impuestos y costes de cobertura. Verificar reglas de distribución y transferencia con asesores locales antes de asumir caja disponible en la matriz.',
    scenarios:[['Continuidad','Ventas y costes evolucionan según presupuesto.','Reconciliar moneda funcional, caja operativa y caja de la matriz.'],['Estrés','Depreciación local y retrasos de cobro.','Combinar shock FX con días de circulante y servicio de deuda.'],['Mejora','Reprecio comercial y costes locales amortiguan el FX.','Comprobar que las coberturas naturales son estables por importe y plazo.']],
    invalidation:'Un proyecto no supera la revisión si solo es rentable al tipo de cambio inicial, ignora costes de cobertura o trata beneficios retenidos como caja libremente transferible.',
    diligence:'¿Puede repercutirse el FX al cliente? ¿En qué plazo? ¿Qué vencimientos quedan descubiertos? ¿Hay restricciones contractuales o regulatorias que afecten a la distribución?',
    decision:'Fijar límites de exposición por moneda y vencimiento. Aprobar inversión y financiación conjuntamente, con un colchón de liquidez y condiciones explícitas para detener nuevas aportaciones.',
  },
];
const checks = ['La hipótesis identifica una ventaja económica concreta.', 'Los datos críticos tienen fuente, fecha y responsable.', 'El flujo recurrente está separado de los efectos únicos de caja.', 'El escenario adverso incluye ejecución, divisa y liquidez.', 'Se ha definido qué evidencia invalidaría la tesis.', 'La decisión tiene condiciones, responsable y fecha de revisión.'];

export default function InnerCircle({ onBack, useAuth }) {
  const { openPricing } = useAuth();
  const [selected, setSelected] = useState(dossiers[0].id);
  const [checked, setChecked] = useState([]);
  const dossier = dossiers.find(d => d.id === selected);
  const toggle = i => setChecked(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  return <main className="ic-desk">
    <header><div><span className="ic-kicker">ZENITH RISE CAPITAL</span><div style={{fontSize:20}}>The Inner Circle</div></div>
      <nav aria-label="Secciones Inner Circle"><a href="#ic-dossiers">Dossiers</a><a href="#ic-case">Caso de decisión</a><a href="#ic-review">Mi revisión</a><a href="#ic-membership">Membresía</a></nav>
      {onBack && <button className="ic-button ic-button-quiet" onClick={onBack}>← Volver a ZRC</button>}
    </header>
    <section><span className="ic-kicker">EL ESPACIO DE LOS MIEMBROS · CRITERIO COMPARTIDO</span>
      <h1>Una lectura más profunda.<br/><span style={{color:'var(--ic-gold)'}}>Una decisión mejor fundada.</span></h1>
      <div className="ic-two"><div><p className="ic-lead">Geopolítica, empresa y capital, conectados a través de tesis que se pueden contrastar. Un espacio para preparar preguntas mejores y conversar con criterio.</p><div className="ic-actions"><a className="ic-button" href="#ic-dossiers">Explorar los dossiers →</a><a className="ic-button ic-button-quiet" href="#ic-review">Preparar mi revisión</a></div></div>
      <aside className="ic-panel"><span className="ic-kicker">EN ESTA BIBLIOTECA</span><h3>De la hipótesis a la decisión</h3><p>Tres dossiers de trabajo, un caso numérico y una pauta de diligencia reutilizable.</p><p className="ic-small">Material metodológico ilustrativo. No representa una edición mensual reciente, operaciones disponibles ni señales verificadas en tiempo real.</p></aside></div>
    </section>
    <section id="ic-dossiers" className="ic-divider"><span className="ic-kicker">01 / DOSSIERS DE TRABAJO</span><h2>La tesis también debe poder fallar.</h2><p>Cada dossier expone el mecanismo económico, la evidencia necesaria y las condiciones que cambiarían la conclusión.</p>
      <div className="ic-tabs" role="tablist" aria-label="Dossiers de análisis">{dossiers.map((d,i) => <button key={d.id} id={`ic-tab-${d.id}`} role="tab" aria-selected={selected === d.id} aria-controls={`ic-dossier-${d.id}`} className="ic-button ic-button-quiet" onClick={()=>setSelected(d.id)}>{String(i+1).padStart(2,'0')} · {d.title}</button>)}</div>
      <article role="tabpanel" id={`ic-dossier-${dossier.id}`} aria-labelledby={`ic-tab-${dossier.id}`} tabIndex={0} className="ic-panel" key={dossier.id}>
        <span className="ic-kicker">{dossier.region} · MARCO ILUSTRATIVO</span><h3>{dossier.question}</h3><p className="ic-lead">{dossier.thesis}</p>
        <div className="ic-two"><div><h4>Mecanismo de transmisión</h4><p>{dossier.transmission}</p></div><div><h4>Evidencia antes de concluir</h4><p>{dossier.evidence}</p></div></div>
        <div className="ic-table-wrap"><table><caption style={{textAlign:'left',padding:'18px 0',color:'var(--ic-gold)'}}>Escenarios para contrastar · sin probabilidades asignadas</caption><thead><tr><th>Escenario</th><th>Supuesto</th><th>Prueba de decisión</th></tr></thead><tbody>{dossier.scenarios.map(row=><tr key={row[0]}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
        <details open><summary>Qué invalidaría la tesis</summary><p>{dossier.invalidation}</p></details>
        <details><summary>Preguntas de diligencia</summary><p>{dossier.diligence}</p></details>
        <details><summary>Decisión y siguiente comprobación</summary><p>{dossier.decision}</p></details>
      </article>
    </section>
    <section id="ic-case" className="ic-divider"><span className="ic-kicker">02 / UN CASO, DOS TIPOS DE CAJA</span><h2>El ahorro aparente no es el retorno.</h2><div className="ic-two"><div><p>Supongamos una empresa con compras anuales de 3,65 M€. Acercar el suministro reduce en diez días su inventario medio. Asumimos un año de 365 días y un coste diario uniforme.</p><p className="ic-note"><strong>3.650.000 € ÷ 365 × 10 = 100.000 €</strong><br/>de caja liberada una sola vez, siempre que el menor inventario se mantenga y no cambien las condiciones de pago.</p><p>El nuevo proveedor exige 250.000 € de inversión inicial. Reduce el gasto logístico en 90.000 €/año, pero eleva el coste de compras en 55.000 €/año.</p></div><aside className="ic-panel"><span className="ic-kicker">SUPUESTOS HIPOTÉTICOS · ANTES DE IMPUESTOS</span><h3>35.000 €/año</h3><p>Ahorro operativo neto: 90.000 − 55.000.</p><h3>150.000 €</h3><p>Desembolso neto inicial: 250.000 − 100.000 de circulante liberado.</p><h3>4,3 años</h3><p>Recuperación simple: 150.000 ÷ 35.000 = 4,29. Sin descuento, impuestos, mantenimiento ni valor residual; no equivale a VAN o TIR.</p></aside></div>
      <details><summary>¿Qué ocurre si el ahorro logístico es un 30 % menor?</summary><p>90.000 × 70 % = 63.000 €/año. El ahorro neto baja a 8.000 €/año y la recuperación simple sube a 18,75 años. La tesis depende mucho más del ahorro logístico de lo que sugiere el caso inicial.</p><p>Antes de decidir: construir flujos anuales después de impuestos, añadir mantenimiento y coste de transición, incluir la reversión del circulante cuando corresponda y descontar al coste de capital adecuado.</p></details>
    </section>
    <section id="ic-review" className="ic-divider"><span className="ic-kicker">03 / MI REVISIÓN</span><h2>Seis preguntas antes del comité.</h2><div className="ic-two"><div className="ic-panel"><p role="status">{checked.length} de {checks.length} puntos revisados</p><div className="ic-progress" aria-hidden="true"><span style={{width:`${checked.length/checks.length*100}%`}}/></div>{checks.map((text,i)=><label key={text}><input type="checkbox" checked={checked.includes(i)} onChange={()=>toggle(i)}/>{text}</label>)}<button className="ic-button ic-button-quiet" onClick={()=>setChecked([])}>Reiniciar revisión</button><p className="ic-small">Lista personal temporal: se reinicia al salir. Marcarla completa no acredita que una inversión sea adecuada.</p></div><aside><h3>Trae una pregunta concreta.</h3><p>Para proponer un tema al equipo, describe el corredor, sector, decisión pendiente y evidencia que necesitas. Comparte primero información general; acuerda un canal específico antes de enviar documentación confidencial.</p><a className="ic-button" href="mailto:luis@zenithrisecapital.com?subject=Inner%20Circle%20-%20Propuesta%20de%20tema">Proponer un tema al equipo →</a><p className="ic-small">Abre tu aplicación de correo. La solicitud no incluye un encargo de análisis a medida.</p></aside></div></section>
    <section id="ic-membership" className="ic-divider"><span className="ic-kicker">04 / TU MEMBRESÍA</span><h2>Profundidad, afinidad y continuidad.</h2><InnerCircleValue/>
      <div className="ic-three" style={{marginTop:28}}><article className="ic-panel"><span className="ic-kicker">LA NOTA</span><h3>Ritmo mensual</h3><p>La propuesta editorial se articula en torno a una tesis, sus escenarios y una pauta de seguimiento. Las ediciones publicadas deben identificar fecha, fuentes y límites de la evidencia.</p></article><article className="ic-panel"><span className="ic-kicker">EL CÍRCULO</span><h3>Conversaciones con contexto</h3><p>Temas propuestos por miembros y revisados por el equipo. No hay encuentros confirmados publicados en esta biblioteca; cada convocatoria indicará fecha, formato y condiciones.</p></article><article className="ic-panel"><span className="ic-kicker">LOS PLANES</span><h3>Accesos distintos</h3><p>La aprobación en Inner Circle no activa herramientas de pago ni otorga prioridad sobre operaciones. Consulta las condiciones vigentes de Intelligence e Institutional.</p>{openPricing && <button className="ic-button ic-button-quiet" onClick={openPricing}>Consultar planes →</button>}</article></div>
      <details><summary>¿Cómo se selecciona una oportunidad para su análisis?</summary><p>Primero se documentan origen, fecha y permiso de difusión. Después se separan datos acreditados, declaraciones del promotor y supuestos de ZRC. Solo una operación verificada y autorizada debe presentarse como disponible; las tesis de esta biblioteca son ejemplos de método.</p></details>
      <details><summary>¿Qué hace útil una nota de Inner Circle?</summary><p>Una conclusión ejecutiva, fuentes trazables, un mecanismo de transmisión, escenarios alternativos, exposición sectorial, preguntas de diligencia y condiciones de invalidación. El seguimiento debe explicar qué cambió respecto a la tesis anterior.</p></details>
    </section>
    <footer>ZRC · The Inner Circle · Análisis para contrastar decisiones.<br/>Contenido informativo y metodológico. No constituye oferta de inversión ni asesoramiento personalizado.</footer>
  </main>;
}
