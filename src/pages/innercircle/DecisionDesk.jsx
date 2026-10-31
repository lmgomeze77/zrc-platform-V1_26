import {useIcLocale, translateIc} from './icLocale';
import { IcText } from './icLocale';
import { useState } from 'react';
import { decisionTypes, countryQuestions, defaultDecision, normalizeDecision, cashSensitivity, buildDecisionMarkdown } from '../../data/innercircle/decisionDesk';
import edition from '../../data/innercircle/october2026.json';
const KEY = 'zrc-inner-circle-decision-v1';
const money = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
function readSaved() {try {const value = JSON.parse(localStorage.getItem(KEY));return value?.version === 1 ? { decision: normalizeDecision(value.decision), savedAt: typeof value.savedAt === 'string' ? value.savedAt : '' } : null;} catch {return null;}}
export default function DecisionDesk() {
 const {lang}=useIcLocale();
  const [saved, setSaved] = useState(readSaved);
  const [decision, setDecision] = useState(() => saved?.decision || { ...defaultDecision });
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const update = (key, value) => {setDecision((prev) => normalizeDecision({ ...prev, [key]: value }));setDirty(true);setMessage('');};
  const play = decisionTypes[decision.type],amounts = cashSensitivity(decision);
  const references = edition.sources.filter((s) => ['S1', 'S2', decision.country === 'MX' ? 'S4' : decision.country === 'CO' ? 'S5' : 'S3'].includes(s.id));
  const fact = edition.facts.find((f) => f.sources.includes(decision.country === 'MX' ? 'S4' : decision.country === 'CO' ? 'S5' : 'S2'));
  const save = () => {const entry = { version: 1, decision: normalizeDecision(decision), savedAt: new Date().toISOString() };try {localStorage.setItem(KEY, JSON.stringify(entry));setSaved(entry);setDirty(false);setMessage('Ficha guardada en este navegador.');} catch {setMessage('No se pudo guardar. Puedes descargar la ficha para conservarla.');}};
  const download = () => {const text = buildDecisionMarkdown(decision, references, dirty ? '' : saved?.savedAt, lang, text=>translateIc(text,lang));const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));const link = document.createElement('a');link.href = url;link.download = 'ZRC_Inner_Circle_Mi_Decision.md';link.click();URL.revokeObjectURL(url);};
  return <IcText><section id="ic-decision" className="ic-divider"><span className="ic-kicker">TU PRIMER RESULTADO / UNA FICHA PARA TU DECISIÓN</span><h2>¿Qué estás decidiendo?</h2><p>Selecciona la operación y el país. Obtendrás una pregunta prioritaria, evidencias que reunir y una ficha que puedes guardar y llevar a tu próxima reunión.</p>
    <div className="ic-two"><div className="ic-panel">
      <label>Nombre de referencia<input className="ic-field" value={decision.name} maxLength={100} onChange={(e) => update('name', e.target.value)} placeholder="Ej. Entrada comercial en México" /></label>
      <div className="ic-form-grid"><label>Operación<select className="ic-field" value={decision.type} onChange={(e) => {setDecision((prev) => ({ ...prev, type: e.target.value, checked: [], nextStep: '' }));setDirty(true);setMessage('');}}>{Object.entries(decisionTypes).map(([id, p]) => <option key={id} value={id}>{p.title}</option>)}</select></label><label>País<select className="ic-field" value={decision.country} onChange={(e) => update('country', e.target.value)}><option value="MX">México</option><option value="CO">Colombia</option><option value="ES">España</option><option value="OTHER">Otra geografía</option></select></label></div>
      <label>Fecha de revisión<input className="ic-field" type="date" value={decision.reviewDate} onChange={(e) => update('reviewDate', e.target.value)} /></label>
      <h3>¿Cuánta caja está expuesta?</h3><p className="ic-small">Opcional. Introduce tus supuestos para dimensionar dos efectos distintos. Cero significa sin importe modelizado.</p>
      <div className="ic-form-grid"><label>Ventas anuales a crédito (€)<input className="ic-field" type="number" min="0" max="1000000000000" value={decision.creditSales} onChange={(e) => update('creditSales', e.target.value)} /></label><label>Días adicionales de cobro<input className="ic-field" type="number" min="0" max="365" value={decision.extraDays} onChange={(e) => update('extraDays', e.target.value)} /></label><label>Coste anual actual de pagos en divisa (€)<input className="ic-field" type="number" min="0" max="1000000000000" value={decision.fxPayments} onChange={(e) => update('fxPayments', e.target.value)} /></label><label>Encarecimiento supuesto en euros (%)<input className="ic-field" type="number" min="0" max="100" value={decision.fxIncrease} onChange={(e) => update('fxIncrease', e.target.value)} /></label></div>
      <p className="ic-small">Guardado local en este navegador; no se sincroniza con tu cuenta. Utiliza una referencia general del proyecto. La fecha sirve para organizar la revisión y no genera avisos.</p>
    </div><div className="ic-panel"><span className="ic-kicker">TU FICHA · {play.title}</span><h3>{play.question}</h3><p>{countryQuestions[decision.country]}</p>
      <div className="ic-cash-results"><div><span className="ic-kicker">CIRCULANTE ADICIONAL</span><h3>{money(amounts.receivables)}</h3><p className="ic-small">Ventas a crédito ÷ 365 × días adicionales. Es caja inmovilizada, no un gasto recurrente.</p></div><div><span className="ic-kicker">SOBRECOSTE ANUAL EN DIVISA</span><h3>{money(amounts.fxCost)}</h3><p className="ic-small">Pagos × encarecimiento. Volumen constante y sin coberturas. Es un supuesto, no una previsión FX.</p></div></div>
      <h3>Evidencia para la próxima reunión</h3>{play.evidence.map((text, i) => <label key={text}><input type="checkbox" checked={decision.checked.includes(i)} onChange={() => update('checked', decision.checked.includes(i) ? decision.checked.filter((n) => n !== i) : [...decision.checked, i])} />{text}</label>)}
      <p className="ic-small">Las marcas son tu registro de revisión; no implican validación de ZRC.</p><label>Próximo paso<textarea className="ic-field" rows={3} maxLength={1200} placeholder={play.action} value={decision.nextStep} onChange={(e) => update('nextStep', e.target.value)} /></label><p>{decision.nextStep || play.action}</p>
      <div className="ic-actions"><button className="ic-button" onClick={save}>Guardar mi ficha</button><button className="ic-button ic-button-quiet" onClick={download}>Descargar para comité →</button></div><p role="status" className="ic-small">{message || (dirty ? 'Hay cambios sin guardar.' : saved?.savedAt ? `Último guardado: ${new Date(saved.savedAt).toLocaleString(lang==='en'?'en-GB':'es-ES')}` : 'Todavía no has guardado una ficha.')}</p>
    </div></div>
    <details><summary>Contexto que conviene contrastar · edición de octubre</summary><p><strong>{fact.label}: </strong>{fact.text}</p><p>Estos datos conservan el corte del 31 de octubre de 2026. Comprueba las condiciones actuales del proyecto antes de actuar.</p>{references.map((s) => <p key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.publisher} · {s.title} ↗</a></p>)}</details>
    <p className="ic-small">La ficha estructura tu análisis y calcula sensibilidades aritméticas. No decide si invertir, no estima una rentabilidad y no sustituye una revisión del proyecto.</p>
  </section></IcText>;
}
