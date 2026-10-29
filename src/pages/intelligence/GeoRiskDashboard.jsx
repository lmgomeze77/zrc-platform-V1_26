import marketSnapshot from "../../../public/data/georisk-market-research.json";
import GeoRiskInvestmentEngine from "./GeoRiskInvestmentEngine.jsx";
import {DEFAULT_INVESTMENT_INPUTS} from "../../data/georiskInvestmentEngine.js";
import {createWorkspaceSnapshot,parseWorkspaceSnapshot} from "../../data/georiskWorkspaceSnapshot.js";
import {COUNTRY_PROFILES} from "../../data/countryRiskProfiles.js";
import {COUNTRY_EXPANSION_CANDIDATES} from "../../data/georiskCountryExpansion.js";
import { downloadGeoRiskInvestmentReport } from "../../data/georiskInvestmentReport.js";
import { estimatePriceImpact, decomposeAssetSensitivity, SENSITIVITY_VERSION } from "../../data/georiskSensitivityAudit.js";
import { useGeoRiskObservedBaselines } from "../../hooks/useGeoRiskObservedBaselines.js";
import GeoRiskTaxonomyBridge from "../../components/GeoRiskTaxonomyBridge.jsx";
import { GEORISK_SCENARIOS, GEORISK_SCENARIO_VERSION, GEORISK_MODEL_CLASSIFICATION } from "../../data/georiskScenarioContract.js";
import GeoRiskGprData from "../../components/GeoRiskGprData";
import GeoRiskMarketData from "../../components/GeoRiskMarketData";
import GeoRiskMacroData from "../../components/GeoRiskMacroData";
import GeoRiskGovernanceData from "../../components/GeoRiskGovernanceData";
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
// Shared versioned analyst scenario configuration — identical in GeoRisk and ML.
const SCENARIOS = GEORISK_SCENARIOS;

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

const SECTION_GUIDES = {
  data: {
    title: "Consulta datos reales y su evolución",
    body: "Compara divisas con la última referencia diaria del BCE y hasta cinco años de observaciones. Cada dato tiene fuente y fecha. Los gráficos muestran valores publicados, sin generar un histórico artificial.",
    tip: "Consulta la fecha del dato. Las simulaciones siguen siendo supuestos y todavía no se recalibran con este histórico."
  },
  scenarios: {
    title: "Prueba distintos escenarios",
    body: "Elige una región y un sector, y mueve los controles para explorar qué podría ocurrir si cada situación ganara peso. El resultado resume los supuestos que has elegido; no es una probabilidad comprobada ni una predicción.",
    tip: "Si quieres comparar dos ideas, cambia un control cada vez y observa cómo se mueve el resultado."
  },
  variables: {
    title: "Mira por dónde se transmite el riesgo",
    body: "Esta tabla traduce tus escenarios a tipos, inflación, divisas y otras variables. Los niveles actuales son referencias fijas del modelo: todavía no son cotizaciones ni tienen una serie histórica conectada.",
    tip: "Separa siempre el dato observado del impacto estimado por el escenario."
  },
  nlp: {
    title: "Revisa un titular o una nota",
    body: "Pega un texto para detectar palabras asociadas a tensión o distensión. La herramienta cuenta términos; no comprueba la noticia ni entiende siempre el contexto, la ironía o una negación.",
    tip: "Comprueba el texto original y la fuente antes de sacar conclusiones."
  },
  allocation: {
    title: "Consulta señales orientativas por activo",
    body: "El modelo combina sus supuestos para mostrar una posible dirección del impacto en algunos activos. Es una señal simplificada, no una recomendación personalizada ni una cartera optimizada.",
    tip: "Mira qué supuesto produce la señal y contrástalo con análisis y datos actuales."
  }
};

// Sensibilidad estimada de precio (%) por unidad de vector de impacto [-1,1].
// Modelo ilustrativo ZRC — no constituye proyección exacta de mercado.
// "fx" cambia de signo entre regiones porque EUR/USD y DXY suben cuando la
// divisa local SE FORTALECE, mientras que USD/CNY sube cuando el yuan SE
// DEBILITA — el coeficiente refleja ese efecto en el exportador local.
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
const normalizeWeights = (weights) => {
  const total = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  if (total <= 0) return Object.fromEntries(Object.entries(SCENARIOS).map(([key, scenario]) => [key, scenario.prob]));
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Math.max(0, Number(value) || 0) / total]));
};
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
      {label && <div style={{ fontSize: 11, color: "#64748B", marginTop: -4, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>}
    </div>
  );
}

function MiniBar({ value, max = 1, color, width = 80 }) {
  const pct = clamp(Math.abs(value) / max * 100, 0, 100);
  const isNeg = value < 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: width + 50 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: isNeg ? "#EF4444" : "#10B981", minWidth: 42, textAlign: "right" }}>
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

