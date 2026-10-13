// GeoRiskAssetEvidence.jsx — "what history says" table under the ZRC-GRI.
// Data: src/data/georisk-asset-evidence.json, produced offline by
// scripts/compute-georisk-asset-evidence.py from public sources (GPR,
// FRED, Shiller, World Bank). Replaces the former illustrative
// shock-vector table, which was not calibrated against market history.
import evidence from "../data/georisk-asset-evidence.json";
import { C } from "../theme/palette";

const F = {
  body: "'Outfit','Helvetica Neue',sans-serif",
  mono: "'IBM Plex Mono','Fira Code',monospace",
};

const ROWS = [
  { key: "bajo", es: "BAJO", en: "LOW", color: "var(--zrc-risk-low)" },
  { key: "moderado", es: "MODERADO", en: "MODERATE", color: "var(--zrc-risk-mod)" },
  { key: "elevado", es: "ELEVADO", en: "ELEVATED", color: "var(--zrc-risk-high)" },
  { key: "critico", es: "CRÍTICO", en: "CRITICAL", color: "var(--zrc-risk-crit)" },
];

const ASSET_LABELS_EN = { "Oro": "Gold", "Brent": "Brent", "S&P 500": "S&P 500", "Bund 10a": "Bund 10y", "Treasury 10a": "Treasury 10y", "EUR/USD": "EUR/USD" };

const num = (v, lang, d = 1) => new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", { minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: "exceptZero" }).format(Math.abs(v) < 0.5 / 10 ** d ? 0 : v);
const plain = (v, lang, d = 0) => new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", { maximumFractionDigits: d }).format(v);

function rangeLabel(key, t, lang) {
  if (key === "bajo") return `GPR < ${plain(t.moderado, lang)}`;
  if (key === "moderado") return `${plain(t.moderado, lang)}–${plain(t.elevado, lang)}`;
  if (key === "elevado") return `${plain(t.elevado, lang)}–${plain(t.critico, lang)}`;
  return `≥ ${plain(t.critico, lang)}`;
}

function Cell({ asset, cell, lang, emphasize }) {
  const isBp = asset.unit === "bp";
  // Bonds are shown as yields: a falling yield means the bond price rises.
  const good = isBp ? cell.excess < 0 : cell.excess > 0;
  const color = !cell.significant ? C.textMuted : good ? C.green : C.red;
  const value = isBp ? `${num(cell.excess, lang, 0)} pb` : `${num(cell.excess, lang, 1)} pp`;
  const tip = lang === "es"
    ? `n = ${cell.n} · rango intercuartílico ${num(cell.p25, lang)} a ${num(cell.p75, lang)}${isBp ? " pb" : "%"} · sube el ${cell.share_up}% de las veces`
    : `n = ${cell.n} · interquartile range ${num(cell.p25, lang)} to ${num(cell.p75, lang)}${isBp ? " bp" : "%"} · up ${cell.share_up}% of the time`;
  return (
    <td title={tip} style={{ textAlign: "right", padding: "12px 14px", fontFamily: F.mono, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 12, fontWeight: cell.significant ? 700 : 400, color }}>
        {cell.significant ? value : `≈ ${value}`}
      </span>
      <span style={{ display: "block", fontSize: 9, color: C.textMuted, marginTop: 3, opacity: emphasize ? 1 : 0.85 }}>n={cell.n}</span>
    </td>
  );
}

