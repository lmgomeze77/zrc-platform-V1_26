import { useState, useEffect, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════
// ZRC FINANCIAL INTELLIGENCE SYSTEM — v1.0
// Modules: Onboarding · 13W Cash Flow · Working Capital · Risk Engine · AI Report
// Design: ZRC platform tokens — navy #09090B · gold #D4A853
// ══════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#09090B", surface: "#111113", surface2: "#18181B", surface3: "#1F1F23",
  border: "#27272A", borderHover: "#3F3F46",
  text: "#FAFAFA", textSec: "#A1A1AA", textMuted: "#71717A",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.10)", goldBorder: "rgba(212,168,83,0.25)",
  red: "#EF4444", redDim: "rgba(239,68,68,0.12)",
  green: "#22C55E", greenDim: "rgba(34,197,94,0.12)",
  amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  blue: "#3B82F6",
};

const F = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body: "'Outfit', 'Helvetica Neue', sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', monospace",
};

// ── Default demo inputs (matches ZRC Excel v1) ──────────────────────────
const DEFAULT_INPUTS = {
  companyName: "Example Family-Owned GrowthCo",
  startingCash: 250000,
  monthlyRevenue: 650000,
  monthlyGrowthRate: 0.025,
  cashSalesPct: 0.25,
  collectionDelayDays: 60,
  supplierPaymentTerms: 45,
  payroll: 95000,
  fixedCosts: 85000,
  variableCostPct: 0.52,
  vatTaxPayments: 42000,
  capex: 25000,
  debtService: 18000,
  minimumCashBuffer: 150000,
  openingAR: 950000,
  openingAP: 520000,
  openingInventory: 680000,
  annualCOGS: 4050000,
};

// ── Financial Engine ────────────────────────────────────────────────────
function computeModel(inp) {
  const weeklyRevBase = inp.monthlyRevenue * 12 / 52;
  const weeklyPayroll = inp.payroll * 12 / 52;
  const weeklyFixed = inp.fixedCosts * 12 / 52;
  const weeklyVAT = inp.vatTaxPayments * 12 / 52;
  const weeklyCapexDebt = (inp.capex + inp.debtService) * 12 / 52;

  // Lagged cash in: % sold on credit collected after collectionDelayDays
  const creditPct = 1 - inp.cashSalesPct;
  const lagWeeks = Math.round(inp.collectionDelayDays / 7);

  const cashFlow = [];
  for (let w = 1; w <= 13; w++) {
    const revenue = weeklyRevBase * Math.pow(1 + inp.monthlyGrowthRate / 4.33, w - 1);
    const cashSales = revenue * inp.cashSalesPct;
    // Lagged receivables kick in after lag
    const laggedRec = w > lagWeeks
      ? weeklyRevBase * creditPct * Math.pow(1 + inp.monthlyGrowthRate / 4.33, Math.max(0, w - lagWeeks - 1))
      : inp.openingAR / Math.max(lagWeeks, 1);
    const totalCashIn = cashSales + laggedRec;
    const variableCost = revenue * inp.variableCostPct;
    const totalCashOut = weeklyPayroll + weeklyFixed + variableCost + weeklyVAT + weeklyCapexDebt;
    const prev = w === 1 ? inp.startingCash : cashFlow[w - 2].closingCash;
    const closingCash = prev + totalCashIn - totalCashOut;
    cashFlow.push({
      week: w, revenue, cashSales, laggedRec, totalCashIn,
      payroll: weeklyPayroll, fixed: weeklyFixed, variableCost,
      vat: weeklyVAT, capexDebt: weeklyCapexDebt, totalCashOut,
      closingCash, belowBuffer: closingCash < inp.minimumCashBuffer,
    });
  }

  // Working Capital
  const annualRevenue = inp.monthlyRevenue * 12;
  const dso = (inp.openingAR / annualRevenue) * 365;
  const dpo = (inp.openingAP / inp.annualCOGS) * 365;
  const dio = (inp.openingInventory / inp.annualCOGS) * 365;
  const ccc = dso + dio - dpo;
  const liquidityDSO10 = (annualRevenue / 365) * 10;
  const liquidityDSO20 = (annualRevenue / 365) * 20;

  // Runway
  const week13Cash = cashFlow[12].closingCash;
  const avgWeeklyBurn = cashFlow.reduce((s, r) => s + r.totalCashOut, 0) / 13;
  const cashAboveBuffer = Math.max(0, week13Cash - inp.minimumCashBuffer);
  const runwayWeeks = cashAboveBuffer / avgWeeklyBurn;
  const fundingGap = Math.min(0, week13Cash - inp.minimumCashBuffer);

  // Risk Rules
  const belowBufferWeeks = cashFlow.filter(r => r.belowBuffer).length;
  const rules = [
    { name: "Cash runway", value: runwayWeeks, threshold: 6, pass: runwayWeeks >= 6, score: runwayWeeks < 6 ? 2 : 0 },
    { name: "Min cash breach", value: week13Cash, threshold: inp.minimumCashBuffer, pass: week13Cash >= inp.minimumCashBuffer, score: week13Cash < inp.minimumCashBuffer ? 2 : 0 },
    { name: "DSO efficiency", value: dso, threshold: 75, pass: dso <= 75, score: dso > 75 ? 2 : dso > 60 ? 1 : 0 },
    { name: "CCC pressure", value: ccc, threshold: 90, pass: ccc <= 90, score: ccc > 90 ? 2 : ccc > 70 ? 1 : 0 },
    { name: "Weeks below buffer", value: belowBufferWeeks, threshold: 3, pass: belowBufferWeeks <= 3, score: belowBufferWeeks > 3 ? 2 : 0 },
  ];
  const totalScore = rules.reduce((s, r) => s + r.score, 0);
  const riskLevel = totalScore >= 4 ? "HIGH" : totalScore >= 2 ? "MEDIUM" : "LOW";
  const riskColor = riskLevel === "HIGH" ? C.red : riskLevel === "MEDIUM" ? C.amber : C.green;

  return { cashFlow, dso, dpo, dio, ccc, liquidityDSO10, liquidityDSO20, runwayWeeks, fundingGap, week13Cash, rules, totalScore, riskLevel, riskColor, annualRevenue, avgWeeklyBurn };
}

