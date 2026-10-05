import GeoRiskPredictiveOutlook from '../../components/GeoRiskPredictiveOutlook.jsx';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sparkles, TrendingUp, Radar, Grid3x3, MessageSquare, Target, RotateCcw } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// GEORISK ML — Zenith Rise Capital
// Predictive Geopolitical Intelligence · ZRC AI Engine
// Evolución del GeoRisk Dashboard → análisis predictivo con IA
// ═══════════════════════════════════════════════════════════════════

const MODEL_VERSION = "ZRC GeoRisk 1.2";
const MODEL_REVIEW_DATE = "04/10/2026";

const REGIONS = {
  eu:   { key: "eu",   label: "Zona Euro" },
  usa:  { key: "usa",  label: "Estados Unidos" },
  asia: { key: "asia", label: "Asia (China)" },
};

// Todas las regiones comparten las mismas claves de variable (interest_rates,
// inflation_cpi, fx, commodities, sovereign_yield, capital_flows) pero con su
// propia fuente/nivel — el selector de región cambia qué referencia se lee.
const ECONOMIC_VARIABLES_BY_REGION = {
  eu: {
    interest_rates:  { label: "Tipos de Interés",   source: "Tipo Depósito · BCE",               unit: "%",   base: 4.75,  vol: 0.15, decimals: 2 },
    inflation_cpi:   { label: "Inflación / IPC",    source: "HICP YoY · Zona Euro · Eurostat",   unit: "%",   base: 3.2,   vol: 0.25, decimals: 2 },
    fx:              { label: "EUR/USD",            source: "Spot FX · Tipo Ref. BCE",           unit: "",    base: 1.074, vol: 0.008, decimals: 3 },
    commodities:     { label: "Materias Primas",    source: "S&P GSCI · S&P Global",             unit: "idx", base: 118.4, vol: 3.5, decimals: 2 },
    sovereign_yield: { label: "Yield Soberano 10Y", source: "Bund 10Y · Zona Euro · BCE",        unit: "%",   base: 4.48,  vol: 0.10, decimals: 2 },
    capital_flows:   { label: "Flujos IED",         source: "IED Neta · Zona Euro · BCE",        unit: "Bn€", base: -12.3, vol: 1.8, decimals: 2 },
  },
  usa: {
    interest_rates:  { label: "Tipos de Interés",   source: "Fed Funds Rate · Federal Reserve",  unit: "%",   base: 5.25,  vol: 0.15, decimals: 2 },
    inflation_cpi:   { label: "Inflación / IPC",    source: "CPI YoY · BLS",                      unit: "%",   base: 3.0,   vol: 0.25, decimals: 2 },
    fx:              { label: "Índice Dólar (DXY)", source: "ICE US Dollar Index",                unit: "idx", base: 104.2, vol: 0.8, decimals: 2 },
    commodities:     { label: "Materias Primas",    source: "S&P GSCI · S&P Global",              unit: "idx", base: 118.4, vol: 3.5, decimals: 2 },
    sovereign_yield: { label: "Yield Soberano 10Y", source: "US Treasury 10Y · Fed",              unit: "%",   base: 4.35,  vol: 0.12, decimals: 2 },
    capital_flows:   { label: "Flujos IED",         source: "Net TIC Flows · US Treasury",        unit: "Bn$", base: -38.6, vol: 5.2, decimals: 2 },
  },
  asia: {
    interest_rates:  { label: "Tipos de Interés",   source: "LPR 1Y · PBOC",                      unit: "%",   base: 3.45,  vol: 0.10, decimals: 2 },
    inflation_cpi:   { label: "Inflación / IPC",    source: "CPI YoY · China · NBS",              unit: "%",   base: 0.4,   vol: 0.30, decimals: 2 },
    fx:              { label: "USD/CNY",            source: "Spot FX · PBOC Fixing",              unit: "",    base: 7.28,  vol: 0.02, decimals: 2 },
    commodities:     { label: "Materias Primas",    source: "S&P GSCI · S&P Global",              unit: "idx", base: 118.4, vol: 3.5, decimals: 2 },
    sovereign_yield: { label: "Yield Soberano 10Y", source: "China Govt Bond 10Y · PBOC",         unit: "%",   base: 2.15,  vol: 0.08, decimals: 2 },
    capital_flows:   { label: "Flujos IED",         source: "IED Neta · China · SAFE",            unit: "Bn$", base: -9.4,  vol: 2.1, decimals: 2 },
  },
};

// El riesgo intrínseco (prob/risk) de cada escenario es global; lo que cambia
// por región es cómo se transmite a cada variable (impactByRegion).
// Convención: en "fx", positivo = el índice/par cotizado SUBE (EUR/USD, DXY o
// USD/CNY según la región) — ver ASSET_SENSITIVITY_BY_REGION para cómo esto
// se traduce a "divisa local más débil/fuerte" en cada caso.
const SCENARIOS = {
  tariff_escalation: {
    label: "Escalada Arancelaria", desc: "Tensiones EE.UU.–China–UE",
    prob: 0.34, risk: 78, color: "#F59E0B",
    impactByRegion: {
      eu:   { interest_rates: 0.35,  inflation_cpi: 0.55, fx: -0.08, commodities: 0.45, sovereign_yield: 0.40,  capital_flows: -0.60 },
      usa:  { interest_rates: 0.15,  inflation_cpi: 0.65, fx: 0.30,  commodities: 0.45, sovereign_yield: 0.25,  capital_flows: 0.35 },
      asia: { interest_rates: -0.10, inflation_cpi: 0.20, fx: 0.55,  commodities: 0.45, sovereign_yield: -0.15, capital_flows: -0.75 },
    }
  },
  mena_instability: {
    label: "Inestabilidad MENA", desc: "Conflicto MENA · Disrupción energética",
    prob: 0.38, risk: 85, color: "#EF4444",
    impactByRegion: {
      eu:   { interest_rates: 0.20, inflation_cpi: 0.75, fx: -0.12, commodities: 0.90, sovereign_yield: 0.30,  capital_flows: -0.45 },
      usa:  { interest_rates: 0.10, inflation_cpi: 0.55, fx: 0.25,  commodities: 0.90, sovereign_yield: 0.15,  capital_flows: 0.30 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.60, fx: 0.30,  commodities: 0.90, sovereign_yield: -0.10, capital_flows: -0.50 },
    }
  },
  eu_fragmentation: {
    label: "Fragmentación Europea", desc: "Tensiones soberanas · Spreads periféricos",
    prob: 0.20, risk: 72, color: "#8B5CF6",
    impactByRegion: {
      eu:   { interest_rates: 0.45, inflation_cpi: 0.30, fx: -0.20, commodities: 0.15, sovereign_yield: 0.85,  capital_flows: -0.70 },
      usa:  { interest_rates: 0.05, inflation_cpi: 0.10, fx: 0.35,  commodities: 0.10, sovereign_yield: -0.10, capital_flows: 0.55 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.05, fx: 0.15,  commodities: 0.05, sovereign_yield: -0.05, capital_flows: -0.20 },
    }
  },
  detente: {
    label: "Distensión Geopolítica", desc: "Acuerdos diplomáticos · Reducción de primas",
    prob: 0.08, risk: 28, color: "#10B981",
    impactByRegion: {
      eu:   { interest_rates: -0.20, inflation_cpi: -0.30, fx: 0.08,  commodities: -0.35, sovereign_yield: -0.40, capital_flows: 0.50 },
      usa:  { interest_rates: -0.10, inflation_cpi: -0.20, fx: -0.15, commodities: -0.35, sovereign_yield: -0.15, capital_flows: -0.10 },
      asia: { interest_rates: -0.05, inflation_cpi: -0.10, fx: -0.30, commodities: -0.35, sovereign_yield: -0.10, capital_flows: 0.65 },
    }
  },
};

