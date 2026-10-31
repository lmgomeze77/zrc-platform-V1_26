import {useState} from 'react';
import {IcText,useIcMemberContent} from './icLocale';
import DecisionDesk from './DecisionDesk';
export default function WorkingLibrary(){
const {dossiers}=useIcMemberContent();const [selected,setSelected]=useState(dossiers[0].id);const dossier=dossiers.find(d=>d.id===selected);
return <IcText><div className="ic-working-library"><DecisionDesk/>
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

</div></IcText>;
}