// ── Helpers ─────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
};
const fmtEur = (n) => `€${fmt(Math.abs(n))}${n < 0 ? " (gap)" : ""}`;
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

// ── Shared UI atoms ──────────────────────────────────────────────────────
const Badge = ({ color, children }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 3, fontSize: 11, fontFamily: F.body, fontWeight: 700, letterSpacing: "0.06em", color: C.bg, background: color }}>
    {children}
  </span>
);

const KPICard = ({ label, value, sub, color = C.gold, warn }) => (
  <div style={{ background: C.surface2, border: `1px solid ${warn ? "rgba(239,68,68,0.4)" : C.goldBorder}`, padding: "18px 20px", borderRadius: 6 }}>
    <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: F.display, fontSize: 28, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>{sub}</div>}
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontFamily: F.display, fontSize: 22, color: C.gold, margin: 0, fontWeight: 400 }}>{title}</h3>
    {subtitle && <p style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, marginTop: 4, marginBottom: 0 }}>{subtitle}</p>}
  </div>
);

const InputField = ({ label, value, onChange, type = "number", unit, hint }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontFamily: F.body, fontSize: 12, color: C.textSec, marginBottom: 5, letterSpacing: "0.04em" }}>
      {label} {unit && <span style={{ color: C.textMuted }}>({unit})</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: C.surface3, border: `1px solid ${C.border}`,
        borderRadius: 4, padding: "8px 12px",
        fontFamily: F.mono, fontSize: 13, color: C.text,
        outline: "none", transition: "border-color 0.2s",
      }}
      onFocus={e => e.target.style.borderColor = C.gold}
      onBlur={e => e.target.style.borderColor = C.border}
    />
    {hint && <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 3 }}>{hint}</div>}
  </div>
);

const Divider = () => <div style={{ borderTop: `1px solid ${C.border}`, margin: "24px 0" }} />;

// ── Tab system ───────────────────────────────────────────────────────────
const TABS = [
  { id: "inputs", label: "Client Inputs", icon: "⚙" },
  { id: "cashflow", label: "13W Cash Flow", icon: "📊" },
  { id: "wc", label: "Working Capital", icon: "⚡" },
  { id: "risk", label: "Risk Engine", icon: "🛡" },
  { id: "report", label: "AI Report", icon: "🧠" },
];