const SECTORS = {
  global:      { label: "Multisectorial",      mult: 1.00 },
  real_estate: { label: "Real Estate", mult: 0.88 },
  financial:   { label: "Financiero",  mult: 1.15 },
  industrial:  { label: "Industrial",  mult: 0.92 },
  energy:      { label: "Energía",     mult: 1.08 },
};

const ASSETS = [
  "Deuda soberana core", "Renta fija High Yield", "Real estate prime",
  "Materias primas", "Equity exportador", "Efectivo / Money Market"
];

// Sensibilidad estimada de precio (%) por unidad de vector de impacto [-1,1].
// Modelo ilustrativo ZRC — no constituye proyección exacta de mercado.
// "fx" cambia de signo entre regiones porque EUR/USD y DXY suben cuando la
// divisa local SE FORTALECE, mientras que USD/CNY sube cuando el yuan SE
// DEBILITA — el coeficiente refleja ese efecto en el exportador local.
const ASSET_SENSITIVITY_BASE = {
  "Deuda soberana core":       { interest_rates: -9,  sovereign_yield: -11, capital_flows: 2  },
  "Renta fija High Yield":     { interest_rates: -6,  sovereign_yield: -7,  capital_flows: 4, inflation_cpi: -2 },
  "Real estate prime":         { interest_rates: -8,  sovereign_yield: -5,  capital_flows: 7  },
  "Materias primas":           { commodities: 12, inflation_cpi: 3 },
  "Efectivo / Money Market":   { interest_rates: 3, sovereign_yield: 1 },
};
const ASSET_SENSITIVITY_BY_REGION = {
  eu:   { ...ASSET_SENSITIVITY_BASE, "Equity exportador": { fx: -35, capital_flows: 4 } },
  usa:  { ...ASSET_SENSITIVITY_BASE, "Equity exportador": { fx: -35, capital_flows: 4 } },
  asia: { ...ASSET_SENSITIVITY_BASE, "Equity exportador": { fx: 35,  capital_flows: 4 } },
};

function estimatePriceImpact(asset, impactVector, region = "eu") {
  const sens = ASSET_SENSITIVITY_BY_REGION[region]?.[asset] || {};
  let total = 0;
  Object.entries(sens).forEach(([vk, coef]) => { total += (impactVector[vk] || 0) * coef; });
  return total;
}

// Mezcla de probabilidad de escenario ZRC (sin ajustar por el usuario) — es la
// misma que usa el Decision Engine por defecto (sector Global, sin overrides).
export const DEFAULT_WEIGHTS = Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.prob]));

// Overlay de riesgo soberano — reutiliza el mismo motor cuantitativo del
// Decision Engine (mix de escenarios ZRC, sector Global) para que Macro Pulse
// pueda reconciliar su señal de "recorte de tipos = bullish" con el riesgo de
// yield/spread prospectivo, en vez de tener dos vistas desconectadas para el
// mismo activo. Determinista — no depende de la llamada al motor de IA.
export function computeSovereignBondRiskImpact(region) {
  const vars = ECONOMIC_VARIABLES_BY_REGION[region] || ECONOMIC_VARIABLES_BY_REGION.eu;
  const impacts = {};
  Object.keys(vars).forEach(varKey => {
    let total = 0;
    Object.entries(SCENARIOS).forEach(([sk, sv]) => {
      total += (DEFAULT_WEIGHTS[sk] || 0) * (sv.impactByRegion[region]?.[varKey] || 0);
    });
    impacts[varKey] = total;
  });
  return estimatePriceImpact("Deuda soberana core", impacts, region);
}

export const SOVEREIGN_BOND_RISK_OVERLAY = {
  eu:  computeSovereignBondRiskImpact("eu"),
  usa: computeSovereignBondRiskImpact("usa"),
};

function riskLabel(v) {
  return v < 40 ? "BAJO" : v < 65 ? "MODERADO" : v < 80 ? "ELEVADO" : "CRÍTICO";
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const normalizeWeights = (weights) => {
  const total = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Math.max(0, Number(value) || 0) / total]));
};
const fmt   = (v, d = 2) => Number(v).toFixed(d);

// ── Mini Components ──────────────────────────────────────────────

function Pulse({ color = "#10B981", size = 8 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <span style={{
        width: size, height: size, borderRadius: "50%", background: color,
        boxShadow: `0 0 ${size}px ${color}80`,
        animation: "grml-pulse 2s ease-in-out infinite"
      }} />
    </span>
  );
}

