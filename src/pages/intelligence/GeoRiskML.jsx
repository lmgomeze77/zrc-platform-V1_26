import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
// GEORISK ML — Zenith Rise Capital
// Predictive Geopolitical Intelligence · Claude API-powered
// Evolución del GeoRisk Dashboard → análisis predictivo con IA
// ═══════════════════════════════════════════════════════════════════

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
    prob: 0.42, risk: 78, color: "#F59E0B",
    impactByRegion: {
      eu:   { interest_rates: 0.35,  inflation_cpi: 0.55, fx: -0.08, commodities: 0.45, sovereign_yield: 0.40,  capital_flows: -0.60 },
      usa:  { interest_rates: 0.15,  inflation_cpi: 0.65, fx: 0.30,  commodities: 0.45, sovereign_yield: 0.25,  capital_flows: 0.35 },
      asia: { interest_rates: -0.10, inflation_cpi: 0.20, fx: 0.55,  commodities: 0.45, sovereign_yield: -0.15, capital_flows: -0.75 },
    }
  },
  mena_instability: {
    label: "Inestabilidad MENA", desc: "Conflicto MENA · Disrupción energética",
    prob: 0.28, risk: 85, color: "#EF4444",
    impactByRegion: {
      eu:   { interest_rates: 0.20, inflation_cpi: 0.75, fx: -0.12, commodities: 0.90, sovereign_yield: 0.30,  capital_flows: -0.45 },
      usa:  { interest_rates: 0.10, inflation_cpi: 0.55, fx: 0.25,  commodities: 0.90, sovereign_yield: 0.15,  capital_flows: 0.30 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.60, fx: 0.30,  commodities: 0.90, sovereign_yield: -0.10, capital_flows: -0.50 },
    }
  },
  eu_fragmentation: {
    label: "Fragmentación Europea", desc: "Tensiones soberanas · Spreads periféricos",
    prob: 0.18, risk: 72, color: "#8B5CF6",
    impactByRegion: {
      eu:   { interest_rates: 0.45, inflation_cpi: 0.30, fx: -0.20, commodities: 0.15, sovereign_yield: 0.85,  capital_flows: -0.70 },
      usa:  { interest_rates: 0.05, inflation_cpi: 0.10, fx: 0.35,  commodities: 0.10, sovereign_yield: -0.10, capital_flows: 0.55 },
      asia: { interest_rates: 0.05, inflation_cpi: 0.05, fx: 0.15,  commodities: 0.05, sovereign_yield: -0.05, capital_flows: -0.20 },
    }
  },
  detente: {
    label: "Distensión Geopolítica", desc: "Acuerdos diplomáticos · Reducción de primas",
    prob: 0.12, risk: 28, color: "#10B981",
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

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
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
        <path d={arc(-120, 120)} fill="none" stroke="#1a2744" strokeWidth={6} strokeLinecap="round" />
        <path d={arc(-120, angle)} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${c}80)`, transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }} />
        <text x={size / 2} y={size / 2 + 2} textAnchor="middle" fill={c}
          style={{ fontSize: size * 0.28, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {Math.round(value)}
        </text>
      </svg>
      {label && <div style={{ fontSize: 9, color: "#64748B", marginTop: -4, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>}
    </div>
  );
}

function MiniBar({ value, max = 1, color, width = 80 }) {
  const pct = clamp(Math.abs(value) / max * 100, 0, 100);
  const isNeg = value < 0;
  const col = color || (isNeg ? "#EF4444" : "#10B981");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: col, minWidth: 42, textAlign: "right" }}>
        {isNeg ? "" : "+"}{fmt(value)}
      </span>
      <div style={{ width, height: 4, background: "#0f1a2e", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: col,
          transition: "width 0.6s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 6px ${col}80` }} />
      </div>
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

// Forecast curve: simple stochastic projection
function buildForecast(baseRisk, scenarioWeights, steps = 12) {
  const seed = Object.values(scenarioWeights).reduce((s, v) => s + v, 0);
  let risk = baseRisk;
  const curve = [{ t: 0, v: risk, lo: risk - 3, hi: risk + 3 }];
  for (let i = 1; i <= steps; i++) {
    const drift = (Math.sin(i * 0.5 + seed) * 4) + (Math.random() - 0.5) * 3;
    risk = clamp(risk + drift * 0.4, 10, 98);
    const ci = 3 + i * 0.8;
    curve.push({ t: i, v: risk, lo: Math.max(10, risk - ci), hi: Math.min(98, risk + ci) });
  }
  return curve;
}

