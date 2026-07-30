import { useState, useEffect, useCallback, useMemo, useId } from "react";
import {
  Radar, Activity, MessageSquare, PieChart, RotateCcw,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Radio,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// GEORISK INTELLIGENCE SYSTEM — Zenith Rise Capital
// Ruta sugerida: /research/georisk
// ═══════════════════════════════════════════════════════

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
    interest_rates:  { label: "Tipos de Interés",    source: "Tipo Depósito · BCE",               unit: "%",   base: 4.75,  volatility: 0.15, decimals: 2 },
    inflation_cpi:   { label: "Inflación / IPC",     source: "HICP YoY · Zona Euro · Eurostat",   unit: "%",   base: 3.2,   volatility: 0.25, decimals: 2 },
    fx:              { label: "Tipo Cambio EUR/USD", source: "Spot FX · Tipo Ref. BCE",           unit: "",    base: 1.074, volatility: 0.008, decimals: 3 },
    commodities:     { label: "Materias Primas",     source: "S&P GSCI · S&P Global",             unit: "idx", base: 118.4, volatility: 3.5, decimals: 2 },
    sovereign_yield: { label: "Yield Soberano 10Y",  source: "Bund 10Y · Zona Euro · BCE",        unit: "%",   base: 4.48,  volatility: 0.10, decimals: 2 },
    capital_flows:   { label: "Flujos Capital IED",  source: "IED Neta · Zona Euro · BCE",        unit: "Bn€", base: -12.3, volatility: 1.8, decimals: 2 },
  },
  usa: {
    interest_rates:  { label: "Tipos de Interés",    source: "Fed Funds Rate · Federal Reserve",  unit: "%",   base: 5.25,  volatility: 0.15, decimals: 2 },
    inflation_cpi:   { label: "Inflación / IPC",     source: "CPI YoY · BLS",                      unit: "%",   base: 3.0,   volatility: 0.25, decimals: 2 },
    fx:              { label: "Índice Dólar (DXY)",  source: "ICE US Dollar Index",                unit: "idx", base: 104.2, volatility: 0.8, decimals: 2 },
    commodities:     { label: "Materias Primas",     source: "S&P GSCI · S&P Global",              unit: "idx", base: 118.4, volatility: 3.5, decimals: 2 },
    sovereign_yield: { label: "Yield Soberano 10Y",  source: "US Treasury 10Y · Fed",              unit: "%",   base: 4.35,  volatility: 0.12, decimals: 2 },
    capital_flows:   { label: "Flujos Capital IED",  source: "Net TIC Flows · US Treasury",        unit: "Bn$", base: -38.6, volatility: 5.2, decimals: 2 },
  },
  asia: {
    interest_rates:  { label: "Tipos de Interés",    source: "LPR 1Y · PBOC",                      unit: "%",   base: 3.45,  volatility: 0.10, decimals: 2 },
    inflation_cpi:   { label: "Inflación / IPC",     source: "CPI YoY · China · NBS",              unit: "%",   base: 0.4,   volatility: 0.30, decimals: 2 },
    fx:              { label: "Tipo Cambio USD/CNY", source: "Spot FX · PBOC Fixing",              unit: "",    base: 7.28,  volatility: 0.02, decimals: 2 },
    commodities:     { label: "Materias Primas",     source: "S&P GSCI · S&P Global",              unit: "idx", base: 118.4, volatility: 3.5, decimals: 2 },
    sovereign_yield: { label: "Yield Soberano 10Y",  source: "China Govt Bond 10Y · PBOC",         unit: "%",   base: 2.15,  volatility: 0.08, decimals: 2 },
    capital_flows:   { label: "Flujos Capital IED",  source: "IED Neta · China · SAFE",            unit: "Bn$", base: -9.4,  volatility: 2.1, decimals: 2 },
  },
};