export default function GeoRiskAssetEvidence({ lang = "es" }) {
  const es = lang === "es";
  const { assets, current, gpr_thresholds: t, gpr_sample: sample, horizon_months: h, shock_rule: shock } = evidence;
  const currentRow = ROWS.find((r) => r.key === current.band);
  const thStyle = { padding: "10px 14px", fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em", fontWeight: 600 };
  const startYear = sample[0].slice(0, 4), endYear = sample[1].slice(0, 4);

  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 10 }}>
        {es ? "LO QUE DICE LA HISTORIA · ACTIVOS SEGÚN EL RIESGO GEOPOLÍTICO" : "WHAT HISTORY SAYS · ASSETS BY GEOPOLITICAL RISK"}
      </div>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, margin: "0 0 12px", lineHeight: 1.6, maxWidth: 820 }}>
        {es
          ? `Cómo se movió cada activo en los ${h} meses siguientes, por encima o por debajo de lo normal, según la banda del índice de riesgo geopolítico GPR (${startYear}–${endYear}). En color, diferencias estadísticamente sólidas; en gris (≈), sin efecto consistente.`
          : `How each asset moved over the following ${h} months, above or below normal, by band of the GPR geopolitical risk index (${startYear}–${endYear}). In colour, statistically robust differences; in grey (≈), no consistent effect.`}
      </p>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14, padding: "8px 12px", background: C.surface, border: `1px solid ${C.border}`, fontFamily: F.mono, fontSize: 10, color: C.textSec }}>
        <span>{es ? "GPR actual" : "Current GPR"} ({current.month}): <strong style={{ color: C.text }}>{plain(current.gpr, lang, 1)}</strong></span>
        <span>· {es ? "percentil" : "percentile"} {plain(current.percentile, lang)}</span>
        {currentRow && <span>→ <strong style={{ color: currentRow.color, letterSpacing: "0.08em" }}>{es ? currentRow.es : currentRow.en}</strong></span>}
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ background: C.surface2 }}>
              <th style={{ ...thStyle, textAlign: "left" }}>{es ? "BANDA GPR" : "GPR BAND"}</th>
              {assets.map((a) => (
                <th key={a.key} style={{ ...thStyle, textAlign: "right" }}>
                  {es ? a.label : ASSET_LABELS_EN[a.label] || a.label}
                  <span style={{ display: "block", fontWeight: 400, marginTop: 2 }}>{a.unit === "bp" ? (es ? "rentab., pb" : "yield, bp") : (es ? "precio, pp" : "price, pp")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const isCurrent = r.key === current.band;
              return (
                <tr key={r.key} style={{ borderTop: `1px solid ${C.border}`, background: isCurrent ? C.goldDim : "transparent", boxShadow: isCurrent ? `inset 3px 0 0 ${r.color}` : "none" }}>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: r.color, marginRight: 8, verticalAlign: "middle" }} />
                    <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: "0.08em" }}>{es ? r.es : r.en}</span>
                    <span style={{ display: "block", fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginTop: 3, marginLeft: 16 }}>
                      {rangeLabel(r.key, t, lang)}{isCurrent ? (es ? " · ACTUAL" : " · CURRENT") : ""}
                    </span>
                  </td>
                  {assets.map((a) => <Cell key={a.key} asset={a} cell={a.cells[r.key]} lang={lang} emphasize={isCurrent} />)}
                </tr>
              );
            })}
            <tr style={{ borderTop: `2px solid ${C.borderHover}`, background: C.surface }}>
              <td style={{ padding: "12px 14px" }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: "0.08em" }}>{es ? "MES DE SHOCK" : "SHOCK MONTH"}</span>
                <span style={{ display: "block", fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginTop: 3, maxWidth: 170, whiteSpace: "normal", lineHeight: 1.4 }}>
                  {es ? `GPR +${plain(shock.jump_vs_3m_avg_pct, lang)}% o más sobre su media de 3 meses · variación en ese mes` : `GPR +${plain(shock.jump_vs_3m_avg_pct, lang)}% or more vs its 3-month average · change in that month`}
                </span>
              </td>
              {assets.map((a) => <Cell key={a.key} asset={a} cell={a.cells.shock} lang={lang} />)}
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, margin: "0 0 20px", lineHeight: 1.6 }}>
        {es
          ? "pp = puntos porcentuales de variación de precio sobre la mediana de todos los periodos; pb = puntos básicos de rentabilidad (en bonos, verde = la rentabilidad baja y el precio sube). Pasa el cursor por una cifra para ver el rango y el número de casos."
          : "pp = percentage points of price change above the all-period median; bp = basis points of yield (for bonds, green = yield falls and price rises). Hover a figure for its range and number of cases."}
      </p>
    </div>
  );
}
