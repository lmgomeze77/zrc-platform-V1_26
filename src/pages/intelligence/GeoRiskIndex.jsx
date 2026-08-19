// GeoRiskIndex.jsx — ZRC GeoRisk Index (public weekly benchmark)
// Self-contained component: fetches weekly history from the Worker,
// renders the chart + concrete asset-impact reference table.
// Import in App.jsx: import GeoRiskIndex from "./pages/intelligence/GeoRiskIndex";

import { useState, useEffect, useMemo } from "react";
import { t as tVisor } from "../labs/visorI18n";

// A diferencia del modal de leads del Visor (que sigue apuntando a
// zrc-api.onrender.com, el backend de leads en producción), esta captura
// apunta al propio Worker (mismo origen): la promesa aquí es "te mandamos
// el índice cada lunes", y eso requiere controlar el envío — el Worker ya
// tiene D1 + Resend montado y el cron semanal lo extiende para mandar el
// email real (ver sendWeeklyDigestEmails en src/worker/index.js). Los
// textos de sector se reutilizan del mismo diccionario (visorI18n) para no
// duplicar la lista.
const LEAD_API_URL = "/api/lead";
const LEAD_SECTOR_KEYS = [
  "leadSectorPromotor", "leadSectorFamilyOffice", "leadSectorAsesoria",
  "leadSectorAgencia", "leadSectorInversor", "leadSectorFondo", "leadSectorOtro",
];

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

// Genera ~targetCount gridlines "redondas" (múltiplos de 1/2/5/10 según la
// escala) dentro de [min, max] — a diferencia de una lista fija de ticks,
// esto siempre produce una escala legible sea cual sea el rango real de
// valores del índice (evita quedarse con un único tick, como pasaba antes
// cuando el rango de la serie era estrecho).
function niceTicks(min, max, targetCount = 4) {
  const span = Math.max(max - min, 1e-6);
  const rough = span / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let t = start; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return ticks;
}