function ForecastChart({ curve, color = "#3B82F6" }) {
  const W = 500, H = 120, PAD = { l: 36, r: 12, t: 12, b: 28 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const allVals = curve.flatMap(p => [p.lo, p.hi]);
  const minV = Math.max(0, Math.min(...allVals) - 5);
  const maxV = Math.min(100, Math.max(...allVals) + 5);
  const range = maxV - minV;
  const xOf = i => PAD.l + (i / (curve.length - 1)) * iW;
  const yOf = v => PAD.t + iH - ((v - minV) / range) * iH;
  const ciPath = [
    ...curve.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p.hi)}`),
    ...curve.slice().reverse().map((p, i) => `L${xOf(curve.length - 1 - i)},${yOf(p.lo)}`),
    "Z"
  ].join(" ");
  const linePath = curve.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p.v)}`).join(" ");
  const monthLabels = ["Ahora", "1M", "2M", "3M", "4M", "5M", "6M", "7M", "8M", "9M", "10M", "11M", "12M"];
  const yTicks = [20, 40, 60, 80];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} y1={yOf(t)} x2={W - PAD.r} y2={yOf(t)} stroke="#1a2744" strokeWidth={0.5} />
          <text x={PAD.l - 4} y={yOf(t) + 4} textAnchor="end" fill="#475569" fontSize={8} fontFamily="monospace">{t}</text>
        </g>
      ))}
      {/* CI band */}
      <path d={ciPath} fill={color} fillOpacity={0.08} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
      {/* Now divider */}
      <line x1={xOf(0)} y1={PAD.t} x2={xOf(0)} y2={H - PAD.b} stroke={color} strokeWidth={1} strokeDasharray="3,3" />
      {/* Month labels */}
      {[0, 3, 6, 9, 12].map(i => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">
          {monthLabels[i]}
        </text>
      ))}
      {/* Last value dot */}
      <circle cx={xOf(curve.length - 1)} cy={yOf(curve[curve.length - 1].v)} r={3} fill={color} />
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
    if (abs < 0.15) return "#1a2744";
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
                    {weighted >= 0 ? "+" : ""}{fmt(weighted, 2)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        {[["Impacto positivo (riesgo ↑)", "#EF4444"], ["Neutral", "#1a2744"], ["Impacto negativo (riesgo ↓)", "#10B981"]].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#64748B", fontFamily: "monospace" }}>
            <span style={{ width: 10, height: 10, background: c, display: "inline-block", borderRadius: 2 }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Claude API ML Engine ──────────────────────────────────────────

async function callClaudeML({ scenario, riskScore, variables, mode, userText }) {
  const systemPrompt = `Eres el motor ML de análisis geopolítico de Zenith Rise Capital (ZRC).
Tu función es generar análisis predictivo institucional en formato JSON estricto.
Responde SOLO con JSON válido, sin markdown ni texto adicional.
Idioma: español. Tono: institucional, conciso, cuantificado.`;

  let userPrompt = "";

  if (mode === "forecast") {
    userPrompt = `Analiza este perfil de riesgo geopolítico y genera previsiones:
Score riesgo compuesto: ${riskScore.toFixed(1)}/100
Escenario dominante: ${scenario.label} (prob: ${(scenario.prob * 100).toFixed(0)}%)
Variables económicas impactadas: ${JSON.stringify(variables)}

Responde con este JSON exacto:
{
  "outlook_30d": "string 1 frase",
  "outlook_90d": "string 1 frase",
  "key_triggers": ["trigger1","trigger2","trigger3"],
  "risk_trajectory": "ESCALATING|STABLE|DECLINING",
  "confidence": 0-100,
  "scenario_probability_adjustment": {
    "rationale": "string",
    "suggested_shifts": {"tariff_escalation": delta, "mena_instability": delta, "eu_fragmentation": delta, "detente": delta}
  },
  "asset_signals": [
    {"asset": "string", "signal": "SOBREPONDERAR|NEUTRAL|INFRAPONDERAR", "rationale": "string max 10 palabras"}
  ]
}`;
  } else if (mode === "nlp") {
    userPrompt = `Analiza este texto para extracción de señales geopolíticas de riesgo:
"${userText}"

Responde con este JSON exacto:
{
  "risk_score": 0-100,
  "sentiment": "BEARISH|NEUTRAL|BULLISH",
  "key_entities": ["entity1","entity2","entity3"],
  "scenario_match": "tariff_escalation|mena_instability|eu_fragmentation|detente|mixed",
  "scenario_probability_impact": {"tariff_escalation": -1.0 to 1.0, "mena_instability": -1.0 to 1.0, "eu_fragmentation": -1.0 to 1.0, "detente": -1.0 to 1.0},
  "investment_implications": ["implication1","implication2","implication3"],
  "confidence": 0-100,
  "summary": "string 2 frases max"
}`;
  } else if (mode === "decision") {
    userPrompt = `Genera señales de decisión de inversión institucional basadas en:
Score riesgo: ${riskScore.toFixed(1)}/100
Variables: ${JSON.stringify(variables)}

Responde con este JSON exacto:
{
  "portfolio_stance": "RISK_OFF|NEUTRAL|RISK_ON",
  "tactical_recommendations": [
    {"action": "string", "rationale": "string", "timeframe": "30D|60D|90D", "conviction": "HIGH|MEDIUM|LOW"}
  ],
  "macro_regime": "string 1 frase",
  "key_risks": ["risk1","risk2"],
  "key_opportunities": ["opp1","opp2"]
}`;
  }

  // Omit Content-Type so the browser sends text/plain (a "simple" CORS request)
  // which avoids the Safari preflight bug while the Worker still parses JSON correctly.
  const response = await fetch("https://zenith-risecapital.lmgomeze77.workers.dev/api/claude", {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  const bodyText = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
  let data;
  try { data = JSON.parse(bodyText); } catch (e) {
    throw new Error(`Bad JSON (${response.headers.get("content-type")}): ${bodyText.slice(0, 200)}`);
  }
  const text = data.content?.[0]?.text || "{}";
  const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON in Claude response: ${clean.slice(0, 120)}`);
  return JSON.parse(clean.slice(start, end + 1));
}

// ── Main Component ────────────────────────────────────────────────

const DEFAULT_WEIGHTS = Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.prob]));

export default function GeoRiskML() {
  const [sector, setSector] = useState("global");
  const [region, setRegion] = useState("eu");
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [tab, setTab] = useState("forecast");
  const [time, setTime] = useState(new Date());
  const [sparkData, setSparkData] = useState({});
  const [forecast, setForecast] = useState(null);
  const [mlForecast, setMlForecast] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);
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

  useEffect(() => {
    const d = {};
    Object.entries(ECONOMIC_VARIABLES).forEach(([k, v]) => {
      d[k] = Array.from({ length: 24 }, (_, i) =>
        v.base + (Math.random() - 0.5) * v.vol * 4 * Math.sin(i / 3)
      );
    });
    setSparkData(d);
  }, [region]);

  const sectorMult = SECTORS[sector].mult;

  const isCustomized = useMemo(() =>
    Object.entries(weights).some(([k, v]) => Math.abs(v - DEFAULT_WEIGHTS[k]) > 0.005),
    [weights]
  );
  const resetWeights = () => setWeights({ ...DEFAULT_WEIGHTS });

  const computeImpact = useCallback((varKey) => {
    let total = 0;
    Object.entries(SCENARIOS).forEach(([sk, sv]) => {
      total += (weights[sk] || 0) * (sv.impactByRegion[region]?.[varKey] || 0) * sectorMult;
    });
    return total;
  }, [weights, sectorMult, region]);

  const compositeRisk = useMemo(() => {
    let r = 0;
    Object.entries(SCENARIOS).forEach(([k, v]) => { r += (weights[k] || 0) * v.risk; });
    return r * sectorMult;
  }, [weights, sectorMult]);

  const dominantScenario = useMemo(() => {
    const [key] = Object.entries(weights).reduce(([bk, bv], [k, v]) => v > bv ? [k, v] : [bk, bv], ["", 0]);
    return { key, ...SCENARIOS[key] };
  }, [weights]);

  const variableImpacts = useMemo(() => {
    return Object.fromEntries(
      Object.keys(ECONOMIC_VARIABLES).map(k => [k, computeImpact(k)])
    );
  }, [computeImpact, ECONOMIC_VARIABLES]);

  const assetImpacts = useMemo(() => {
    return ASSETS.map(asset => {
      const pct = estimatePriceImpact(asset, variableImpacts, region);
      const dir = pct > 1.5 ? "SOBREPONDERAR" : pct < -1.5 ? "INFRAPONDERAR" : "NEUTRAL";
      const col = pct > 1.5 ? "#10B981" : pct < -1.5 ? "#EF4444" : "#F59E0B";
      return { asset, pct, dir, col };
    });
  }, [variableImpacts, region]);

  // Build stochastic forecast on weight change
  useEffect(() => {
    setForecast(buildForecast(compositeRisk, weights));
  }, [compositeRisk, weights]);

  const runMLForecast = async () => {
    setMlLoading(true); setMlError(null); setMlForecast(null);
    try {
      const result = await callClaudeML({
        scenario: dominantScenario,
        riskScore: compositeRisk,
        variables: variableImpacts,
        mode: "forecast"
      });
      setMlForecast(result);
    } catch (e) {
      setMlError(`Error al conectar con el motor ML: ${e.message}`);
    } finally { setMlLoading(false); }
  };

  const runNLP = async () => {
    if (!nlpText.trim()) return;
    setNlpLoading(true); setNlpResult(null);
    try {
      const result = await callClaudeML({ mode: "nlp", userText: nlpText, riskScore: compositeRisk, scenario: dominantScenario, variables: variableImpacts });
      setNlpResult(result);
      // Apply scenario probability adjustments
      if (result.scenario_probability_impact) {
        const newW = { ...weights };
        Object.entries(result.scenario_probability_impact).forEach(([k, delta]) => {
          if (newW[k] !== undefined) newW[k] = clamp(newW[k] + delta * 0.3, 0, 0.9);
        });
        setWeights(newW);
      }
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
    { id: "forecast", label: "Predictivo ML" },
    { id: "scenarios", label: "Escenarios" },
    { id: "heatmap", label: "Correlaciones" },
    { id: "nlp", label: "NLP Analyzer" },
    { id: "decision", label: "Decision Engine" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080e1a", color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes grml-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes grml-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes grml-scanline { from{top:-2px} to{top:100%} }
        @keyframes grml-gridPulse { 0%,100%{opacity:0.03} 50%{opacity:0.06} }
        @keyframes grml-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .grml-btn { transition: all 0.2s; }
        .grml-btn:hover { opacity:0.8; transform:translateY(-1px); }
        .grml input[type=range] { -webkit-appearance:none; height:3px; background:#1a2744; border-radius:2px; outline:none }
        .grml input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#3B82F6; cursor:pointer; box-shadow:0 0 8px #3B82F680 }
        .grml ::-webkit-scrollbar { width:4px }
        .grml ::-webkit-scrollbar-track { background:#0a1628 }
        .grml ::-webkit-scrollbar-thumb { background:#1e3a5f; border-radius:2px }
        .grml-loading { background: linear-gradient(90deg, #1a2744 25%, #1e3a5f 50%, #1a2744 75%); background-size:200% 100%; animation:grml-shimmer 1.5s infinite; border-radius:4px; }
      `}</style>

      {/* Grid + scan */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"linear-gradient(#1a274410 1px,transparent 1px),linear-gradient(90deg,#1a274410 1px,transparent 1px)", backgroundSize:"40px 40px", animation:"grml-gridPulse 4s ease-in-out infinite" }} />
      <div style={{ position:"fixed", left:0, right:0, height:2, zIndex:1, background:"linear-gradient(90deg,transparent,#3B82F620,transparent)", animation:"grml-scanline 8s linear infinite", pointerEvents:"none" }} />

      <div className="grml" style={{ position:"relative", zIndex:2, maxWidth:1400, margin:"0 auto", padding:"0 20px" }}>

        {/* ── HEADER ── */}
        <header style={{ padding:"20px 0 12px", borderBottom:"1px solid #1a2744" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:28, height:28, borderRadius:4, background:"linear-gradient(135deg,#1e3a5f,#3B82F6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, letterSpacing:1, color:"#fff", fontFamily:"'JetBrains Mono',monospace" }}>ZR</div>
                <span style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:"#64748B", fontFamily:"'JetBrains Mono',monospace" }}>ZENITH RISE CAPITAL</span>
                <span style={{ padding:"2px 8px", background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.35)", borderRadius:3, fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:"#A78BFA", letterSpacing:1 }}>ML ENGINE v1.0</span>
              </div>
              <h1 style={{ fontSize:22, fontWeight:700, margin:0, letterSpacing:-0.5, color:"#F1F5F9" }}>
                GeoRisk Predictive Intelligence
              </h1>
              <div style={{ fontSize:11, color:"#475569", marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>
                Análisis geopolítico predictivo · Powered by Claude Sonnet · Calesius Global SL
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end", marginBottom:4 }}>
                <Pulse color="#A78BFA" />
                <span style={{ fontSize:10, color:"#A78BFA", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1 }}>ML LIVE</span>
                <span style={{ margin:"0 4px", color:"#1a2744" }}>|</span>
                <Pulse color="#10B981" />
                <span style={{ fontSize:10, color:"#10B981", fontFamily:"'JetBrains Mono',monospace" }}>OPERATIONAL</span>
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600, color:"#CBD5E1" }}>
                {time.toLocaleTimeString("es-ES", { hour12:false })}
              </div>
              <div style={{ fontSize:10, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>
                {time.toLocaleDateString("es-ES", { weekday:"short", day:"2-digit", month:"short", year:"numeric" }).toUpperCase()} · CET
              </div>
            </div>
          </div>
        </header>

        {/* ── DIFERENCIADOR: QUÉ APORTA GEORISK ML SOBRE EL DASHBOARD ── */}
        <div style={{
          background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)",
          borderLeft: "3px solid #A78BFA", borderRadius: 6, padding: "12px 16px", margin: "16px 0",
        }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#A78BFA", letterSpacing: 1, marginBottom: 6 }}>
            POR QUÉ GEORISK ML — Y NO SOLO EL DASHBOARD
          </div>
          <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.7, maxWidth: 760 }}>
            El GeoRisk Dashboard modela escenarios con reglas fijas definidas por ZRC Research. <b>GeoRisk ML añade una capa predictiva con IA (Claude Sonnet)</b>:
            forecast de riesgo a 12 meses con intervalo de confianza, un <b>NLP Analyzer</b> que lee noticias/briefings en tiempo real y ajusta automáticamente
            las probabilidades de escenario, y un <b>Decision Engine institucional</b> que traduce el perfil de riesgo en recomendaciones tácticas con nivel de convicción —
            el mismo tipo de output que un comité de inversión necesita para pasar de "cuál es el riesgo" a "qué hacemos con la cartera".
          </div>
        </div>

        {/* ── RESUMEN PARA COMITÉ DE INVERSIÓN ── */}
        {(() => {
          const top = [...assetImpacts].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
          return (
            <div style={{
              background: "#0a1322", border: "1px solid #F59E0B30", borderLeft: "3px solid #F59E0B",
              borderRadius: 6, padding: "12px 16px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#F59E0B", letterSpacing: 1, marginBottom: 8 }}>
                RESUMEN PARA COMITÉ DE INVERSIÓN
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#CBD5E1", lineHeight: 1.9 }}>
                <li>Riesgo compuesto <b>{riskLabel(compositeRisk)}</b> ({fmt(compositeRisk, 1)}/100), mix {isCustomized ? "personalizado por el analista" : "base ZRC Research"}.</li>
                <li>Escenario dominante: <b style={{ color: dominantScenario.color }}>{dominantScenario.label}</b> ({(weights[dominantScenario.key] * 100).toFixed(0)}% prob.).</li>
                {top && (
                  <li>Llamada táctica principal: <b style={{ color: top.col }}>{top.dir}</b> en <b>{top.asset}</b> — impacto estimado {top.pct >= 0 ? "+" : ""}{fmt(top.pct, 1)}% a 12M bajo el mix actual.</li>
                )}
                <li>Pulsa <b>ANALIZAR</b> en la pestaña Predictivo ML para un outlook 30D/90D generado por IA, o <b>EJECUTAR ENGINE</b> en Decision Engine para recomendaciones tácticas con conviction level.</li>
              </ul>
            </div>
          );
        })()}

        {/* ── SCORE BAR ── */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto", gap:20, padding:"16px 0", alignItems:"center", borderBottom:"1px solid #1a274440" }}>
          <RiskGauge value={compositeRisk} size={110} label="Riesgo Compuesto" />

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:10, color:"#64748B", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, marginRight:4 }}>REGIÓN:</span>
              {Object.entries(REGIONS).map(([k, v]) => (
                <button key={k} className="grml-btn" onClick={() => setRegion(k)} style={{
                  padding:"4px 10px", borderRadius:3, border:"1px solid",
                  borderColor: region===k ? "#A78BFA" : "#1a2744",
                  background: region===k ? "#A78BFA15" : "transparent",
                  color: region===k ? "#C4B5FD" : "#64748B",
                  fontSize:11, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace"
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:10, color:"#64748B", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, marginRight:4 }}>SECTOR:</span>
              {Object.entries(SECTORS).map(([k, v]) => (
                <button key={k} className="grml-btn" onClick={() => setSector(k)} style={{
                  padding:"4px 10px", borderRadius:3, border:"1px solid",
                  borderColor: sector===k ? "#3B82F6" : "#1a2744",
                  background: sector===k ? "#3B82F615" : "transparent",
                  color: sector===k ? "#60A5FA" : "#64748B",
                  fontSize:11, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace"
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ fontSize:9, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>
              Las variables, fuentes y niveles se leen sobre {REGIONS[region].label} · el riesgo compuesto del escenario es global
            </div>

            {/* Risk bar */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>ÍNDICE DE RIESGO COMPUESTO</span>
                <span style={{ fontSize:9, color:riskColor, fontFamily:"monospace" }}>{compositeRisk.toFixed(1)}/100</span>
              </div>
              <div style={{ height:6, background:"#0f1a2e", borderRadius:3, overflow:"hidden" }}>
                <div style={{ width:`${compositeRisk}%`, height:"100%", background:`linear-gradient(90deg, #10B981, ${riskColor})`, borderRadius:3, transition:"width 0.8s cubic-bezier(.4,0,.2,1)", boxShadow:`0 0 8px ${riskColor}60` }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:3, fontSize:8, color:"#475569", fontFamily:"monospace" }}>
                <span>BAJO</span><span>MODERADO</span><span>ELEVADO</span><span>CRÍTICO</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>
            <div style={{ fontSize:9, color:"#64748B", letterSpacing:1, marginBottom:4 }}>MULTIPLICADOR</div>
            <div style={{ fontSize:20, fontWeight:600, color: sectorMult>1 ? "#F59E0B" : "#10B981" }}>×{sectorMult.toFixed(2)}</div>
          </div>

          <div style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>
            <div style={{ fontSize:9, color:"#64748B", letterSpacing:1, marginBottom:4 }}>ESCENARIO DOMINANTE</div>
            <div style={{ fontSize:12, fontWeight:600, color: dominantScenario.color }}>{dominantScenario.label}</div>
            <div style={{ fontSize:10, color:"#475569" }}>{(weights[dominantScenario.key]*100).toFixed(0)}% prob.</div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #1a2744", marginBottom:16, overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} className="grml-btn" onClick={() => setTab(t.id)} style={{
              padding:"10px 20px", background:"transparent", border:"none",
              borderBottom: tab===t.id ? "2px solid #A78BFA" : "2px solid transparent",
              color: tab===t.id ? "#F1F5F9" : "#64748B",
              fontSize:12, fontWeight:600, cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:0.5, whiteSpace:"nowrap"
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══════════════ TAB: PREDICTIVO ML ═══════════════ */}
        {tab === "forecast" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>

              {/* Forecast curve */}
              <div style={{ background:"#0a1322", border:"1px solid #1a2744", borderRadius:6, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:2 }}>PROYECCIÓN ESTOCÁSTICA DE RIESGO</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>Horizonte 12 meses · IC 95%</div>
                  </div>
                  <span style={{ padding:"2px 8px", background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.3)", borderRadius:3, fontSize:9, fontFamily:"monospace", color:"#60A5FA" }}>AUTO-UPDATE</span>
                </div>
                {forecast && <ForecastChart curve={forecast} color={riskColor} />}
                <div style={{ marginTop:8, display:"flex", gap:16, justifyContent:"flex-end" }}>
                  {["30D","60D","90D"].map((h, i) => {
                    const pts = forecast ? [forecast[3], forecast[6], forecast[9]] : [];
                    const v = pts[i]?.v;
                    const ci = pts[i] ? (pts[i].hi - pts[i].lo) / 2 : 0;
                    return v ? (
                      <div key={h} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:8, color:"#64748B", fontFamily:"monospace" }}>{h}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:v<40?"#10B981":v<65?"#F59E0B":"#EF4444", fontFamily:"monospace" }}>{v.toFixed(0)}</div>
                        <div style={{ fontSize:8, color:"#475569", fontFamily:"monospace" }}>±{ci.toFixed(1)}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* ML Forecast panel */}
              <div style={{ background:"#0a1322", border:"1px solid rgba(139,92,246,0.25)", borderRadius:6, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:2 }}>ANÁLISIS ML — CLAUDE SONNET</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>Forecast + señales institucionales</div>
                  </div>
                  <button className="grml-btn" onClick={runMLForecast} disabled={mlLoading} style={{
                    padding:"6px 14px", background: mlLoading ? "#1a2744" : "linear-gradient(135deg,#4c1d95,#7c3aed)",
                    border:"1px solid rgba(139,92,246,0.4)", borderRadius:4, color:"#E2E8F0",
                    fontSize:10, fontFamily:"monospace", cursor: mlLoading ? "not-allowed" : "pointer", letterSpacing:1
                  }}>
                    {mlLoading ? "PROCESANDO..." : "⚡ ANALIZAR"}
                  </button>
                </div>

                {!mlForecast && !mlLoading && !mlError && (
                  <div style={{ padding:"24px 0", textAlign:"center", color:"#475569", fontSize:12, fontFamily:"monospace" }}>
                    Pulsa ANALIZAR para ejecutar el motor ML sobre el perfil de riesgo actual
                  </div>
                )}

                {mlLoading && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[80, 60, 90, 50, 70].map((w, i) => (
                      <div key={i} className="grml-loading" style={{ height:14, width:`${w}%` }} />
                    ))}
                  </div>
                )}

                {mlError && <div style={{ color:"#EF4444", fontSize:12, fontFamily:"monospace", padding:"12px 0" }}>{mlError}</div>}

                {mlForecast && !mlLoading && (
                  <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
                    {/* Trajectory badge */}
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                      <span style={{
                        padding:"3px 10px", borderRadius:3, fontSize:10, fontFamily:"monospace", fontWeight:700, letterSpacing:1,
                        background: `${trajectoryColor[mlForecast.risk_trajectory] || "#F59E0B"}20`,
                        color: trajectoryColor[mlForecast.risk_trajectory] || "#F59E0B",
                        border: `1px solid ${trajectoryColor[mlForecast.risk_trajectory] || "#F59E0B"}40`
                      }}>{mlForecast.risk_trajectory}</span>
                      <span style={{ fontSize:10, color:"#64748B", fontFamily:"monospace" }}>Confianza: {mlForecast.confidence}%</span>
                    </div>

                    {/* Outlooks */}
                    {[["30D", mlForecast.outlook_30d], ["90D", mlForecast.outlook_90d]].map(([h, text]) => (
                      <div key={h} style={{ padding:"8px 10px", background:"#0d1829", borderRadius:4, marginBottom:6, borderLeft:"2px solid #A78BFA40" }}>
                        <span style={{ fontSize:8, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, display:"block", marginBottom:3 }}>OUTLOOK {h}</span>
                        <span style={{ fontSize:11, color:"#CBD5E1", lineHeight:1.5 }}>{text}</span>
                      </div>
                    ))}

                    {/* Key triggers */}
                    {mlForecast.key_triggers?.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>TRIGGERS CLAVE</div>
                        {mlForecast.key_triggers.map((t, i) => (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#94A3B8", marginBottom:4 }}>
                            <span style={{ width:4, height:4, borderRadius:"50%", background:"#F59E0B", display:"inline-block", flexShrink:0 }} />
                            {t}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Asset signals */}
                    {mlForecast.asset_signals?.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>SEÑALES DE ACTIVOS</div>
                        {mlForecast.asset_signals.slice(0, 4).map((s, i) => {
                          const sc = s.signal==="SOBREPONDERAR" ? "#10B981" : s.signal==="INFRAPONDERAR" ? "#EF4444" : "#F59E0B";
                          return (
                            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"center", padding:"4px 0", borderBottom:"1px solid #1a274430" }}>
                              <span style={{ fontSize:11, color:"#94A3B8" }}>{s.asset}</span>
                              <span style={{ fontSize:9, fontFamily:"monospace", color:sc, background:`${sc}15`, padding:"2px 6px", borderRadius:2, border:`1px solid ${sc}30` }}>{s.signal}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Variables grid */}
            <div style={{ background:"#0a1322", border:"1px solid #1a2744", borderRadius:6, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.2fr 1.5fr", padding:"10px 16px", background:"#0d1829", borderBottom:"1px solid #1a2744", fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                <span>VARIABLE</span><span>BASE</span><span>IMPACTO</span><span>PROYECCIÓN</span><span>TENDENCIA 24M</span>
              </div>
              {Object.entries(ECONOMIC_VARIABLES).map(([k, v], i) => {
                const imp = computeImpact(k);
                const proj = v.base + imp * v.vol * 5;
                const impCol = imp > 0.1 ? "#F59E0B" : imp < -0.1 ? "#10B981" : "#94A3B8";
                return (
                  <div key={k} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.2fr 1.5fr", padding:"12px 16px", borderBottom:"1px solid #1a274430", alignItems:"center", background:i%2 ? "#0a1322" : "#0c1526" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:"#CBD5E1" }}>{v.label}</div>
                      <div style={{ fontSize:9, color:"#475569", fontFamily:"monospace", letterSpacing:"0.04em", marginTop:2 }}>{v.source}</div>
                    </div>
                    <span style={{ fontFamily:"monospace", fontSize:12, color:"#94A3B8" }}>{fmt(v.base, v.decimals ?? 2)}{v.unit}</span>
                    <MiniBar value={imp} max={0.8} width={50} />
                    <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:600, color:impCol }}>
                      {fmt(proj, v.decimals ?? 2)}{v.unit}
                    </span>
                    <SparkLine data={sparkData[k]} color={impCol} w={110} h={24} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: ESCENARIOS ═══════════════ */}
        {tab === "scenarios" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div style={{
              background:"#0a1322", border:"1px solid #1e3a5f", borderLeft:"3px solid #3B82F6",
              borderRadius:6, padding:"12px 16px", marginBottom:16,
              display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap",
            }}>
              <div style={{ fontSize:12, color:"#94A3B8", lineHeight:1.6, maxWidth:680 }}>
                <span style={{ color:"#CBD5E1" }}>El círculo de cada slider aparece por defecto en la probabilidad estimada por los algoritmos de ZRC.</span>
                {" "}Deslízalo para explorar tu propio escenario, o deja que el NLP Analyzer lo ajuste automáticamente al leer una noticia.
                {" "}Queda marcado como "AJUSTADO" con el valor ZRC original visible; usa ↺ para devolver el círculo a su posición.
              </div>
              {isCustomized && (
                <button onClick={resetWeights} style={{
                  flexShrink:0, padding:"6px 14px", background:"transparent", border:"1px solid #3B82F660",
                  color:"#60A5FA", fontSize:10, fontFamily:"monospace", letterSpacing:1, cursor:"pointer",
                  borderRadius:4, whiteSpace:"nowrap",
                }}>
                  ↺ RESTABLECER VALORES ZRC
                </button>
              )}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12 }}>
              {Object.entries(SCENARIOS).map(([sk, sv]) => {
                const isModified = Math.abs(weights[sk] - DEFAULT_WEIGHTS[sk]) > 0.005;
                return (
                <div key={sk} onClick={() => setActiveScenario(sk)} style={{
                  background: activeScenario===sk ? "#0d1829" : "#0a1322",
                  border:`1px solid ${activeScenario===sk ? sv.color+"60" : "#1a274440"}`,
                  borderRadius:6, padding:16, cursor:"pointer", transition:"all 0.3s", position:"relative", overflow:"hidden"
                }}>
                  {activeScenario===sk && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${sv.color},transparent)` }} />}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:sv.color, marginBottom:2 }}>{sv.label}</div>
                      <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace" }}>{sv.desc}</div>
                    </div>
                    <RiskGauge value={sv.risk} size={56} />
                  </div>
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>PROBABILIDAD</span>
                        <button
                          onClick={e => { e.stopPropagation(); setWeights(prev => ({ ...prev, [sk]: DEFAULT_WEIGHTS[sk] })); }}
                          title={`Dejar en el nivel ZRC (${(DEFAULT_WEIGHTS[sk]*100).toFixed(0)}%) sin arrastrar`}
                          disabled={!isModified}
                          style={{
                            background: isModified ? "#3B82F615" : "transparent",
                            border: `1px solid ${isModified ? "#3B82F660" : "#1a274460"}`,
                            color: isModified ? "#60A5FA" : "#334155",
                            fontSize:11, borderRadius:3, padding:"0px 5px", lineHeight:1.6,
                            cursor: isModified ? "pointer" : "default", flexShrink: 0,
                          }}
                        >↺</button>
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color: isModified ? "#F59E0B" : sv.color, fontFamily:"monospace" }}>{(weights[sk]*100).toFixed(0)}%</span>
                    </div>
                    {isModified && (
                      <div style={{ marginBottom:4 }}>
                        <span style={{ fontSize:9, fontFamily:"monospace", color:"#F59E0B", background:"#F59E0B15", border:"1px solid #F59E0B30", borderRadius:2, padding:"1px 5px" }}>
                          AJUSTADO · ZRC: {(DEFAULT_WEIGHTS[sk]*100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize:9, color:"#475569", fontFamily:"monospace", marginBottom:4 }}>
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
                      <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>VECTORES DE IMPACTO · FUENTE Y NIVEL ACTUAL POR VARIABLE</div>
                      {Object.entries(sv.impactByRegion[region]).map(([vk, vi]) => {
                        const ev = ECONOMIC_VARIABLES[vk];
                        return (
                          <div key={vk} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0" }}>
                            <div>
                              <div style={{ fontSize:11, color:"#94A3B8" }}>{ev?.label}</div>
                              <div style={{ fontSize:9, color:"#475569", fontFamily:"monospace" }}>
                                {ev?.source} · actual: {fmt(ev?.base, ev?.decimals ?? 2)}{ev?.unit}
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <SparkLine data={sparkData[vk]} color={sv.color} w={36} h={16} />
                              <MiniBar value={vi} max={1} color={sv.color} width={50} />
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, margin:"10px 0 6px" }}>
                        EJEMPLO · IMPACTO ESTIMADO EN PRECIOS (12M, si se materializa este escenario) · {REGIONS[region].label}
                      </div>
                      {ASSETS.map(a => {
                        const pct = estimatePriceImpact(a, sv.impactByRegion[region], region);
                        const c = pct > 0.5 ? "#EF4444" : pct < -0.5 ? "#10B981" : "#64748B";
                        return (
                          <div key={a} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0" }}>
                            <span style={{ fontSize:11, color:"#94A3B8" }}>{a}</span>
                            <span style={{ fontSize:11, fontFamily:"monospace", fontWeight:600, color:c }}>
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

        {/* ═══════════════ TAB: CORRELACIONES ═══════════════ */}
        {tab === "heatmap" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div style={{ background:"#0a1322", border:"1px solid #1a2744", borderRadius:6, padding:20 }}>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>MATRIZ DE CORRELACIÓN ESCENARIO × VARIABLE</div>
                <div style={{ fontSize:11, color:"#94A3B8" }}>Impacto ponderado por probabilidad asignada. Actualización en tiempo real.</div>
              </div>
              <CorrelationHeatmap scenarios={SCENARIOS} scenarioWeights={weights} economicVariables={ECONOMIC_VARIABLES} region={region} />
            </div>

            {/* Weighted impacts table */}
            <div style={{ background:"#0a1322", border:"1px solid #1a2744", borderRadius:6, overflow:"hidden", marginTop:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"10px 16px", background:"#0d1829", borderBottom:"1px solid #1a2744", fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                <span>VARIABLE</span><span style={{textAlign:"right"}}>IMPACTO NETO</span><span style={{textAlign:"right"}}>VALOR BASE</span><span style={{textAlign:"right"}}>VALOR PROYECTADO</span>
              </div>
              {Object.entries(ECONOMIC_VARIABLES).map(([k, v], i) => {
                const imp = computeImpact(k);
                const proj = v.base + imp * v.vol * 5;
                const c = imp > 0.1 ? "#EF4444" : imp < -0.1 ? "#10B981" : "#94A3B8";
                return (
                  <div key={k} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"12px 16px", borderBottom:"1px solid #1a274430", alignItems:"center", background:i%2?"#0a1322":"#0c1526" }}>
                    <div>
                      <div style={{ fontSize:12, color:"#CBD5E1" }}>{v.label}</div>
                      <div style={{ fontSize:9, color:"#475569", fontFamily:"monospace", letterSpacing:"0.04em", marginTop:2 }}>{v.source}</div>
                    </div>
                    <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:12, fontWeight:600, color:c }}>{imp>=0?"+":""}{fmt(imp,3)}</span>
                    <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:12, color:"#64748B" }}>{fmt(v.base, v.decimals ?? 2)}{v.unit}</span>
                    <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:13, fontWeight:600, color:c }}>{fmt(proj, v.decimals ?? 2)}{v.unit}</span>
                  </div>
                );
              })}
            </div>

            {/* Asset price impact examples */}
            <div style={{ background:"#0a1322", border:"1px solid #1a2744", borderRadius:6, overflow:"hidden", marginTop:12 }}>
              <div style={{ padding:"10px 16px", background:"#0d1829", borderBottom:"1px solid #1a2744", fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                EJEMPLOS DE IMPACTO EN PRECIOS DE ACTIVOS · 12M · MIX ACTUAL DE PROBABILIDADES
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.3fr", padding:"10px 16px", background:"#0d1829", borderBottom:"1px solid #1a2744", fontSize:10, color:"#64748B", fontFamily:"monospace", letterSpacing:1 }}>
                <span>CLASE DE ACTIVO</span><span style={{textAlign:"right"}}>IMPACTO PRECIO EST.</span><span style={{textAlign:"right"}}>RECOMENDACIÓN</span>
              </div>
              {assetImpacts.map((a, i) => (
                <div key={a.asset} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.3fr", padding:"12px 16px", borderBottom:"1px solid #1a274430", alignItems:"center", background:i%2?"#0a1322":"#0c1526" }}>
                  <span style={{ fontSize:12, color:"#CBD5E1" }}>{a.asset}</span>
                  <span style={{ textAlign:"right", fontFamily:"monospace", fontSize:13, fontWeight:600, color:a.col }}>{a.pct>=0?"+":""}{fmt(a.pct,1)}%</span>
                  <span style={{ textAlign:"right" }}>
                    <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, letterSpacing:1, color:a.col, padding:"2px 8px", borderRadius:2, background:`${a.col}15`, border:`1px solid ${a.col}30` }}>{a.dir}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: NLP ANALYZER ═══════════════ */}
        {tab === "nlp" && (
          <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
            <div style={{ background:"#0a1322", border:"1px solid rgba(139,92,246,0.25)", borderRadius:6, padding:20 }}>
              <div style={{ fontSize:10, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>NLP ANALYZER — CLAUDE ML ENGINE</div>
              <div style={{ fontSize:11, color:"#94A3B8", marginBottom:14 }}>Extracción automática de señales geopolíticas. Los resultados ajustan las probabilidades de escenario.</div>
              <textarea value={nlpText} onChange={e => setNlpText(e.target.value)}
                placeholder="Pegue aquí un titular, noticia o briefing geopolítico para análisis predictivo de riesgo..."
                style={{ width:"100%", height:120, background:"#080e1a", border:"1px solid #1a2744", borderRadius:4, padding:14, color:"#CBD5E1", fontSize:13, fontFamily:"'JetBrains Mono',monospace", resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" }}
              />
              <button className="grml-btn" onClick={runNLP} disabled={nlpLoading} style={{
                marginTop:10, padding:"9px 24px", background: nlpLoading ? "#1a2744" : "linear-gradient(135deg,#4c1d95,#7c3aed)",
                border:"1px solid rgba(139,92,246,0.4)", borderRadius:4, color:"#fff",
                fontSize:11, fontWeight:600, fontFamily:"monospace", cursor: nlpLoading ? "not-allowed" : "pointer", letterSpacing:1
              }}>
                {nlpLoading ? "⏳ ANALIZANDO..." : "⚡ ANALIZAR CON ML"}
              </button>

              {nlpLoading && (
                <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:8 }}>
                  {[90, 70, 80, 60].map((w, i) => <div key={i} className="grml-loading" style={{ height:16, width:`${w}%` }} />)}
                </div>
              )}

              {nlpResult && !nlpLoading && (
                <div style={{ marginTop:20, animation:"grml-fadeIn 0.4s ease" }}>
                  {nlpResult.error ? (
                    <div style={{ color:"#EF4444", fontFamily:"monospace", fontSize:12 }}>{nlpResult.error}</div>
                  ) : (
                    <>
                      {/* Score + sentiment */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                        {[
                          ["RISK SCORE", nlpResult.risk_score, nlpResult.risk_score > 60 ? "#EF4444" : nlpResult.risk_score > 35 ? "#F59E0B" : "#10B981"],
                          ["SENTIMENT", nlpResult.sentiment, nlpResult.sentiment==="BEARISH" ? "#EF4444" : nlpResult.sentiment==="BULLISH" ? "#10B981" : "#F59E0B"],
                          ["CONFIANZA", `${nlpResult.confidence}%`, "#A78BFA"]
                        ].map(([label, val, col]) => (
                          <div key={label} style={{ textAlign:"center", padding:"12px", background:"#0d1829", borderRadius:4 }}>
                            <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>{label}</div>
                            <div style={{ fontSize:24, fontWeight:700, color:col, fontFamily:"monospace" }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div style={{ padding:"12px 16px", background:"#0d182960", borderLeft:"2px solid #A78BFA", borderRadius:4, marginBottom:14 }}>
                        <div style={{ fontSize:9, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>ANÁLISIS ML</div>
                        <div style={{ fontSize:12, color:"#CBD5E1", lineHeight:1.6 }}>{nlpResult.summary}</div>
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        {/* Entities */}
                        {nlpResult.key_entities?.length > 0 && (
                          <div>
                            <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>ENTIDADES DETECTADAS</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                              {nlpResult.key_entities.map((e, i) => (
                                <span key={i} style={{ padding:"3px 8px", borderRadius:3, fontSize:11, fontFamily:"monospace", background:"rgba(59,130,246,0.12)", color:"#60A5FA", border:"1px solid rgba(59,130,246,0.3)" }}>{e}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Implications */}
                        {nlpResult.investment_implications?.length > 0 && (
                          <div>
                            <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>IMPLICACIONES DE INVERSIÓN</div>
                            {nlpResult.investment_implications.map((imp, i) => (
                              <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", fontSize:11, color:"#94A3B8", marginBottom:5 }}>
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
                          <span style={{ fontSize:9, color:"#64748B", fontFamily:"monospace" }}>ESCENARIO MAPEADO:</span>
                          <span style={{ fontSize:10, fontFamily:"monospace", color:SCENARIOS[nlpResult.scenario_match]?.color || "#94A3B8", padding:"2px 8px", background:`${SCENARIOS[nlpResult.scenario_match]?.color || "#94A3B8"}15`, border:`1px solid ${SCENARIOS[nlpResult.scenario_match]?.color || "#94A3B8"}30`, borderRadius:3 }}>
                            {SCENARIOS[nlpResult.scenario_match]?.label || nlpResult.scenario_match}
                          </span>
                          <span style={{ fontSize:9, color:"#475569", fontFamily:"monospace" }}>— probabilidades de escenario actualizadas</span>
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
            <div style={{ background:"#0a1322", border:"1px solid rgba(139,92,246,0.25)", borderRadius:6, padding:20, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, color:"#A78BFA", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>DECISION ENGINE — CLAUDE ML</div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>Recomendaciones tácticas institucionales basadas en el perfil de riesgo actual</div>
                </div>
                <button className="grml-btn" onClick={runDecision} disabled={decisionLoading} style={{
                  padding:"8px 18px", background: decisionLoading ? "#1a2744" : "linear-gradient(135deg,#134e4a,#059669)",
                  border:"1px solid rgba(16,185,129,0.3)", borderRadius:4, color:"#fff",
                  fontSize:10, fontFamily:"monospace", cursor: decisionLoading ? "not-allowed" : "pointer", letterSpacing:1
                }}>
                  {decisionLoading ? "PROCESANDO..." : "⚡ EJECUTAR ENGINE"}
                </button>
              </div>

              {/* Current risk snapshot */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
                {[
                  ["RIESGO", `${compositeRisk.toFixed(0)}/100`, riskColor],
                  ["ESCENARIO DOM.", dominantScenario.label?.split(" ")[0], dominantScenario.color],
                  ["SECTOR", SECTORS[sector].label, "#60A5FA"],
                  ["MULT.", `×${sectorMult.toFixed(2)}`, sectorMult>1?"#F59E0B":"#10B981"],
                ].map(([label, val, col]) => (
                  <div key={label} style={{ padding:"10px 12px", background:"#0d1829", borderRadius:4, borderLeft:`2px solid ${col}40` }}>
                    <div style={{ fontSize:8, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:col, fontFamily:"monospace" }}>{val}</div>
                  </div>
                ))}
              </div>

              {!decisionResult && !decisionLoading && (
                <div style={{ padding:"24px 0", textAlign:"center", color:"#475569", fontSize:12, fontFamily:"monospace" }}>
                  El motor generará recomendaciones de asignación táctica basadas en el perfil geopolítico actual
                </div>
              )}

              {decisionLoading && (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[85, 65, 75, 55, 80, 60].map((w, i) => <div key={i} className="grml-loading" style={{ height:14, width:`${w}%` }} />)}
                </div>
              )}

              {decisionResult && !decisionLoading && (
                <div style={{ animation:"grml-fadeIn 0.4s ease" }}>
                  {decisionResult.error ? (
                    <div style={{ color:"#EF4444", fontFamily:"monospace", fontSize:12 }}>{decisionResult.error}</div>
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
                            <div style={{ fontSize:11, fontWeight:700, color:c, fontFamily:"monospace", letterSpacing:1 }}>{l}</div>
                          </div>
                        ))}
                        <span style={{ fontSize:11, color:"#94A3B8", fontStyle:"italic" }}>{decisionResult.macro_regime}</span>
                      </div>

                      {/* Tactical recommendations */}
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>RECOMENDACIONES TÁCTICAS</div>
                        {decisionResult.tactical_recommendations?.map((rec, i) => {
                          const cc = rec.conviction==="HIGH" ? "#EF4444" : rec.conviction==="MEDIUM" ? "#F59E0B" : "#64748B";
                          return (
                            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, alignItems:"center", padding:"10px 12px", background: i%2 ? "#0a1322" : "#0d1829", borderRadius:4, marginBottom:4 }}>
                              <div>
                                <div style={{ fontSize:12, color:"#CBD5E1", marginBottom:2 }}>{rec.action}</div>
                                <div style={{ fontSize:10, color:"#64748B" }}>{rec.rationale}</div>
                              </div>
                              <span style={{ fontSize:9, fontFamily:"monospace", color:"#60A5FA", background:"rgba(59,130,246,0.12)", padding:"2px 6px", borderRadius:2, whiteSpace:"nowrap" }}>{rec.timeframe}</span>
                              <span style={{ fontSize:9, fontFamily:"monospace", color:cc, background:`${cc}15`, padding:"2px 6px", borderRadius:2, border:`1px solid ${cc}30`, whiteSpace:"nowrap" }}>{rec.conviction}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        {[["RIESGOS CLAVE", decisionResult.key_risks, "#EF4444"], ["OPORTUNIDADES", decisionResult.key_opportunities, "#10B981"]].map(([label, items, col]) => (
                          <div key={label}>
                            <div style={{ fontSize:9, color:"#64748B", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>{label}</div>
                            {items?.map((item, i) => (
                              <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", fontSize:11, color:"#94A3B8", marginBottom:5 }}>
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

            <div style={{ padding:12, background:"#0d182960", borderRadius:4, border:"1px dashed #1a274480", fontSize:10, color:"#475569", fontFamily:"monospace", lineHeight:1.6 }}>
              ⚠ DISCLAIMER: Las señales generadas por el Decision Engine ML son output del modelo Claude de Anthropic aplicado al perfil cuantitativo de Zenith Rise Capital. No constituyen asesoramiento de inversión regulado. Consulte con un asesor financiero cualificado antes de ejecutar decisiones de inversión.
            </div>
          </div>
        )}

        <footer style={{ padding:"20px 0", marginTop:30, borderTop:"1px solid #1a2744", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:10, color:"#475569", fontFamily:"monospace", lineHeight:1.6 }}>
            © 2026 Zenith Rise Capital · Calesius Global SL · Madrid, España
            <br />GeoRisk ML v1.0 · Powered by Claude Sonnet · Horizonte 12M · Recalibración continua
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:10, color:"#475569", fontFamily:"monospace" }}>zenithrisecapital.com</span>
            <span style={{ padding:"3px 8px", borderRadius:3, fontSize:9, fontFamily:"monospace", letterSpacing:1, background:"rgba(139,92,246,0.12)", color:"#A78BFA", border:"1px solid rgba(139,92,246,0.25)" }}>ML ENGINE LIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
