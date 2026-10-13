import GeoRiskGprData from "../../components/GeoRiskGprData";
import GeoRiskAssetEvidence from "../../components/GeoRiskAssetEvidence";
// GeoRiskIndex.jsx — ZRC GeoRisk Index (public weekly benchmark)
// Self-contained component: fetches weekly history from the Worker,
// renders the chart + concrete asset-impact reference table.
// Import in App.jsx: import GeoRiskIndex from "./pages/intelligence/GeoRiskIndex";

import { useState, useEffect } from "react";
import { t as tVisor } from "../labs/visorI18n";
import { C, alpha } from "../../theme/palette";

// A diferencia del modal de leads del Visor (que sigue apuntando a
// zrc-api.onrender.com, el backend de leads en producción), esta captura
// apunta al propio Worker: la promesa aquí es "te mandamos el índice cada
// lunes", y eso requiere controlar el envío — el Worker ya tiene D1 +
// Resend montado y el cron semanal lo extiende para mandar el email real
// (ver sendWeeklyDigestEmails en src/worker/index.js). Los textos de
// sector se reutilizan del mismo diccionario (visorI18n) para no
// duplicar la lista.
// URL absoluta (no ruta relativa): www.zenithrisecapital.com no está
// vinculado a todas las rutas del Worker, así que un fetch relativo aquí
// devuelve 404 en texto plano en vez de llegar al Worker. El subdominio
// workers.dev sí resuelve siempre a este Worker — mismo patrón que API_URL.
const LEAD_API_URL = "https://zenith-risecapital.lmgomeze77.workers.dev/api/lead";
const LEAD_SECTOR_KEYS = [
  "leadSectorPromotor", "leadSectorFamilyOffice", "leadSectorAsesoria",
  "leadSectorAgencia", "leadSectorInversor", "leadSectorFondo", "leadSectorOtro",
];

const F = {
  display: "var(--zrc-font-display)", figures: "var(--zrc-font-figures)",
  body: "'Outfit','Helvetica Neue',sans-serif",
  mono: "'IBM Plex Mono','Fira Code',monospace",
};

const API_URL = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-index";

// Escala de riesgo propia (verde → ocre → carmín → granate), definida en
// theme.css para que funcione en tema claro y oscuro.
const RISK = {
  low: "var(--zrc-risk-low)", mod: "var(--zrc-risk-mod)",
  high: "var(--zrc-risk-high)", crit: "var(--zrc-risk-crit)",
};
const BANDS = [
  { key: "bajo", fill: 0.10, label: "BAJO", labelEn: "LOW", range: "0–40", lo: 0, hi: 40, mid: 20, color: RISK.low },
  { key: "moderado", fill: 0.13, label: "MODERADO", labelEn: "MODERATE", range: "40–65", lo: 40, hi: 65, mid: 52.5, color: RISK.mod },
  { key: "elevado", fill: 0.10, label: "ELEVADO", labelEn: "ELEVATED", range: "65–80", lo: 65, hi: 80, mid: 72.5, color: RISK.high },
  { key: "critico", fill: 0.22, label: "CRÍTICO", labelEn: "CRITICAL", range: "80–100", lo: 80, hi: 100, mid: 90, color: RISK.crit },
];

const bandOf = (v) => BANDS.find((b) => v < b.hi) || BANDS[BANDS.length - 1];
const riskLabel = (v) => bandOf(v).label;
const riskColor = (v) => bandOf(v).color;
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
      {/* Zonas de riesgo visibles dentro del rango del gráfico */}
      {BANDS.filter((b) => b.hi > minV && b.lo < maxV).map((b) => {
        const top = yOf(Math.min(b.hi, maxV)), bottom = yOf(Math.max(b.lo, minV));
        const showThreshold = b.lo > minV && b.lo < maxV;
        return (
          <g key={b.key}>
            <rect x={PAD.l} y={top} width={iW} height={bottom - top} fill={b.color} opacity={b.fill} />
            {/* Barra lateral con el color de la banda: identifica la zona aunque el fondo sea suave */}
            <rect x={PAD.l} y={top} width={4} height={bottom - top} fill={b.color} />
            {showThreshold && (
              <>
                <line x1={PAD.l} y1={bottom} x2={W - PAD.r} y2={bottom} stroke={b.color} strokeWidth={1} strokeDasharray="4 3" />
                <text x={PAD.l + 8} y={bottom - 4} fill={b.color} fontSize={8} fontWeight={600} fontFamily={F.mono}>{b.lo}</text>
              </>
            )}
            {bottom - top >= 16 && <text x={W - PAD.r - 6} y={bottom - 5} textAnchor="end" fill={b.color} fontSize={9} fontWeight={700} fontFamily={F.mono} letterSpacing="0.1em">{b.label}</text>}
          </g>
        );
      })}
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
              <text x={i === 0 ? cx + 8 : cx} y={cy - 9} textAnchor={i === 0 ? "start" : "end"} fill={color} fontSize={11} fontWeight={600} fontFamily={F.mono}>
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

