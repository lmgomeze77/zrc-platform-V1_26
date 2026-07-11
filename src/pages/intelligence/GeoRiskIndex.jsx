// GeoRiskIndex.jsx — ZRC GeoRisk Index (public weekly benchmark)
// Self-contained component: fetches weekly history from the Worker,
// renders the chart + concrete asset-impact reference table.
// Import in App.jsx: import GeoRiskIndex from "./pages/intelligence/GeoRiskIndex";

import { useState, useEffect, useMemo } from "react";

const C = {
  bg: "#09090B", surface: "#111113", surface2: "#18181B", surface3: "#1F1F23",
  border: "#27272A", borderHover: "#3F3F46",
  text: "#FAFAFA", textSec: "#A1A1AA", textMuted: "#71717A",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.12)", goldBorder: "rgba(212,168,83,0.25)",
  red: "#EF4444", green: "#22C55E", blue: "#3B82F6", amber: "#F59E0B",
};
const F = {
  display: "'Cormorant Garamond','Georgia',serif",
  body: "'Outfit','Helvetica Neue',sans-serif",
  mono: "'IBM Plex Mono','Fira Code',monospace",
};

const API_URL = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-index";

const ASSETS = [
  "Deuda soberana core", "Renta fija High Yield", "Real estate prime",
  "Materias primas", "Equity exportador", "Efectivo / Money Market",
];

// Sensibilidad estimada de precio (%) por unidad de vector de impacto [-1,1].
// Mismo modelo ilustrativo usado en GeoRisk Dashboard / GeoRisk ML.
const ASSET_SENSITIVITY = {
  "Deuda soberana core":       { interest_rates: -9,  sovereign_yield: -11, capital_flows: 2  },
  "Renta fija High Yield":     { interest_rates: -6,  sovereign_yield: -7,  capital_flows: 4, inflation_cpi: -2 },
  "Real estate prime":         { interest_rates: -8,  sovereign_yield: -5,  capital_flows: 7  },
  "Materias primas":           { commodities: 12, inflation_cpi: 3 },
  "Equity exportador":         { fx_eurusd: -35, capital_flows: 4 },
  "Efectivo / Money Market":   { interest_rates: 3, sovereign_yield: 1 },
};

// Perfil de shock representativo (forma del escenario "Escalada Arancelaria",
// el de mayor probabilidad en el mix ZRC por defecto), escalado por la
// distancia del índice respecto al punto neutro (50).
const REFERENCE_SHOCK_VECTOR = {
  interest_rates: 0.35, inflation_cpi: 0.55, fx_eurusd: -0.08,
  commodities: 0.45, sovereign_yield: 0.40, capital_flows: -0.60,
};

function bandImpact(indexLevel) {
  const intensity = (indexLevel - 50) / 50;
  return ASSETS.map((asset) => {
    const sens = ASSET_SENSITIVITY[asset] || {};
    let total = 0;
    Object.entries(sens).forEach(([vk, coef]) => {
      total += (REFERENCE_SHOCK_VECTOR[vk] || 0) * intensity * coef;
    });
    return { asset, pct: total };
  });
}

const BANDS = [
  { key: "bajo", label: "BAJO", range: "0–40", mid: 20, color: C.green },
  { key: "moderado", label: "MODERADO", range: "40–65", mid: 52.5, color: C.amber },
  { key: "elevado", label: "ELEVADO", range: "65–80", mid: 72.5, color: "#F97316" },
  { key: "critico", label: "CRÍTICO", range: "80–100", mid: 90, color: C.red },
];

const riskLabel = (v) => (v < 40 ? "BAJO" : v < 65 ? "MODERADO" : v < 80 ? "ELEVADO" : "CRÍTICO");
const riskColor = (v) => (v < 40 ? C.green : v < 65 ? C.amber : v < 80 ? "#F97316" : C.red);
const fmt = (v, d = 1) => Number(v).toFixed(d);