function IndexChart({ history, color }) {
  const W = 720, H = 220, PAD = { l: 40, r: 16, t: 28, b: 28 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const vals = history.map((p) => p.index_value);
  const minV = Math.max(0, Math.min(...vals) - 8);
  const maxV = Math.min(100, Math.max(...vals) + 8);
  const range = maxV - minV || 1;
  const xOf = (i) => (history.length <= 1 ? PAD.l + iW / 2 : PAD.l + (i / (history.length - 1)) * iW);
  const yOf = (v) => PAD.t + iH - ((v - minV) / range) * iH;
  const linePath = history.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p.index_value)}`).join(" ");
  const yTicks = niceTicks(minV, maxV, 4);
  const firstLabel = history[0]?.week_start;
  const lastLabel = history[history.length - 1]?.week_start;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} y1={yOf(t)} x2={W - PAD.r} y2={yOf(t)} stroke={C.border} strokeWidth={0.5} />
          <text x={PAD.l - 6} y={yOf(t) + 4} textAnchor="end" fill={C.textMuted} fontSize={9} fontFamily={F.mono}>{fmt(t, t % 1 === 0 ? 0 : 1)}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {history.map((p, i) => {
        const isEndpoint = i === 0 || i === history.length - 1;
        const cx = xOf(i), cy = yOf(p.index_value);
        return (
          <g key={p.week_start}>
            <circle cx={cx} cy={cy} r={3} fill={color}>
              <title>{`${p.week_start} — ${fmt(p.index_value)} (${p.risk_label || riskLabel(p.index_value)})`}</title>
            </circle>
            {/* Solo se etiqueta el primer y el último punto (valor inicial vs.
                actual) — si se etiquetara cada punto, la serie se volvería
                ilegible según crezca el histórico semana a semana. */}
            {isEndpoint && (
              <text x={cx} y={cy - 9} textAnchor={i === 0 ? "start" : "end"} fill={color} fontSize={11} fontWeight={600} fontFamily={F.mono}>
                {fmt(p.index_value)}
              </text>
            )}
          </g>
        );
      })}
      {firstLabel && (
        <text x={PAD.l} y={H - 8} textAnchor="start" fill={C.textMuted} fontSize={9} fontFamily={F.mono}>{firstLabel}</text>
      )}
      {lastLabel && lastLabel !== firstLabel && (
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fill={C.textMuted} fontSize={9} fontFamily={F.mono}>{lastLabel}</text>
      )}
    </svg>
  );
}

// Captura de email para el envío semanal del índice — la serie histórica ya
// es pública y gratuita (sin esto no se perdía ningún dato), así que esto
// añade un imán de leads sin restringir nada que ya funcionaba.
function WeeklyDigestCapture({ lang }) {
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const resp = await fetch(LEAD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sector, source: "georisk-index", rc: null, parcela: null }),
      });
      if (!resp.ok) throw new Error("request failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div style={{ padding: "20px 24px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, fontFamily: F.body, fontSize: 13, color: C.text }}>
        {lang === "es"
          ? "Listo — recibirás el ZRC-GRI cada lunes en tu email."
          : "Done — you'll get the ZRC-GRI in your inbox every Monday."}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}` }}>
      <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, marginBottom: 6 }}>
        {lang === "es" ? "Recibe el índice cada lunes" : "Get the index every Monday"}
      </div>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: "0 0 18px", maxWidth: 480 }}>
        {lang === "es"
          ? "El mismo print semanal que ves arriba, directo a tu email, con el escenario dominante y el cambio semana a semana."
          : "The same weekly print you see above, straight to your inbox, with the dominant scenario and week-over-week change."}
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="email" required placeholder={lang === "es" ? "email@empresa.com" : "email@company.com"}
          value={email} onChange={(e) => setEmail(e.target.value)}
          style={{
            flex: "1 1 220px", padding: "11px 14px", background: C.surface2, color: C.text,
            border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F.body, outline: "none",
          }}
        />
        <select
          required value={sector} onChange={(e) => setSector(e.target.value)}
          style={{
            flex: "1 1 180px", padding: "11px 14px", background: C.surface2, color: C.text,
            border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F.body, outline: "none", appearance: "none",
          }}
        >
          <option value="">{lang === "es" ? "Sector / actividad" : "Sector / role"}</option>
          {LEAD_SECTOR_KEYS.map((k) => <option key={k}>{tVisor(lang, k)}</option>)}
        </select>
        <button
          type="submit" disabled={status === "submitting"}
          style={{
            padding: "11px 22px", background: C.gold, color: C.bg, border: "none",
            fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", cursor: status === "submitting" ? "wait" : "pointer",
            opacity: status === "submitting" ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          {status === "submitting" ? (lang === "es" ? "Enviando…" : "Sending…") : (lang === "es" ? "Suscribirme" : "Subscribe")}
        </button>
      </form>
      {status === "error" && (
        <p style={{ marginTop: 12, fontSize: 12, color: C.red }}>
          {lang === "es" ? "Error al enviar — inténtalo de nuevo." : "Something went wrong — please try again."}
        </p>
      )}
    </div>
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
            ? "Metodología: el ZRC-GRI es el promedio ponderado por probabilidad del riesgo intrínseco de los cuatro escenarios geopolíticos base de ZRC Research (sector Global, multiplicador ×1.00), recalculado cada lunes. Los niveles de referencia de impacto en activos usan un perfil de shock representativo (forma del escenario de mayor probabilidad) escalado por nivel de índice — son ilustrativos, no una proyección de mercado, y no constituyen asesoramiento de inversión. Para el análisis interactivo con escenarios propios, ver GeoRisk Dashboard y GeoRisk Predictive ML."
            : "Methodology: the ZRC-GRI is the probability-weighted average of the intrinsic risk of ZRC Research's four base geopolitical scenarios (Global sector, ×1.00 multiplier), recalculated every Monday. Asset-impact reference levels use a representative shock profile (shaped by the highest-probability scenario) scaled by index level — illustrative only, not a market projection, and not investment advice. For interactive analysis with your own scenarios, see GeoRisk Dashboard and GeoRisk Predictive ML."}
        </div>
      </FadeIn>

      <FadeIn delay={0.35}>
        <div style={{ marginTop: 20 }}>
          <WeeklyDigestCapture lang={lang} />
        </div>
      </FadeIn>
    </Sec>
  );
}