// El riesgo intrínseco (prob/risk) de cada escenario es global; lo que cambia
// por región es cómo se transmite a cada variable (impactByRegion).
// Convención: en "fx", positivo = el índice/par cotizado SUBE (EUR/USD, DXY o
// USD/CNY según la región) — ver ASSET_SENSITIVITY_BY_REGION para cómo esto
// se traduce a "divisa local más débil/fuerte" en cada caso.
const SCENARIOS = {
  tariff_escalation: {
    label: "Escalada Arancelaria",
    desc: "Tensiones comerciales EE.UU.–China–UE",
    prob: 0.34, risk: 78, color: "#F59E0B",
    impactByRegion: {
      eu:   { interest_rates: 0.35,  inflation_cpi: 0.55, fx: -0.08, commodities: 0.45, sovereign_yield: 0.40,  capital_flows: -0.60 },
      usa:  { interest_rates: 0.15,  inflation_cpi: 0.65, fx: 0.30,  commodities: 0.45, sovereign_yield: 0.25,  capital_flows: 0.35 },
      asia: { interest_rates: -0.10, inflation_cpi: 0.20, fx: 0.55,  commodities: 0.45, sovereign_yield: -0.15, capital_flows: -0.75 },
    }
  },
  mena_instability: {
    label: "Inestabilidad MENA",
    desc: "Conflicto Oriente Medio · Disrupción energética",
    prob: 0.38, risk: 85, color: "#EF4444",
    impactByRegion: {
      eu:   { interest_rates: 0.20, inflation_cpi: 0.75, fx: -0.12, commodities: 0.90, sovereign_yield: 0.30,  capital_flows: -0.45 },
      usa:  { interest_rates: 0.10, inflation_cpi: 0.55, fx: 0.25,  commodities: 0.90, sovereign_yield: 0.15,  capital_flows: 0.30 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.60, fx: 0.30,  commodities: 0.90, sovereign_yield: -0.10, capital_flows: -0.50 },
    }
  },
  eu_fragmentation: {
    label: "Fragmentación Europea",
    desc: "Tensiones soberanas · Spreads periféricos",
    prob: 0.20, risk: 72, color: "#8B5CF6",
    impactByRegion: {
      eu:   { interest_rates: 0.45, inflation_cpi: 0.30, fx: -0.20, commodities: 0.15, sovereign_yield: 0.85,  capital_flows: -0.70 },
      usa:  { interest_rates: 0.05, inflation_cpi: 0.10, fx: 0.35,  commodities: 0.10, sovereign_yield: -0.10, capital_flows: 0.55 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.05, fx: 0.15,  commodities: 0.05, sovereign_yield: -0.05, capital_flows: -0.20 },
    }
  },
  detente: {
    label: "Distensión Geopolítica",
    desc: "Acuerdos diplomáticos · Reducción primas riesgo",
    prob: 0.08, risk: 28, color: "#10B981",
    impactByRegion: {
      eu:   { interest_rates: -0.20, inflation_cpi: -0.30, fx: 0.08,  commodities: -0.35, sovereign_yield: -0.40, capital_flows: 0.50 },
      usa:  { interest_rates: -0.10, inflation_cpi: -0.20, fx: -0.15, commodities: -0.35, sovereign_yield: -0.15, capital_flows: -0.10 },
      asia: { interest_rates: -0.05, inflation_cpi: -0.10, fx: -0.30, commodities: -0.35, sovereign_yield: -0.10, capital_flows: 0.65 },
    }
  },
};

const SECTORS = {
  global:      { label: "Global",      mult: 1.00 },
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

function riskLabel(v) {
  return v < 40 ? "BAJO" : v < 65 ? "MODERADO" : v < 80 ? "ELEVADO" : "CRÍTICO";
}

const NLP_KEYWORDS = {
  war: 0.95, conflict: 0.85, sanction: 0.80, invasion: 0.92, escalation: 0.78,
  attack: 0.82, blockade: 0.75, coup: 0.88, guerra: 0.95, conflicto: 0.85,
  sanción: 0.80, invasión: 0.92, escalada: 0.78, bloqueo: 0.75,
  tariff: 0.65, arancel: 0.65, recession: 0.70, default: 0.80,
  devaluation: 0.72, inflation: 0.55, recesión: 0.70, inflación: 0.55,
  tension: 0.38, dispute: 0.35, election: 0.30, uncertainty: 0.32,
  tensión: 0.38, incertidumbre: 0.32,
  peace: -0.40, agreement: -0.35, ceasefire: -0.60, deal: -0.25,
  paz: -0.40, acuerdo: -0.35, diplomacy: -0.30, diplomacia: -0.30,
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmt = (v, d = 2) => v.toFixed(d);

// ── Micro Components ────────────────────────────────

function Pulse({ color = "#10B981", size = 8 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: size, height: size, borderRadius: "50%", background: color,
        boxShadow: `0 0 ${size}px ${color}80`,
        animation: "zrc-pulse 2s ease-in-out infinite"
      }} />
    </span>
  );
}