// Este índice es el único número público — el motor interactivo detrás
// (escenarios propios, forecast IA, decision engine) vive en GeoRisk
// Dashboard / Predictive ML, ambos exclusivos de Intelligence. A diferencia
// de Observatory (que ya tiene su propio flujo de prueba gratuita +
// paywall por historia), aquí no hay nada que gatear — el índice sigue
// siendo gratis — así que esto es una promoción directa, no una restricción.
function IntelligenceUpsell({ lang, openPricing }) {
  if (!openPricing) return null;
  return (
    <div style={{
      padding: "24px 28px", background: "var(--zrc-cta-blue-bg)", border: "1px solid var(--zrc-cta-blue-border)",
      borderTop: `3px solid ${C.gold}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap",
    }}>
      <div style={{ maxWidth: 460 }}>
        <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, marginBottom: 6 }}>
          {lang === "es" ? "Este es solo el número público" : "This is just the public number"}
        </div>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0 }}>
          {lang === "es"
            ? "GeoRisk Dashboard te deja correr tus propios escenarios con sliders en tiempo real, y GeoRisk Predictive ML añade forecast a 12 meses, NLP analyzer y decision engine institucional — ambos incluidos en Intelligence."
            : "GeoRisk Dashboard lets you run your own scenarios with real-time sliders, and GeoRisk Predictive ML adds a 12-month forecast, NLP analyzer and institutional decision engine — both included in Intelligence."}
        </p>
      </div>
      <button
        onClick={openPricing}
        style={{
          padding: "12px 26px", background: C.gold, color: C.bg, border: "none",
          fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        {lang === "es" ? "Ver Intelligence →" : "See Intelligence →"}
      </button>
    </div>
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
          ? "Listo — ya formas parte de ZRC Morning Intelligence. Recibirás el briefing y el nuevo ZRC-GRI semanal."
          : "Done — you're now part of ZRC Morning Intelligence. You'll receive the briefing and the weekly ZRC-GRI."}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", background: "var(--zrc-cta-sage-bg)", border: "1px solid var(--zrc-cta-sage-border)", borderLeft: `3px solid ${C.gold}` }}>
      <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, marginBottom: 6 }}>
        {lang === "es" ? "Únete a ZRC Morning Intelligence" : "Join ZRC Morning Intelligence"}
      </div>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: "0 0 18px", maxWidth: 480 }}>
        {lang === "es"
          ? "Recibe el briefing de inteligencia de ZRC y, cada semana, el nuevo GeoRisk Index con el escenario dominante y el cambio semana a semana."
          : "Receive ZRC’s intelligence briefing plus the weekly GeoRisk Index, dominant scenario and week-over-week change."}
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="email" required placeholder={lang === "es" ? "email@empresa.com" : "email@company.com"}
          value={email} onChange={(e) => setEmail(e.target.value)}
          style={{
            flex: "1 1 220px", padding: "11px 14px", background: C.bg, color: C.text,
            border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F.body, outline: "none",
          }}
        />
        <select
          required value={sector} onChange={(e) => setSector(e.target.value)}
          style={{
            flex: "1 1 180px", padding: "11px 14px", background: C.bg, color: C.text,
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
          {status === "submitting" ? (lang === "es" ? "Enviando…" : "Sending…") : (lang === "es" ? "Unirme al briefing" : "Join the briefing")}
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

export default function GeoRiskIndex({ lang = "es", useAuth, FadeIn, Sec, SH, GoldDivider }) {
  const { openPricing } = useAuth();
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
  const inputStatus = live?.inputStatus || null;
  const inputDate = live?.inputDate || null;


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
        <style>{`
          .zrc-gri-head { display:grid; grid-template-columns:auto 1fr; gap:32px; align-items:center; padding:28px 32px; }
          @media (max-width: 640px) { .zrc-gri-head { grid-template-columns:1fr; gap:20px; padding:22px 18px; } }
        `}</style>
        <div className="zrc-gri-head" style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: 24 }}>
          <div style={{ textAlign: "center", minWidth: 140 }}>
            {status === "loading" ? (
              <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>· · ·</div>
            ) : displayValue != null ? (
              <>
                <div style={{ fontFamily: F.figures, fontSize: 56, fontWeight: 400, color: riskColor(displayValue), lineHeight: 1, fontVariantNumeric: "lining-nums tabular-nums" }}>
                  {fmt(displayValue, 1)}
                </div>
                <div style={{
                  display: "inline-block", fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: riskColor(displayValue),
                  letterSpacing: "0.12em", marginTop: 10, padding: "3px 10px", border: `1px solid ${riskColor(displayValue)}`,
                }}>
                  {lang === "es" ? displayLabel : bandOf(displayValue).labelEn}
                </div>
                {weeklyChange != null && (() => {
                  // Sin cambio (redondeado a 1 decimal) no es una subida: se
                  // muestra neutro en vez de "▲ 0.0" en rojo.
                  const flat = Math.abs(weeklyChange) < 0.05;
                  return (
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: flat ? C.textMuted : weeklyChange > 0 ? C.red : C.green, marginTop: 8 }}>
                      {flat ? "=" : weeklyChange > 0 ? "▲" : "▼"} {fmt(Math.abs(weeklyChange), 1)} {lang === "es" ? "pts vs. semana anterior" : "pts vs. prior week"}
                    </div>
                  );
                })()}
              </>
            ) : (
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>
                {lang === "es" ? "Sin datos" : "No data"}
              </div>
            )}
          </div>
          <div>
            {inputStatus === "fallback_static" && <div style={{ marginBottom: 10, padding: "8px 10px", border: `1px solid ${C.amber}`, fontFamily: F.mono, fontSize: 9, color: C.amber }}>{lang === "es" ? `INPUTS SIN REFRESCAR · base: ${inputDate || "—"}` : `INPUTS NOT REFRESHED · basis: ${inputDate || "—"}`}</div>}
            {inputStatus === "evidence_driven" && inputDate && <div style={{ marginBottom: 10, fontFamily: F.mono, fontSize: 9, color: C.green }}>{lang === "es" ? `RECALCULADO CON INPUTS: ${inputDate}` : `RECALCULATED WITH INPUTS: ${inputDate}`}</div>}
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
              <IndexChart history={chartHistory} color="var(--zrc-chart-line)" />
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
        <GeoRiskAssetEvidence lang={lang} />
      </FadeIn>

      <FadeIn delay={0.3}>
        <div style={{ padding: "16px 20px", background: C.surface, border: `1px dashed ${C.border}`, fontSize: 11, color: C.textMuted, lineHeight: 1.7, fontFamily: F.body }}>
          {lang === "es"
            ? "Metodología: el ZRC-GRI es el promedio ponderado por probabilidad del riesgo intrínseco de los cuatro escenarios geopolíticos base de ZRC Research (sector Global, multiplicador ×1.00), recalculado cada lunes. La tabla de activos se basa en datos históricos públicos: cada mes desde 1985 se clasifica por el percentil del índice GPR de Caldara e Iacoviello (cortes 40/65/80, los mismos que las bandas del ZRC-GRI) y se mide la variación de cada activo en los 3 meses siguientes frente a la mediana de todo el periodo, con un bootstrap por bloques para separar los efectos sólidos del ruido. Fuentes: GPR (matteoiacoviello.com), FRED (Bund y Treasury a 10 años, Brent, EUR/USD), Shiller/Yale (S&P 500) y Banco Mundial (oro); precios medios mensuales. El ZRC-GRI aún no está calibrado frente al GPR, por eso la tabla usa las bandas del GPR. Es evidencia histórica, no una proyección, y no constituye asesoramiento de inversión. Para el análisis con escenarios propios, ver GeoRisk Dashboard y GeoRisk Predictive ML."
            : "Methodology: the ZRC-GRI is the probability-weighted average of the intrinsic risk of ZRC Research's four base geopolitical scenarios (Global sector, ×1.00 multiplier), recalculated every Monday. The asset table is based on public historical data: every month since 1985 is classified by its percentile of the Caldara–Iacoviello GPR index (cut points 40/65/80, the same as the ZRC-GRI bands) and each asset's change over the following 3 months is measured against the all-period median, with a block bootstrap to separate robust effects from noise. Sources: GPR (matteoiacoviello.com), FRED (10-year Bund and Treasury, Brent, EUR/USD), Shiller/Yale (S&P 500) and the World Bank (gold); monthly average prices. The ZRC-GRI is not yet calibrated against GPR, so the table uses GPR bands. Historical evidence, not a projection, and not investment advice. For scenario analysis, see GeoRisk Dashboard and GeoRisk Predictive ML."}
        </div>
      </FadeIn>

      <GeoRiskGprData lang={lang} />

      <FadeIn delay={0.3}>
        <div style={{ marginTop: 20 }}>
          <IntelligenceUpsell lang={lang} openPricing={openPricing} />
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