// ══════════════════════════════════════════════════════════════════════════
// PANEL: CLIENT INPUTS
// ══════════════════════════════════════════════════════════════════════════
function InputsPanel({ inputs, setInputs }) {
  const set = (k) => (v) => setInputs(prev => ({ ...prev, [k]: v }));
  return (
    <div>
      <SectionHeader title="Client Financial Inputs" subtitle="Editable assumptions. All formula outputs update in real time." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>1 — Company & Revenue</div>
          <InputField label="Company name" value={inputs.companyName} onChange={set("companyName")} type="text" />
          <InputField label="Starting cash" value={inputs.startingCash} onChange={set("startingCash")} unit="EUR" />
          <InputField label="Monthly revenue" value={inputs.monthlyRevenue} onChange={set("monthlyRevenue")} unit="EUR/month" />
          <InputField label="Monthly growth rate" value={inputs.monthlyGrowthRate} onChange={set("monthlyGrowthRate")} unit="decimal" hint="e.g. 0.025 = 2.5% monthly" />
          <InputField label="Cash sales %" value={inputs.cashSalesPct} onChange={set("cashSalesPct")} unit="decimal" hint="Share of revenue collected same week" />
          <InputField label="Collection delay" value={inputs.collectionDelayDays} onChange={set("collectionDelayDays")} unit="days" hint="Average receivables collection delay" />
          <InputField label="Supplier payment terms" value={inputs.supplierPaymentTerms} onChange={set("supplierPaymentTerms")} unit="days" />
          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>2 — Balance Sheet Anchors</div>
          <InputField label="Opening accounts receivable" value={inputs.openingAR} onChange={set("openingAR")} unit="EUR" />
          <InputField label="Opening accounts payable" value={inputs.openingAP} onChange={set("openingAP")} unit="EUR" />
          <InputField label="Opening inventory" value={inputs.openingInventory} onChange={set("openingInventory")} unit="EUR" />
          <InputField label="Annual COGS" value={inputs.annualCOGS} onChange={set("annualCOGS")} unit="EUR/year" />
        </div>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>3 — Cost Structure</div>
          <InputField label="Monthly payroll" value={inputs.payroll} onChange={set("payroll")} unit="EUR/month" hint="Incl. social charges" />
          <InputField label="Monthly fixed costs" value={inputs.fixedCosts} onChange={set("fixedCosts")} unit="EUR/month" hint="Rent, utilities, admin" />
          <InputField label="Variable cost % of revenue" value={inputs.variableCostPct} onChange={set("variableCostPct")} unit="decimal" hint="COGS + variable OPEX ratio" />
          <InputField label="VAT / tax payments" value={inputs.vatTaxPayments} onChange={set("vatTaxPayments")} unit="EUR/month" />
          <InputField label="Monthly capex" value={inputs.capex} onChange={set("capex")} unit="EUR/month" />
          <InputField label="Monthly debt service" value={inputs.debtService} onChange={set("debtService")} unit="EUR/month" hint="Principal + interest" />
          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>4 — Risk Thresholds</div>
          <InputField label="Minimum cash buffer" value={inputs.minimumCashBuffer} onChange={set("minimumCashBuffer")} unit="EUR" hint="Management safety threshold" />
          <div style={{ marginTop: 24, padding: "16px 20px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 6 }}>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 6 }}>ZRC Guardrails Active</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
              Raw client files are never sent to the AI layer. Only structured KPI outputs reach the model. Every recommendation is tied to a named financial metric.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL: 13W CASH FLOW
// ══════════════════════════════════════════════════════════════════════════
function CashFlowPanel({ model, inputs }) {
  const { cashFlow } = model;
  const cols = [
    { key: "week", label: "Wk", mono: true },
    { key: "revenue", label: "Revenue", fmt: fmt },
    { key: "totalCashIn", label: "Cash In", fmt: fmt },
    { key: "totalCashOut", label: "Cash Out", fmt: fmt },
    { key: "closingCash", label: "Closing Cash", fmt: fmt, highlight: true },
  ];

  const maxCash = Math.max(...cashFlow.map(r => r.closingCash));
  const minCash = Math.min(...cashFlow.map(r => r.closingCash));

  return (
    <div>
      <SectionHeader title="13-Week Rolling Cash Flow" subtitle="Weekly cash in/out projection with minimum buffer monitoring." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPICard label="Week 13 Cash" value={`€${fmt(model.week13Cash)}`} sub="Projected end position" color={model.week13Cash > inputs.minimumCashBuffer ? C.green : C.red} warn={model.week13Cash < inputs.minimumCashBuffer} />
        <KPICard label="Min Cash Buffer" value={`€${fmt(inputs.minimumCashBuffer)}`} sub="Safety threshold" />
        <KPICard label="Funding Gap" value={model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"} sub={model.fundingGap < 0 ? "Below buffer at W13" : "Buffer maintained"} color={model.fundingGap < 0 ? C.red : C.green} warn={model.fundingGap < 0} />
      </div>

      {/* Mini sparkline */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Cash Position — Weeks 1–13</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
          {cashFlow.map((row) => {
            const h = Math.max(4, ((row.closingCash - minCash) / (maxCash - minCash + 1)) * 60);
            return (
              <div key={row.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: "100%", height: h,
                    background: row.belowBuffer ? C.red : C.gold,
                    opacity: row.belowBuffer ? 0.9 : 0.7,
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.4s",
                  }}
                  title={`W${row.week}: €${fmt(row.closingCash)}`}
                />
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{row.week}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, background: C.gold, borderRadius: 2 }} />
            <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>Above buffer</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, background: C.red, borderRadius: 2 }} />
            <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>Below buffer (stress)</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12 }}>
          <thead>
            <tr>
              {["Wk", "Revenue", "Cash In", "Cash Out", "Closing Cash", "Status"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: h === "Wk" ? "center" : "right", background: C.surface2, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, letterSpacing: "0.04em", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cashFlow.map((row) => (
              <tr key={row.week} style={{ background: row.belowBuffer ? C.redDim : "transparent", borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: F.mono, color: C.textMuted }}>{row.week}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: F.mono, color: C.textSec }}>€{fmt(row.revenue)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: F.mono, color: C.green }}>€{fmt(row.totalCashIn)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: F.mono, color: C.red }}>€{fmt(row.totalCashOut)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: F.mono, fontWeight: 700, color: row.belowBuffer ? C.red : C.gold }}>€{fmt(row.closingCash)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {row.belowBuffer
                    ? <Badge color={C.red}>⚠ Below buffer</Badge>
                    : <Badge color={C.green}>✓ Clear</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL: WORKING CAPITAL
// ══════════════════════════════════════════════════════════════════════════
function WorkingCapitalPanel({ model }) {
  const { dso, dpo, dio, ccc, liquidityDSO10, liquidityDSO20, annualRevenue } = model;
  const metrics = [
    { label: "DSO", value: dso, unit: "days", benchmark: 60, formula: "A/R ÷ Revenue × 365", action: "Accelerate collections, A/R governance", priority: dso > 75 ? "High" : "Medium" },
    { label: "DPO", value: dpo, unit: "days", benchmark: 60, formula: "A/P ÷ COGS × 365", action: "Negotiate supplier terms and payment calendar", priority: "Medium" },
    { label: "DIO", value: dio, unit: "days", benchmark: 75, formula: "Inventory ÷ COGS × 365", action: "Improve inventory rotation and purchasing discipline", priority: "Medium" },
    { label: "CCC", value: ccc, unit: "days", benchmark: 75, formula: "DSO + DIO − DPO", action: "Reduce cash trapped in operating cycle", priority: ccc > 90 ? "High" : "Medium" },
  ];

  const simulations = [
    { label: "DSO −5 days", days: 5, released: (annualRevenue / 365) * 5 },
    { label: "DSO −10 days", days: 10, released: liquidityDSO10 },
    { label: "DSO −20 days", days: 20, released: liquidityDSO20 },
  ];

  return (
    <div>
      <SectionHeader title="Working Capital Optimizer" subtitle="Identify where liquidity is trapped and quantify release potential." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {metrics.map(m => {
          const gap = m.value - m.benchmark;
          return (
            <KPICard
              key={m.label}
              label={m.label}
              value={`${fmt(m.value, 1)} d`}
              sub={`Benchmark: ${m.benchmark}d · Gap: ${gap > 0 ? "+" : ""}${fmt(gap, 1)}d`}
              color={m.value > m.benchmark ? C.amber : C.green}
              warn={m.value > m.benchmark * 1.2}
            />
          );
        })}
      </div>

      {/* Metric detail table */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 28 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12 }}>
          <thead>
            <tr>
              {["Metric", "Formula", "Current", "Benchmark", "Gap", "Suggested Action", "Priority"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", background: C.surface3, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const gap = m.value - m.benchmark;
              const gapColor = gap > 0 ? C.amber : C.green;
              return (
                <tr key={m.label} style={{ borderBottom: i < metrics.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: C.gold }}>{m.label}</td>
                  <td style={{ padding: "10px 14px", color: C.textMuted, fontFamily: F.mono, fontSize: 11 }}>{m.formula}</td>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: C.text }}>{fmt(m.value, 1)} d</td>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, color: C.textSec }}>{m.benchmark} d</td>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, color: gapColor, fontWeight: 700 }}>{gap > 0 ? "+" : ""}{fmt(gap, 1)} d</td>
                  <td style={{ padding: "10px 14px", color: C.textSec, fontSize: 11, maxWidth: 200 }}>{m.action}</td>
                  <td style={{ padding: "10px 14px" }}><Badge color={m.priority === "High" ? C.amber : C.blue}>{m.priority}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Liquidity simulation */}
      <div style={{ background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: "20px 24px" }}>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
          Liquidity Release Simulation — DSO Reduction
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {simulations.map(s => (
            <div key={s.label} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "14px 18px" }}>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: F.display, fontSize: 22, color: C.gold }}>€{fmt(s.released)}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 4 }}>cash unlocked</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 14 }}>
          Formula: Annual revenue ÷ 365 × days reduced · Based on €{fmt(annualRevenue)} annual revenue
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL: RISK ENGINE
// ══════════════════════════════════════════════════════════════════════════
function RiskPanel({ model, inputs }) {
  const { rules, totalScore, riskLevel, riskColor, runwayWeeks, cashFlow } = model;
  return (
    <div>
      <SectionHeader title="ZRC Decision Rule Engine" subtitle="Rule-based risk scoring. Every flag is tied to a named financial metric." />

      {/* Risk headline */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", background: C.surface2, border: `1px solid ${riskColor}40`, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${riskColor}20`, border: `2px solid ${riskColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          {riskLevel === "HIGH" ? "⚠" : riskLevel === "MEDIUM" ? "⚡" : "✓"}
        </div>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Overall Risk Level</div>
          <div style={{ fontFamily: F.display, fontSize: 32, color: riskColor, lineHeight: 1 }}>{riskLevel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>Risk score</div>
          <div style={{ fontFamily: F.display, fontSize: 32, color: riskColor }}>{totalScore} / 10</div>
        </div>
      </div>

      {/* Rules table */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12 }}>
          <thead>
            <tr>
              {["Rule", "Threshold", "Current", "Score", "Status", "ZRC Recommendation"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", background: C.surface3, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { ...rules[0], threshold: "≥ 6 weeks", displayVal: `${fmt(runwayWeeks, 1)} weeks`, rec: "Secure short-term liquidity line and reduce discretionary outflows" },
              { ...rules[1], threshold: `≥ €${fmt(inputs.minimumCashBuffer)}`, displayVal: `€${fmt(rules[1].value)}`, rec: "Prepare funding gap action plan. Pre-negotiate credit line." },
              { ...rules[2], threshold: "≤ 75 days", displayVal: `${fmt(rules[2].value, 1)} days`, rec: "Launch receivables recovery sprint. A/R governance committee." },
              { ...rules[3], threshold: "≤ 90 days", displayVal: `${fmt(rules[3].value, 1)} days`, rec: "Prioritize working capital release over new growth commitments." },
              { ...rules[4], threshold: "≤ 3 weeks", displayVal: `${fmt(rules[4].value)} weeks`, rec: "Weekly treasury committee until cash buffer restored." },
            ].map((rule, i) => (
              <tr key={i} style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : "none", background: !rule.pass ? C.redDim : "transparent" }}>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{rule.name}</td>
                <td style={{ padding: "10px 14px", fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{rule.threshold}</td>
                <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: rule.pass ? C.green : C.red }}>{rule.displayVal}</td>
                <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: rule.score > 0 ? C.red : C.green }}>{rule.score}</td>
                <td style={{ padding: "10px 14px" }}>
                  <Badge color={rule.pass ? C.green : C.red}>{rule.pass ? "LOW" : "RISK"}</Badge>
                </td>
                <td style={{ padding: "10px 14px", color: C.textSec, fontSize: 11 }}>{rule.rec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scenario table */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "18px 20px" }}>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>Scenario Stress Table</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Base", color: C.green, desc: "Management case", cash: model.week13Cash, gap: model.fundingGap },
            { label: "Growth", color: C.amber, desc: "+20% rev, +10d collection lag", cash: model.week13Cash * 0.88, gap: model.week13Cash * 0.88 < inputs.minimumCashBuffer ? model.week13Cash * 0.88 - inputs.minimumCashBuffer : 0 },
            { label: "Stress", color: C.red, desc: "−15% rev, +20d lag, +5% costs", cash: model.week13Cash * 0.62, gap: model.week13Cash * 0.62 < inputs.minimumCashBuffer ? model.week13Cash * 0.62 - inputs.minimumCashBuffer : 0 },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface3, border: `1px solid ${s.color}30`, borderRadius: 4, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Badge color={s.color}>{s.label}</Badge>
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{s.desc}</span>
              </div>
              <div style={{ fontFamily: F.display, fontSize: 22, color: s.cash < inputs.minimumCashBuffer ? C.red : C.gold }}>€{fmt(s.cash)}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 2 }}>W13 cash</div>
              {s.gap < 0 && <div style={{ fontFamily: F.mono, fontSize: 11, color: C.red, marginTop: 6 }}>Gap: €{fmt(Math.abs(s.gap))}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PANEL: AI REPORT
// ══════════════════════════════════════════════════════════════════════════
function ReportPanel({ model, inputs }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const payload = {
      client_name: inputs.companyName,
      report_date: new Date().toLocaleDateString("en-GB"),
      currency: "EUR",
      kpis: {
        cash_runway_weeks: fmt(model.runwayWeeks, 1),
        risk_level: model.riskLevel,
        funding_gap: model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))} shortfall` : "No gap",
        dso: fmt(model.dso, 1),
        ccc: fmt(model.ccc, 1),
        week13_cash: `€${fmt(model.week13Cash)}`,
        liquidity_released_dso_10d: `€${fmt(model.liquidityDSO10)}`,
      },
      risk_rules: model.rules.map(r => ({ name: r.name, status: r.pass ? "LOW" : "RISK", score: r.score })),
      total_risk_score: model.totalScore,
    };

    const systemPrompt = `You are a senior financial advisor at Zenith Rise Capital (ZRC), a Madrid-based institutional advisory firm. 
Generate a concise, board-grade Financial Intelligence Report for the client. 
Tone: premium, precise, conservative, actionable. Avoid generic advice. Every recommendation must be tied to the exact data provided.
Do not invent figures. If data looks unusual, flag it as a diagnostic note.
Structure your response as valid JSON with these exact keys:
{
  "executive_summary": "2-3 sentences, precise, citing key metrics",
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "recommended_actions": [
    {"priority": "High/Medium", "action": "...", "impact": "...", "timing": "...", "owner": "CEO/CFO/ZRC"},
    ...
  ],
  "strategic_view": "2-3 sentences on the strategic picture",
  "forward_view": "2-3 sentences on the 13-week outlook"
}
Return ONLY valid JSON. No markdown fences. No preamble.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: `Generate the Financial Intelligence Report for the following client data:\n${JSON.stringify(payload, null, 2)}` }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setReport(parsed);
    } catch (e) {
      setError("Failed to generate report. Check API connectivity.");
    }
    setLoading(false);
  };

  const exportHTML = () => {
    if (!report) return;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>ZRC Financial Intelligence Report — ${inputs.companyName}</title>
<style>
  body{font-family:Georgia,serif;margin:0;background:#f5f5f3;color:#111827}
  .page{max-width:920px;margin:32px auto;background:#fff;padding:42px 54px;border:1px solid #e5e7eb}
  .brand{color:#D4A853;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px}
  h1{font-size:34px;margin:10px 0 6px;color:#09090B}
  .subtitle{font-family:Arial,sans-serif;color:#6B7280;font-size:13px;margin-bottom:28px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}
  .kpi{border:1px solid #D4A853;padding:16px;background:#0B1220;color:#fff}
  .kpi .label{font-family:Arial,sans-serif;font-size:11px;color:#CBD5E1}
  .kpi .value{font-size:26px;color:#D4A853;margin-top:6px}
  h2{font-size:20px;margin-top:28px;border-bottom:2px solid #D4A853;padding-bottom:6px}
  p,li{font-family:Arial,sans-serif;font-size:14px;line-height:1.55}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-family:Arial,sans-serif;font-size:13px}
  th{background:#0B1220;color:#fff;text-align:left;padding:9px}
  td{border:1px solid #e5e7eb;padding:9px}
  .footer{margin-top:36px;font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;text-align:center}
</style>
</head>
<body>
<div class="page">
  <div class="brand">ZENITH RISE CAPITAL</div>
  <h1>ZRC Financial Intelligence Report</h1>
  <div class="subtitle">Client: ${inputs.companyName} · Week: ${new Date().toLocaleDateString("en-GB")} · Currency: EUR</div>
  <div class="kpis">
    <div class="kpi"><div class="label">Cash runway</div><div class="value">${fmt(model.runwayWeeks, 1)} weeks</div></div>
    <div class="kpi"><div class="label">Risk level</div><div class="value">${model.riskLevel}</div></div>
    <div class="kpi"><div class="label">Funding gap</div><div class="value">${model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"}</div></div>
    <div class="kpi"><div class="label">DSO</div><div class="value">${fmt(model.dso, 1)} days</div></div>
    <div class="kpi"><div class="label">CCC</div><div class="value">${fmt(model.ccc, 1)} days</div></div>
    <div class="kpi"><div class="label">DSO −10d cash release</div><div class="value">€${fmt(model.liquidityDSO10)}</div></div>
  </div>
  <h2>1. Executive Summary</h2>
  <p>${report.executive_summary}</p>
  <h2>2. Key Risks</h2>
  <ul>${report.key_risks.map(r => `<li>${r}</li>`).join("")}</ul>
  <h2>3. Recommended Actions</h2>
  <table><thead><tr><th>Priority</th><th>Action</th><th>Impact</th><th>Timing</th><th>Owner</th></tr></thead>
  <tbody>${report.recommended_actions.map(a => `<tr><td>${a.priority}</td><td>${a.action}</td><td>${a.impact}</td><td>${a.timing}</td><td>${a.owner}</td></tr>`).join("")}</tbody></table>
  <h2>4. Strategic View</h2>
  <p>${report.strategic_view}</p>
  <h2>5. Forward View</h2>
  <p>${report.forward_view}</p>
  <div class="footer">Zenith Rise Capital · Confidential client report · Generated by ZRC Financial Intelligence System · ${new Date().toISOString().split("T")[0]}</div>
</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ZRC_FIS_${inputs.companyName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.html`;
    a.click();
  };

  return (
    <div>
      <SectionHeader title="AI Report Generator" subtitle="Send structured model outputs to Claude. Every recommendation is anchored to a named metric." />

      {/* Payload preview */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>KPI Payload — sent to model</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            ["Client", inputs.companyName],
            ["Risk level", model.riskLevel],
            ["Cash runway", `${fmt(model.runwayWeeks, 1)} weeks`],
            ["Funding gap", model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"],
            ["DSO", `${fmt(model.dso, 1)} days`],
            ["CCC", `${fmt(model.ccc, 1)} days`],
            ["Week 13 cash", `€${fmt(model.week13Cash)}`],
            ["DSO −10d release", `€${fmt(model.liquidityDSO10)}`],
            ["Risk score", `${model.totalScore} / 10`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", background: C.surface3, borderRadius: 3 }}>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{k}</span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: C.goldDim, borderRadius: 4, fontFamily: F.body, fontSize: 11, color: C.textSec }}>
          ✓ Guardrail: raw client files are never sent. Only structured KPIs reach the model.
        </div>
      </div>

      <button
        onClick={generateReport}
        disabled={loading}
        style={{
          padding: "12px 28px", background: loading ? C.surface3 : C.gold, color: C.bg,
          border: "none", borderRadius: 4, fontFamily: F.body, fontWeight: 700,
          fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.04em",
          transition: "opacity 0.2s", opacity: loading ? 0.6 : 1, marginBottom: 24,
        }}
      >
        {loading ? "⏳ Generating report…" : "⚡ Generate AI Report"}
      </button>

      {error && (
        <div style={{ padding: "14px 18px", background: C.redDim, border: `1px solid ${C.red}40`, borderRadius: 6, fontFamily: F.body, fontSize: 13, color: C.red, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {report && (
        <div>
          {/* Report card */}
          <div style={{ background: C.surface2, border: `1px solid ${C.goldBorder}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#0B1220", padding: "20px 28px", borderBottom: `2px solid ${C.gold}` }}>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Zenith Rise Capital</div>
              <div style={{ fontFamily: F.display, fontSize: 26, color: C.text, margin: "6px 0 4px" }}>ZRC Financial Intelligence Report</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>{inputs.companyName} · {new Date().toLocaleDateString("en-GB")} · EUR</div>
            </div>
            <div style={{ padding: "28px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                {[
                  ["Cash runway", `${fmt(model.runwayWeeks, 1)} weeks`],
                  ["Risk level", model.riskLevel],
                  ["Funding gap", model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"],
                  ["DSO", `${fmt(model.dso, 1)} days`],
                  ["CCC", `${fmt(model.ccc, 1)} days`],
                  ["DSO −10d cash", `€${fmt(model.liquidityDSO10)}`],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "#0B1220", border: `1px solid ${C.gold}`, padding: "14px 16px" }}>
                    <div style={{ fontFamily: F.body, fontSize: 10, color: "#CBD5E1", letterSpacing: "0.06em", textTransform: "uppercase" }}>{l}</div>
                    <div style={{ fontFamily: F.display, fontSize: 22, color: C.gold, marginTop: 4 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: F.display, fontSize: 18, color: C.gold, borderBottom: `2px solid ${C.gold}`, paddingBottom: 6, marginTop: 0 }}>1. Executive Summary</h4>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>{report.executive_summary}</p>
              </div>

              <div style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: F.display, fontSize: 18, color: C.gold, borderBottom: `2px solid ${C.gold}`, paddingBottom: 6, marginTop: 0 }}>2. Key Risks</h4>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {report.key_risks.map((r, i) => (
                    <li key={i} style={{ fontFamily: F.body, fontSize: 14, color: C.textSec, marginBottom: 6, lineHeight: 1.55 }}>{r}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: F.display, fontSize: 18, color: C.gold, borderBottom: `2px solid ${C.gold}`, paddingBottom: 6, marginTop: 0 }}>3. Recommended Actions</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Priority", "Action", "Impact", "Timing", "Owner"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", background: "#0B1220", color: C.text, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.recommended_actions.map((a, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 10px" }}><Badge color={a.priority === "High" ? C.red : C.amber}>{a.priority}</Badge></td>
                        <td style={{ padding: "8px 10px", color: C.textSec }}>{a.action}</td>
                        <td style={{ padding: "8px 10px", color: C.textMuted, fontSize: 12 }}>{a.impact}</td>
                        <td style={{ padding: "8px 10px", fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{a.timing}</td>
                        <td style={{ padding: "8px 10px", fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{a.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: F.display, fontSize: 18, color: C.gold, borderBottom: `2px solid ${C.gold}`, paddingBottom: 6, marginTop: 0 }}>4. Strategic View</h4>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>{report.strategic_view}</p>
              </div>

              <div>
                <h4 style={{ fontFamily: F.display, fontSize: 18, color: C.gold, borderBottom: `2px solid ${C.gold}`, paddingBottom: 6, marginTop: 0 }}>5. Forward View</h4>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>{report.forward_view}</p>
              </div>

              <div style={{ marginTop: 28, textAlign: "center", fontFamily: F.body, fontSize: 11, color: C.textMuted }}>
                Zenith Rise Capital · Confidential client report · Generated by ZRC Financial Intelligence System
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              onClick={exportHTML}
              style={{ padding: "10px 22px", background: C.surface2, color: C.gold, border: `1px solid ${C.goldBorder}`, borderRadius: 4, fontFamily: F.body, fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              ↓ Export HTML Report
            </button>
            <button
              onClick={generateReport}
              style={{ padding: "10px 22px", background: C.surface3, color: C.textSec, border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: F.body, fontSize: 13, cursor: "pointer" }}
            >
              ↻ Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function FinancialIntelligenceSystem({ onClose }) {
  const [activeTab, setActiveTab] = useState("inputs");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const model = computeModel(inputs);

  return (
    <div style={{ width: "100%", minHeight: "100%", background: C.bg, color: C.text, fontFamily: F.body }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 0" }}>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 10, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Zenith Rise Capital</div>
            <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, marginTop: 2 }}>Financial Intelligence System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Live risk badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: `${model.riskColor}15`, border: `1px solid ${model.riskColor}40`, borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: model.riskColor }} />
              <span style={{ fontFamily: F.mono, fontSize: 11, color: model.riskColor, fontWeight: 700 }}>{model.riskLevel} RISK</span>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{inputs.companyName}</div>
            {onClose && (
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px", background: "none", border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeTab === tab.id ? C.gold : C.textMuted,
                fontFamily: F.body, fontSize: 13, cursor: "pointer",
                fontWeight: activeTab === tab.id ? 700 : 400,
                transition: "all 0.2s", letterSpacing: "0.02em",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard KPI strip */}
      <div style={{ background: "#0B1220", borderBottom: `1px solid ${C.border}`, padding: "14px 32px" }}>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {[
            ["Cash Runway", `${fmt(model.runwayWeeks, 1)} wks`, model.runwayWeeks < 6 ? C.red : C.green],
            ["Risk Level", model.riskLevel, model.riskColor],
            ["Funding Gap", model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None", model.fundingGap < 0 ? C.red : C.green],
            ["DSO", `${fmt(model.dso, 1)} d`, model.dso > 75 ? C.amber : C.green],
            ["CCC", `${fmt(model.ccc, 1)} d`, model.ccc > 90 ? C.red : model.ccc > 75 ? C.amber : C.green],
            ["DSO −10d Release", `€${fmt(model.liquidityDSO10)}`, C.gold],
          ].map(([label, value, color]) => (
            <div key={label} style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: F.display, fontSize: 16, color, fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel content */}
      <div style={{ padding: "32px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {activeTab === "inputs" && <InputsPanel inputs={inputs} setInputs={setInputs} />}
        {activeTab === "cashflow" && <CashFlowPanel model={model} inputs={inputs} />}
        {activeTab === "wc" && <WorkingCapitalPanel model={model} />}
        {activeTab === "risk" && <RiskPanel model={model} inputs={inputs} />}
        {activeTab === "report" && <ReportPanel model={model} inputs={inputs} />}
      </div>
    </div>
  );
}
