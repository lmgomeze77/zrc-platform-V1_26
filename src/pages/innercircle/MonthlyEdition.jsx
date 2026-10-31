import StrategicRiskBrief from './StrategicRiskBrief';
import { IcText } from './icLocale';
import { useState } from 'react';
import EditorialPhoto from './EditorialPhoto';
import {useIcMemberContent} from './icLocale';

export default function MonthlyEdition({onDecision}) {
 const {edition}=useIcMemberContent();
  const [view, setView] = useState('monthly');
  return <IcText><section id="ic-edition" className="ic-divider">
    <span className="ic-kicker">EDICIÓN {edition.edition} / {edition.month}</span>
    <h1 className="ic-report-title">{edition.title}</h1><p className="ic-lead">{edition.subtitle}</p>
    {onDecision&&<div className="ic-actions"><button className="ic-button ic-button-quiet" onClick={onDecision}>Trabajar esta lectura en mi ficha →</button></div>}
    <p className="ic-small">Corte de información: {edition.cutoff}</p>
    <div className="ic-tabs" role="tablist" aria-label="Lecturas de la edición">
      {[['editorial', 'Nota editorial'], ['monthly', 'Reportaje mensual'], ['sources', 'Fuentes y método']].map(([id, label]) => <button key={id} role="tab" id={`ic-edition-tab-${id}`} aria-selected={view === id} aria-controls={`ic-edition-panel-${id}`} className="ic-button ic-button-quiet" onClick={() => setView(id)}>{label}</button>)}
    </div>
    <article className="ic-panel ic-edition-reading" role="tabpanel" id={`ic-edition-panel-${view}`} aria-labelledby={`ic-edition-tab-${view}`} tabIndex={0}>
      {view === 'editorial' && <><span className="ic-kicker">CARTA DE APERTURA · CRITERIO EDITORIAL</span><h3>{edition.editorial.title}</h3>{edition.editorial.paragraphs.map((p) => <p key={p}>{p}</p>)}<p className="ic-edition-signature">{edition.author}</p><button className="ic-button" onClick={() => setView('monthly')}>Leer el comentario del mes →</button></>}
      {view === 'monthly' && <><span className="ic-kicker">TESIS ZRC · INTERPRETACIÓN, NO PREVISIÓN PROPIA</span><p className="ic-lead ic-note">{edition.thesis}</p><StrategicRiskBrief/><h3>La base documental de esta edición</h3><p>Separamos decisiones y datos publicados de las previsiones de sus autores. Ninguna cifra macroeconómica constituye por sí sola una recomendación para un proyecto.</p>
        {edition.facts.map((f) => <div key={f.label} className="ic-edition-fact"><span className="ic-kicker">{f.label}</span><p>{f.text} {f.sources.map((id) => <a key={id} href={edition.sources.find((s) => s.id === id).url} target="_blank" rel="noopener noreferrer">[{id}]</a>)}</p></div>)}
        <span className="ic-kicker">LECTURA PROPIA ZRC · IMPLICACIONES Y JUICIO EDITORIAL</span>
        {edition.commentary.map((c) => <div key={c.title}><h3>{c.title}</h3>{c.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>)}
        <EditorialPhoto subject="energy" /><h3>Escenarios para poner a prueba la inversión</h3><p className="ic-small">Marcos condicionales propios; sin probabilidades ni precios objetivo.</p><div className="ic-table-wrap"><table><thead><tr><th>Escenario</th><th>Condición</th><th>Respuesta de gestión</th></tr></thead><tbody>{edition.scenarios.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.trigger}</td><td>{s.action}</td></tr>)}</tbody></table></div>
        <h3>Qué nos haría cambiar de opinión</h3><p>{edition.invalidation}</p><h3>Cuatro preguntas para el comité</h3><ol>{edition.questions.map((q) => <li key={q}>{q}</li>)}</ol><h3>Seguimiento</h3><p>{edition.nextReview}</p><p className="ic-edition-signature">{edition.author}</p><button className="ic-button ic-button-quiet" onClick={() => setView('sources')}>Consultar las fuentes →</button>
      </>}
      {view === 'sources' && <><h3>Fuentes primarias y límites</h3><p>Consulta: {edition.cutoff}. Los enlaces respaldan los hechos y previsiones del bloque de evidencia. Las implicaciones empresariales y escenarios son elaboración editorial propia; no conclusiones atribuidas a estos organismos.</p>
        {edition.sources.map((s) => <div className="ic-edition-fact" key={s.id}><span className="ic-kicker">{s.id} · {s.publisher}</span><p><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></p><p className="ic-small">Publicado: {s.published}. {s.observation}.</p></div>)}
        <p>No se han estimado probabilidades de escenario, retornos de activos ni puntuaciones de riesgo país. No se han equiparado tipos oficiales con costes de financiación empresarial. La nota no evalúa cambios legales concretos ni sustituye la diligencia jurídica, fiscal o técnica de una operación.</p><p>Las ediciones se conservan con su fecha de corte para permitir el seguimiento de la tesis y la comparación con publicaciones posteriores.</p>
      </>}
    </article>
  </section></IcText>;
}
