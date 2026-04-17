import { useState, useEffect, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════
// GEORISK INTELLIGENCE SYSTEM — Zenith Rise Capital
// Ruta sugerida: /research/georisk
// ═══════════════════════════════════════════════════════

const ECONOMIC_VARIABLES = {
  interest_rates:  { label: "Tipos de Interés",      unit: "%",   base: 4.75,  volatility: 0.15 },
  inflation_cpi:   { label: "Inflación / IPC",       unit: "%",   base: 3.2,   volatility: 0.25 },
  fx_eurusd:       { label: "Tipo Cambio EUR/USD",   unit: "",    base: 1.074, volatility: 0.008 },
  commodities:     { label: "Materias Primas",       unit: "idx", base: 118.4, volatility: 3.5 },
  sovereign_yield: { label: "Yield Soberano 10Y",    unit: "%",   base: 4.48,  volatility: 0.10 },
  capital_flows:   { label: "Flujos Capital IED",    unit: "Bn€", base: -12.3, volatility: 1.8 },
};

const SCENARIOS = {
  tariff_escalation: {
    label: "Escalada Arancelaria",
    desc: "Tensiones comerciales EE.UU.–China–UE",
    prob: 0.42, risk: 78, color: "#F59E0B",
    impact: { interest_rates: 0.35, inflation_cpi: 0.55, fx_eurusd: -0.08, commodities: 0.45, sovereign_yield: 0.40, capital_flows: -0.60 }
  },
  mena_instability: {
    label: "Inestabilidad MENA",
    desc: "Conflicto Oriente Medio · Disrupción energética",
    prob: 0.28, risk: 85, color: "#EF4444",
    impact: { interest_rates: 0.20, inflation_cpi: 0.75, fx_eurusd: -0.12, commodities: 0.90, sovereign_yield: 0.30, capital_flows: -0.45 }
  },
  eu_fragmentation: {
    label: "Fragmentación Europea",
    desc: "Tensiones soberanas · Spreads periféricos",
    prob: 0.18, risk: 72, color: "#8B5CF6",
    impact: { interest_rates: 0.45, inflation_cpi: 0.30, fx_eurusd: -0.20, commodities: 0.15, sovereign_yield: 0.85, capital_flows: -0.70 }
  },
  detente: {
    label: "Distensión Geopolítica",
    desc: "Acuerdos diplomáticos · Reducción primas riesgo",
    prob: 0.12, risk: 28, color: "#10B981",
    impact: { interest_rates: -0.20, inflation_cpi: -0.30, fx_eurusd: 0.08, commodities: -0.35, sovereign_yield: -0.40, capital_flows: 0.50 }
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
  const r = size / 2 - 8;
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
        <path d={createArc(-120, 120)} fill="none" stroke="#1a2744" strokeWidth={6} strokeLinecap="round" />
        <path d={createArc(-120, angle)} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round"
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: width + 50 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isNeg ? "#EF4444" : "#10B981", minWidth: 42, textAlign: "right" }}>
        {isNeg ? "" : "+"}{fmt(value)}
      </span>
      <div style={{ width, height: 4, background: "#0f1a2e", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 2,
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
      display: "flex", gap: 24, padding: "8px 0", overflow: "hidden",
      borderTop: "1px solid #1a2744", borderBottom: "1px solid #1a2744",
      animation: "zrc-ticker 30s linear infinite", whiteSpace: "nowrap"
    }}>
      {[...items, ...items].map((item, i) => (
        <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94A3B8", letterSpacing: 0.5 }}>
          <span style={{ color: "#3B82F6" }}>{item.label}</span>
          {" "}
          <span style={{ color: item.delta > 0 ? "#10B981" : item.delta < 0 ? "#EF4444" : "#94A3B8" }}>
            {item.value} {item.delta > 0 ? "▲" : item.delta < 0 ? "▼" : "●"}
          </span>
        </span>
      ))}
    </div>
  );
}