function RiskGauge({ value, size = 120, label }) {
  const pct = clamp(value / 100, 0, 1);
  const angle = pct * 240 - 120;
  const c = pct < 0.4 ? "#10B981" : pct < 0.65 ? "#F59E0B" : "#EF4444";
  const r = size / 2 - 9;
  const createArc = (startAngle, endAngle) => {
    const s = (startAngle - 90) * Math.PI / 180;
    const e = (endAngle - 90) * Math.PI / 180;
    const cx = size / 2, cy = size / 2;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <path d={createArc(-120, 120)} fill="none" stroke="#152540" strokeWidth={7} strokeLinecap="round" />
        <path d={createArc(-120, angle)} fill="none" stroke={c} strokeWidth={7} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${c}90)`, transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }} />
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: width + 50 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isNeg ? "#EF4444" : "#10B981", minWidth: 42, textAlign: "right" }}>
        {isNeg ? "" : "+"}{fmt(value)}
      </span>
      <div style={{ width, height: 6, background: "#0d1626", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: color || (isNeg ? "#EF4444" : "#10B981"),
          transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
          boxShadow: `0 0 6px ${color || (isNeg ? "#EF444480" : "#10B98180")}`
        }} />
      </div>
    </div>
  );
}

function DataTicker({ items }) {
  return (
    <div style={{
      position: "relative", padding: "9px 0",
      borderTop: "1px solid #16233d", borderBottom: "1px solid #16233d",
      background: "linear-gradient(180deg, #0a1220 0%, #0a1322 100%)",
    }}>
      <div style={{ display: "flex", gap: 28, overflow: "hidden", animation: "zrc-ticker 30s linear infinite", whiteSpace: "nowrap" }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94A3B8", letterSpacing: 0.5 }}>
            <span style={{ color: "#5B9BFF" }}>{item.label}</span>
            {" "}
            <span style={{ color: item.delta > 0 ? "#10B981" : item.delta < 0 ? "#EF4444" : "#94A3B8" }}>
              {item.value} {item.delta > 0 ? "▲" : item.delta < 0 ? "▼" : "●"}
            </span>
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 48, background: "linear-gradient(90deg, #0a1322, transparent)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 48, background: "linear-gradient(270deg, #0a1322, transparent)", pointerEvents: "none" }} />
    </div>
  );
}

function SparkLine({ data, color = "#3B82F6", w = 100, h = 28, area = true }) {
  const gradId = useId();
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const coords = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / range) * (h - 4) - 2]);
  const line = coords.map(p => p.join(",")).join(" ");
  const areaPath = `M${coords[0][0]},${h} L${coords.map(p => p.join(",")).join(" L")} L${coords[coords.length - 1][0]},${h} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {area && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {area && <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />}
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

// ── NLP Analyzer ────────────────────────────────────

function analyzeText(text) {
  const words = text.toLowerCase().replace(/[^a-záéíóúñü\s]/g, "").split(/\s+/);
  let score = 0, hits = [];
  words.forEach(w => {
    if (NLP_KEYWORDS[w] !== undefined) {
      score += NLP_KEYWORDS[w];
      hits.push({ word: w, weight: NLP_KEYWORDS[w] });
    }
  });
  hits.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { score: clamp(score / Math.max(hits.length, 1), -1, 1), rawScore: score, hits, wordCount: words.length };
}

// ── Main Dashboard ──────────────────────────────────

export default function GeoRiskDashboard() {
  const [activeScenario, setActiveScenario] = useState("tariff_escalation");
  const [sector, setSector] = useState("global");
  const [region, setRegion] = useState("eu");
  const DEFAULT_WEIGHTS = Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.prob]));
  const [scenarioWeights, setScenarioWeights] = useState(DEFAULT_WEIGHTS);
  const [nlpText, setNlpText] = useState("");
  const [nlpResult, setNlpResult] = useState(null);
  const [time, setTime] = useState(new Date());
  const [sparkData, setSparkData] = useState({});
  const [tab, setTab] = useState("scenarios");

  const ECONOMIC_VARIABLES = ECONOMIC_VARIABLES_BY_REGION[region];
  const fxExporterSign = region === "asia" ? 1 : -1;

  const isCustomized = useMemo(() =>
    Object.entries(scenarioWeights).some(([k, v]) => Math.abs(v - DEFAULT_WEIGHTS[k]) > 0.005),
    [scenarioWeights]
  );

  const resetWeights = () => setScenarioWeights({ ...DEFAULT_WEIGHTS });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const d = {};
    Object.keys(ECONOMIC_VARIABLES).forEach(k => {
      const v = ECONOMIC_VARIABLES[k];
      d[k] = Array.from({ length: 20 }, (_, i) =>
        v.base + (Math.random() - 0.5) * v.volatility * 4 * Math.sin(i / 3)
      );
    });
    setSparkData(d);
  }, [region]);

  const sectorMult = SECTORS[sector].mult;

  const computeImpact = useCallback((varKey) => {
    let total = 0;
    Object.entries(SCENARIOS).forEach(([sk, sv]) => {
      const w = scenarioWeights[sk] || 0;
      total += w * (sv.impactByRegion[region]?.[varKey] || 0) * sectorMult;
    });
    return total;
  }, [scenarioWeights, sectorMult, region]);

  const compositeRisk = useMemo(() => {
    let r = 0;
    Object.entries(SCENARIOS).forEach(([k, v]) => {
      r += (scenarioWeights[k] || 0) * v.risk;
    });
    return r * sectorMult;
  }, [scenarioWeights, sectorMult]);

  const allocationSignals = useMemo(() => {
    const imp = {};
    Object.keys(ECONOMIC_VARIABLES).forEach(k => { imp[k] = computeImpact(k); });
    const ratesPressure = imp.interest_rates + imp.sovereign_yield;
    const flowDir = imp.capital_flows;
    const fxExporter = imp.fx * fxExporterSign;
    return ASSETS.map(a => {
      let signal = 0, rationale = "";
      if (a === "Deuda soberana core") {
        signal = -ratesPressure * 40; rationale = ratesPressure > 0 ? "Presión alcista en tipos reduce atractivo" : "Tipos a la baja favorecen renta fija";
      } else if (a === "Renta fija High Yield") {
        signal = -ratesPressure * 30 + flowDir * 10; rationale = "Sensible a spreads y flujos de capital";
      } else if (a === "Real estate prime") {
        signal = -ratesPressure * 25 + flowDir * 15; rationale = flowDir < 0 ? "Salida de capitales presiona valoraciones" : "Flujos entrantes soportan pricing";
      } else if (a === "Materias primas") {
        signal = imp.commodities * 35; rationale = imp.commodities > 0 ? "Presión alcista por disrupción de suministro" : "Normalización de precios esperada";
      } else if (a === "Equity exportador") {
        signal = fxExporter * 200 + flowDir * 10; rationale = fxExporter > 0 ? "Divisa local débil favorece exportadores" : "Divisa local fuerte penaliza competitividad";
      } else {
        signal = ratesPressure * 20 - flowDir * 5; rationale = compositeRisk > 60 ? "Refugio en entorno de riesgo elevado" : "Coste de oportunidad alto en entorno estable";
      }
      const dir = signal > 15 ? "SOBREPONDERAR" : signal < -15 ? "INFRAPONDERAR" : "NEUTRAL";
      const col = signal > 15 ? "#10B981" : signal < -15 ? "#EF4444" : "#F59E0B";
      return { asset: a, signal, dir, col, rationale };
    });
  }, [computeImpact, compositeRisk, fxExporterSign, ECONOMIC_VARIABLES]);

  const handleNlp = () => {
    if (!nlpText.trim()) return;
    setNlpResult(analyzeText(nlpText));
  };

  const tickerItems = Object.entries(ECONOMIC_VARIABLES).map(([k, v]) => {
    const d = computeImpact(k);
    const val = v.base + d * v.volatility * 5;
    return { label: v.label, value: `${fmt(val, v.decimals ?? 2)}${v.unit}`, delta: d };
  });

  return (
    <div style={{
      minHeight: "100vh", background: "#070c17",
      color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @keyframes zrc-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes zrc-fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes zrc-ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes zrc-scanline { from { top: -2px } to { top: 100% } }
        @keyframes zrc-gridPulse { 0%,100% { opacity:0.025 } 50% { opacity:0.05 } }
        .zrc-georisk input[type=range] { -webkit-appearance: none; height: 3px; background: #1a2744; border-radius: 2px; outline: none }
        .zrc-georisk input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: #3B82F6; cursor: pointer; box-shadow: 0 0 8px #3B82F680; border: 2px solid #0a1322 }
        .zrc-georisk ::-webkit-scrollbar { width: 4px }
        .zrc-georisk ::-webkit-scrollbar-track { background: #0a1628 }
        .zrc-georisk ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px }
        .zrc-card {
          background: linear-gradient(180deg, #0d1a2e 0%, #0a1322 100%);
          border: 1px solid #1a2b47; border-radius: 10px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.5);
        }
        .zrc-card--interactive { cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .zrc-card--interactive:hover {
          transform: translateY(-2px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 30px -14px rgba(0,0,0,0.65);
        }
        .zrc-pill { transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, color 0.15s ease; }
        .zrc-pill:hover { transform: translateY(-1px); border-color: #3B82F680 !important; color: #CBD5E1 !important; }
        .zrc-tab { transition: background 0.2s ease, color 0.2s ease; }
        .zrc-tab:hover { color: #CBD5E1 !important; background: #ffffff06; }
        .zrc-row:hover { background: #101d33 !important; }
        .zrc-reset:hover { border-color: #3B82F6 !important; color: #93C5FD !important; }
      `}</style>

      <div className="zrc-georisk">
        {/* Ambient glow */}
        <div style={{
          position: "fixed", top: -280, left: "50%", transform: "translateX(-50%)",
          width: 900, height: 560, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse at center, #1e3a5f38 0%, transparent 70%)",
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "linear-gradient(#1a274410 1px, transparent 1px), linear-gradient(90deg, #1a274410 1px, transparent 1px)",
          backgroundSize: "40px 40px", animation: "zrc-gridPulse 4s ease-in-out infinite"
        }} />

        {/* Scanline */}
        <div style={{
          position: "fixed", left: 0, right: 0, height: 2, zIndex: 1,
          background: "linear-gradient(90deg, transparent, #3B82F620, transparent)",
          animation: "zrc-scanline 8s linear infinite", pointerEvents: "none"
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>

          {/* HEADER */}
          <header style={{ padding: "24px 0 16px", borderBottom: "1px solid #16233d" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "linear-gradient(135deg, #1e3a5f, #3B82F6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#fff",
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: "0 4px 16px -4px #3B82F660",
                  }}>ZR</div>
                  <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>
                    ZENITH RISE CAPITAL
                  </span>
                </div>
                <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "#F8FAFC" }}>
                  <Radar size={22} color="#5B9BFF" strokeWidth={2} />
                  GeoRisk Intelligence System
                </h1>
                <div style={{ fontSize: 11, color: "#4B5A72", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  Calesius Global SL · Modelo propietario de análisis geopolítico cuantitativo
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <Pulse color="#10B981" />
                  <span style={{ fontSize: 11, color: "#10B981", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>LIVE</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 19, fontWeight: 600, color: "#E2E8F0", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                  {time.toLocaleTimeString("es-ES", { hour12: false })}
                </div>
                <div style={{ fontSize: 10, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace" }}>
                  {time.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} · CET
                </div>
              </div>
            </div>
          </header>

          <DataTicker items={tickerItems} />

          <div className="zrc-card" style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24,
            padding: "20px 24px", margin: "20px 0", alignItems: "center"
          }}>
            <div style={{ textAlign: "center" }}>
              <RiskGauge value={compositeRisk} size={110} label="Riesgo Compuesto" />
              <div style={{
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginTop: 2,
                color: isCustomized ? "#F59E0B" : "#10B981",
              }}>
                {isCustomized ? "▲ ESCENARIO PERSONALIZADO" : "● BASE ZRC RESEARCH"}
              </div>
            </div>
            <div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginRight: 4 }}>REGIÓN:</span>
                {Object.entries(REGIONS).map(([k, v]) => (
                  <button key={k} className="zrc-pill" onClick={() => setRegion(k)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid",
                    borderColor: region === k ? "#A78BFA" : "#1e2d47",
                    background: region === k ? "#A78BFA18" : "transparent",
                    color: region === k ? "#C4B5FD" : "#64748B",
                    fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 0.5,
                  }}>{v.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginRight: 4 }}>SECTOR:</span>
                {Object.entries(SECTORS).map(([k, v]) => (
                  <button key={k} className="zrc-pill" onClick={() => setSector(k)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid",
                    borderColor: sector === k ? "#3B82F6" : "#1e2d47",
                    background: sector === k ? "#3B82F618" : "transparent",
                    color: sector === k ? "#60A5FA" : "#64748B",
                    fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 0.5,
                  }}>{v.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace", marginTop: 10 }}>
                Las variables, fuentes y niveles se leen sobre {REGIONS[region].label} · el riesgo compuesto del escenario es global
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ fontSize: 10, color: "#64748B", letterSpacing: 1 }}>MULTIPLICADOR</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: sectorMult > 1 ? "#F59E0B" : "#10B981" }}>
                ×{sectorMult.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="zrc-card" style={{ display: "flex", gap: 2, padding: 5, marginBottom: 20 }}>
            {[
              { id: "scenarios", label: "Escenarios", icon: Radar },
              { id: "variables", label: "Variables", icon: Activity },
              { id: "nlp", label: "NLP Analyzer", icon: MessageSquare },
              { id: "allocation", label: "Asignación", icon: PieChart },
            ].map(t2 => (
              <button key={t2.id} className="zrc-tab" onClick={() => setTab(t2.id)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", border: "none", borderRadius: 7,
                background: tab === t2.id ? "linear-gradient(135deg, #1e3a5f, #24466f)" : "transparent",
                boxShadow: tab === t2.id ? "0 4px 14px -6px #3B82F660, 0 0 0 1px #3B82F640 inset" : "none",
                color: tab === t2.id ? "#F1F5F9" : "#64748B",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
              }}>
                <t2.icon size={13} strokeWidth={2.2} />
                {t2.label}
              </button>
            ))}
          </div>

          {/* SCENARIOS */}
          {tab === "scenarios" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>

              {/* Methodology callout */}
              <div className="zrc-card" style={{
                borderLeft: "3px solid #3B82F6",
                padding: "16px 20px", marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#5B9BFF", letterSpacing: 1, marginBottom: 6 }}>
                    METODOLOGÍA · SCORE COMPUESTO
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7, maxWidth: 680 }}>
                    El score es el promedio ponderado por probabilidad del riesgo intrínseco de cada escenario, ajustado por multiplicador sectorial.
                    {" "}<span style={{ color: "#CBD5E1" }}>El círculo de cada slider aparece por defecto en la probabilidad estimada por los algoritmos de ZRC Research.</span>
                    {" "}Puedes deslizarlo para explorar escenarios propios — el score se recalcula en tiempo real y queda marcado como "AJUSTADO", indicando el valor ZRC original.
                    {" "}<span style={{ color: "#F59E0B" }}>Las modificaciones no reflejan el análisis oficial de ZRC.</span>
                    {" "}Usa el botón ↺ (por escenario o global) para devolver el círculo a su posición ZRC.
                  </div>
                  <div style={{ fontSize: 11, color: "#4B5A72", lineHeight: 1.7, maxWidth: 680, marginTop: 10, borderTop: "1px solid #1a274460", paddingTop: 10 }}>
                    ¿Necesitas forecast a 12 meses, NLP en tiempo real y un decision engine institucional sobre estos mismos escenarios?
                    {" "}<span style={{ color: "#A78BFA" }}>GeoRisk Predictive ML</span> es la evolución con IA de este dashboard.
                  </div>
                </div>
                {isCustomized && (
                  <button className="zrc-reset" onClick={resetWeights} style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px",
                    background: "#3B82F612", border: "1px solid #3B82F660",
                    color: "#60A5FA", fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 1, cursor: "pointer", borderRadius: 6, whiteSpace: "nowrap",
                    transition: "all 0.2s",
                  }}>
                    <RotateCcw size={12} /> RESTABLECER VALORES ZRC
                  </button>
                )}
              </div>

              {/* IC Summary */}
              {(() => {
                const top = [...allocationSignals].sort((a, b) => Math.abs(b.signal) - Math.abs(a.signal))[0];
                const topImpact = top ? estimatePriceImpact(top.asset, Object.fromEntries(Object.keys(ECONOMIC_VARIABLES).map(k => [k, computeImpact(k)])), region) : 0;
                const worstScenario = Object.entries(SCENARIOS).sort((a, b) => (scenarioWeights[b[0]] * b[1].risk) - (scenarioWeights[a[0]] * a[1].risk))[0][1];
                return (
                  <div className="zrc-card" style={{
                    borderLeft: "3px solid #F59E0B",
                    padding: "16px 20px", marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B", letterSpacing: 1, marginBottom: 10 }}>
                      RESUMEN PARA COMITÉ DE INVERSIÓN
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#CBD5E1", lineHeight: 1.9 }}>
                      <li>Riesgo compuesto <b>{riskLabel(compositeRisk)}</b> ({fmt(compositeRisk, 1)}/100), mix {isCustomized ? "personalizado por el analista" : "base ZRC Research"}.</li>
                      <li>Riesgo a vigilar: <b>{worstScenario.label}</b> (riesgo intrínseco {worstScenario.risk}/100).</li>
                      {top && (
                        <li>Llamada táctica principal: <b style={{ color: top.col }}>{top.dir}</b> en <b>{top.asset}</b> — impacto estimado {topImpact >= 0 ? "+" : ""}{fmt(topImpact, 1)}% a 12M bajo el mix actual.</li>
                      )}
                    </ul>
                  </div>
                );
              })()}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
                {Object.entries(SCENARIOS).map(([sk, sv]) => {
                  const isModified = Math.abs(scenarioWeights[sk] - DEFAULT_WEIGHTS[sk]) > 0.005;
                  return (
                    <div key={sk} className="zrc-card zrc-card--interactive" onClick={() => setActiveScenario(sk)} style={{
                      background: activeScenario === sk ? "linear-gradient(180deg, #101f36 0%, #0a1322 100%)" : undefined,
                      borderColor: activeScenario === sk ? sv.color + "60" : undefined,
                      padding: 18,
                      position: "relative", overflow: "hidden"
                    }}>
                      {activeScenario === sk && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${sv.color}, transparent)` }} />}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: sv.color, marginBottom: 2 }}>{sv.label}</div>
                          <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{sv.desc}</div>
                        </div>
                        <RiskGauge value={sv.risk} size={56} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                              PROB. ESCENARIO
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setScenarioWeights({ ...scenarioWeights, [sk]: DEFAULT_WEIGHTS[sk] }); }}
                              title={`Dejar en el nivel ZRC (${(DEFAULT_WEIGHTS[sk] * 100).toFixed(0)}%) sin arrastrar`}
                              disabled={!isModified}
                              style={{
                                display: "flex", alignItems: "center",
                                background: isModified ? "#3B82F615" : "transparent",
                                border: `1px solid ${isModified ? "#3B82F660" : "#1a274460"}`,
                                color: isModified ? "#60A5FA" : "#334155",
                                borderRadius: 4, padding: "3px 5px", lineHeight: 1,
                                cursor: isModified ? "pointer" : "default", flexShrink: 0,
                              }}
                            ><RotateCcw size={11} /></button>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: isModified ? "#F59E0B" : sv.color, fontFamily: "'JetBrains Mono', monospace" }}>
                            {(scenarioWeights[sk] * 100).toFixed(0)}%
                          </span>
                        </div>
                        {isModified && (
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B", background: "#F59E0B15", border: "1px solid #F59E0B30", borderRadius: 2, padding: "1px 5px" }}>
                              AJUSTADO · ZRC: {(DEFAULT_WEIGHTS[sk] * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
                          Desliza el círculo, o pulsa ↺ — el círculo en sombra marca el nivel estimado por ZRC
                        </div>
                        <div style={{ position: "relative", height: 12, display: "flex", alignItems: "center" }}>
                          <div title={`Nivel ZRC: ${(DEFAULT_WEIGHTS[sk] * 100).toFixed(0)}%`} style={{
                            position: "absolute", left: `${(DEFAULT_WEIGHTS[sk] * 100 / 80) * 100}%`, top: "50%",
                            width: 13, height: 13, borderRadius: "50%",
                            border: `2px solid ${isModified ? "#94A3B8" : sv.color}`,
                            background: isModified ? "rgba(148,163,184,0.15)" : `${sv.color}25`,
                            transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 1,
                          }} />
                          <input type="range" min={0} max={80} value={scenarioWeights[sk] * 100}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              e.stopPropagation();
                              setScenarioWeights({ ...scenarioWeights, [sk]: parseInt(e.target.value) / 100 });
                            }}
                            style={{ width: "100%", accentColor: isModified ? "#F59E0B" : sv.color, position: "relative", zIndex: 2 }}
                          />
                        </div>
                      </div>
                      {activeScenario === sk && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${sv.color}20` }}>
                          <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>
                            VECTORES DE IMPACTO · FUENTE Y NIVEL ACTUAL POR VARIABLE
                          </div>
                          {Object.entries(sv.impactByRegion[region]).map(([vk, vi]) => {
                            const ev = ECONOMIC_VARIABLES[vk];
                            return (
                              <div key={vk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                                <div>
                                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{ev?.label}</div>
                                  <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                                    {ev?.source} · actual: {fmt(ev?.base, ev?.decimals ?? 2)}{ev?.unit}
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <SparkLine data={sparkData[vk]} color={sv.color} w={36} h={16} />
                                  <MiniBar value={vi} max={1} color={sv.color} width={50} />
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, margin: "10px 0 6px" }}>
                            EJEMPLO · IMPACTO ESTIMADO EN PRECIOS (12M, si se materializa este escenario) · {REGIONS[region].label}
                          </div>
                          {ASSETS.map(a => {
                            const pct = estimatePriceImpact(a, sv.impactByRegion[region], region);
                            const c = pct > 0.5 ? "#EF4444" : pct < -0.5 ? "#10B981" : "#64748B";
                            return (
                              <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                                <span style={{ fontSize: 11, color: "#94A3B8" }}>{a}</span>
                                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: c }}>
                                  {pct >= 0 ? "+" : ""}{fmt(pct, 1)}%
                                </span>
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

          {/* VARIABLES */}
          {tab === "variables" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div className="zrc-card" style={{ overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr",
                  padding: "12px 20px", background: "#0d1829", borderBottom: "1px solid #1a2744",
                  fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
                }}>
                  <span>VARIABLE</span><span>BASE</span><span>IMPACTO</span><span>PROYECCIÓN</span><span>TENDENCIA</span>
                </div>
                {Object.entries(ECONOMIC_VARIABLES).map(([k, v], i) => {
                  const imp = computeImpact(k);
                  const proj = v.base + imp * v.volatility * 5;
                  return (
                    <div key={k} className="zrc-row" style={{
                      display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr",
                      padding: "13px 20px", borderBottom: "1px solid #1a274430",
                      alignItems: "center", background: i % 2 ? "#0a1322" : "#0c1526",
                      transition: "background 0.2s"
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#CBD5E1" }}>{v.label}</div>
                        <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em", marginTop: 2 }}>{v.source}</div>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#94A3B8" }}>
                        {fmt(v.base, v.decimals ?? 2)}{v.unit}
                      </span>
                      <MiniBar value={imp} max={0.8} width={50} />
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                        color: imp > 0.1 ? "#F59E0B" : imp < -0.1 ? "#10B981" : "#94A3B8"
                      }}>
                        {fmt(proj, v.decimals ?? 2)}{v.unit}
                      </span>
                      <SparkLine data={sparkData[k]} color={imp > 0.1 ? "#F59E0B" : imp < -0.1 ? "#10B981" : "#3B82F6"} w={90} h={24} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NLP */}
          {tab === "nlp" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div className="zrc-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 12 }}>
                  <MessageSquare size={13} color="#5B9BFF" />
                  ANÁLISIS NLP DE RIESGO GEOPOLÍTICO · Introduzca texto de noticias o briefings
                </div>
                <textarea
                  value={nlpText}
                  onChange={e => setNlpText(e.target.value)}
                  placeholder="Pegue aquí un titular, noticia o briefing geopolítico para análisis de riesgo..."
                  style={{
                    width: "100%", height: 140, background: "#080e1a", border: "1px solid #1a2744",
                    borderRadius: 8, padding: 14, color: "#CBD5E1", fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace", resize: "vertical",
                    outline: "none", lineHeight: 1.6, boxSizing: "border-box"
                  }}
                />
                <button onClick={handleNlp} style={{
                  marginTop: 12, padding: "9px 24px", background: "linear-gradient(135deg, #1e3a5f, #3B82F6)",
                  border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: 1,
                  boxShadow: "0 6px 18px -8px #3B82F680",
                }}>
                  ANALIZAR RIESGO
                </button>

                {nlpResult && (
                  <div style={{ marginTop: 22, padding: 20, background: "#0d1829", borderRadius: 8, border: "1px solid #1a2744" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>SCORE RIESGO</div>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          color: nlpResult.score > 0.3 ? "#EF4444" : nlpResult.score > 0 ? "#F59E0B" : "#10B981"
                        }}>
                          {nlpResult.score > 0.05 ? <TrendingUp size={20} /> : nlpResult.score < -0.05 ? <TrendingDown size={20} /> : <Minus size={20} />}
                          {nlpResult.score > 0 ? "+" : ""}{fmt(nlpResult.score)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>SCORE BRUTO</div>
                        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#CBD5E1" }}>
                          {fmt(nlpResult.rawScore)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>KEYWORDS</div>
                        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#5B9BFF" }}>
                          {nlpResult.hits.length}
                        </div>
                      </div>
                    </div>
                    {nlpResult.hits.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>KEYWORDS DETECTADAS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {nlpResult.hits.map((h, i) => (
                            <span key={i} style={{
                              padding: "3px 8px", borderRadius: 5, fontSize: 11,
                              fontFamily: "'JetBrains Mono', monospace",
                              background: h.weight > 0 ? "#EF444420" : "#10B98120",
                              color: h.weight > 0 ? "#FCA5A5" : "#6EE7B7",
                              border: `1px solid ${h.weight > 0 ? "#EF444440" : "#10B98140"}`
                            }}>
                              {h.word} <span style={{ opacity: 0.6 }}>{h.weight > 0 ? "+" : ""}{fmt(h.weight)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALLOCATION */}
          {tab === "allocation" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div className="zrc-card" style={{ overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1.3fr 2.6fr",
                  padding: "12px 20px", background: "#0d1829", borderBottom: "1px solid #1a2744",
                  fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
                }}>
                  <span>CLASE DE ACTIVO</span><span>SEÑAL</span><span>IMPACTO PRECIO EST. (12M)</span><span>RECOMENDACIÓN</span><span>RACIONAL</span>
                </div>
                {allocationSignals.map((a, i) => {
                  const priceImpact = estimatePriceImpact(a.asset, Object.fromEntries(Object.keys(ECONOMIC_VARIABLES).map(k => [k, computeImpact(k)])), region);
                  const pCol = priceImpact > 0.5 ? "#EF4444" : priceImpact < -0.5 ? "#10B981" : "#64748B";
                  const DirIcon = a.dir === "SOBREPONDERAR" ? TrendingUp : a.dir === "INFRAPONDERAR" ? TrendingDown : Minus;
                  return (
                    <div key={i} className="zrc-row" style={{
                      display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1.3fr 2.6fr",
                      padding: "15px 20px", borderBottom: "1px solid #1a274430",
                      alignItems: "center", background: i % 2 ? "#0a1322" : "#0c1526",
                      transition: "background 0.2s"
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#CBD5E1" }}>{a.asset}</span>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
                        color: a.col, display: "flex", alignItems: "center", gap: 4
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", background: a.col,
                          boxShadow: `0 0 4px ${a.col}80`, display: "inline-block"
                        }} />
                        {a.signal > 0 ? "+" : ""}{fmt(a.signal, 0)}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: pCol }}>
                        {priceImpact >= 0 ? "+" : ""}{fmt(priceImpact, 1)}%
                      </span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                        letterSpacing: 1, color: a.col,
                        padding: "3px 9px", borderRadius: 5,
                        background: `${a.col}15`, border: `1px solid ${a.col}30`,
                        width: "fit-content",
                      }}>
                        <DirIcon size={11} /> {a.dir}
                      </span>
                      <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>{a.rationale}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{
                marginTop: 14, padding: "14px 16px", background: "#0d182960", borderRadius: 8,
                border: "1px dashed #1a274480", fontSize: 10, color: "#64748B",
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span><span style={{ color: "#F59E0B", fontWeight: 700 }}>DISCLAIMER:</span> Las señales de asignación y los impactos de precio estimados se generan mediante el modelo cuantitativo propietario de Zenith Rise Capital
                (sensibilidad histórica ilustrativa por clase de activo) y no constituyen asesoramiento de inversión. Los resultados dependen de las probabilidades de escenario asignadas por el
                analista y del multiplicador sectorial seleccionado. Consulte con un asesor financiero cualificado antes de tomar decisiones de inversión.</span>
              </div>
            </div>
          )}

          <footer style={{
            padding: "22px 0", marginTop: 32, borderTop: "1px solid #16233d",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
          }}>
            <div style={{ fontSize: 10, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
              © 2026 Zenith Rise Capital · Calesius Global SL · Madrid, España
              <br />Modelo GeoRisk v2.1 · Horizonte: 12 meses · Recalibración: continua
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace" }}>www.zenithrisecapital.com</span>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 9px", borderRadius: 5, fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                background: "#10B98115", color: "#10B981", border: "1px solid #10B98130"
              }}><Radio size={10} /> OPERATIONAL</div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