function DataTicker({ items, collectedAt }) {
  return (
    <section className="zrc-ticker-shell" aria-label="Indicadores de mercado observados">
      <div className="zrc-ticker-heading" style={{flexWrap:"wrap"}}>
        <span>MERCADOS OBSERVADOS</span>
        <span>{collectedAt ? `FRED · Captura ${collectedAt.slice(0,10)}` : "Sin captura disponible"}</span>
      </div>
      <div className="zrc-observed-grid">
        {items.length ? items.map(item => (
          <div key={item.id} className="zrc-observed-card">
            <span className="zrc-observed-label">{item.label}</span>
            <strong className="zrc-observed-value">{item.value} <span className="zrc-observed-unit">{item.unit}</span></strong>
            <span className="zrc-observed-date">Observación: {item.date} · FRED</span>
          </div>
        )) : <p style={{padding:16,color:"#FBBF24"}}>Datos no disponibles; no se muestran valores simulados.</p>}
      </div>
    </section>
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

export default function GeoRiskDashboard({ countryContext = null }) {
  const [activeScenario, setActiveScenario] = useState("tariff_escalation");
  const [sector, setSector] = useState("global");
  const [region, setRegion] = useState("eu");
  const DEFAULT_WEIGHTS = Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.prob]));
  const [scenarioWeights, setScenarioWeights] = useState(DEFAULT_WEIGHTS);
  const [nlpText, setNlpText] = useState("");
  const [nlpResult, setNlpResult] = useState(null);
  const [time, setTime] = useState(new Date());
  const [tab, setTab] = useState("data");
  const [impactView, setImpactView] = useState("variables");
  const [showDecisionBrief, setShowDecisionBrief] = useState(true);
  const [compareCountry, setCompareCountry] = useState("");
  const [primaryCountry, setPrimaryCountry] = useState(countryContext?.name || "");
  useEffect(() => { setPrimaryCountry(countryContext?.name || ""); }, [countryContext?.name]);
  const [dealName, setDealName] = useState("");
  const [financialInputs,setFinancialInputs] = useState({...DEFAULT_INVESTMENT_INPUTS});
  const [financialEditedFields,setFinancialEditedFields] = useState([]);
  const [financialCountryAdjustment,setFinancialCountryAdjustment] = useState(false);
  const [financialSensitivity,setFinancialSensitivity] = useState(1);
  const [workspaceMessage,setWorkspaceMessage] = useState("");
  const [briefs, setBriefs] = useState(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem("zrc-georisk-briefs-v1") || "[]");
      return Array.isArray(parsed) ? parsed.filter(x => x && typeof x === "object").slice(0,20) : [];
    } catch { return []; }
  });
  const [briefStorageError, setBriefStorageError] = useState("");
  useEffect(() => {
    try { window.localStorage.setItem("zrc-georisk-briefs-v1", JSON.stringify(briefs)); setBriefStorageError(""); }
    catch { setBriefStorageError("El navegador no permite guardar fichas en este dispositivo."); }
  }, [briefs]);

  const sectionGuide = SECTION_GUIDES[tab];
  const exportWorkspace = () => {
    const snapshot=createWorkspaceSnapshot({project:dealName,country:primaryCountry,comparison:compareCountry,region,sector,scenarioWeights,inputs:financialInputs,editedFields:financialEditedFields,countryAdjustment:financialCountryAdjustment,sensitivity:financialSensitivity});
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download="ZRC_Investment_Workspace_"+(dealName.trim().normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"_").slice(0,40)||"expediente")+".json";
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    setWorkspaceMessage("Expediente exportado. Guarda el archivo en una ubicación protegida.");
  };
  const importWorkspace = async event => {
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    if(file.size>65536){setWorkspaceMessage("Archivo demasiado grande (máximo 64 KB).");return;}
    try{
      const data=parseWorkspaceSnapshot(JSON.parse(await file.text()));
      setDealName(data.project);setPrimaryCountry(data.country);setCompareCountry(data.comparison);
      setRegion(data.region);if(SECTORS[data.sector])setSector(data.sector);
      setScenarioWeights(data.scenarioWeights);setFinancialInputs(data.inputs);
      setFinancialEditedFields(data.editedFields);setFinancialCountryAdjustment(data.countryAdjustment);setFinancialSensitivity(data.sensitivity);
      setTab("investment");setWorkspaceMessage("Expediente importado en esta sesión. No se ha enviado a un servidor.");
    }catch(err){setWorkspaceMessage("No se ha importado: "+err.message);}
  };

  const {variables:ECONOMIC_VARIABLES,observedCount, status:observationStatus}=useGeoRiskObservedBaselines(region,ECONOMIC_VARIABLES_BY_REGION[region]);
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

  const sectorMult = SECTORS[sector].mult;

  const computeImpact = useCallback((varKey) => {
    let total = 0;
    const normalizedWeights = normalizeWeights(scenarioWeights);
    Object.entries(SCENARIOS).forEach(([sk, sv]) => {
      const w = normalizedWeights[sk] || 0;
      total += w * (sv.impactByRegion[region]?.[varKey] || 0) * sectorMult;
    });
    return total;
  }, [scenarioWeights, sectorMult, region]);

  const baseCompositeRisk = useMemo(() => {
    let r = 0;
    const normalizedWeights = normalizeWeights(scenarioWeights);
    Object.entries(SCENARIOS).forEach(([k, v]) => {
      r += (normalizedWeights[k] || 0) * v.risk;
    });
    return r;
  }, [scenarioWeights]);

  const compositeRisk = useMemo(() => clamp(baseCompositeRisk * sectorMult, 0, 100), [baseCompositeRisk, sectorMult]);
  const sectorFactorChangePct = Math.round((sectorMult - 1) * 100);

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

  const decisionDrivers = Object.entries(ECONOMIC_VARIABLES).map(([key, item]) => ({
    key, label: item.label, impact: computeImpact(key)
  })).filter(item => Number.isFinite(item.impact)).sort((a,b) => Math.abs(b.impact)-Math.abs(a.impact)).slice(0,3);
  const dominantScenario = Object.entries(SCENARIOS).sort((a,b)=>
    (scenarioWeights[b[0]]*b[1].risk)-(scenarioWeights[a[0]]*a[1].risk))[0]?.[1]?.label || "No disponible";

  const saveDecisionBrief = () => {
    const name = dealName.trim().slice(0,90);
    if (!name) return;
    const brief = {
      id: String(Date.now()), name, country: primaryCountry.trim().slice(0,90),
      comparison: compareCountry.trim().slice(0,90), region, sector,
      scenarioWeights: {...scenarioWeights}, score: Number(compositeRisk.toFixed(1)),
      dominantScenario, savedAt: new Date().toISOString(),
      drivers: decisionDrivers.map(d => ({label:d.label,impact:Number(d.impact.toFixed(3))})),
      methodology: GEORISK_SCENARIO_VERSION
    };
    setBriefs(prev => [brief,...prev].slice(0,20));
    // Keep the current operation active after saving; the saved brief is a scenario snapshot, not the full financial model.
  };
  const restoreDecisionBrief = (brief) => {
    if (REGIONS[brief.region]) setRegion(brief.region);
    if (SECTORS[brief.sector]) setSector(brief.sector);
    if (brief.scenarioWeights && typeof brief.scenarioWeights === "object") {
      setScenarioWeights(Object.fromEntries(Object.keys(SCENARIOS).map(key => [
        key, Number.isFinite(brief.scenarioWeights[key]) ? brief.scenarioWeights[key] : DEFAULT_WEIGHTS[key]
      ])));
    }
    setCompareCountry(brief.comparison || "");
    setDealName(brief.name || "");
    setPrimaryCountry(brief.country || "");
    setTab("scenarios");
    setShowDecisionBrief(true);
  };

  const tickerItems = (marketSnapshot.status === "available" || marketSnapshot.status === "partial" ? marketSnapshot.series : []).filter(item => item.latest && Number.isFinite(item.latest.value)).map(item => ({
    id:item.id,label:item.label,value:item.latest.value.toLocaleString("es-ES",{maximumFractionDigits:2}),
    unit:item.unit,date:item.latest.date
  }));

  return (
    <div style={{
      minHeight: "100vh", background: "#070c17",
      color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @keyframes zrc-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes zrc-fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes zrc-ticker-scroll { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        .zrc-observed-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,195px),1fr)); gap:1px; background:#263754; }\n        .zrc-observed-card:last-child:nth-child(odd) { grid-column: 1 / -1; }
        .zrc-observed-card { background:#0D182B; padding:14px 16px; display:flex; flex-direction:column; gap:7px; min-width:0; }
        .zrc-observed-label { color:#B8D9FF; font:650 12px/1.4 'JetBrains Mono',monospace; overflow-wrap:anywhere; }
        .zrc-observed-value { color:#F8FAFC; font:700 clamp(17px,2.1vw,22px)/1.3 'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
        .zrc-observed-unit { color:#B7C6DC; font:500 11px/1.4 'JetBrains Mono',monospace; }
        .zrc-observed-date { color:#B2C2D9; font:500 10px/1.5 'JetBrains Mono',monospace; }
        @media(max-width:560px){ .zrc-observed-grid {grid-template-columns:repeat(2,minmax(0,1fr));} .zrc-observed-card {padding:16px 12px;gap:10px;} .zrc-observed-value {font-size:clamp(17px,4.5vw,22px);} .zrc-observed-date {font-size:11px;} .zrc-ticker-heading {align-items:flex-start;flex-direction:column;gap:4px;} }
        .zrc-ticker-shell { margin-top: 2px; border: 1px solid #263754; border-radius: 12px; background: #0D182B; overflow: hidden; }
        .zrc-ticker-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 14px; border-bottom: 1px solid #263754; color: #60A5FA; font: 700 10px/1.4 'JetBrains Mono', monospace; letter-spacing: .09em; }
        .zrc-ticker-heading span:last-child { color: #AFC0D7; font-weight: 500; letter-spacing: .02em; text-transform: none; }
        .zrc-ticker-window { overflow-x: auto; overflow-y: hidden; outline: none; touch-action: pan-x; scrollbar-width: none; -webkit-overflow-scrolling: touch; -webkit-mask-image: linear-gradient(90deg, transparent, #000 18px, #000 calc(100% - 18px), transparent); mask-image: linear-gradient(90deg, transparent, #000 18px, #000 calc(100% - 18px), transparent); }
        .zrc-ticker-window::-webkit-scrollbar { display: none; }
        .zrc-ticker-window:focus-visible { box-shadow: 0 0 0 2px #60A5FA inset; }
        .zrc-ticker-track { display: flex; width: max-content; animation: zrc-ticker-scroll 42s linear infinite; will-change: transform; }
        .zrc-ticker-window:hover .zrc-ticker-track,
        .zrc-ticker-window:focus .zrc-ticker-track,
        .zrc-ticker-window:active .zrc-ticker-track { animation-play-state: paused; }
        .zrc-ticker-group { display: flex; flex: none; align-items: stretch; }
        .zrc-ticker-item { display: grid; grid-template-columns: auto auto auto; grid-template-areas: 'label value direction' 'kind kind kind'; align-items: center; column-gap: 8px; row-gap: 4px; min-width: 245px; padding: 12px 18px; border-right: 1px solid #263754; white-space: nowrap; }
        .zrc-ticker-label { grid-area: label; color: #93C5FD; font: 500 13px/1.35 'JetBrains Mono', monospace; }
        .zrc-ticker-value { grid-area: value; color: #F8FAFC; font: 700 16px/1.35 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .zrc-ticker-direction { grid-area: direction; font: 700 11px/1 'JetBrains Mono', monospace; }
        .zrc-ticker-kind { grid-area: kind; color: #64748B; font: 600 9px/1.3 'JetBrains Mono', monospace; letter-spacing: .08em; }
        @media (max-width: 720px) {
          .zrc-ticker-heading { padding-inline: 12px; }
          .zrc-ticker-item { min-width: 220px; padding: 11px 14px; }
          .zrc-ticker-track { animation-duration: 34s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .zrc-ticker-window { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
          .zrc-ticker-track { animation: none; }
          .zrc-ticker-group[aria-hidden="true"] { display: none; }
        }
        @keyframes zrc-scanline { from { top: -2px } to { top: 100% } }
        @keyframes zrc-gridPulse { 0%,100% { opacity:0.025 } 50% { opacity:0.05 } }
        .zrc-georisk input[type=range] { -webkit-appearance: none; height: 3px; background: #1a2744; border-radius: 2px; outline: none }
        .zrc-georisk input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: #3B82F6; cursor: pointer; box-shadow: 0 0 8px #3B82F680; border: 2px solid #0a1322 }
        .zrc-georisk ::-webkit-scrollbar { width: 4px; height: 4px }
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
        .zrc-tab { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease; }
        .zrc-tab:hover { background: #213c60 !important; border-color: #5b88bc !important; }
        .zrc-tab:focus-visible { outline: 3px solid #93C5FD; outline-offset: 3px; }
        .zrc-tab:active { transform: scale(0.985); }
        .zrc-tab[aria-selected="true"] { color: #fff !important; }
        .zrc-tabbar { display: grid !important; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 9px !important; }
        .zrc-tabbar .zrc-tab { width: 100%; min-width: 0; min-height: 64px; }
        .zrc-tab-label { line-height: 1.3; overflow-wrap: normal; }
        .zrc-tab-icon { flex-shrink: 0; }
        @media (max-width: 900px) {
          .zrc-tabbar { grid-template-columns: repeat(2,minmax(0,1fr)); }
        }
        .zrc-row:hover { background: #101d33 !important; }
        .zrc-reset:hover { border-color: #3B82F6 !important; color: #93C5FD !important; }
        .zrc-control-row { display: grid; grid-template-columns: auto 1fr auto; }

        .zrc-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .zrc-table-inner { min-width: 640px; }
        @media (max-width: 720px) {
          .zrc-control-row { grid-template-columns: 1fr; justify-items: center; }
          .zrc-region-sector { width: 100%; text-align: center; }
          .zrc-region-sector > div { justify-content: center; }
          .zrc-mult-block { text-align: center !important; }
          .zrc-tabbar { gap: 8px !important; padding: 9px !important; }
          .zrc-tabbar .zrc-tab { min-height: 74px; padding: 11px 8px !important; }
          .zrc-tab-label { font-size: 13px; letter-spacing: 0; }
          .zrc-tab-icon { width: 19px; height: 19px; }
        }
        @media (max-width: 360px) {
          .zrc-tabbar { grid-template-columns: 1fr; }
          .zrc-tabbar .zrc-tab { min-height: 54px; }
        }
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
                    fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#fff",
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: "0 4px 16px -4px #3B82F660",
                  }}>ZR</div>
                  <span style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>
                    ZENITH RISE CAPITAL
                  </span>
                </div>
                <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 25, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "#F8FAFC" }}>
                  <Radar size={22} color="#5B9BFF" strokeWidth={2} />
                  GeoRisk Intelligence System
                </h1>
                <div style={{ fontSize: 12, color: "#4B5A72", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  Calesius Global SL · Modelo propietario de análisis geopolítico cuantitativo
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <Pulse color="#F59E0B" />
                  <span style={{ fontSize: 12, color: "#F59E0B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>MODELO</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: "#E2E8F0", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                  {time.toLocaleTimeString("es-ES", { hour12: false })}
                </div>
                <div style={{ fontSize: 11, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace" }}>
                  {time.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} · CET
                </div>
              </div>
            </div>
          </header>

          <div className="zrc-card zrc-control-row" style={{
            gap: 24, padding: "20px 24px", margin: "20px 0", alignItems: "center"
          }}>
            <div style={{ textAlign: "center" }}>
              <RiskGauge value={compositeRisk} size={110} label="Riesgo del escenario" />
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>ÁMBITO MUNDIAL</div>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginTop: 2,
                color: isCustomized ? "#F59E0B" : "#10B981",
              }}>
                {isCustomized ? "▲ ESCENARIO PERSONALIZADO" : "● PESOS DE REFERENCIA"}
              </div>
            </div>
            <div className="zrc-region-sector">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginRight: 4 }}>REGIÓN DE IMPACTO:</span>
                {Object.entries(REGIONS).map(([k, v]) => (
                  <button key={k} className="zrc-pill" onClick={() => setRegion(k)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid",
                    borderColor: region === k ? "#A78BFA" : "#1e2d47",
                    background: region === k ? "#A78BFA18" : "transparent",
                    color: region === k ? "#C4B5FD" : "#64748B",
                    fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 0.5,
                  }}>{v.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginRight: 4 }}>EXPOSICIÓN SECTORIAL:</span>
                {Object.entries(SECTORS).map(([k, v]) => (
                  <button key={k} className="zrc-pill" onClick={() => setSector(k)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid",
                    borderColor: sector === k ? "#3B82F6" : "#1e2d47",
                    background: sector === k ? "#3B82F618" : "transparent",
                    color: sector === k ? "#60A5FA" : "#64748B",
                    fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 0.5,
                  }}>{v.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", marginTop: 10 }}>
                <strong style={{ color: "#CBD5E1" }}>Impactos: {REGIONS[region].label} · {SECTORS[sector].label}.</strong><br />La región cambia las variables y señales de activos. El score mide el escenario mundial con la exposición sectorial elegida; se mantiene al cambiar de región.
              </div>
            </div>
            <div className="zrc-mult-block" style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", maxWidth: 270 }}>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1 }}>FACTOR SECTORIAL · SUPUESTO ZRC</div>
              <div style={{ fontSize: 21, fontWeight: 600, color: sectorMult > 1 ? "#F59E0B" : "#10B981" }}>
                {sectorMult.toFixed(2)}×
              </div>
              <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 3 }}>
                {baseCompositeRisk.toFixed(1)} × {sectorMult.toFixed(2)} = {compositeRisk.toFixed(1)} / 100
              </div>
              <div style={{ fontSize: 10, color: "#64748B", lineHeight: 1.5, marginTop: 4 }}>
                {sectorFactorChangePct === 0 ? "1,00 no ajusta el riesgo base." : `Este factor ${sectorFactorChangePct < 0 ? "reduce" : "aumenta"} el riesgo un ${Math.abs(sectorFactorChangePct)}%.`}
                {" "}También ajusta el impacto estimado en variables. Es un supuesto fijo, no se obtiene de cotizaciones históricas.
              </div>
            </div>
          </div>

          <nav className="zrc-card zrc-tabbar" aria-label="Secciones de GeoRisk Intelligence" role="tablist" style={{
            padding: 10, marginBottom: 22, borderRadius: 16, border: "1px solid #344b6a",
            background: "linear-gradient(180deg,#10223a 0%,#0b192c 100%)",
            boxShadow: "0 12px 30px -18px #000"
          }}>
            {[
              { id: "data", label: "Mercados", icon: TrendingUp, subtitle: "Datos observados" },
              { id: "scenarios", label: "Escenarios", icon: Radar, subtitle: "Simulaciones" },
              { id: "impact", label: "Análisis de impacto", icon: Activity, subtitle: "Sensibilidades" },
              { id: "investment", label: "Decisión de inversión", icon: PieChart, subtitle: "Valoración" },
            ].map(t2 => {
              const selected = tab === t2.id;
              return <button type="button" key={t2.id} role="tab" aria-selected={selected}
                className="zrc-tab" onClick={() => setTab(t2.id)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "13px 10px", border: selected ? "1px solid #6aa9f5" : "1px solid #314762",
                  borderRadius: 11,
                  background: selected ? "linear-gradient(145deg,#24558a,#1b3c63)" : "#14263e",
                  boxShadow: selected ? "0 5px 20px #3B82F633, inset 0 1px #ffffff26" : "inset 0 1px #ffffff09",
                  color: selected ? "#fff" : "#E2E8F0", cursor: "pointer",
                  fontSize: 14, fontWeight: selected ? 750 : 650,
                  fontFamily: "'DM Sans',sans-serif", textAlign: "center"
                }}>
                <t2.icon className="zrc-tab-icon" size={21} strokeWidth={2} color={selected ? "#BFDBFE" : "#93C5FD"} />
                <span className="zrc-tab-label">{t2.label}</span>
                <span style={{fontSize: 10, fontWeight: 500, color: selected ? "#D8E9FF" : "#AFC0D7"}}>{t2.subtitle}</span>
              </button>;
            })}
          </nav>

          <section aria-label="Expediente activo de inversión" style={{background:"#10253B",border:"1px solid #3D6287",borderRadius:14,padding:"15px 18px",margin:"0 0 16px"}}>
            <div style={{fontSize:10,fontWeight:750,letterSpacing:1.2,color:"#93C5FD"}}>ZRC · INVESTMENT WORKSPACE · VISTA DE TRABAJO</div>
            <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:8}}>
              <div><strong style={{fontSize:17,color:"#F1F5F9"}}>{dealName.trim() || "Operación sin nombre"}</strong><div style={{fontSize:12,color:"#CBD5E1",marginTop:4}}>{primaryCountry.trim() || "País pendiente"} · {REGIONS[region].label} · {SECTORS[sector].label}</div></div>
              <span style={{fontSize:11,color:"#FCD34D",border:"1px solid #8D683A",borderRadius:8,padding:"7px 10px"}}>Simulación de analista · No validada</span>
            </div>
            <div style={{fontSize:11,color:"#9BB1C8",marginTop:9}}>País y nombre compartidos entre escenarios e inversión. Las fichas locales guardan un resumen del escenario, no los flujos del motor financiero. No introduzcas información confidencial.</div>
          </section>
          <div aria-label="Portabilidad del expediente" style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"center",margin:"0 0 16px"}}>
            <button type="button" onClick={exportWorkspace} style={{border:"1px solid #537CA6",background:"#20466D",color:"#F8FAFC",borderRadius:8,padding:"10px 13px",fontSize:12,cursor:"pointer"}}>Exportar expediente JSON</button>
            <label style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid #537CA6",background:"#142C47",color:"#E2E8F0",borderRadius:8,padding:"10px 13px",fontSize:12,cursor:"pointer"}}>Importar expediente JSON <input aria-label="Importar expediente JSON" type="file" accept=".json,application/json" onChange={importWorkspace} style={{width:"155px",maxWidth:"100%",fontSize:11}}/></label>
            <span role="status" style={{fontSize:11,color:"#CBD5E1"}}>{workspaceMessage || "Los supuestos financieros se mantienen en memoria entre pestañas; no se guardan automáticamente."}</span>
          </div>
          {tab === "investment" && <GeoRiskInvestmentEngine countryContext={primaryCountry ? {name: primaryCountry} : null} selectedCountry={primaryCountry} onCountryChange={setPrimaryCountry} selectedProject={dealName} onProjectChange={setDealName} financialInputs={financialInputs} onFinancialInputsChange={setFinancialInputs} financialEditedFields={financialEditedFields} onFinancialEditedFieldsChange={setFinancialEditedFields} financialCountryAdjustment={financialCountryAdjustment} onFinancialCountryAdjustmentChange={setFinancialCountryAdjustment} financialSensitivity={financialSensitivity} onFinancialSensitivityChange={setFinancialSensitivity} />}

          {(tab === "scenarios" || tab === "impact") && (
            <section aria-label="Ficha de decisión para inversores" style={{margin:"0 0 18px",border:"1px solid #355173",borderRadius:15,background:"#0D1B30",padding:"17px 19px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div><div style={{fontSize:10,color:"#93C5FD",fontWeight:700,letterSpacing:1.2}}>INTELLIGENCE · DECISION BRIEF</div>
                  <h3 style={{margin:"6px 0 0",fontSize:18,color:"#F1F5F9"}}>De la exposición a una hipótesis de inversión</h3></div>
                <button type="button" aria-expanded={showDecisionBrief} onClick={()=>setShowDecisionBrief(v=>!v)} style={{border:"1px solid #355173",background:"#142743",borderRadius:9,color:"#CBD5E1",padding:"9px 12px",cursor:"pointer",fontSize:12}}>{showDecisionBrief?"Ocultar análisis":"Mostrar análisis"}</button>
              </div>
              {showDecisionBrief && <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:10,marginTop:14}}>
                  <div style={{padding:13,border:"1px solid #28415F",borderRadius:10}}>
                    <div style={{fontSize:10,color:"#93C5FD",marginBottom:7}}>CONTEXTO Y EXPOSICIÓN</div>
                    <div style={{fontSize:14,fontWeight:700}}>{primaryCountry.trim() || "Sin país seleccionado"}</div>
                    <div style={{fontSize:12,color:"#94A3B8",marginTop:5}}>Simulación: {REGIONS[region].label} · {SECTORS[sector].label}</div>
                    {primaryCountry.trim() && <div style={{fontSize:11,color:"#FBBF24",marginTop:7}}>El país no modifica automáticamente los parámetros regionales.</div>}
                  </div>
                  <div style={{padding:13,border:"1px solid #28415F",borderRadius:10}}>
                    <div style={{fontSize:10,color:"#93C5FD",marginBottom:7}}>HIPÓTESIS DE ESCENARIO</div>
                    <div style={{fontSize:22,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{compositeRisk.toFixed(1)} <span style={{fontSize:12,color:"#94A3B8"}}>/100</span></div>
                    <div style={{fontSize:12,color:"#CBD5E1",marginTop:5}}>{dominantScenario}</div>
                    <div style={{fontSize:11,color:"#94A3B8",marginTop:5}}>Score ilustrativo; no equivale a probabilidad.</div>
                  </div>
                  <div style={{padding:13,border:"1px solid #28415F",borderRadius:10}}>
                    <div style={{fontSize:10,color:"#93C5FD",marginBottom:7}}>CANALES A CONTRASTAR</div>
                    {decisionDrivers.map(d=><div key={d.key} style={{fontSize:12,color:"#CBD5E1",marginBottom:6}}>{d.label} <span style={{color:"#94A3B8"}}>· impacto supuesto {d.impact>0?"+":""}{d.impact.toFixed(2)}</span></div>)}
                    <div style={{fontSize:10,color:"#94A3B8"}}>Ordenados por magnitud del modelo, no por evidencia empírica.</div>
                  </div>
                </div>
                <div style={{marginTop:14,padding:"13px 14px",border:"1px solid #28415F",borderRadius:10}}>
                  <div style={{fontSize:11,color:"#93C5FD",fontWeight:700,marginBottom:8}}>COMPARAR PAÍSES · MATRIZ DE DUE DILIGENCE</div>
                  <label htmlFor="georisk-primary-country" style={{display:"block",fontSize:12,color:"#CBD5E1",marginBottom:6}}>País principal (inversión / exposición)</label>
                  <input id="georisk-primary-country" list="georisk-primary-countries" maxLength={90} value={primaryCountry} onChange={e=>setPrimaryCountry(e.target.value)} placeholder="Selecciona un país, p. ej. España" style={{width:"100%",maxWidth:320,boxSizing:"border-box",background:"#081426",border:"1px solid #50749A",borderRadius:8,color:"#F1F5F9",padding:"11px 12px",fontSize:14,marginBottom:12}}/>
                  <datalist id="georisk-primary-countries">{[...COUNTRY_PROFILES,...COUNTRY_EXPANSION_CANDIDATES].map(p=><option key={p.iso} value={p.name}/>)}</datalist>
                  <div style={{fontSize:11,color:"#94A3B8",marginBottom:12}}>Selección compartida con «Decisión de inversión». No recalibra automáticamente el escenario regional.</div>
                  <label htmlFor="georisk-compare-country" style={{display:"block",fontSize:12,color:"#CBD5E1",marginBottom:6}}>Segundo país (comparación cualitativa)</label>
                  <input id="georisk-compare-country" maxLength={90} value={compareCountry} onChange={e=>setCompareCountry(e.target.value)} placeholder="Ej. México" style={{width:"100%",maxWidth:320,boxSizing:"border-box",background:"#081426",border:"1px solid #355173",borderRadius:8,color:"#F1F5F9",padding:"10px 12px",fontSize:13}}/>
                  {compareCountry.trim() && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10,marginTop:12}}>
                    {[primaryCountry.trim() || "País principal sin seleccionar",compareCountry.trim()].map((name,i)=><div key={i} style={{border:"1px solid #28415F",borderRadius:9,padding:12}}>
                      <strong style={{color:"#F1F5F9",fontSize:13}}>{name}</strong>
                      <div style={{fontSize:11,color:"#94A3B8",marginTop:7,lineHeight:1.7}}>Contrastar: riesgo regulatorio, exposición FX, financiación, cadena de suministro, repatriación de capital y contraparte local.</div>
                      <div style={{fontSize:11,color:"#FBBF24",marginTop:7}}>Sin score de país verificado. No se asignan diferencias numéricas artificiales.</div>
                    </div>)}
                  </div>}
                </div>
                <div style={{marginTop:14,padding:"13px 14px",border:"1px solid #28415F",borderRadius:10}}>
                  <div style={{fontSize:11,color:"#93C5FD",fontWeight:700,marginBottom:8}}>GUARDAR FICHA DE OPERACIÓN</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    <input aria-label="Nombre de la operación" maxLength={90} value={dealName} onChange={e=>setDealName(e.target.value)} placeholder="Nombre de operación / proyecto" style={{flex:"1 1 220px",minWidth:0,background:"#081426",border:"1px solid #355173",borderRadius:8,color:"#F1F5F9",padding:"10px 12px",fontSize:13}}/>
                    <button type="button" disabled={!dealName.trim()} onClick={saveDecisionBrief} style={{background:dealName.trim()?"#24578C":"#263548",color:"#F8FAFC",border:"none",borderRadius:8,padding:"10px 14px",cursor:dealName.trim()?"pointer":"not-allowed",fontSize:12}}>Guardar escenario</button>
                  </div>
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:8}}>Se guardan hasta 20 fichas en este navegador, no en tu cuenta. Exporta un informe HTML imprimible desde cada ficha. No introduzcas datos confidenciales: otros usuarios de este dispositivo podrían acceder a ellas.</div>
                  {briefStorageError && <div role="alert" style={{fontSize:11,color:"#FBBF24",marginTop:7}}>{briefStorageError}</div>}
                  {briefs.length>0 && <div style={{marginTop:12,display:"grid",gap:7}}>
                    {briefs.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,border:"1px solid #28415F",borderRadius:8,padding:"9px 11px"}}>
                      <div style={{fontSize:12,color:"#CBD5E1"}}><strong>{b.name}</strong> · {b.country || "Sin país"}{b.comparison?" / "+b.comparison:""} · {b.score}/100 <span style={{color:"#94A3B8"}}>({new Date(b.savedAt).toLocaleDateString("es-ES")})</span></div>
                      <div style={{display:"flex",gap:6}}>
                        <button type="button" aria-label={"Exportar informe "+b.name} onClick={()=>downloadGeoRiskInvestmentReport(b)} style={{border:"1px solid #355173",borderRadius:7,background:"#142743",color:"#93C5FD",padding:"6px 10px",cursor:"pointer",fontSize:11}}>Informe HTML</button>
                        <button type="button" onClick={()=>restoreDecisionBrief(b)} style={{border:"1px solid #355173",borderRadius:7,background:"#142743",color:"#F1F5F9",padding:"6px 10px",cursor:"pointer",fontSize:11}}>Restaurar</button>
                        <button type="button" aria-label={"Eliminar ficha "+b.name} onClick={()=>setBriefs(prev=>prev.filter(x=>x.id!==b.id))} style={{border:"1px solid #6B3740",borderRadius:7,background:"transparent",color:"#FDA4AF",padding:"6px 10px",cursor:"pointer",fontSize:11}}>Eliminar</button>
                      </div>
                    </div>)}
                  </div>}
                </div>
                <div style={{marginTop:13,padding:"12px 14px",borderRadius:10,background:"#10283A",fontSize:12,lineHeight:1.65,color:"#CBD5E1"}}>
                  <strong style={{color:"#93C5FD"}}>Checklist de due diligence:</strong> contrastar exposición de ingresos y costes, divisa funcional y coberturas, coste de financiación, concentración de proveedores y sensibilidad del capital circulante. Validar cada hipótesis con datos de la compañía antes de tomar decisiones.
                </div>
                <p style={{fontSize:11,lineHeight:1.6,color:"#94A3B8",margin:"10px 0 0"}}>Fuente de la simulación: supuestos ZRC del modelo de escenarios. No se infieren rendimientos, valoraciones ni recomendaciones de compra/venta. Las cotizaciones observadas se consultan por separado en Mercados.</p>
              </>}
            </section>
          )}

          {tab === "impact" && (
            <nav aria-label="Herramientas de análisis de impacto" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"-8px 0 18px"}}>
              {[
                {id:"variables",label:"Variables",icon:Activity},
                {id:"allocation",label:"Activos",icon:PieChart},
                {id:"nlp",label:"Noticias y palabras clave",icon:MessageSquare},
              ].map(item=><button key={item.id} type="button" aria-pressed={impactView===item.id} onClick={()=>setImpactView(item.id)}
                style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 13px",borderRadius:9,border:impactView===item.id?"1px solid #60A5FA":"1px solid #273D5B",background:impactView===item.id?"#1E3A5F":"#0D182B",color:impactView===item.id?"#F1F5F9":"#94A3B8",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <item.icon size={14}/>{item.label}
              </button>)}
            </nav>
          )}

          {tab === "data" && (
            <div style={{marginBottom:18}}>
              <DataTicker items={tickerItems} collectedAt={marketSnapshot.collected_at} />
          <div role="note" style={{ margin: "12px 0 0", padding: "12px 16px", border: "1px solid #7C5A1B", borderLeft: "3px solid #F59E0B", borderRadius: 8, background: "#2A2112", color: "#FDE68A", fontSize: 12, lineHeight: 1.6 }}>
            DATOS OBSERVADOS ARRIBA: últimas publicaciones archivadas, no cotizaciones en tiempo real. ESCENARIOS ABAJO: supuestos ilustrativos independientes; los impactos no se recalibran con estas cotizaciones.
          </div>
            </div>
          )}

          <div role="status" aria-live="polite" style={{border:"1px solid #285744",borderRadius:15,padding:"15px 18px",margin:"12px 0 16px",background:"linear-gradient(120deg,#102C22,#0D1C18)",color:"#EDF6EF"}}>
    <div style={{fontSize:10,color:"#86EFAC",letterSpacing:1.2,fontWeight:700}}>RESULTADO DEL ESCENARIO</div>
    <div style={{display:"flex",gap:16,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",marginTop:8}}>
      <div><span style={{fontSize:27,fontWeight:750,fontVariantNumeric:"tabular-nums"}}>{compositeRisk.toFixed(1)}</span><span style={{fontSize:12,color:"#A6BDAD"}}> / 100 · riesgo simulado</span><div style={{fontSize:12,color:"#D0E2D5",marginTop:5}}>Principal escenario: <strong>{Object.entries(SCENARIOS).sort((a,b)=>(scenarioWeights[b[0]]*b[1].risk)-(scenarioWeights[a[0]]*a[1].risk))[0][1].label}</strong></div></div>
      <div style={{fontSize:12,color:"#D0E2D5"}}>Zona: <strong>{REGIONS[region].label}</strong></div>
    </div>
    <p style={{fontSize:12,color:"#A5C8B3",margin:"10px 0 0"}}>Modelo ilustrativo, no pronóstico. Los resultados no son cotizaciones ni probabilidades calibradas.</p>
  </div>
  <details style={{margin:"0 0 14px",border:"1px solid #324A40",borderRadius:12,background:"#101E19",color:"#D8E8DD"}}>
    <summary style={{cursor:"pointer",padding:"12px 16px",fontSize:12,fontWeight:700,listStyle:"inside"}}>ⓘ Metodología y fuentes <span style={{fontSize:11,fontWeight:400,opacity:.7}}>· consulta opcional</span></summary>
    <div style={{padding:"0 16px 16px"}}>
      <div role="note" style={{border:"1px solid #8B6A35",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:12,lineHeight:1.6,background:"#251e10",color:"#F3D8A7"}}>
        <strong>Modelo de escenarios ZRC · {GEORISK_SCENARIO_VERSION}</strong>. Los pesos, riesgos intrínsecos, multiplicadores sectoriales y coeficientes de impacto son <strong>supuestos analíticos, no parámetros calibrados</strong>. Las referencias macro de la simulación son fijas e ilustrativas; los datos observados se muestran por separado con fuente y fecha. El índice público ZRC-GRI es otra metodología y sus puntuaciones no son intercambiables con las del simulador.
      </div>
          <div role="status" style={{border:"1px solid #315642",borderRadius:12,padding:"12px 16px",margin:"10px 0",background:"#102218",fontSize:12,color:"#C7E3D0",lineHeight:1.65}}>
  <strong>Referencias macroeconómicas · P0.3</strong> · {observationStatus==="loading"?"Consultando fuentes…":`${observedCount} de ${Object.keys(ECONOMIC_VARIABLES).length} variables con dato observado verificable.`}
  <div>Los restantes niveles base son <strong>supuestos fijos ilustrativos</strong>, no cifras de mercado actualizadas. Las variaciones calculadas son sensibilidades hipotéticas, no pronósticos calibrados.</div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8,marginTop:8}}>
    {Object.entries(ECONOMIC_VARIABLES).map(([key,v])=><div key={key} style={{border:"1px solid #284936",padding:"7px 9px",borderRadius:8}}>
      <div style={{fontSize:11,fontWeight:600}}>{v.label}</div>
      <div style={{fontSize:11,color:v.base_status==="observed"?"#86EFAC":"#F8CD88"}}>{v.base_status==="observed"?`Observado · ${v.observed.date}`:"Supuesto ilustrativo"}</div>
      {v.base_status==="observed"?<a href={v.observed.source_url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#93C5FD"}}>{v.observed.source} · referencia oficial</a>:<div style={{fontSize:10,opacity:.7}}>{v.reference_warning}</div>}
    </div>)}
  </div>
</div>
<div role="note" style={{padding:"13px 16px",borderRadius:12,marginBottom:14,border:"1px solid #8B6A35",background:"#261F13",color:"#F6D79B",fontSize:12,lineHeight:1.65}}>
   <strong>Auditoría P0.4 · Sensibilidades ilustrativas</strong> · Las cifras calculadas sobre activos son <strong>puntos heurísticos sin unidad financiera</strong>, no variaciones porcentuales de precio ni rentabilidades esperadas. Los coeficientes no están calibrados y no justifican operaciones automáticas. Modelo: {SENSITIVITY_VERSION}.
   <details style={{marginTop:7}}><summary style={{cursor:"pointer"}}>Ver contribuciones por activo</summary>
     {ASSETS.map(asset=>{const d=decomposeAssetSensitivity(asset,Object.fromEntries(Object.keys(ECONOMIC_VARIABLES).map(k=>[k,computeImpact(k)])),region);return <div key={asset} style={{padding:"9px 0",borderBottom:"1px solid #5E4826"}}>
       <strong>{asset}</strong> · {d.score===null?"Sin cobertura":d.score.toFixed(2)+" puntos ilustrativos"}
       <div style={{fontSize:11,opacity:.85}}>{d.terms.map(t=>t.contribution===null?`${t.variable}: sin dato`:`${t.variable}: ${t.impact.toFixed(2)} × ${t.coefficient} = ${t.contribution.toFixed(2)}`).join(" · ")}</div>
     </div>})}
   </details>
  </div>
  <GeoRiskTaxonomyBridge origin="simulator" />
    </div>
  </details>

          {/* SCENARIOS */}
        {tab === "data" && (<>
          <div className="zrc-card" style={{padding:"18px 20px",marginBottom:16,borderLeft:"3px solid #60A5FA",lineHeight:1.7}}>
            <strong style={{color:"#BFDBFE"}}>Cómo se conectan las piezas de GeoRisk</strong>
            <p style={{margin:"8px 0",color:"#CBD5E1"}}><b>1. Evidencia observada:</b> precios de mercado, datos macro y el índice GPR de Caldara–Iacoviello basado en prensa. Cada fuente tiene su propia fecha y metodología.</p>
            <p style={{margin:"8px 0",color:"#CBD5E1"}}><b>2. Exposición:</b> las <a href="/inteligencia/paises" style={{color:"#93C5FD"}}>fichas de país</a> describen factores estructurales y vulnerabilidades. No son una descomposición automática del GPR.</p>
            <p style={{margin:"8px 0",color:"#CBD5E1"}}><b>3. Escenarios ZRC:</b> ponderaciones y sensibilidades estiman impactos hipotéticos por región y sector. No están calibrados automáticamente con las series observadas.</p>
            <p style={{margin:"8px 0 0",color:"#CBD5E1"}}><b>4. Interpretación:</b> contrasta escenarios con evidencia histórica antes de extraer implicaciones de inversión. <b>GPR, riesgo país y ZRC-GRI son medidas distintas; sus puntuaciones no son intercambiables.</b></p>
          </div>
          <GeoRiskMarketData region={region} />
          <GeoRiskMacroData />
          <GeoRiskGovernanceData />
          <details style={{border:"1px solid #263754",borderRadius:12,padding:"14px 18px",marginTop:16,background:"#0D182B"}}>
            <summary style={{cursor:"pointer",fontWeight:700,color:"#BFDBFE"}}>Indicador de riesgo geopolítico en prensa (GPR) · evidencia externa, no índice ZRC</summary>
            <p style={{fontSize:12,lineHeight:1.7,color:"#CBD5E1"}}>El GPR mide la frecuencia relativa de noticias relacionadas con tensiones y acontecimientos geopolíticos. Sirve como contexto histórico y contraste externo; no calcula automáticamente el riesgo de un país, la probabilidad de conflicto ni los escenarios de ZRC.</p>
            <GeoRiskGprData />
          </details>
        </>)}

          {tab === "scenarios" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>

              <details style={{marginBottom:16,border:"1px solid #253650",borderRadius:12,padding:"10px 14px"}}>
                <summary style={{cursor:"pointer",color:"#93C5FD",fontSize:12,fontWeight:700}}>Cómo se calcula este escenario · explicación técnica</summary>
              <div className="zrc-card" style={{
                borderLeft: "3px solid #3B82F6",
                padding: "16px 20px", marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#5B9BFF", letterSpacing: 1, marginBottom: 6 }}>
                    METODOLOGÍA · SCORE COMPUESTO
                  </div>
                  <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, maxWidth: 680 }}>
                    El score es el promedio ponderado por probabilidad del riesgo intrínseco de cada escenario, ajustado por multiplicador sectorial.
                    {" "}<span style={{ color: "#CBD5E1" }}>Los valores iniciales son pesos de escenario de referencia, no probabilidades calibradas. Al agregarlos, el modelo los normaliza para que sumen 100%.</span>
                    {" "}Puedes deslizarlo para explorar escenarios propios — el score se recalcula en tiempo real y queda marcado como "AJUSTADO", indicando el valor ZRC original.
                    {" "}<span style={{ color: "#F59E0B" }}>Las modificaciones no reflejan el análisis oficial de ZRC.</span>
                    {" "}Usa el botón ↺ (por escenario o global) para devolver el círculo a su posición ZRC.
                  </div>
                  <div style={{ fontSize: 12, color: "#4B5A72", lineHeight: 1.7, maxWidth: 680, marginTop: 10, borderTop: "1px solid #1a274460", paddingTop: 10 }}>
                    ¿Necesitas análisis narrativo asistido por IA y más herramientas para contrastar estos supuestos?
                    {" "}<span style={{ color: "#A78BFA" }}>GeoRisk Predictive ML</span> es la evolución con IA de este dashboard.
                  </div>
                </div>
                {isCustomized && (
                  <button className="zrc-reset" onClick={resetWeights} style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px",
                    background: "#3B82F612", border: "1px solid #3B82F660",
                    color: "#60A5FA", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 1, cursor: "pointer", borderRadius: 6, whiteSpace: "nowrap",
                    transition: "all 0.2s",
                  }}>
                    <RotateCcw size={12} /> RESTABLECER VALORES ZRC
                  </button>
                )}
              </div>

              </details>
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
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B", letterSpacing: 1, marginBottom: 10 }}>
                      RESUMEN PARA COMITÉ DE INVERSIÓN
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#CBD5E1", lineHeight: 1.9 }}>
                      <li>Riesgo del escenario mundial <b>{riskLabel(compositeRisk)}</b> ({fmt(compositeRisk, 1)}/100), mix {isCustomized ? "personalizado por el analista" : "pesos de referencia"}.</li>
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
                          <div style={{ fontSize: 14, fontWeight: 600, color: sv.color, marginBottom: 2 }}>{sv.label}</div>
                          <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{sv.desc}</div>
                        </div>
                        <RiskGauge value={sv.risk} size={56} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
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
                          <span style={{ fontSize: 15, fontWeight: 700, color: isModified ? "#F59E0B" : sv.color, fontFamily: "'JetBrains Mono', monospace" }}>
                            {(scenarioWeights[sk] * 100).toFixed(0)}%
                          </span>
                        </div>
                        {isModified && (
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B", background: "#F59E0B15", border: "1px solid #F59E0B30", borderRadius: 2, padding: "1px 5px" }}>
                              AJUSTADO · ZRC: {(DEFAULT_WEIGHTS[sk] * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
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
                          <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>
                            VECTORES DE IMPACTO · REFERENCIAS CODIFICADAS (NO DATOS ACTUALES)
                          </div>
                          {Object.entries(sv.impactByRegion[region]).map(([vk, vi]) => {
                            const ev = ECONOMIC_VARIABLES[vk];
                            return (
                              <div key={vk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                                <div>
                                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{ev?.label}</div>
                                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                                    {ev?.source} · referencia: {fmt(ev?.base, ev?.decimals ?? 2)}{ev?.unit}
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span title="No hay serie histórica conectada" style={{ fontSize: 10, color: "#64748B" }}>sin serie</span>
                                  <MiniBar value={vi} max={1} color={sv.color} width={50} />
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, margin: "10px 0 6px" }}>
                            EJEMPLO · IMPACTO ESTIMADO EN PRECIOS (12M, si se materializa este escenario) · {REGIONS[region].label}
                          </div>
                          {ASSETS.map(a => {
                            const pct = estimatePriceImpact(a, sv.impactByRegion[region], region);
                            const c = pct > 0.5 ? "#EF4444" : pct < -0.5 ? "#10B981" : "#64748B";
                            return (
                              <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                                <span style={{ fontSize: 12, color: "#94A3B8" }}>{a}</span>
                                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: c }}>
                                  {pct >= 0 ? "+" : ""}{fmt(pct, 1)} pts
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
          {tab === "impact" && impactView === "variables" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div role="note" style={{ marginBottom: 12, padding: "12px 16px", border: "1px solid #7C5A1B", borderRadius: 8, color: "#FDE68A", fontSize: 12, lineHeight: 1.6 }}>Las series históricas no están conectadas. Esta vista muestra solo referencias estáticas y estimaciones del escenario seleccionado.</div>
              <div className="zrc-card zrc-table-scroll">
                <div className="zrc-table-inner">
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr",
                    padding: "12px 20px", background: "#0d1829", borderBottom: "1px solid #1a2744",
                    fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
                  }}>
                    <span>VARIABLE</span><span>REFERENCIA*</span><span>IMPACTO</span><span>ESTIMACIÓN*</span><span>SERIE</span>
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
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#CBD5E1" }}>{v.label}</div>
                          <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em", marginTop: 2 }}>{v.source}</div>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#94A3B8" }}>
                          {fmt(v.base, v.decimals ?? 2)}{v.unit}
                        </span>
                        <MiniBar value={imp} max={0.8} width={50} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600,
                          color: imp > 0.1 ? "#F59E0B" : imp < -0.1 ? "#10B981" : "#94A3B8"
                        }}>
                          {fmt(proj, v.decimals ?? 2)}{v.unit}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748B" }}>No conectada</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* NLP */}
          {tab === "impact" && impactView === "nlp" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div className="zrc-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 12 }}>
                  <MessageSquare size={13} color="#5B9BFF" />
                  DETECCIÓN DE PALABRAS CLAVE · No interpreta contexto, negación ni fuentes
                </div>
                <p style={{ color: "#94A3B8", fontSize: 12, lineHeight: 1.6, margin: "0 0 12px" }}>Este filtro cuenta coincidencias literales con un diccionario bilingüe. Úselo como apoyo exploratorio, no como una medición objetiva del riesgo.</p>
                <textarea
                  value={nlpText}
                  onChange={e => setNlpText(e.target.value)}
                  placeholder="Pegue aquí un titular, noticia o briefing geopolítico para análisis de riesgo..."
                  style={{
                    width: "100%", height: 140, background: "#080e1a", border: "1px solid #1a2744",
                    borderRadius: 8, padding: 14, color: "#CBD5E1", fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace", resize: "vertical",
                    outline: "none", lineHeight: 1.6, boxSizing: "border-box"
                  }}
                />
                <button onClick={handleNlp} style={{
                  marginTop: 12, padding: "9px 24px", background: "linear-gradient(135deg, #1e3a5f, #3B82F6)",
                  border: "none", borderRadius: 7, color: "#fff", fontSize: 13, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: 1,
                  boxShadow: "0 6px 18px -8px #3B82F680",
                }}>
                  ANALIZAR RIESGO
                </button>

                {nlpResult && (
                  <div style={{ marginTop: 22, padding: 20, background: "#0d1829", borderRadius: 8, border: "1px solid #1a2744" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>SCORE RIESGO</div>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          fontSize: 31, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          color: nlpResult.score > 0.3 ? "#EF4444" : nlpResult.score > 0 ? "#F59E0B" : "#10B981"
                        }}>
                          {nlpResult.score > 0.05 ? <TrendingUp size={20} /> : nlpResult.score < -0.05 ? <TrendingDown size={20} /> : <Minus size={20} />}
                          {nlpResult.score > 0 ? "+" : ""}{fmt(nlpResult.score)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>SCORE BRUTO</div>
                        <div style={{ fontSize: 31, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#CBD5E1" }}>
                          {fmt(nlpResult.rawScore)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>KEYWORDS</div>
                        <div style={{ fontSize: 31, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#5B9BFF" }}>
                          {nlpResult.hits.length}
                        </div>
                      </div>
                    </div>
                    {nlpResult.hits.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>KEYWORDS DETECTADAS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {nlpResult.hits.map((h, i) => (
                            <span key={i} style={{
                              padding: "3px 8px", borderRadius: 5, fontSize: 12,
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
          {tab === "impact" && impactView === "allocation" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div className="zrc-card zrc-table-scroll">
                <div className="zrc-table-inner">
                  <div style={{
                    display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1.3fr 2.6fr",
                    padding: "12px 20px", background: "#0d1829", borderBottom: "1px solid #1a2744",
                    fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
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
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#CBD5E1" }}>{a.asset}</span>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                          color: a.col, display: "flex", alignItems: "center", gap: 4
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%", background: a.col,
                            boxShadow: `0 0 4px ${a.col}80`, display: "inline-block"
                          }} />
                          {a.signal > 0 ? "+" : ""}{fmt(a.signal, 0)}
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: pCol }}>
                          {priceImpact >= 0 ? "+" : ""}{fmt(priceImpact, 1)}%
                        </span>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                          letterSpacing: 1, color: a.col,
                          padding: "3px 9px", borderRadius: 5,
                          background: `${a.col}15`, border: `1px solid ${a.col}30`,
                          width: "fit-content",
                        }}>
                          <DirIcon size={11} /> {a.dir}
                        </span>
                        <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.4 }}>{a.rationale}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{
                marginTop: 14, padding: "14px 16px", background: "#0d182960", borderRadius: 8,
                border: "1px dashed #1a274480", fontSize: 11, color: "#64748B",
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span><span style={{ color: "#F59E0B", fontWeight: 700 }}>DISCLAIMER:</span> Las señales de asignación y las puntuaciones de sensibilidad por activo se obtienen de coeficientes heurísticos de Zenith Rise Capital
                (supuestos sin calibración histórica, no rendimientos ni variaciones de precio estimadas) y no constituyen asesoramiento de inversión. Los resultados dependen de las probabilidades de escenario asignadas por el
                analista y del multiplicador sectorial seleccionado. Consulte con un asesor financiero cualificado antes de tomar decisiones de inversión.</span>
              </div>
            </div>
          )}

          <footer style={{
            padding: "22px 0", marginTop: 32, borderTop: "1px solid #16233d",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
          }}>
            <div style={{ fontSize: 11, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
              © 2026 Zenith Rise Capital · Calesius Global SL · Madrid, España
              <br />Modelo de escenarios ilustrativo · Horizonte indicativo: 12 meses · Sin recalibración automática
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#4B5A72", fontFamily: "'JetBrains Mono', monospace" }}>www.zenithrisecapital.com</span>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 9px", borderRadius: 5, fontSize: 10,
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
