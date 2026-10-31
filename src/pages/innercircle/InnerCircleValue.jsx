import { useState } from 'react';
import './innerCircle.css';

// Shared public proposition: membership and platform subscriptions remain separate.
export default function InnerCircleValue({ lang = 'es', compact = false }) {
  const [sample, setSample] = useState(false);
  const es = lang === 'es';
  const benefits = es ? [
    ['01', 'Una tesis, en profundidad', 'Nota mensual con mecanismos de transmisión, escenarios alternativos y condiciones que cambiarían la conclusión.'],
    ['02', 'Una conversación relevante', 'Un entorno para inversores, empresarios y asesores con intereses en Iberia, América Latina y MENA.'],
    ['03', 'Una lectura para decidir', 'Preguntas de diligencia, riesgos de ejecución y criterios para contrastar una oportunidad antes de comprometer capital.'],
  ] : [
    ['01', 'One thesis, examined closely', 'A monthly note with transmission channels, alternative scenarios and conditions that would change the conclusion.'],
    ['02', 'A relevant conversation', 'An environment for investors, business owners and advisers focused on Iberia, Latin America and MENA.'],
    ['03', 'A decision framework', 'Diligence questions, execution risks and criteria to assess an opportunity before committing capital.'],
  ];
  return <div className={`ic-value ${compact ? 'ic-value-compact' : ''}`}>
    <div className="ic-value-heading"><span className="ic-kicker">{es ? 'QUÉ APORTA LA MEMBRESÍA' : 'THE MEMBERSHIP VALUE'}</span><span className="ic-badge">{es ? 'Gratuita · admisión manual' : 'Free · reviewed admission'}</span></div>
    <div className="ic-value-grid">{benefits.map(([n,title,body]) => <article key={n}><span className="ic-kicker">{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    <button type="button" className="ic-button ic-button-quiet" aria-expanded={sample} aria-controls={`ic-sample-${compact ? 'compact' : 'full'}`} onClick={() => setSample(!sample)}>{sample ? (es ? 'Cerrar muestra −' : 'Close sample −') : (es ? 'Ver una muestra de la lectura →' : 'Preview the analytical approach →')}</button>
    <div id={`ic-sample-${compact ? 'compact' : 'full'}`} hidden={!sample} className="ic-sample">
      <span className="ic-kicker">{es ? 'MUESTRA ILUSTRATIVA · NO ES UNA SEÑAL ACTUAL' : 'ILLUSTRATIVE SAMPLE · NOT A CURRENT SIGNAL'}</span>
      <h3>{es ? '¿Una cadena de suministro más corta justifica una inversión más cara?' : 'Does a shorter supply chain justify a more expensive investment?'}</h3>
      <p>{es ? 'La tesis: comparar el ahorro logístico y de inventario con el mayor coste de producción y capital. Un menor plazo de entrega solo crea valor si el ahorro total compensa la inversión, el riesgo de ejecución y la concentración de proveedores.' : 'The thesis: compare logistics and inventory savings with higher production and capital costs. A shorter lead time creates value only if total savings compensate for investment, execution risk and supplier concentration.'}</p>
      <p><strong>{es ? 'Qué comprobar: ' : 'What to verify: '}</strong>{es ? 'coste puesto en destino, días de inventario, moneda de cobro y pago, permisos y capacidad real del proveedor.' : 'landed cost, inventory days, revenue and cost currencies, permits and actual supplier capacity.'}</p>
      <p><strong>{es ? 'Qué invalidaría la tesis: ' : 'What would invalidate the thesis: '}</strong>{es ? 'que el ahorro dependa de fletes excepcionalmente altos o de incentivos aún no concedidos.' : 'savings that depend on exceptionally high freight rates or incentives not yet granted.'}</p>
    </div>
    <p className="ic-small">{es ? 'Inner Circle es una comunidad editorial con acceso aprobado. Las herramientas de Intelligence y los encargos de Advisory se contratan por separado. Los encuentros se anuncian únicamente cuando están confirmados.' : 'Inner Circle is an editorial community with approved access. Intelligence tools and Advisory engagements are contracted separately. Gatherings are announced only when confirmed.'}</p>
  </div>;
}
