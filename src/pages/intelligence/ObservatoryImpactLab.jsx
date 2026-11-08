import { useState } from "react";
import { C } from "../../theme/palette";

const fields = [
  { key: "volume", es: "Consumo mensual (litros)", en: "Monthly usage (litres)", max: 1_000_000_000, step: 1 },
  { key: "shock", es: "Cambio del diésel (€/litro)", en: "Diesel price change (€/litre)", min: -5, max: 5, step: 0.01 },
  { key: "passThrough", es: "Impacto trasladado al cliente (%)", en: "Impact passed through to customers (%)", max: 100, step: 1 },
];
const baseline = { volume: "20000", shock: "0.20", passThrough: "50" };
const card = { padding: "clamp(16px, 4vw, 30px)", marginBottom: 24, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, color: C.textSec };
const controls = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 175px), 1fr))", gap: 12 };

export default function ObservatoryImpactLab({ lang }) {
  const es = lang === "es";
  const [values, setValues] = useState(baseline);
  const [view, setView] = useState("public");
  const valid = fields.every(({ key, min = 0, max }) => {
    const raw = values[key];
    return raw !== "" && Number.isFinite(Number(raw)) && Number(raw) >= min && Number(raw) <= max;
  });
  const extraCost = Number(values.volume) * Number(values.shock);
  const passedOn = extraCost * Number(values.passThrough) / 100;
  const marginImpact = passedOn - extraCost;
  const money = new Intl.NumberFormat(es ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  const display = value => money.format(value === 0 ? 0 : value);
  return (
    <section id="laboratorio-impacto" aria-labelledby="laboratorio-impacto-title" style={card}>
      <p style={{ color: C.gold, fontSize: 12, fontWeight: 600 }}>{es ? "OBSERVATORIO ZRC · CASO INTERACTIVO" : "ZRC OBSERVATORY · INTERACTIVE CASE"}</p>
      <h3 id="laboratorio-impacto-title" style={{ color: C.text, margin: "8px 0" }}>{es ? "Si sube el diésel, ¿cuánto margen pierde una empresa de transporte?" : "If diesel gets more expensive, how much margin does a transport company lose?"}</h3>
      <p>{es ? "Un acontecimiento geopolítico puede alterar el coste de la energía. El efecto sobre una empresa depende del combustible que consume y de lo que pueda trasladar a sus clientes." : "A geopolitical event can affect energy costs. A company's exposure depends on fuel usage and how much of the change it can pass through to customers."}</p>
      <div role="group" aria-label={es ? "Perspectivas del caso" : "Case perspectives"} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {[["public", "Entender", "Understand"], ["class", "Practicar en clase", "Use in class"], ["pro", "Aplicar al negocio", "Apply to business"]].map(([key, labelEs, labelEn]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} style={{ padding: "7px 12px", border: `1px solid ${C.gold}`, borderRadius: 4, background: view === key ? C.gold : "transparent", color: view === key ? C.onGold : C.text, cursor: "pointer" }}>{es ? labelEs : labelEn}</button>
        ))}
      </div>
      <div style={controls}>
        {fields.map(({ key, es: labelEs, en: labelEn, min = 0, max, step }) => (
          <label key={key} style={{ display: "grid", gap: 5 }}>
            {es ? labelEs : labelEn}
            <input type="number" min={min} max={max} step={step} value={values[key]} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} style={{ width: "100%", minWidth: 0, padding: 8, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, background: C.surface }} />
          </label>
        ))}
      </div>
      <p aria-live="polite" aria-atomic="true" style={{ color: C.text }}>
        {valid ? <><strong>{es ? "Variación del margen mensual" : "Monthly margin change"}</strong>{" "}{display(marginImpact)}{" · "}{es ? "Variación del coste" : "Cost change"}{" "}{display(extraCost)}{" · "}{es ? "Traslado al cliente" : "Customer pass-through"}{" "}{display(passedOn)}</> : (es ? "Completa los tres campos con valores dentro de sus límites." : "Complete all three fields with values within their limits.")}
      </p>
      {view === "public" && <p>{es ? "Prueba a cambiar el traslado al cliente del 50 % al 0 %. El coste del combustible es el mismo. Lo que cambia es quién lo soporta." : "Change pass-through from 50% to 0%. Fuel costs are the same, but who bears them changes."}</p>}
      {view === "class" && <><p>{es ? "En parejas, comparad dos empresas que consumen 20.000 litros al mes. El diésel sube 0,20 €/litro. Una empresa repercute el 25 % y la otra el 75 %. Calculad cuánto margen pierde cada una y explicad qué cláusula contractual justificaría la diferencia." : "In pairs, compare two firms using 20,000 litres per month. Diesel rises by €0.20 per litre. One firm passes on 25% and the other 75%. Calculate each margin loss and explain which contract clause could justify the difference."}</p><details><summary>{es ? "Comprobar el cálculo" : "Check the calculation"}</summary><p>{es ? "El coste aumenta 4.000 € para ambas. La primera pierde 3.000 € de margen y la segunda 1.000 €. Una cláusula de ajuste por combustible podría explicar la diferencia si permite aplicar el ajuste durante el mismo mes." : "Costs rise by €4,000 for both. The first loses €3,000 in margin and the second €1,000. A fuel adjustment clause could explain the difference if it applies within the same month."}</p></details></>}
      {view === "pro" && <p>{es ? "Para una revisión de precios, toma el consumo de las facturas, el cambio del precio realmente pagado y el traslado previsto en los contratos. Simula por separado el mes de subida y el mes en que entra en vigor el recargo. Si la variación de margen supera tu umbral interno, revisa primero los contratos con mayor exposición." : "For a pricing review, take fuel usage from invoices, the price change actually paid, and pass-through from contracts. Model the month prices rise separately from the month the surcharge starts. If margin moves beyond your internal threshold, review the most exposed contracts first."}</p>}
      <details>
        <summary>{es ? "Método, supuestos y fuente" : "Method, assumptions and source"}</summary>
        <p>{es ? "Coste adicional = litros × cambio del precio. Variación del margen = importe trasladado − coste adicional. Las cifras iniciales son ilustrativas. Se mantienen constantes el consumo y los demás costes. No se estima el precio futuro del diésel ni se convierte un movimiento del Brent en una subida del combustible." : "Additional cost = litres × price change. Margin change = amount passed through − additional cost. The defaults are illustrative. Fuel usage and other costs are held constant. The model does not forecast diesel prices or convert a Brent move into a fuel price increase."}{" "}<a style={{ color: C.gold }} href="https://www.eia.gov/energyexplained/diesel-fuel/factors-affecting-diesel-prices.php">{es ? "EIA · Factores del precio del diésel" : "EIA · Factors affecting diesel prices"}</a></p>
      </details>
    </section>
  );
}
