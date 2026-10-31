import { useState } from 'react';
import EditorialPhoto from './EditorialPhoto';
import './innerCircle.css';

// Shared public proposition: membership and platform subscriptions remain separate.
export default function InnerCircleValue({ lang = 'es', compact = false }) {
  const [sample, setSample] = useState(false);
  const es = lang === 'es';
  const benefits = es ? [
    ['01', 'Prepara tu próxima decisión', 'Crea una ficha de expansión, adquisición o financiación: pregunta prioritaria, evidencias pendientes y siguiente paso.'],
    ['02', 'Pon números a la exposición', 'Calcula la caja que exigirían más días de cobro y el sobrecoste de tus pagos en divisa bajo tus propios supuestos.'],
    ['03', 'Lleva una ficha al comité', 'Guarda tu trabajo en este navegador, descarga la ficha y contrasta sus supuestos con la nota mensual y las fuentes.'],
  ] : [
    ['01', 'Prepare your next decision', 'Build an expansion, acquisition or financing brief: a priority question, evidence to gather and a next step.'],
    ['02', 'Quantify your exposure', 'Estimate additional cash tied up by slower collections and the cost of FX payments under your own assumptions.'],
    ['03', 'Take a brief to your committee', 'Save your work in this browser, download the brief and challenge its assumptions against the monthly note and sources.'],
  ];
  return <div className={`ic-value ${compact ? 'ic-value-compact' : ''}`}>
    {!compact && <EditorialPhoto subject="trade" variant="ic-photo-membership"/>}
    <div className="ic-value-heading"><span className="ic-kicker">{es ? 'QUÉ APORTA LA MEMBRESÍA' : 'THE MEMBERSHIP VALUE'}</span><span className="ic-badge">{es ? 'Gratuita · admisión manual' : 'Free · reviewed admission'}</span></div>
    <div className="ic-value-grid">{benefits.map(([n,title,body]) => <article key={n}><span className="ic-kicker">{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    <button type="button" className="ic-button ic-button-quiet" aria-expanded={sample} aria-controls={`ic-sample-${compact ? 'compact' : 'full'}`} onClick={() => setSample(!sample)}>{sample ? (es ? 'Cerrar muestra −' : 'Close sample −') : (es ? 'Ver un ejemplo de lo que te llevas →' : 'See an example of your output →')}</button>
    <div id={`ic-sample-${compact ? 'compact' : 'full'}`} hidden={!sample} className="ic-sample">
      <span className="ic-kicker">{es ? 'MUESTRA ILUSTRATIVA · NO ES UNA SEÑAL ACTUAL' : 'ILLUSTRATIVE SAMPLE · NOT A CURRENT SIGNAL'}</span>
      <h3>{es ? 'Ejemplo: preparar la financiación de una filial en Colombia' : 'Example: preparing finance for a subsidiary in Colombia'}</h3>
      <p>{es ? 'Resultado: una ficha con la pregunta «¿La moneda y el vencimiento de la deuda encajan con los cobros?», tres evidencias por reunir y una acción para la siguiente reunión.' : 'Output: a brief asking whether debt currency and maturity match collections, three evidence checks and an action for your next meeting.'}</p>
      <p><strong>{es ? 'Ejemplo hipotético: ' : 'Hypothetical example: '}</strong>{es ? '730.000 € de ventas anuales a crédito y 15 días adicionales de cobro inmovilizan 30.000 € más de caja. Pagos anuales en divisa con un coste actual de 100.000 € y un encarecimiento supuesto del 10 % añaden 10.000 € de coste anual.' : '€730,000 annual credit sales and 15 extra collection days tie up €30,000 more cash. Annual FX payments currently costing €100,000 and an assumed 10% increase add €10,000 in annual cost.'}</p>
      <p>{es ? 'La ficha mantiene separados el circulante y el gasto anual. Puedes guardar los supuestos y descargarla para revisarlos con tu equipo. No asigna una recomendación de inversión.' : 'The brief keeps working capital and annual cost separate. Save assumptions and download them to review with your team. It does not provide an investment recommendation.'}</p>
    </div>
    <p className="ic-small">{es ? 'Incluye la nota mensual, la biblioteca y una ficha de trabajo personal. Admisión manual. Las herramientas de Intelligence y los encargos de Advisory se contratan por separado. Los encuentros se anuncian únicamente cuando están confirmados.' : 'Includes the monthly note, library and personal decision brief. Admission is reviewed. Intelligence tools and Advisory engagements are contracted separately. Gatherings are announced only when confirmed.'}</p>
  </div>;
}