function IndexChart({ history, color }) {
  const W = 720, H = 220, PAD = { l: 40, r: 16, t: 16, b: 28 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const vals = history.map((p) => p.index_value);
  const minV = Math.max(0, Math.min(...vals) - 8);
  const maxV = Math.min(100, Math.max(...vals) + 8);
  const range = maxV - minV || 1;
  const xOf = (i) => (history.length <= 1 ? PAD.l + iW / 2 : PAD.l + (i / (history.length - 1)) * iW);
  const yOf = (v) => PAD.t + iH - ((v - minV) / range) * iH;
  const linePath = history.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p.index_value)}`).join(" ");
  const yTicks = [20, 40, 60, 80].filter((t) => t >= minV && t <= maxV);
  const firstLabel = history[0]?.week_start;
  const lastLabel = history[history.length - 1]?.week_start;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} y1={yOf(t)} x2={W - PAD.r} y2={yOf(t)} stroke={C.border} strokeWidth={0.5} />
          <text x={PAD.l - 6} y={yOf(t) + 4} textAnchor="end" fill={C.textMuted} fontSize={9} fontFamily={F.mono}>{t}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {history.map((p, i) => (
        <circle key={p.week_start} cx={xOf(i)} cy={yOf(p.index_value)} r={3} fill={color}>
          <title>{`${p.week_start} — ${fmt(p.index_value)} (${p.risk_label || riskLabel(p.index_value)})`}</title>
        </circle>
      ))}
      {firstLabel && (
        <text x={PAD.l} y={H - 8} textAnchor="start" fill={C.textMuted} fontSize={9} fontFamily={F.mono}>{firstLabel}</text>
      )}
      {lastLabel && lastLabel !== firstLabel && (
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fill={C.textMuted} fontSize={9} fontFamily={F.mono}>{lastLabel}</text>
      )}
    </svg>
  );
}

export default function GeoRiskIndex({ lang = "es", FadeIn, Sec, SH, GoldDivider }) {
  const [history, setHistory] = useState([]);
  const [live, setLive] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let mounted = true;
    fetch(API_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((d) => {
        if (!mounted) return;
        setHistory(Array.isArray(d.history) ? d.history : []);
        setLive(d.live || null);
        setStatus("ok");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });
    return () => { mounted = false; };
  }, []);

  const current = history.length ? history[history.length - 1] : null;
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const displayValue = current ? current.index_value : live?.value ?? null;
  const displayLabel = current ? (current.risk_label || riskLabel(current.index_value)) : (live ? live.riskLabel : null);
  const displayScenario = current ? current.dominant_scenario : live?.dominantScenario;
  const weeklyChange = current && previous ? current.index_value - previous.index_value : null;

  const bands = useMemo(() => BANDS.map((b) => ({ ...b, impacts: bandImpact(b.mid) })), []);

  const chartHistory = history.length
    ? history
    : (live ? [{ week_start: "hoy", index_value: live.value, risk_label: live.riskLabel }] : []);

  return (
    <Sec id="georisk-index">
      <SH
        label={lang === "es" ? "03 — ZRC GEORISK INDEX" : "03 — ZRC GEORISK INDEX"}
        title={lang === "es" ? "El Índice de Riesgo Geopolítico de ZRC" : "The ZRC Geopolitical Risk Index"}
        sub={lang === "es"
          ? "Score compuesto semanal (0–100) construido con el mismo motor cuantitativo que GeoRisk Dashboard. Publicado como referencia pública del riesgo geopolítico, con niveles concretos de impacto estimado en precios de activos."
          : "Weekly composite score (0–100) built on the same quantitative engine as GeoRisk Dashboard. Published as a public geopolitical risk benchmark, with concrete estimated asset price-impact levels."}
      />

      <FadeIn delay={0.1}>
        <div style={{
          display: "grid", gridTemplateColumns: "auto 1fr", gap: 32,
          padding: "28px 32px", background: C.surface, border: `1px solid ${C.border}`, marginBottom: 24,
          alignItems: "center", flexWrap: "wrap",
        }}>
          <div style={{ textAlign: "center", minWidth: 140 }}>
            {status === "loading" ? (
              <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>· · ·</div>
            ) : displayValue != null ? (
              <>
                <div style={{ fontFamily: F.display, fontSize: 56, fontWeight: 300, color: riskColor(displayValue), lineHeight: 1 }}>
                  {fmt(displayValue, 1)}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: riskColor(displayValue), letterSpacing: "0.12em", marginTop: 6 }}>
                  {displayLabel}
                </div>
                {weeklyChange != null && (
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: weeklyChange >= 0 ? C.red : C.green, marginTop: 6 }}>
                    {weeklyChange >= 0 ? "▲" : "▼"} {fmt(Math.abs(weeklyChange), 1)} {lang === "es" ? "pts/semana" : "pts/week"}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>
                {lang === "es" ? "Sin datos" : "No data"}
              </div>
            )}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em" }}>
                ZRC-GRI · {lang === "es" ? "HISTÓRICO SEMANAL" : "WEEKLY HISTORY"}
              </span>
              {displayScenario && (
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.gold }}>
                  {lang === "es" ? "Escenario dominante:" : "Dominant scenario:"} {displayScenario}
                </span>
              )}
            </div>
            {status === "error" && (
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, padding: "24px 0" }}>
                {lang === "es"
                  ? "No se pudo cargar el histórico en este momento. El índice se publica cada semana — vuelve pronto."
                  : "Could not load the history right now. The index is published weekly — check back soon."}
              </div>
            )}
            {status !== "error" && chartHistory.length > 0 && (
              <IndexChart history={chartHistory} color={C.gold} />
            )}
            {status === "ok" && history.length === 0 && (
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 8 }}>
                {lang === "es"
                  ? "Serie histórica en construcción — primer dato de esta semana. La serie crecerá cada lunes."
                  : "Historical series just starting — this week's first print. The series will grow every Monday."}
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 14 }}>
          {lang === "es" ? "NIVELES DE REFERENCIA · IMPACTO ESTIMADO EN ACTIVOS" : "REFERENCE LEVELS · ESTIMATED ASSET IMPACT"}
        </div>
        <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ background: C.surface2 }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>
                  {lang === "es" ? "NIVEL ÍNDICE" : "INDEX LEVEL"}
                </th>
                {ASSETS.map((a) => (
                  <th key={a} style={{ textAlign: "right", padding: "10px 14px", fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.05em" }}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.key} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: b.color, letterSpacing: "0.08em" }}>{b.label}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginLeft: 8 }}>{b.range}</span>
                  </td>
                  {b.impacts.map((imp) => (
                    <td key={imp.asset} style={{ textAlign: "right", padding: "12px 14px", fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: imp.pct > 0.5 ? C.red : imp.pct < -0.5 ? C.green : C.textMuted }}>
                      {imp.pct >= 0 ? "+" : ""}{fmt(imp.pct, 1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FadeIn>

      <FadeIn delay={0.3}>
        <div style={{ padding: "16px 20px", background: C.surface, border: `1px dashed ${C.border}`, fontSize: 11, color: C.textMuted, lineHeight: 1.7, fontFamily: F.body }}>
          {lang === "es"
            ? "Metodología: el ZRC-GRI parte del promedio ponderado por probabilidad del riesgo intrínseco de los cuatro escenarios geopolíticos base de ZRC Research (sector Global, multiplicador ×1.00), y le suma un pequeño ajuste semanal (máx. ±3 pts) según el tono de las señales geopolíticas del día — así el print recalculado cada lunes se mueve con la actualidad sin desviarse de la línea base estructural. Los niveles de referencia de impacto en activos usan un perfil de shock representativo (forma del escenario de mayor probabilidad) escalado por nivel de índice — son ilustrativos, no una proyección de mercado, y no constituyen asesoramiento de inversión. Para el análisis interactivo con escenarios propios, ver GeoRisk Dashboard y GeoRisk Predictive ML."
            : "Methodology: the ZRC-GRI starts from the probability-weighted average of the intrinsic risk of ZRC Research's four base geopolitical scenarios (Global sector, ×1.00 multiplier), plus a small weekly adjustment (max ±3 pts) based on that day's geopolitical signal flow — so the Monday print moves with current events without drifting from the structural baseline. Asset-impact reference levels use a representative shock profile (shaped by the highest-probability scenario) scaled by index level — illustrative only, not a market projection, and not investment advice. For interactive analysis with your own scenarios, see GeoRisk Dashboard and GeoRisk Predictive ML."}
        </div>
      </FadeIn>
    </Sec>
  );
}