function RiskGauge({ value, size = 120, label }) {
  const pct = clamp(value / 100, 0, 1);
  const angle = pct * 240 - 120;
  const c = pct < 0.4 ? "#10B981" : pct < 0.65 ? "#F59E0B" : "#EF4444";
  const r = size / 2 - 8;
  const arc = (s, e) => {
    const toRad = a => (a - 90) * Math.PI / 180;
    const cx = size / 2, cy = size / 2;
    const x1 = cx + r * Math.cos(toRad(s)), y1 = cy + r * Math.sin(toRad(s));
    const x2 = cx + r * Math.cos(toRad(e)), y2 = cy + r * Math.sin(toRad(e));
    return `M ${x1} ${y1} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <path d={arc(-120, 120)} fill="none" stroke="#16301f" strokeWidth={6} strokeLinecap="round" />
        <path d={arc(-120, angle)} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${c}80)`, transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }} />
        <text x={size / 2} y={size / 2 + 2} textAnchor="middle" fill={c}
          style={{ fontSize: size * 0.28, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {Math.round(value)}
        </text>
      </svg>
      {label && <div style={{ fontSize: 10, color: "#64748B", marginTop: -4, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>}
    </div>
  );
}

function MiniBar({ value, max = 1, color, width = 80 }) {
  const pct = clamp(Math.abs(value) / max * 100, 0, 100);
  const isNeg = value < 0;
  const col = color || (isNeg ? "#EF4444" : "#10B981");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: col, minWidth: 42, textAlign: "right" }}>
        {isNeg ? "" : "+"}{fmt(value)}
      </span>
      <div style={{ width, height: 4, background: "#0f1f14", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: col,
          transition: "width 0.6s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 6px ${col}80` }} />
      </div>
    </div>
  );
}

function SparkLine({ data, color = "#16A34A", w = 100, h = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}
        r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

// Heatmap correlación escenario × variable
function CorrelationHeatmap({ scenarios, scenarioWeights, economicVariables, region }) {
  const vars = Object.entries(economicVariables);
  const scens = Object.entries(scenarios);
  const cellW = 72, cellH = 36;
  const labelW = 140, labelH = 70;
  const W = labelW + scens.length * cellW + 8;
  const H = labelH + vars.length * cellH + 8;

  const col = (v) => {
    const abs = Math.abs(v);
    if (abs < 0.15) return "#16301f";
    return v > 0
      ? `rgba(239,68,68,${Math.min(0.9, abs * 0.9)})`
      : `rgba(16,185,129,${Math.min(0.9, abs * 0.9)})`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W, height: H, display: "block" }}>
        {/* Scenario headers */}
        {scens.map(([sk, sv], j) => (
          <g key={sk}>
            <rect x={labelW + j * cellW} y={0} width={cellW - 2} height={labelH - 4}
              fill={sv.color + "20"} rx={2} />
            <text x={labelW + j * cellW + cellW / 2} y={labelH / 2 - 8}
              textAnchor="middle" fill={sv.color} fontSize={9} fontFamily="monospace" fontWeight={600}>
              {sv.label.split(" ")[0]}
            </text>
            <text x={labelW + j * cellW + cellW / 2} y={labelH / 2 + 4}
              textAnchor="middle" fill={sv.color + "99"} fontSize={8} fontFamily="monospace">
              {(scenarioWeights[sk] * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {/* Var labels + cells */}
        {vars.map(([vk, vv], i) => (
          <g key={vk}>
            <text x={labelW - 6} y={labelH + i * cellH + cellH / 2 + 4}
              textAnchor="end" fill="#94A3B8" fontSize={10} fontFamily="monospace">
              {vv.label}
            </text>
            {scens.map(([sk, sv], j) => {
              const impact = sv.impactByRegion[region][vk] || 0;
              const weighted = impact * (scenarioWeights[sk] || 0);
              return (
                <g key={sk}>
                  <rect x={labelW + j * cellW} y={labelH + i * cellH}
                    width={cellW - 2} height={cellH - 2} fill={col(weighted)} rx={2} />
                  <text x={labelW + j * cellW + cellW / 2} y={labelH + i * cellH + cellH / 2 + 4}
                    textAnchor="middle" fill="#E2E8F0" fontSize={9} fontFamily="monospace" fontWeight={600}>
                    {weighted > 0.04 ? "↑" : weighted < -0.04 ? "↓" : "—"}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        {[["Impacto positivo (riesgo ↑)", "#EF4444"], ["Neutral", "#16301f"], ["Impacto negativo (riesgo ↓)", "#10B981"]].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
            <span style={{ width: 10, height: 10, background: c, display: "inline-block", borderRadius: 2 }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ZRC AI Engine ─────────────────────────────────────────────────
// Prompts, output schemas and provider configuration live in the Worker.
// The browser sends only bounded, aggregated signals.
async function callClaudeML({ scenario, riskScore, variables, mode, userText }) {
  const response = await fetch("/api/georisk-ml", {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    body: JSON.stringify({
      mode,
      riskScore,
      scenario: { label: scenario?.label, weight: scenario?.prob },
      variables,
      userText: userText || "",
    })
  });

  const bodyText = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
  let data;
  try { data = JSON.parse(bodyText); } catch (e) {
    throw new Error(`Bad JSON (${response.headers.get("content-type")}): ${bodyText.slice(0, 200)}`);
  }
  if (!data.result) throw new Error("Respuesta incompleta del motor ZRC");
  return { ...data.result, _meta: data.meta };
}

function AnalysisStamp({ result }) {
  const meta = result?._meta;
  if (!meta) return null;
  return <div style={{ margin: "10px 0", color: "#64748B", fontSize: 11, fontFamily: "monospace" }}>
    ZRC AI Engine · generado {new Date(meta.generated_at).toLocaleString("es-ES")} · sin consulta externa en esta ejecución
  </div>;
}

// ── Main Component ────────────────────────────────────────────────

const SECTION_GUIDES = {
  data: {
    title: "Consulta datos reales y su evolución",
    body: "Compara divisas con la última referencia diaria del BCE y hasta cinco años de observaciones. Cada dato tiene fuente y fecha. Los gráficos muestran valores publicados, sin generar un histórico artificial.",
    tip: "Consulta la fecha del dato. Las simulaciones siguen siendo supuestos y todavía no se recalibran con este histórico."
  },
  forecast: {
    title: "Del nivel observado al pronóstico de parámetros",
    body: "Consulta referencias fechadas y proyecciones a 30 y 90 días, con bandas de error histórico, cobertura por región y señales que conviene vigilar.",
    tip: "Comprueba la fecha de la referencia, el error histórico y los acontecimientos que pueden invalidar el pronóstico."
  },
  scenarios: {
    title: "Construye una mezcla de escenarios",
    body: "Cada control indica cuánto pesa una situación en el análisis. Los pesos se ajustan a un total de 100% para poder compararlos. Los valores de partida son referencias del modelo, no probabilidades verificadas.",
    tip: "Cambia un control cada vez y restablece los valores iniciales cuando quieras empezar de nuevo."
  },
  heatmap: {
    title: "Encuentra qué escenario afecta a cada variable",
    body: "Cada casilla cruza una situación con una variable, como inflación o tipos. El color y la cifra muestran la dirección y la intensidad que supone el modelo; no son correlaciones observadas en datos históricos.",
    tip: "Busca las casillas más marcadas y revisa qué supuesto las produce."
  },
  nlp: {
    title: "Pide a la IA que lea un texto que tú aportas",
    body: "Pega un titular o un fragmento. La IA puede resumirlo y sugerir escenarios, pero no verifica la fuente, no busca noticias externas y puede equivocarse. Las sugerencias no cambian tus pesos.",
    tip: "Verifica la noticia original y decide tú si quieres modificar el escenario."
  },
  decision: {
    title: "Obtén un borrador para debatir",
    body: "La IA organiza riesgos, oportunidades y posibles acciones según los supuestos actuales. No es una recomendación personalizada ni una instrucción para invertir; revisa cada punto y sus fuentes.",
    tip: "Úsalo como lista de preguntas para un análisis más completo."
  }
};

export default function GeoRiskML() {
  const [sector, setSector] = useState("global");
  const [region, setRegion] = useState("eu");
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const normalizedWeights = useMemo(() => normalizeWeights(weights), [weights]);
  const [tab, setTab] = useState("forecast");
  const sectionGuide = SECTION_GUIDES[tab];
  const [time, setTime] = useState(new Date());
  const [nlpText, setNlpText] = useState("");
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [decisionResult, setDecisionResult] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState("tariff_escalation");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const ECONOMIC_VARIABLES = ECONOMIC_VARIABLES_BY_REGION[region];
  const fxExporterSign = region === "asia" ? 1 : -1;

  const sectorMult = SECTORS[sector].mult;

  const isCustomized = useMemo(() =>
    Object.entries(weights).some(([k, v]) => Math.abs(v - DEFAULT_WEIGHTS[k]) > 0.005),
    [weights]
  );
  const resetWeights = () => setWeights({ ...DEFAULT_WEIGHTS });

  const computeImpact = useCallback((varKey) => {
    let total = 0;
    const normalizedWeights = normalizeWeights(weights);
    Object.entries(SCENARIOS).forEach(([sk, sv]) => {
      total += (normalizedWeights[sk] || 0) * (sv.impactByRegion[region]?.[varKey] || 0) * sectorMult;
    });
    return total;
  }, [weights, sectorMult, region]);

  const baseCompositeRisk = useMemo(() => {
    let r = 0;
    const normalizedWeights = normalizeWeights(weights);
    Object.entries(SCENARIOS).forEach(([k, v]) => { r += (normalizedWeights[k] || 0) * v.risk; });
    return r;
  }, [weights]);

  const compositeRisk = useMemo(() => clamp(baseCompositeRisk * sectorMult, 0, 100), [baseCompositeRisk, sectorMult]);
  const dominantScenario = useMemo(() => {
    const [key] = Object.entries(normalizedWeights).reduce(([bk, bv], [k, v]) => v > bv ? [k, v] : [bk, bv], ["tariff_escalation", -1]);
    return { key, ...SCENARIOS[key], prob: normalizedWeights[key] || 0 };
  }, [normalizedWeights]);

  const variableImpacts = useMemo(() => {
    return Object.fromEntries(
      Object.keys(ECONOMIC_VARIABLES).map(k => [k, computeImpact(k)])
    );
  }, [computeImpact, ECONOMIC_VARIABLES]);

  const assetImpacts = useMemo(() => {
    return ASSETS.map(asset => {
      const pct = estimatePriceImpact(asset, variableImpacts, region);
      const dir = pct > 1.5 ? "FAVORABLE" : pct < -1.5 ? "VULNERABLE" : "NEUTRAL";
      const col = pct > 1.5 ? "#10B981" : pct < -1.5 ? "#EF4444" : "#F59E0B";
      return { asset, pct, dir, col };
    });
  }, [variableImpacts, region]);

  const runNLP = async () => {
    if (!nlpText.trim()) return;
    setNlpLoading(true); setNlpResult(null);
    try {
      const result = await callClaudeML({ mode: "nlp", userText: nlpText, riskScore: compositeRisk, scenario: dominantScenario, variables: variableImpacts });
      // Keep model suggestions separate from analyst-controlled scenario weights.
      setNlpResult(result);
    } catch (e) {
      setNlpResult({ error: `Error NLP: ${e.message}` });
    } finally { setNlpLoading(false); }
  };

  const runDecision = async () => {
    setDecisionLoading(true); setDecisionResult(null);
    try {
      const result = await callClaudeML({ mode: "decision", riskScore: compositeRisk, variables: variableImpacts, scenario: dominantScenario });
      setDecisionResult(result);
    } catch (e) {
      setDecisionResult({ error: `Error en motor de decisión: ${e.message}` });
    } finally { setDecisionLoading(false); }
  };

  const riskColor = compositeRisk < 40 ? "#10B981" : compositeRisk < 65 ? "#F59E0B" : "#EF4444";
  const trajectoryColor = { ESCALATING: "#EF4444", STABLE: "#F59E0B", DECLINING: "#10B981" };

  const TABS = [
    
    { id: "forecast", label: "Pronóstico 30 / 90 días", icon: TrendingUp },
    { id: "scenarios", label: "Supuestos de escenario", icon: Radar },
    { id: "heatmap", label: "Relación escenario-variable", icon: Grid3x3 },
    { id: "nlp", label: "Analizar texto", icon: MessageSquare },
    { id: "decision", label: "Borrador de decisión IA", icon: Target },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#070f0a", color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes grml-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes grml-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes grml-scanline { from{top:-2px} to{top:100%} }
        @keyframes grml-gridPulse { 0%,100%{opacity:0.03} 50%{opacity:0.06} }
        @keyframes grml-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .grml-btn { transition: all 0.2s; }
        .grml-btn:hover { opacity:0.8; transform:translateY(-1px); }
        .grml input[type=range] { -webkit-appearance:none; height:3px; background:#16301f; border-radius:2px; outline:none }
        .grml input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#16A34A; cursor:pointer; box-shadow:0 0 8px #16A34A80 }
        .grml ::-webkit-scrollbar { width:4px }
        .grml ::-webkit-scrollbar-track { background:#0a1a12 }
        .grml ::-webkit-scrollbar-thumb { background:#14532d; border-radius:2px }
        .grml-loading { background: linear-gradient(90deg, #16301f 25%, #14532d 50%, #16301f 75%); background-size:200% 100%; animation:grml-shimmer 1.5s infinite; border-radius:4px; }
        .grml-card {
          background: linear-gradient(180deg, #0d1f16 0%, #0a1810 100%);
          border: 1px solid #16301f; border-radius: 10px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.5);
        }
        .grml-card--interactive { cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .grml-card--interactive:hover { transform: translateY(-2px); box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 30px -14px rgba(0,0,0,0.65); }
        .grml-tab { transition: background 0.2s ease, color 0.2s ease; }
        .grml-tab:hover { color: #CBD5E1 !important; background: #ffffff06; }
        .grml-reset:hover { border-color: #16A34A !important; color: #4ADE80 !important; }
        .grml-score-row { display:grid; grid-template-columns: auto 1fr auto auto; }
        .grml-two-col { display:grid; grid-template-columns: 1fr 1fr; }
        .grml-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .grml-table-inner { min-width: 640px; }
        @media (max-width: 780px) {
          .grml-score-row { grid-template-columns: 1fr; justify-items: center; text-align: center; }
          .grml-score-row > div { width: 100%; }
          .grml-two-col { grid-template-columns: 1fr; }
          .grml-snapshot-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Grid + scan */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"linear-gradient(#16301f10 1px,transparent 1px),linear-gradient(90deg,#16301f10 1px,transparent 1px)", backgroundSize:"40px 40px", animation:"grml-gridPulse 4s ease-in-out infinite" }} />
      <div style={{ position:"fixed", left:0, right:0, height:2, zIndex:1, background:"linear-gradient(90deg,transparent,#16A34A20,transparent)", animation:"grml-scanline 8s linear infinite", pointerEvents:"none" }} />

      <div className="grml" style={{ position:"relative", zIndex:2, maxWidth:1400, margin:"0 auto", padding:"0 20px" }}>

        {/* ── HEADER ── */}
        <header style={{ padding:"20px 0 12px", borderBottom:"1px solid #16301f" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:28, height:28, borderRadius:4, background:"linear-gradient(135deg,#14532d,#16A34A)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, letterSpacing:1, color:"#fff", fontFamily:"'JetBrains Mono',monospace" }}>ZR</div>
                <span style={{ fontSize:12, letterSpacing:3, textTransform:"uppercase", color:"#64748B", fontFamily:"'JetBrains Mono',monospace" }}>ZENITH RISE CAPITAL</span>
                <span style={{ padding:"2px 8px", background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.35)", borderRadius:3, fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:"#A78BFA", letterSpacing:1 }}>ML ENGINE v1.0</span>
              </div>
              <h1 style={{ display:"flex", alignItems:"center", gap:10, fontSize:23, fontWeight:700, margin:0, letterSpacing:-0.5, color:"#F8FAFC" }}>
                <Sparkles size={21} color="#4ADE80" strokeWidth={2} />
                GeoRisk · Escenarios + IA
              </h1>
              <div style={{ fontSize:12, color:"#475569", marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>
                Perspectiva predictiva y análisis geopolítico · Calesius Global SL
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end", marginBottom:4 }}>
                <Pulse color="#A78BFA" />
                <span style={{ fontSize:11, color:"#A78BFA", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1 }}>IA BAJO DEMANDA</span>
                <span style={{ margin:"0 4px", color:"#16301f" }}>|</span>
                <Pulse color="#10B981" />
                <span style={{ fontSize:11, color:"#A78BFA", fontFamily:"'JetBrains Mono',monospace" }}>ANÁLISIS BAJO DEMANDA</span>
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:19, fontWeight:600, color:"#CBD5E1" }}>
                {time.toLocaleTimeString("es-ES", { hour12:false })}
              </div>
              <div style={{ fontSize:11, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>
                {time.toLocaleDateString("es-ES", { weekday:"short", day:"2-digit", month:"short", year:"numeric" }).toUpperCase()} · CET
              </div>
            </div>
          </div>
        </header>

        {/* ── DIFERENCIADOR: QUÉ APORTA GEORISK ML SOBRE EL DASHBOARD ── */}
        <div className="grml-card" style={{
          background: "rgba(139,92,246,0.06)",
          borderLeft: "3px solid #A78BFA", padding: "16px 20px", margin: "20px 0",
        }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#A78BFA", letterSpacing: 1, marginBottom: 6 }}>
            POR QUÉ GEORISK ML — Y NO SOLO EL DASHBOARD
          </div>
          <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, maxWidth: 760 }}>
El GeoRisk Dashboard reúne observaciones, fuentes y escenarios. <b>GeoRisk ML añade pronósticos de parámetros a 30 y 90 días</b>, anclados en referencias oficiales fechadas y contrastados con errores históricos. Además permite explorar hipótesis y analizar texto con IA. Cada previsión indica su cobertura, fundamento y señales que podrían invalidarla.
          </div>
        </div>
        <div role="note" style={{ margin: "0 0 16px", padding: "12px 16px", border: "1px solid #7C5A1B", borderLeft: "3px solid #F59E0B", borderRadius: 8, background: "#2A2112", color: "#FDE68A", fontSize: 12, lineHeight: 1.6 }}>
          <b>Observaciones, pronósticos y supuestos.</b> Los pronósticos usan las series oficiales disponibles. La puntuación y las simulaciones de escenarios conservan su metodología propia: no son probabilidades ni sustituyen la previsión de cada parámetro. Las conexiones sin cobertura se identifican expresamente.
        </div>

        {tab !== "forecast" && <>
        {/* ── RESUMEN PARA COMITÉ DE INVERSIÓN ── */}
        {(() => {
          const top = [...assetImpacts].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
          return (
            <div className="grml-card" style={{
              borderLeft: "3px solid #F59E0B", padding: "16px 20px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#F59E0B", letterSpacing: 1, marginBottom: 8 }}>
                RESUMEN PARA COMITÉ DE INVERSIÓN
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#CBD5E1", lineHeight: 1.9 }}>
                <li>Riesgo del escenario mundial <b>{riskLabel(compositeRisk)}</b> ({fmt(compositeRisk, 1)}/100), mix {isCustomized ? "personalizado por el analista" : "pesos de referencia del modelo"}.</li>
                <li>Escenario dominante: <b style={{ color: dominantScenario.color }}>{dominantScenario.label}</b> ({(normalizedWeights[dominantScenario.key] * 100).toFixed(0)}% del peso normalizado).</li>
                {top && (
                  <li>Mayor sensibilidad simulada: <b>{top.asset}</b> · <b style={{ color: top.col }}>{top.dir}</b>. Magnitud y reglas internas no publicadas.</li>
                )}
                <li>Consulta <b>Pronóstico 30 / 90 días</b> para previsiones fundadas en observaciones, o <b>GENERAR BORRADOR</b> en un borrador para ordenar riesgos y oportunidades, siempre con revisión humana.</li>
              </ul>
            </div>
          );
        })()}

        <details className="grml-card" style={{ padding: "16px 20px", marginBottom: 20, color: "#CBD5E1" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Metodología, versión y vigencia</summary>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>El score resume la mezcla de escenarios mundiales y la exposición sectorial seleccionada. La región determina la transmisión a variables económicas y señales de activos; no modifica el score. Es un indicador de escenario, no una puntuación de riesgo regional ni una probabilidad.</p>
          <p style={{ fontSize: 12, lineHeight: 1.7 }}>Las ponderaciones internas, sensibilidades, transformaciones y reglas de decisión forman parte de la metodología propietaria de ZRC y no se publican. Los niveles base son anclas internas del modelo; los datos observados, con fecha y fuente, se consultan separadamente en <b>Datos observados</b>.</p>
          <p style={{ fontSize: 12, color: "#94A3B8" }}>Versión pública: {MODEL_VERSION} · revisión metodológica: {MODEL_REVIEW_DATE}. El reloj de cabecera no indica actualización de datos.</p>
        </details>

        {/* ── SCORE BAR ── */}
        <div className="grml-card grml-score-row" style={{ gap:20, padding:"20px 24px", margin:"0 0 20px", alignItems:"center" }}>
          <div style={{ textAlign: "center" }}>
            <RiskGauge value={compositeRisk} size={110} label="Riesgo del escenario" />
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>ÁMBITO MUNDIAL</div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#64748B", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, marginRight:4 }}>REGIÓN DE IMPACTO:</span>
              {Object.entries(REGIONS).map(([k, v]) => (
                <button key={k} className="grml-btn" onClick={() => setRegion(k)} style={{
                  padding:"4px 10px", borderRadius:3, border:"1px solid",
                  borderColor: region===k ? "#A78BFA" : "#16301f",
                  background: region===k ? "#A78BFA15" : "transparent",
                  color: region===k ? "#C4B5FD" : "#64748B",
                  fontSize:12, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace"
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#64748B", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, marginRight:4 }}>EXPOSICIÓN SECTORIAL:</span>
              {Object.entries(SECTORS).map(([k, v]) => (
                <button key={k} className="grml-btn" onClick={() => setSector(k)} style={{
                  padding:"4px 10px", borderRadius:3, border:"1px solid",
                  borderColor: sector===k ? "#16A34A" : "#16301f",
                  background: sector===k ? "#16A34A15" : "transparent",
                  color: sector===k ? "#4ADE80" : "#64748B",
                  fontSize:12, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace"
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ fontSize:10, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>
              <strong style={{ color: "#CBD5E1" }}>Impactos: {REGIONS[region].label} · {SECTORS[sector].label}.</strong><br />La región cambia las variables y señales de activos. El score mide el escenario mundial con la exposición sectorial elegida; se mantiene al cambiar de región.
            </div>

            {/* Risk bar */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>RIESGO DEL ESCENARIO · ÁMBITO MUNDIAL</span>
                <span style={{ fontSize:10, color:riskColor, fontFamily:"monospace" }}>{compositeRisk.toFixed(1)}/100</span>
              </div>
              <div style={{ height:6, background:"#0f1f14", borderRadius:3, overflow:"hidden" }}>
                <div style={{ width:`${compositeRisk}%`, height:"100%", background:`linear-gradient(90deg, #10B981, ${riskColor})`, borderRadius:3, transition:"width 0.8s cubic-bezier(.4,0,.2,1)", boxShadow:`0 0 8px ${riskColor}60` }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:3, fontSize:9, color:"#475569", fontFamily:"monospace" }}>
                <span>BAJO</span><span>MODERADO</span><span>ELEVADO</span><span>CRÍTICO</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", maxWidth:270 }}>
            <div style={{ fontSize:10, color:"#64748B", letterSpacing:1, marginBottom:4 }}>AJUSTE SECTORIAL · METODOLOGÍA ZRC</div>
            <div style={{ fontSize:18, fontWeight:600, color: sectorMult>1 ? "#F59E0B" : "#10B981" }}>{sectorMult > 1 ? "AMPLIFICADOR" : sectorMult < 1 ? "AMORTIGUADOR" : "NEUTRAL"}</div>
            <div style={{ fontSize:10, color:"#64748B", lineHeight:1.5, marginTop:4 }}>Aplicado internamente según el sector seleccionado. Parámetros y reglas no publicados.</div>
          </div>

          <div style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>
            <div style={{ fontSize:10, color:"#64748B", letterSpacing:1, marginBottom:4 }}>ESCENARIO DOMINANTE</div>
            <div style={{ fontSize:13, fontWeight:600, color: dominantScenario.color }}>{dominantScenario.label}</div>
            <div style={{ fontSize:11, color:"#475569" }}>{(normalizedWeights[dominantScenario.key]*100).toFixed(0)}% del peso · no probabilidad</div>
          </div>
        </div>

        </>}
        {/* ── TABS ── */}
        <div className="grml-card" style={{ display:"flex", flexWrap:"wrap", gap:2, padding:5, marginBottom:20 }}>
          {TABS.map(t => (
            <button key={t.id} className="grml-tab" onClick={() => setTab(t.id)} style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              flex:"1 1 auto", padding:"9px 16px", border:"none", borderRadius:7,
              background: tab===t.id ? "linear-gradient(135deg, #14532d, #1a6b3a)" : "transparent",
              boxShadow: tab===t.id ? "0 4px 14px -6px #16A34A60, 0 0 0 1px #16A34A40 inset" : "none",
              color: tab===t.id ? "#F1F5F9" : "#64748B",
              fontSize:13, fontWeight:600, cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:0.5, whiteSpace:"nowrap"
            }}>
              <t.icon size={13} strokeWidth={2.2} />
              {t.label}
            </button>
          ))}
        </div>

        <div role="note" aria-live="polite" style={{ padding: "14px 18px", margin: "0 0 18px", border: "1px solid #28543a", borderLeft: "3px solid #4ADE80", borderRadius: 8, background: "#0d1f16", color: "#CBD5E1" }}>
          <div style={{ fontSize: 10, color: "#4ADE80", fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>EN SENCILLO</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{sectionGuide.title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#94A3B8" }}>{sectionGuide.body}</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6, color: "#CBD5E1" }}><b>Consejo:</b> {sectionGuide.tip}</div>
        </div>

        {/* ═══════════════ TAB: PREDICTIVO ML ═══════════════ */}
        {tab === "forecast" && <GeoRiskPredictiveOutlook region={region} onRegionChange={setRegion} />}

        {tab === "scenarios" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div className="grml-card" style={{
              borderLeft:"3px solid #16A34A", padding:"16px 20px", marginBottom:20,
              display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap",
            }}>
              <div style={{ fontSize:13, color:"#94A3B8", lineHeight:1.7, maxWidth:680 }}>
                <span style={{ color:"#CBD5E1" }}>Los valores iniciales son pesos de escenario de referencia, no probabilidades calibradas. En los cálculos, se normalizan para sumar 100%.</span>
                {" "}Deslízalo para explorar tu propio escenario, o deja que el NLP Analyzer lo ajuste automáticamente al leer una noticia.
                {" "}Queda marcado como "AJUSTADO" con el valor ZRC original visible; usa ↺ para devolver el círculo a su posición.
              </div>
              {isCustomized && (
                <button className="grml-reset" onClick={resetWeights} style={{
                  flexShrink:0, display:"flex", alignItems:"center", gap:6,
                  padding:"7px 14px", background:"#16A34A12", border:"1px solid #16A34A60",
                  color:"#4ADE80", fontSize:11, fontFamily:"monospace", letterSpacing:1, cursor:"pointer",
                  borderRadius:6, whiteSpace:"nowrap", transition:"all 0.2s",
                }}>
                  <RotateCcw size={12} /> RESTABLECER VALORES ZRC
                </button>
              )}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))", gap:16 }}>
              {Object.entries(SCENARIOS).map(([sk, sv]) => {
                const isModified = Math.abs(weights[sk] - DEFAULT_WEIGHTS[sk]) > 0.005;
                return (
                <div key={sk} className="grml-card grml-card--interactive" onClick={() => setActiveScenario(sk)} style={{
                  background: activeScenario===sk ? "linear-gradient(180deg, #0f2419 0%, #0a1810 100%)" : undefined,
                  borderColor: activeScenario===sk ? sv.color+"60" : undefined,
                  padding:18, position:"relative", overflow:"hidden"
                }}>
                  {activeScenario===sk && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${sv.color},transparent)` }} />}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:sv.color, marginBottom:2 }}>{sv.label}</div>
                      <div style={{ fontSize:11, color:"#64748B", fontFamily:"monospace" }}>{sv.desc}</div>
                    </div>
                    <RiskGauge value={sv.risk} size={56} />
                  </div>
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:11, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>PROBABILIDAD</span>
                        <button
                          onClick={e => { e.stopPropagation(); setWeights(prev => ({ ...prev, [sk]: DEFAULT_WEIGHTS[sk] })); }}
                          title={`Dejar en el nivel ZRC (${(DEFAULT_WEIGHTS[sk]*100).toFixed(0)}%) sin arrastrar`}
                          disabled={!isModified}
                          style={{
                            display:"flex", alignItems:"center",
                            background: isModified ? "#16A34A15" : "transparent",
                            border: `1px solid ${isModified ? "#16A34A60" : "#16301f60"}`,
                            color: isModified ? "#4ADE80" : "#334155",
                            borderRadius:4, padding:"3px 5px", lineHeight:1,
                            cursor: isModified ? "pointer" : "default", flexShrink: 0,
                          }}
                        ><RotateCcw size={11} /></button>
                      </div>
                      <span style={{ fontSize:15, fontWeight:700, color: isModified ? "#F59E0B" : sv.color, fontFamily:"monospace" }}>{(weights[sk]*100).toFixed(0)}%</span>
                    </div>
                    {isModified && (
                      <div style={{ marginBottom:4 }}>
                        <span style={{ fontSize:10, fontFamily:"monospace", color:"#F59E0B", background:"#F59E0B15", border:"1px solid #F59E0B30", borderRadius:2, padding:"1px 5px" }}>
                          AJUSTADO · ZRC: {(DEFAULT_WEIGHTS[sk]*100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace", marginBottom:4 }}>
                      Desliza el círculo, o pulsa ↺ — el círculo en sombra marca el nivel estimado por ZRC
                    </div>
                    <div style={{ position:"relative", height:12, display:"flex", alignItems:"center" }}>
                      <div title={`Nivel ZRC: ${(DEFAULT_WEIGHTS[sk]*100).toFixed(0)}%`} style={{
                        position:"absolute", left:`${(DEFAULT_WEIGHTS[sk] * 100 / 80) * 100}%`, top:"50%",
                        width:13, height:13, borderRadius:"50%",
                        border:`2px solid ${isModified ? "#94A3B8" : sv.color}`,
                        background: isModified ? "rgba(148,163,184,0.15)" : `${sv.color}25`,
                        transform:"translate(-50%, -50%)", pointerEvents:"none", zIndex:1,
                      }} />
                      <input type="range" min={0} max={80} value={weights[sk]*100}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setWeights(prev => ({ ...prev, [sk]:parseInt(e.target.value)/100 }))}
                        style={{ width:"100%", accentColor: isModified ? "#F59E0B" : sv.color, position:"relative", zIndex:2 }}
                      />
                    </div>
                  </div>
                  {activeScenario===sk && (
                    <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${sv.color}20` }}>
                      <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>MATRIZ DE TRANSMISIÓN · METODOLOGÍA PROPIETARIA</div>
                      {Object.entries(sv.impactByRegion[region]).map(([vk, vi]) => {
                        const ev = ECONOMIC_VARIABLES[vk];
                        return (
                          <div key={vk} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0" }}>
                            <div>
                              <div style={{ fontSize:12, color:"#94A3B8" }}>{ev?.label}</div>
                              <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace" }}>
                                Nivel base interno: {fmt(ev?.base, ev?.decimals ?? 2)}{ev?.unit} · rev. {MODEL_REVIEW_DATE}
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span title="No hay serie histórica conectada" style={{ fontSize: 10, color: "#64748B" }}>sin serie</span>
                              <span style={{ fontSize:10, fontFamily:"monospace", color:sv.color }}>{vi > 0.1 ? "ALCISTA" : vi < -0.1 ? "BAJISTA" : "NEUTRA"}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, margin:"10px 0 6px" }}>
                        SUPUESTO ZRC · IMPACTO SIMULADO EN PRECIOS (sin horizonte validado) · {REGIONS[region].label}
                      </div>
                      {ASSETS.map(a => {
                        const pct = estimatePriceImpact(a, sv.impactByRegion[region], region);
                        const c = pct > 0.5 ? "#10B981" : pct < -0.5 ? "#EF4444" : "#64748B";
                        return (
                          <div key={a} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0" }}>
                            <span style={{ fontSize:12, color:"#94A3B8" }}>{a}</span>
                            <span style={{ fontSize:11, fontFamily:"monospace", fontWeight:700, color:c }}>{pct > 0.5 ? "FAVORABLE" : pct < -0.5 ? "VULNERABLE" : "NEUTRAL"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: CORRELACIONES ═══════════════ */}
        {tab === "heatmap" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div className="grml-card" style={{ padding:20 }}>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>QUÉ CAMBIA CON CADA ESCENARIO</div>
                <div style={{ fontSize:12, color:"#94A3B8" }}>El color y la flecha muestran dirección e intensidad relativa; los coeficientes internos no se publican.</div>
              </div>
              <CorrelationHeatmap scenarios={SCENARIOS} scenarioWeights={normalizedWeights} economicVariables={ECONOMIC_VARIABLES} region={region} />
            </div>

            {/* Weighted impacts table */}
            <div className="grml-card grml-table-scroll" style={{ marginTop:12 }}>
              <div className="grml-table-inner">
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"10px 16px", background:"#0d1f16", borderBottom:"1px solid #16301f", fontSize:11, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                  <span>VARIABLE</span><span style={{textAlign:"right"}}>SEÑAL</span><span style={{textAlign:"right"}}>NIVEL BASE</span><span style={{textAlign:"right"}}>NIVEL SIMULADO*</span>
                </div>
                {Object.entries(ECONOMIC_VARIABLES).map(([k, v], i) => {
                  const imp = computeImpact(k);
                  const proj = v.base + imp * v.vol * 5;
                  const c = imp > 0.1 ? "#EF4444" : imp < -0.1 ? "#10B981" : "#94A3B8";
                  return (
                    <div key={k} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"12px 16px", borderBottom:"1px solid #16301f30", alignItems:"center", background:i%2?"#0a1810":"#0c1a12" }}>
                      <div>
                        <div style={{ fontSize:13, color:"#CBD5E1" }}>{v.label}</div>
                        <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace", letterSpacing:"0.04em", marginTop:2 }}>Referencia interna · revisada {MODEL_REVIEW_DATE}</div>
                      </div>
                      <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:11, fontWeight:700, color:c }}>{imp > 0.1 ? "ALCISTA" : imp < -0.1 ? "BAJISTA" : "NEUTRA"}</span>
                      <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:13, color:"#64748B" }}>{fmt(v.base, v.decimals ?? 2)}{v.unit}</span>
                      <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:14, fontWeight:600, color:c }}>{fmt(proj, v.decimals ?? 2)}{v.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Asset price impact examples */}
            <div className="grml-card grml-table-scroll" style={{ marginTop:12 }}>
              <div className="grml-table-inner">
                <div style={{ padding:"10px 16px", background:"#0d1f16", borderBottom:"1px solid #16301f", fontSize:11, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                  RESULTADO DEL MODELO · IMPACTO SIMULADO EN ACTIVOS
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr", padding:"10px 16px", background:"#0d1f16", borderBottom:"1px solid #16301f", fontSize:11, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                  <span>CLASE DE ACTIVO</span><span style={{textAlign:"right"}}>EXPOSICIÓN SIMULADA</span>
                </div>
                {assetImpacts.map((a, i) => (
                  <div key={a.asset} style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr", padding:"12px 16px", borderBottom:"1px solid #16301f30", alignItems:"center", background:i%2?"#0a1810":"#0c1a12" }}>
                    <span style={{ fontSize:13, color:"#CBD5E1" }}>{a.asset}</span>
                    <span style={{ textAlign:"right" }}>
                      <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, letterSpacing:1, color:a.col, padding:"2px 8px", borderRadius:2, background:`${a.col}15`, border:`1px solid ${a.col}30` }}>{a.dir}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: NLP ANALYZER ═══════════════ */}
        {tab === "nlp" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div className="grml-card" style={{ borderColor:"rgba(139,92,246,0.25)", padding:20 }}>
              <div style={{ fontSize:11, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>ANÁLISIS DE TEXTO — ASISTENTE IA</div>
              <div style={{ fontSize:12, color:"#94A3B8", marginBottom:14 }}>Análisis IA del texto pegado. Las sugerencias no cambian los pesos; revísalas antes de incorporarlas.</div>
              <textarea value={nlpText} onChange={e => setNlpText(e.target.value)}
                placeholder="Pegue aquí un titular, noticia o briefing geopolítico para análisis predictivo de riesgo..."
                style={{ width:"100%", height:120, background:"#070f0a", border:"1px solid #16301f", borderRadius:4, padding:14, color:"#CBD5E1", fontSize:14, fontFamily:"'JetBrains Mono',monospace", resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" }}
              />
              <button className="grml-btn" onClick={runNLP} disabled={nlpLoading} style={{
                marginTop:10, padding:"9px 24px", background: nlpLoading ? "#16301f" : "linear-gradient(135deg,#4c1d95,#7c3aed)",
                border:"1px solid rgba(139,92,246,0.4)", borderRadius:4, color:"#fff",
                fontSize:12, fontWeight:600, fontFamily:"monospace", cursor: nlpLoading ? "not-allowed" : "pointer", letterSpacing:1
              }}>
                {nlpLoading ? "⏳ ANALIZANDO..." : "⚡ ANALIZAR CON ML"}
              </button>

              {nlpLoading && (
                <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:8 }}>
                  {[90, 70, 80, 60].map((w, i) => <div key={i} className="grml-loading" style={{ height:16, width:`${w}%` }} />)}
                </div>
              )}

              {nlpResult && !nlpLoading && <AnalysisStamp result={nlpResult} />}
                {nlpResult && !nlpLoading && (
                <div style={{ marginTop:20, animation:"grml-fadeIn 0.4s ease" }}>
                  {nlpResult.error ? (
                    <div style={{ color:"#EF4444", fontFamily:"monospace", fontSize:13 }}>{nlpResult.error}</div>
                  ) : (
                    <>
                      {/* Score + sentiment */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                        {[
                          ["RISK SCORE", nlpResult.risk_score, nlpResult.risk_score > 60 ? "#EF4444" : nlpResult.risk_score > 35 ? "#F59E0B" : "#10B981"],
                          ["SENTIMENT", nlpResult.sentiment, nlpResult.sentiment==="BEARISH" ? "#EF4444" : nlpResult.sentiment==="BULLISH" ? "#10B981" : "#F59E0B"],
                          ["VALIDACIÓN", "No calibrada", "#A78BFA"]
                        ].map(([label, val, col]) => (
                          <div key={label} style={{ textAlign:"center", padding:"12px", background:"#0d1f16", borderRadius:4 }}>
                            <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>{label}</div>
                            <div style={{ fontSize:25, fontWeight:700, color:col, fontFamily:"monospace" }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div style={{ padding:"12px 16px", background:"#0d1f1660", borderLeft:"2px solid #A78BFA", borderRadius:4, marginBottom:14 }}>
                        <div style={{ fontSize:10, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>ANÁLISIS ML</div>
                        <div style={{ fontSize:13, color:"#CBD5E1", lineHeight:1.6 }}>{nlpResult.summary}</div>
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        {/* Entities */}
                        {nlpResult.key_entities?.length > 0 && (
                          <div>
                            <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>ENTIDADES DETECTADAS</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                              {nlpResult.key_entities.map((e, i) => (
                                <span key={i} style={{ padding:"3px 8px", borderRadius:3, fontSize:12, fontFamily:"monospace", background:"rgba(22,163,74,0.12)", color:"#4ADE80", border:"1px solid rgba(22,163,74,0.3)" }}>{e}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Implications */}
                        {nlpResult.investment_implications?.length > 0 && (
                          <div>
                            <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>IMPLICACIONES DE INVERSIÓN</div>
                            {nlpResult.investment_implications.map((imp, i) => (
                              <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", fontSize:12, color:"#94A3B8", marginBottom:5 }}>
                                <span style={{ width:4, height:4, borderRadius:"50%", background:"#A78BFA", marginTop:5, flexShrink:0, display:"inline-block" }} />
                                {imp}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Scenario match */}
                      {nlpResult.scenario_match && (
                        <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:10, color:"#64748B", fontFamily:"monospace" }}>ESCENARIO MAPEADO:</span>
                          <span style={{ fontSize:11, fontFamily:"monospace", color:SCENARIOS[nlpResult.scenario_match]?.color || "#94A3B8", padding:"2px 8px", background:`${SCENARIOS[nlpResult.scenario_match]?.color || "#94A3B8"}15`, border:`1px solid ${SCENARIOS[nlpResult.scenario_match]?.color || "#94A3B8"}30`, borderRadius:3 }}>
                            {SCENARIOS[nlpResult.scenario_match]?.label || nlpResult.scenario_match}
                          </span>
                          <span style={{ fontSize:10, color:"#475569", fontFamily:"monospace" }}>— sugerencia IA; pesos sin cambios</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: DECISION ENGINE ═══════════════ */}
        {tab === "decision" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div className="grml-card" style={{ borderColor:"rgba(139,92,246,0.25)", padding:20, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:11, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>BORRADOR DE ANÁLISIS IA</div>
                  <div style={{ fontSize:12, color:"#94A3B8" }}>Hipótesis de exposición basadas en los supuestos del simulador</div>
                </div>
                <button className="grml-btn" onClick={runDecision} disabled={decisionLoading} style={{
                  padding:"8px 18px", background: decisionLoading ? "#16301f" : "linear-gradient(135deg,#134e4a,#059669)",
                  border:"1px solid rgba(16,185,129,0.3)", borderRadius:4, color:"#fff",
                  fontSize:11, fontFamily:"monospace", cursor: decisionLoading ? "not-allowed" : "pointer", letterSpacing:1
                }}>
                  {decisionLoading ? "PROCESANDO..." : "⚡ GENERAR BORRADOR"}
                </button>
              </div>

              {/* Current risk snapshot */}
              <div className="grml-snapshot-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
                {[
                  ["RIESGO", `${compositeRisk.toFixed(0)}/100`, riskColor],
                  ["ESCENARIO DOM.", dominantScenario.label?.split(" ")[0], dominantScenario.color],
                  ["SECTOR", SECTORS[sector].label, "#4ADE80"],
                  ["AJUSTE", sectorMult > 1 ? "AMPLIFICA" : sectorMult < 1 ? "AMORTIGUA" : "NEUTRAL", sectorMult>1?"#F59E0B":"#10B981"],
                ].map(([label, val, col]) => (
                  <div key={label} style={{ padding:"10px 12px", background:"#0d1f16", borderRadius:4, borderLeft:`2px solid ${col}40` }}>
                    <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:col, fontFamily:"monospace" }}>{val}</div>
                  </div>
                ))}
              </div>

              {!decisionResult && !decisionLoading && (
                <div style={{ padding:"24px 0", textAlign:"center", color:"#475569", fontSize:13, fontFamily:"monospace" }}>
                  La IA organizará vulnerabilidades y preguntas para revisar a partir de los supuestos seleccionados
                </div>
              )}

              {decisionLoading && (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[85, 65, 75, 55, 80, 60].map((w, i) => <div key={i} className="grml-loading" style={{ height:14, width:`${w}%` }} />)}
                </div>
              )}

              {decisionResult && !decisionLoading && <AnalysisStamp result={decisionResult} />}
                {decisionResult && !decisionLoading && (
                <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
                  {decisionResult.error ? (
                    <div style={{ color:"#EF4444", fontFamily:"monospace", fontSize:13 }}>{decisionResult.error}</div>
                  ) : (
                    <>
                      {/* Stance */}
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
                        {[
                          { s:"RISK_OFF", l:"RISK OFF", c:"#EF4444" },
                          { s:"NEUTRAL",  l:"NEUTRAL",  c:"#F59E0B" },
                          { s:"RISK_ON",  l:"RISK ON",  c:"#10B981" }
                        ].map(({ s, l, c }) => (
                          <div key={s} style={{ padding:"8px 16px", borderRadius:4, border:`1px solid ${c}${decisionResult.portfolio_stance===s?"90":"20"}`, background:`${c}${decisionResult.portfolio_stance===s?"20":"08"}`, opacity: decisionResult.portfolio_stance===s ? 1 : 0.4 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:c, fontFamily:"monospace", letterSpacing:1 }}>{l}</div>
                          </div>
                        ))}
                        <span style={{ fontSize:12, color:"#94A3B8", fontStyle:"italic" }}>{decisionResult.macro_regime}</span>
                      </div>

                      {/* Tactical recommendations */}
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>SUGERENCIAS PARA REVISAR</div>
                        {decisionResult.tactical_recommendations?.map((rec, i) => {
                          const cc = rec.conviction==="HIGH" ? "#EF4444" : rec.conviction==="MEDIUM" ? "#F59E0B" : "#64748B";
                          return (
                            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, alignItems:"center", padding:"10px 12px", background: i%2 ? "#0a1810" : "#0d1f16", borderRadius:4, marginBottom:4 }}>
                              <div>
                                <div style={{ fontSize:13, color:"#CBD5E1", marginBottom:2 }}>{rec.action}</div>
                                <div style={{ fontSize:11, color:"#64748B" }}>{rec.rationale}</div>
                              </div>
                              <span style={{ fontSize:10, fontFamily:"monospace", color:"#4ADE80", background:"rgba(22,163,74,0.12)", padding:"2px 6px", borderRadius:2, whiteSpace:"nowrap" }}>{rec.timeframe}</span>
                              <span style={{ fontSize:10, fontFamily:"monospace", color:cc, background:`${cc}15`, padding:"2px 6px", borderRadius:2, border:`1px solid ${cc}30`, whiteSpace:"nowrap" }}>{rec.conviction}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        {[["RIESGOS CLAVE", decisionResult.key_risks, "#EF4444"], ["OPORTUNIDADES", decisionResult.key_opportunities, "#10B981"]].map(([label, items, col]) => (
                          <div key={label}>
                            <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>{label}</div>
                            {items?.map((item, i) => (
                              <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", fontSize:12, color:"#94A3B8", marginBottom:5 }}>
                                <span style={{ width:4, height:4, borderRadius:"50%", background:col, marginTop:5, flexShrink:0, display:"inline-block" }} />
                                {item}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding:12, background:"#0d1f1660", borderRadius:4, border:"1px dashed #16301f80", fontSize:11, color:"#475569", fontFamily:"monospace", lineHeight:1.6 }}>
              ⚠ DISCLAIMER: Las señales generadas por ZRC AI Engine son hipótesis aplicadas al perfil cuantitativo seleccionado. No constituyen asesoramiento de inversión regulado. Consulte con un asesor financiero cualificado antes de ejecutar decisiones de inversión.
            </div>
          </div>
        )}

        <footer style={{ padding:"20px 0", marginTop:30, borderTop:"1px solid #16301f", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:11, color:"#475569", fontFamily:"monospace", lineHeight:1.6 }}>
            © 2026 Zenith Rise Capital · Calesius Global SL · Madrid, España
            <br />GeoRisk ML · Pronósticos 30 / 90 días · Referencias oficiales fechadas · IA de escenarios bajo demanda
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>zenithrisecapital.com</span>
            <span style={{ padding:"3px 8px", borderRadius:3, fontSize:10, fontFamily:"monospace", letterSpacing:1, background:"rgba(139,92,246,0.12)", color:"#A78BFA", border:"1px solid rgba(139,92,246,0.25)" }}>IA BAJO DEMANDA</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
