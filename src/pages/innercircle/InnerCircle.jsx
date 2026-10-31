import { IcText } from './icLocale';
import { IcLanguageSwitch, navigateIcSection, useIcMemberContent } from "./icLocale";
import { useState } from 'react';
import MonthlyEdition from './MonthlyEdition';
import DecisionDesk from './DecisionDesk';
import './innerCircle.css';

export default function InnerCircle({ onBack, onLogout, useAuth }) {
  const {dossiers}=useIcMemberContent();
  const { openPricing } = useAuth();
  const [selected, setSelected] = useState(dossiers[0].id);
  const dossier = dossiers.find((d) => d.id === selected);
  return <IcText><main className="ic-desk" onClick={navigateIcSection}>
    <header><div><span className="ic-kicker">ZENITH RISE CAPITAL</span><div style={{ fontSize: 20 }}>The Inner Circle</div></div>
      <span className="ic-badge">MIEMBRO · ACCESO APROBADO</span><IcLanguageSwitch /><nav aria-label="Secciones Inner Circle"><a href="#ic-edition">Edición del mes</a><a href="#ic-dossiers">Dossiers</a><a href="#ic-case">Caso de decisión</a><a href="#ic-decision">Mi decisión</a><a href="#ic-membership">Membresía</a></nav>
      {onLogout && <button className="ic-button ic-button-quiet" onClick={onLogout}>Cerrar sesión</button>}{onBack && <button className="ic-button ic-button-quiet" onClick={onBack}>← Volver a ZRC</button>}
    </header>
    <section><span className="ic-kicker">EL ESPACIO DE LOS MIEMBROS · CRITERIO COMPARTIDO</span>
      <h1>Prepara tu próxima decisión.<br /><span style={{ color: 'var(--ic-gold)' }}>Sal con una ficha de trabajo.</span></h1>
      <div className="ic-two"><div><p className="ic-lead">Define la operación, identifica qué evidencia falta y dimensiona la exposición de caja. Conserva tus supuestos para la siguiente reunión con socios o comité.</p><div className="ic-actions"><a className="ic-button" href="#ic-decision">Crear mi ficha →</a><a className="ic-button ic-button-quiet" href="#ic-edition">Leer la edición del mes</a></div></div>
      <aside className="ic-panel"><span className="ic-kicker">QUÉ TE LLEVAS HOY</span><h3>Un resultado para tu reunión</h3><p>Una ficha descargable con tu pregunta prioritaria, evidencias pendientes, sensibilidades de caja y siguiente paso. La nota del mes y los dossiers te ayudan a contrastarla.</p><p className="ic-small">Edición 01 · Octubre de 2026. Los dossiers de la biblioteca siguen siendo material metodológico ilustrativo; no son operaciones disponibles.</p></aside></div>
    </section>
    <DecisionDesk />
    <MonthlyEdition />
    <section id="ic-dossiers" className="ic-divider"><span className="ic-kicker">01 / DOSSIERS DE TRABAJO</span><h2>La tesis también debe poder fallar.</h2><p>Cada dossier expone el mecanismo económico, la evidencia necesaria y las condiciones que cambiarían la conclusión.</p>
      <div className="ic-tabs" role="tablist" aria-label="Dossiers de análisis">{dossiers.map((d, i) => <button key={d.id} id={`ic-tab-${d.id}`} role="tab" aria-selected={selected === d.id} aria-controls={`ic-dossier-${d.id}`} className="ic-button ic-button-quiet" onClick={() => setSelected(d.id)}>{String(i + 1).padStart(2, '0')} · {d.title}</button>)}</div>
      <article role="tabpanel" id={`ic-dossier-${dossier.id}`} aria-labelledby={`ic-tab-${dossier.id}`} tabIndex={0} className="ic-panel" key={dossier.id}>
        <span className="ic-kicker">{dossier.region} · MARCO ILUSTRATIVO</span><h3>{dossier.question}</h3><p className="ic-lead">{dossier.thesis}</p>
        <div className="ic-two"><div><h4>Mecanismo de transmisión</h4><p>{dossier.transmission}</p></div><div><h4>Evidencia antes de concluir</h4><p>{dossier.evidence}</p></div></div>
        <div className="ic-table-wrap"><table><caption style={{ textAlign: 'left', padding: '18px 0', color: 'var(--ic-gold)' }}>Escenarios para contrastar · sin probabilidades asignadas</caption><thead><tr><th>Escenario</th><th>Supuesto</th><th>Prueba de decisión</th></tr></thead><tbody>{dossier.scenarios.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
        <details open><summary>Qué invalidaría la tesis</summary><p>{dossier.invalidation}</p></details>
        <details><summary>Preguntas de diligencia</summary><p>{dossier.diligence}</p></details>
        <details><summary>Decisión y siguiente comprobación</summary><p>{dossier.decision}</p></details>
      </article>
    </section>
    <section id="ic-case" className="ic-divider"><span className="ic-kicker">02 / UN CASO, DOS TIPOS DE CAJA</span><h2>El ahorro aparente no es el retorno.</h2><div className="ic-two"><div><p>Supongamos una empresa con compras anuales de 3,65 M€. Acercar el suministro reduce en diez días su inventario medio. Asumimos un año de 365 días y un coste diario uniforme.</p><p className="ic-note"><strong>3.650.000 € ÷ 365 × 10 = 100.000 €</strong><br />de caja liberada una sola vez, siempre que el menor inventario se mantenga y no cambien las condiciones de pago.</p><p>El nuevo proveedor exige 250.000 € de inversión inicial. Reduce el gasto logístico en 90.000 €/año, pero eleva el coste de compras en 55.000 €/año.</p></div><aside className="ic-panel"><span className="ic-kicker">SUPUESTOS HIPOTÉTICOS · ANTES DE IMPUESTOS</span><h3>35.000 €/año</h3><p>Ahorro operativo neto: 90.000 − 55.000.</p><h3>150.000 €</h3><p>Desembolso neto inicial: 250.000 − 100.000 de circulante liberado.</p><h3>4,3 años</h3><p>Recuperación simple: 150.000 ÷ 35.000 = 4,29. Sin descuento, impuestos, mantenimiento ni valor residual; no equivale a VAN o TIR.</p></aside></div>
      <details><summary>¿Qué ocurre si el ahorro logístico es un 30 % menor?</summary><p>90.000 × 70 % = 63.000 €/año. El ahorro neto baja a 8.000 €/año y la recuperación simple sube a 18,75 años. La tesis depende mucho más del ahorro logístico de lo que sugiere el caso inicial.</p><p>Antes de decidir: construir flujos anuales después de impuestos, añadir mantenimiento y coste de transición, incluir la reversión del circulante cuando corresponda y descontar al coste de capital adecuado.</p></details>
    </section>
    <section id="ic-membership" className="ic-divider"><span className="ic-kicker">04 / TU MEMBRESÍA</span><h2>Tu acceso ya está aprobado.</h2><p>Empieza por tu ficha de decisión o consulta la edición del mes. Puedes retomar el trabajo que guardaste en este navegador.</p><div className="ic-actions"><a className="ic-button" href="#ic-decision">Ir a mi ficha →</a><a className="ic-button ic-button-quiet" href="#ic-edition">Leer la edición</a></div>
      <div className="ic-three" style={{ marginTop: 28 }}><article className="ic-panel"><span className="ic-kicker">LA NOTA</span><h3>Ritmo mensual</h3><p>La propuesta editorial se articula en torno a una tesis, sus escenarios y una pauta de seguimiento. Las ediciones publicadas deben identificar fecha, fuentes y límites de la evidencia.</p></article><article className="ic-panel"><span className="ic-kicker">EL CÍRCULO</span><h3>Preguntas para la siguiente edición</h3><p>Puedes proponer una pregunta general para las próximas notas. La selección editorial no garantiza una respuesta individual ni un encargo de análisis.</p></article><article className="ic-panel"><span className="ic-kicker">LOS PLANES</span><h3>Accesos distintos</h3><p>La aprobación en Inner Circle no activa herramientas de pago ni otorga prioridad sobre operaciones. Consulta las condiciones vigentes de Intelligence e Institutional.</p>{openPricing && <button className="ic-button ic-button-quiet" onClick={openPricing}>Consultar planes →</button>}</article></div>
      <details><summary>¿Cómo se selecciona una oportunidad para su análisis?</summary><p>Primero se documentan origen, fecha y permiso de difusión. Después se separan datos acreditados, declaraciones del promotor y supuestos de ZRC. Solo una operación verificada y autorizada debe presentarse como disponible; las tesis de esta biblioteca son ejemplos de método.</p></details>
      <details><summary>¿Qué hace útil una nota de Inner Circle?</summary><p>Una conclusión ejecutiva, fuentes trazables, un mecanismo de transmisión, escenarios alternativos, exposición sectorial, preguntas de diligencia y condiciones de invalidación. El seguimiento debe explicar qué cambió respecto a la tesis anterior.</p></details>
    </section>
    <footer>ZRC · The Inner Circle · Análisis para contrastar decisiones.<br />Contenido informativo y metodológico. No constituye oferta de inversión ni asesoramiento personalizado.</footer>
  </main></IcText>;
}
