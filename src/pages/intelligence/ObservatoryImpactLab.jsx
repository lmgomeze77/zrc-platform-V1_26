import { useState } from "react";
import { C } from "../../theme/palette";

const scenarios = [
  { id: "base", es: "Arranque previsto", en: "On-time start", cash: 1_600_000 },
  { id: "shared", es: "Dos meses de retraso", en: "Two-month delay", cash: 900_000 },
  { id: "independent", es: "Procesador alternativo homologado", en: "Approved alternative processor", cash: 1_250_000 },
];
const minimumCash = 1_000_000;
const card = { padding: "clamp(16px, 4vw, 30px)", marginBottom: 24, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, color: C.textSec };
const action = { padding: "9px 13px", border: `1px solid ${C.gold}`, borderRadius: 5, background: C.gold, color: C.onGold, fontWeight: 600, cursor: "pointer" };

export default function ObservatoryImpactLab({ lang, onRegister }) {
  const es = lang === "es";
  const [answer, setAnswer] = useState(null);
  const money = new Intl.NumberFormat(es ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <section id="laboratorio-impacto" aria-labelledby="laboratorio-impacto-title" style={card}>
      <p style={{ color: C.gold, fontSize: 12, fontWeight: 600 }}>{es ? "OBSERVATORIO ZRC · CASO EN UN MINUTO" : "ZRC OBSERVATORY · ONE-MINUTE CASE"}</p>
      <h3 id="laboratorio-impacto-title" style={{ color: C.text, margin: "8px 0" }}>
        {es ? "Dos proveedores, una sola dependencia" : "Two suppliers, one point of failure"}
      </h3>
      <p>{es ? "Una planta española de baterías ha contratado dos proveedores de grafito de países distintos. El mineral necesita un tratamiento especializado antes de poder usarse en la planta." : "A Spanish battery plant has contracted two graphite suppliers from different countries. The material needs specialised processing before it can be used at the plant."}</p>
      <p><strong>{es ? "¿Cambiar de país de origen basta para proteger el arranque?" : "Is a different country of origin enough to protect the launch?"}</strong></p>
      <div role="group" aria-label={es ? "Elige tu respuesta" : "Choose your answer"} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[[true, "Sí, cambia el país de origen", "Yes, the origin country differs"], [false, "Falta saber quién lo procesa", "We need to know who processes it"]].map(([choice, labelEs, labelEn]) => (
          <button key={String(choice)} type="button" aria-pressed={answer === choice} onClick={() => setAnswer(choice)} style={{ ...action, background: answer === choice ? C.gold : "transparent", color: answer === choice ? C.onGold : C.text }}>
            {es ? labelEs : labelEn}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {answer !== null && (
          <>
            <p><strong style={{ color: C.text }}>{answer ? (es ? "Las dos rutas pasan por el mismo procesador." : "Both routes rely on the same processor.") : (es ? "Exacto. Las dos rutas pasan por el mismo procesador." : "Correct. Both routes rely on the same processor.")}</strong>{" "}{es ? "La alternativa debe usar un procesador independiente y estar homologada para el arranque." : "The alternative needs an independent processor and qualification before launch."}</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 290, textAlign: "left", borderCollapse: "collapse" }}>
                <caption style={{ textAlign: "left", paddingBottom: 6 }}>{es ? "Proyecto ficticio · mínimo de caja exigido: 1 M€" : "Fictional project · minimum cash requirement: €1m"}</caption>
                <thead><tr><th scope="col">{es ? "Escenario" : "Scenario"}</th><th scope="col">{es ? "Caja mínima" : "Cash low point"}</th></tr></thead>
                <tbody>{scenarios.map(s => (
                  <tr key={s.id}><th scope="row" style={{ padding: "8px 12px 8px 0", borderTop: `1px solid ${C.border}` }}>{s[lang]}</th><td style={{ borderTop: `1px solid ${C.border}` }}>{money.format(s.cash)}{s.cash < minimumCash && (es ? " · por debajo" : " · below requirement")}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <details style={{ marginTop: 12 }}>
        <summary>{es ? "Supuestos y fuente sectorial" : "Assumptions and industry source"}</summary>
        <p>{es ? "El retraso consume 350.000 € de caja por mes. La alternativa cuesta 350.000 € en total y evita todo el retraso si ya está homologada. Son cifras ilustrativas del proyecto. La AIE documenta la concentración del procesado de grafito para baterías." : "Each month of delay uses €350,000 of cash. The alternative costs €350,000 in total and avoids the entire delay if already qualified. These are illustrative project figures. The IEA documents concentration in battery-grade graphite processing."}{" "}<a style={{ color: C.gold }} href="https://www.iea.org/reports/global-critical-minerals-outlook-2025/executive-summary">{es ? "AIE · Perspectivas de minerales críticos 2025" : "IEA · Global Critical Minerals Outlook 2025"}</a></p>
      </details>
      <p><strong>{es ? "Qué señal merece seguimiento" : "What to watch next"}</strong>{" "}{es ? "Un contrato con un procesador alternativo y la homologación de su material. Una nueva mina, por sí sola, no resuelve esta dependencia." : "A contract with an alternative processor and qualification of its material. A new mine alone leaves this dependency in place."}</p>
      {onRegister && <button type="button" onClick={onRegister} style={action}>{es ? "Crear cuenta para explorar las señales ZRC" : "Create an account to explore ZRC signals"}</button>}
    </section>
  );
}