function SparkLine({ data, color = "#3B82F6", w = 100, h = 28 }) {
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
  const [scenarioWeights, setScenarioWeights] = useState(
    Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.prob]))
  );
  const [nlpText, setNlpText] = useState("");
  const [nlpResult, setNlpResult] = useState(null);
  const [time, setTime] = useState(new Date());
  const [sparkData, setSparkData] = useState({});
  const [tab, setTab] = useState("scenarios");

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
  }, []);

  const sectorMult = SECTORS[sector].mult;

  const computeImpact = useCallback((varKey) => {
    let total = 0;
    Object.entries(SCENARIOS).forEach(([sk, sv]) => {
      const w = scenarioWeights[sk] || 0;
      total += w * (sv.impact[varKey] || 0) * sectorMult;
    });
    return total;
  }, [scenarioWeights, sectorMult]);

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
        signal = imp.fx_eurusd * 200 + flowDir * 10; rationale = imp.fx_eurusd < 0 ? "EUR débil favorece exportadores" : "EUR fuerte penaliza competitividad";
      } else {
        signal = ratesPressure * 20 - flowDir * 5; rationale = compositeRisk > 60 ? "Refugio en entorno de riesgo elevado" : "Coste de oportunidad alto en entorno estable";
      }
      const dir = signal > 15 ? "SOBREPONDERAR" : signal < -15 ? "INFRAPONDERAR" : "NEUTRAL";
      const col = signal > 15 ? "#10B981" : signal < -15 ? "#EF4444" : "#F59E0B";
      return { asset: a, signal, dir, col, rationale };
    });
  }, [computeImpact, compositeRisk]);

  const handleNlp = () => {
    if (!nlpText.trim()) return;
    setNlpResult(analyzeText(nlpText));
  };

  const tickerItems = Object.entries(ECONOMIC_VARIABLES).map(([k, v]) => {
    const d = computeImpact(k);
    const val = v.base + d * v.volatility * 5;
    return { label: v.label, value: `${fmt(val, k === "fx_eurusd" ? 3 : 2)}${v.unit}`, delta: d };
  });

  return (
    <div style={{
      minHeight: "100vh", background: "#080e1a",
      color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @keyframes zrc-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes zrc-fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes zrc-ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes zrc-scanline { from { top: -2px } to { top: 100% } }
        @keyframes zrc-gridPulse { 0%,100% { opacity:0.03 } 50% { opacity:0.06 } }
        .zrc-georisk input[type=range] { -webkit-appearance: none; height: 3px; background: #1a2744; border-radius: 2px; outline: none }
        .zrc-georisk input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #3B82F6; cursor: pointer; box-shadow: 0 0 8px #3B82F680 }
        .zrc-georisk ::-webkit-scrollbar { width: 4px }
        .zrc-georisk ::-webkit-scrollbar-track { background: #0a1628 }
        .zrc-georisk ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px }
      `}</style>

      <div className="zrc-georisk">
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

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1400, margin: "0 auto", padding: "0 20px" }}>

          {/* HEADER */}
          <header style={{ padding: "20px 0 12px", borderBottom: "1px solid #1a2744" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: "linear-gradient(135deg, #1e3a5f, #3B82F6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#fff",
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>ZR</div>
                  <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>
                    ZENITH RISE CAPITAL
                  </span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.5, color: "#F1F5F9" }}>
                  GeoRisk Intelligence System
                </h1>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Calesius Global SL · Modelo propietario de análisis geopolítico cuantitativo
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <Pulse color="#10B981" />
                  <span style={{ fontSize: 11, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: "#CBD5E1", marginTop: 2 }}>
                  {time.toLocaleTimeString("es-ES", { hour12: false })}
                </div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                  {time.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} · CET
                </div>
              </div>
            </div>
          </header>

          <DataTicker items={tickerItems} />

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, padding: "16px 0", alignItems: "center" }}>
            <RiskGauge value={compositeRisk} size={110} label="Riesgo Compuesto" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginRight: 4 }}>SECTOR:</span>
              {Object.entries(SECTORS).map(([k, v]) => (
                <button key={k} onClick={() => setSector(k)} style={{
                  padding: "4px 10px", borderRadius: 3, border: "1px solid",
                  borderColor: sector === k ? "#3B82F6" : "#1a2744",
                  background: sector === k ? "#3B82F615" : "transparent",
                  color: sector === k ? "#60A5FA" : "#64748B",
                  fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: 0.5, transition: "all 0.2s"
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ fontSize: 10, color: "#64748B", letterSpacing: 1 }}>MULTIPLICADOR</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: sectorMult > 1 ? "#F59E0B" : "#10B981" }}>
                ×{sectorMult.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1a2744", marginBottom: 16 }}>
            {[
              { id: "scenarios", label: "Escenarios" },
              { id: "variables", label: "Variables" },
              { id: "nlp", label: "NLP Analyzer" },
              { id: "allocation", label: "Asignación" },
            ].map(t2 => (
              <button key={t2.id} onClick={() => setTab(t2.id)} style={{
                padding: "10px 20px", background: "transparent", border: "none",
                borderBottom: tab === t2.id ? "2px solid #3B82F6" : "2px solid transparent",
                color: tab === t2.id ? "#F1F5F9" : "#64748B",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
                transition: "all 0.2s"
              }}>{t2.label}</button>
            ))}
          </div>

          {/* SCENARIOS */}
          {tab === "scenarios" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                {Object.entries(SCENARIOS).map(([sk, sv]) => (
                  <div key={sk} onClick={() => setActiveScenario(sk)} style={{
                    background: activeScenario === sk ? "#0d1829" : "#0a1322",
                    border: `1px solid ${activeScenario === sk ? sv.color + "60" : "#1a274440"}`,
                    borderRadius: 6, padding: 16, cursor: "pointer",
                    transition: "all 0.3s", position: "relative", overflow: "hidden"
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>PROBABILIDAD</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: sv.color, fontFamily: "'JetBrains Mono', monospace" }}>
                          {(scenarioWeights[sk] * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input type="range" min={0} max={80} value={scenarioWeights[sk] * 100}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const newW = { ...scenarioWeights, [sk]: parseInt(e.target.value) / 100 };
                          setScenarioWeights(newW);
                        }}
                        style={{ width: "100%", accentColor: sv.color }}
                      />
                    </div>
                    {activeScenario === sk && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${sv.color}20` }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 6 }}>
                          VECTORES DE IMPACTO
                        </div>
                        {Object.entries(sv.impact).map(([vk, vi]) => (
                          <div key={vk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                            <span style={{ fontSize: 11, color: "#94A3B8" }}>{ECONOMIC_VARIABLES[vk]?.label}</span>
                            <MiniBar value={vi} max={1} color={sv.color} width={60} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VARIABLES */}
          {tab === "variables" && (
            <div style={{ animation: "zrc-fadeIn 0.4s ease" }}>
              <div style={{ background: "#0a1322", border: "1px solid #1a2744", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr",
                  padding: "10px 16px", background: "#0d1829", borderBottom: "1px solid #1a2744",
                  fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
                }}>
                  <span>VARIABLE</span><span>BASE</span><span>IMPACTO</span><span>PROYECCIÓN</span><span>TENDENCIA</span>
                </div>
                {Object.entries(ECONOMIC_VARIABLES).map(([k, v], i) => {
                  const imp = computeImpact(k);
                  const proj = v.base + imp * v.volatility * 5;
                  return (
                    <div key={k} style={{
                      display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr",
                      padding: "12px 16px", borderBottom: "1px solid #1a274430",
                      alignItems: "center", background: i % 2 ? "#0a1322" : "#0c1526",
                      transition: "background 0.2s"
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#CBD5E1" }}>{v.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#94A3B8" }}>
                        {fmt(v.base, k === "fx_eurusd" ? 3 : 2)}{v.unit}
                      </span>
                      <MiniBar value={imp} max={0.8} width={50} />
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                        color: imp > 0.1 ? "#F59E0B" : imp < -0.1 ? "#10B981" : "#94A3B8"
                      }}>
                        {fmt(proj, k === "fx_eurusd" ? 3 : 2)}{v.unit}
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
              <div style={{ background: "#0a1322", border: "1px solid #1a2744", borderRadius: 6, padding: 20 }}>
                <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 10 }}>
                  ANÁLISIS NLP DE RIESGO GEOPOLÍTICO · Introduzca texto de noticias o briefings
                </div>
                <textarea
                  value={nlpText}
                  onChange={e => setNlpText(e.target.value)}
                  placeholder="Pegue aquí un titular, noticia o briefing geopolítico para análisis de riesgo..."
                  style={{
                    width: "100%", height: 140, background: "#080e1a", border: "1px solid #1a2744",
                    borderRadius: 4, padding: 14, color: "#CBD5E1", fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace", resize: "vertical",
                    outline: "none", lineHeight: 1.6
                  }}
                />
                <button onClick={handleNlp} style={{
                  marginTop: 10, padding: "8px 24px", background: "linear-gradient(135deg, #1e3a5f, #3B82F6)",
                  border: "none", borderRadius: 4, color: "#fff", fontSize: 12, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: 1,
                  transition: "all 0.2s"
                }}>
                  ANALIZAR RIESGO
                </button>

                {nlpResult && (
                  <div style={{ marginTop: 20, padding: 16, background: "#0d1829", borderRadius: 6, border: "1px solid #1a2744" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>SCORE RIESGO</div>
                        <div style={{
                          fontSize: 32, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          color: nlpResult.score > 0.3 ? "#EF4444" : nlpResult.score > 0 ? "#F59E0B" : "#10B981"
                        }}>
                          {nlpResult.score > 0 ? "+" : ""}{fmt(nlpResult.score)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>SCORE BRUTO</div>
                        <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#CBD5E1" }}>
                          {fmt(nlpResult.rawScore)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>KEYWORDS</div>
                        <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#3B82F6" }}>
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
                              padding: "3px 8px", borderRadius: 3, fontSize: 11,
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
              <div style={{ background: "#0a1322", border: "1px solid #1a2744", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 3fr",
                  padding: "10px 16px", background: "#0d1829", borderBottom: "1px solid #1a2744",
                  fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
                }}>
                  <span>CLASE DE ACTIVO</span><span>SEÑAL</span><span>RECOMENDACIÓN</span><span>RACIONAL</span>
                </div>
                {allocationSignals.map((a, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 3fr",
                    padding: "14px 16px", borderBottom: "1px solid #1a274430",
                    alignItems: "center", background: i % 2 ? "#0a1322" : "#0c1526"
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
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                      letterSpacing: 1, color: a.col,
                      padding: "2px 8px", borderRadius: 2,
                      background: `${a.col}15`, border: `1px solid ${a.col}30`,
                      display: "inline-block", textAlign: "center"
                    }}>
                      {a.dir}
                    </span>
                    <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>{a.rationale}</span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 12, padding: 12, background: "#0d182960", borderRadius: 4,
                border: "1px dashed #1a274480", fontSize: 10, color: "#475569",
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6
              }}>
                ⚠ DISCLAIMER: Las señales de asignación se generan mediante el modelo cuantitativo propietario de Zenith Rise Capital
                y no constituyen asesoramiento de inversión. Los resultados dependen de las probabilidades de escenario asignadas por el
                analista y del multiplicador sectorial seleccionado. Consulte con un asesor financiero cualificado antes de tomar decisiones de inversión.
              </div>
            </div>
          )}

          <footer style={{
            padding: "20px 0", marginTop: 30, borderTop: "1px solid #1a2744",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
          }}>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
              © 2026 Zenith Rise Capital · Calesius Global SL · Madrid, España
              <br />Modelo GeoRisk v2.1 · Horizonte: 12 meses · Recalibración: continua
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>www.zenithrisecapital.com</span>
              <div style={{
                padding: "3px 8px", borderRadius: 3, fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                background: "#10B98115", color: "#10B981", border: "1px solid #10B98130"
              }}>OPERATIONAL</div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
