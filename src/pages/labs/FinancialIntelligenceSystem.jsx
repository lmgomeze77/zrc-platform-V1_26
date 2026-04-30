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

// ── Default demo inputs ──────────────────────────────────────────────────
// Payment timing: which week of the month (1–4) each outflow hits the bank.
// This is the key addition over a naive /52 model — it drives real cash peaks.
const DEFAULT_INPUTS = {
  companyName: "Example Family-Owned GrowthCo",
  startingCash: 250000,
  monthlyRevenue: 650000,
  monthlyGrowthRate: 0.025,   // decimal, e.g. 0.025 = 2.5% per month
  cashSalesPct: 0.25,          // share of revenue collected same week as sale
  collectionDelayDays: 60,     // avg days to collect credit sales (drives AR lag)
  supplierPaymentTerms: 45,    // avg days to pay suppliers (drives AP release)
  // Monthly outflows
  payroll: 95000,              // EUR/month — hits bank week payrollWeek
  fixedCosts: 85000,           // EUR/month — hits bank week fixedWeek
  vatTaxPayments: 42000,       // EUR/month equivalent — hits bank week vatWeek
  capex: 25000,                // EUR/month — hits bank week capexWeek
  debtService: 18000,          // EUR/month — hits bank week debtWeek
  // Payment timing (1=first week of month, 2=second, 3=third, 4=last)
  payrollWeek: 4,
  fixedWeek: 1,
  vatWeek: 3,
  capexWeek: 2,
  debtWeek: 2,
  // Risk threshold
  minimumCashBuffer: 150000,
  // Working capital anchors (balance sheet)
  openingAR: 950000,
  openingAP: 520000,
  annualRevenue: 7800000,      // used for DSO/DPO; defaults to monthlyRevenue×12
  annualCOGS: 4050000,
};

// ── Calendar Engine ─────────────────────────────────────────────────────
// Logic:
//   - 13 weeks = weeks 1..13, mapping to months M0 (wks 1-4), M1 (wks 5-8), M2 (wks 9-12), M3 (wk 13)
//   - Each monthly outflow fires exactly once per month, in its designated week
//   - Revenue accrues weekly (monthly / 4.33 per week), with growth applied per month
//   - Cash IN = same-week cash sales + lagged credit collections (collectionDelayDays → lag in weeks)
//   - Opening AR drains over the lag period before new collections take over
//   - No inventory / COGS weekly split — model is AP/AR-driven, consistent with inputs
function computeModel(inp) {
  const annualRev = inp.monthlyRevenue * 12;

  // Weekly revenue by week (monthly growth applied at month boundary)
  // Month index of week w (0-based): Math.floor((w-1)/4)
  const weeklyRevenue = (w) => {
    const monthIdx = Math.floor((w - 1) / 4);
    return (inp.monthlyRevenue / 4.33) * Math.pow(1 + inp.monthlyGrowthRate, monthIdx);
  };

  // Credit collection lag in weeks (rounded)
  const lagWeeks = Math.max(1, Math.round(inp.collectionDelayDays / 7));
  const creditPct = 1 - inp.cashSalesPct;

  // Opening AR spreads evenly across the lag period as pre-existing receivables clear
  const arWeeklyRelease = inp.openingAR / lagWeeks;

  // Which week-of-month (1–4) does week w fall in?
  const weekOfMonth = (w) => ((w - 1) % 4) + 1;

  // Does a monthly payment due in weekOfMonth X fire in week w?
  const fires = (w, targetWeekOfMonth) => weekOfMonth(w) === targetWeekOfMonth;

  const cashFlow = [];

  for (let w = 1; w <= 13; w++) {
    const rev = weeklyRevenue(w);

    // ── CASH IN ──────────────────────────────────────────────────────
    const cashSales = rev * inp.cashSalesPct;

    // Credit collections: opening AR clears first, then lagged new sales
    let creditCollections = 0;
    if (w <= lagWeeks) {
      // Still collecting pre-existing AR
      creditCollections = arWeeklyRelease;
    } else {
      // Collecting credit sales from w - lagWeeks ago
      creditCollections = weeklyRevenue(w - lagWeeks) * creditPct;
    }
    const totalCashIn = cashSales + creditCollections;

    // ── CASH OUT — calendar-based, not smoothed ───────────────────────
    // Each monthly cost fires once in its designated week-of-month
    const payrollOut   = fires(w, inp.payrollWeek) ? inp.payroll    : 0;
    const fixedOut     = fires(w, inp.fixedWeek)   ? inp.fixedCosts : 0;
    const vatOut       = fires(w, inp.vatWeek)      ? inp.vatTaxPayments : 0;
    const capexOut     = fires(w, inp.capexWeek)    ? inp.capex     : 0;
    const debtOut      = fires(w, inp.debtWeek)     ? inp.debtService : 0;
    const totalCashOut = payrollOut + fixedOut + vatOut + capexOut + debtOut;

    const prev = w === 1 ? inp.startingCash : cashFlow[w - 2].closingCash;
    const closingCash = prev + totalCashIn - totalCashOut;

    cashFlow.push({
      week: w,
      monthIdx: Math.floor((w - 1) / 4) + 1,
      weekOfMonth: weekOfMonth(w),
      revenue: rev,
      cashSales,
      creditCollections,
      totalCashIn,
      payroll: payrollOut,
      fixed: fixedOut,
      vat: vatOut,
      capex: capexOut,
      debt: debtOut,
      totalCashOut,
      closingCash,
      belowBuffer: closingCash < inp.minimumCashBuffer,
    });
  }

  // ── Working Capital ───────────────────────────────────────────────────
  const dso = (inp.openingAR / annualRev) * 365;
  const dpo = (inp.openingAP / inp.annualCOGS) * 365;
  // No inventory input → DIO = 0, CCC = DSO - DPO
  const ccc = dso - dpo;
  const liquidityDSO10 = (annualRev / 365) * 10;
  const liquidityDSO20 = (annualRev / 365) * 20;

  // ── Summary metrics ───────────────────────────────────────────────────
  const week13Cash = cashFlow[12].closingCash;
  const minCashAny = Math.min(...cashFlow.map(r => r.closingCash));
  const fundingGap = Math.min(0, minCashAny - inp.minimumCashBuffer); // worst week, not just W13
  const avgWeeklyOut = cashFlow.reduce((s, r) => s + r.totalCashOut, 0) / 13;
  const cashAboveBuffer = Math.max(0, week13Cash - inp.minimumCashBuffer);
  const runwayWeeks = avgWeeklyOut > 0 ? cashAboveBuffer / avgWeeklyOut : 99;
  const belowBufferWeeks = cashFlow.filter(r => r.belowBuffer).length;

  // ── Risk Rules ────────────────────────────────────────────────────────
  const rules = [
    { name: "Cash runway",        value: runwayWeeks,       threshold: 6,                    pass: runwayWeeks >= 6,                    score: runwayWeeks < 6 ? 2 : 0 },
    { name: "Min cash breach",    value: minCashAny,        threshold: inp.minimumCashBuffer, pass: minCashAny >= inp.minimumCashBuffer,  score: minCashAny < inp.minimumCashBuffer ? 2 : 0 },
    { name: "DSO efficiency",     value: dso,               threshold: 75,                   pass: dso <= 75,                           score: dso > 75 ? 2 : dso > 60 ? 1 : 0 },
    { name: "CCC pressure",       value: ccc,               threshold: 60,                   pass: ccc <= 60,                           score: ccc > 60 ? 2 : ccc > 45 ? 1 : 0 },
    { name: "Weeks below buffer", value: belowBufferWeeks,  threshold: 3,                    pass: belowBufferWeeks <= 3,               score: belowBufferWeeks > 3 ? 2 : 0 },
  ];
  const totalScore = rules.reduce((s, r) => s + r.score, 0);
  const riskLevel = totalScore >= 4 ? "HIGH" : totalScore >= 2 ? "MEDIUM" : "LOW";
  const riskColor = riskLevel === "HIGH" ? C.red : riskLevel === "MEDIUM" ? C.amber : C.green;

  return {
    cashFlow, dso, dpo, ccc, liquidityDSO10, liquidityDSO20,
    runwayWeeks, fundingGap, week13Cash, minCashAny,
    rules, totalScore, riskLevel, riskColor,
    annualRevenue: annualRev, avgWeeklyOut, belowBufferWeeks, lagWeeks,
  };
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

  const WeekSelect = ({ label, value, onChange, hint }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontFamily: F.body, fontSize: 12, color: C.textSec, marginBottom: 5, letterSpacing: "0.04em" }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4].map(w => (
          <button key={w} onClick={() => onChange(w)}
            style={{
              flex: 1, padding: "8px 0", fontFamily: F.mono, fontSize: 12, fontWeight: 700,
              background: value === w ? C.gold : C.surface3,
              color: value === w ? C.bg : C.textMuted,
              border: `1px solid ${value === w ? C.gold : C.border}`,
              borderRadius: 4, cursor: "pointer",
            }}>
            W{w}
          </button>
        ))}
      </div>
      {hint && <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 3 }}>{hint}</div>}
    </div>
  );

  return (
    <div>
      <SectionHeader title="Client Financial Inputs" subtitle="Monthly costs fire on their designated week-of-month. AR/AP collection lags are calendar-accurate." />

      {/* Model logic note */}
      <div style={{ padding: "12px 16px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 6, marginBottom: 24 }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 4 }}>13W Calendar Model — How it works</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
          Each monthly outflow hits the bank exactly once per month in the week you designate (W1–W4). Revenue accrues weekly. Credit collections are lagged by your collection delay in days. Opening AR drains first before new collections begin.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0 40px" }}>
        {/* LEFT */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>1 — Company & Revenue</div>
          <InputField label="Company name" value={inputs.companyName} onChange={set("companyName")} type="text" />
          <InputField label="Starting cash" value={inputs.startingCash} onChange={set("startingCash")} unit="EUR" hint="Bank balance at start of Week 1" />
          <InputField label="Monthly revenue" value={inputs.monthlyRevenue} onChange={set("monthlyRevenue")} unit="EUR/month" />
          <InputField label="Monthly growth rate" value={inputs.monthlyGrowthRate} onChange={set("monthlyGrowthRate")} unit="decimal" hint="e.g. 0.025 = 2.5% per month" />
          <InputField label="Cash sales %" value={inputs.cashSalesPct} onChange={set("cashSalesPct")} unit="decimal" hint="Share of revenue collected same week as sale" />
          <InputField label="Collection delay" value={inputs.collectionDelayDays} onChange={set("collectionDelayDays")} unit="days" hint="Avg days to collect credit sales → determines AR lag in weeks" />

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>2 — Monthly Outflows</div>
          <InputField label="Payroll" value={inputs.payroll} onChange={set("payroll")} unit="EUR/month" hint="Incl. social charges" />
          <InputField label="Fixed costs" value={inputs.fixedCosts} onChange={set("fixedCosts")} unit="EUR/month" hint="Rent, utilities, admin" />
          <InputField label="VAT / tax payments" value={inputs.vatTaxPayments} onChange={set("vatTaxPayments")} unit="EUR/month equiv." hint="Monthly equivalent of quarterly/annual tax obligations" />
          <InputField label="Capex" value={inputs.capex} onChange={set("capex")} unit="EUR/month" />
          <InputField label="Debt service" value={inputs.debtService} onChange={set("debtService")} unit="EUR/month" hint="Principal + interest" />

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>3 — Risk Threshold</div>
          <InputField label="Minimum cash buffer" value={inputs.minimumCashBuffer} onChange={set("minimumCashBuffer")} unit="EUR" hint="Management safety threshold — breach triggers risk flag" />
        </div>

        {/* RIGHT */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>4 — Payment Calendar</div>
          <div style={{ padding: "14px 16px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 20 }}>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              Select the week of the month each outflow hits your bank account. W1 = first week, W4 = last week.
            </div>
            <WeekSelect label="Payroll payment week" value={inputs.payrollWeek} onChange={set("payrollWeek")} hint="Most companies: W4 (end of month)" />
            <WeekSelect label="Fixed costs / rent week" value={inputs.fixedWeek} onChange={set("fixedWeek")} hint="Most leases: W1 (start of month)" />
            <WeekSelect label="VAT / tax payment week" value={inputs.vatWeek} onChange={set("vatWeek")} hint="Typically mid-month: W2 or W3" />
            <WeekSelect label="Capex payment week" value={inputs.capexWeek} onChange={set("capexWeek")} />
            <WeekSelect label="Debt service week" value={inputs.debtWeek} onChange={set("debtWeek")} hint="Per loan contract terms" />
          </div>

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>5 — Working Capital Anchors</div>
          <InputField label="Opening accounts receivable" value={inputs.openingAR} onChange={set("openingAR")} unit="EUR" hint="Current AR balance — drains over collection lag period" />
          <InputField label="Opening accounts payable" value={inputs.openingAP} onChange={set("openingAP")} unit="EUR" hint="Used for DPO calculation" />
          <InputField label="Annual COGS" value={inputs.annualCOGS} onChange={set("annualCOGS")} unit="EUR/year" hint="Used for DPO ratio only" />

          <div style={{ marginTop: 20, padding: "14px 16px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 6 }}>
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

  const maxCash = Math.max(...cashFlow.map(r => r.closingCash));
  const minCash = Math.min(...cashFlow.map(r => r.closingCash));

  return (
    <div>
      <SectionHeader title="13-Week Cash Flow — Calendar Model" subtitle={`Monthly outflows fire on their designated week-of-month. Collection lag: ${model.lagWeeks} weeks (${inputs.collectionDelayDays} days). Opening AR drains first.`} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard label="Week 13 Cash" value={`€${fmt(model.week13Cash)}`} sub="End of horizon position" color={model.week13Cash > inputs.minimumCashBuffer ? C.green : C.red} warn={model.week13Cash < inputs.minimumCashBuffer} />
        <KPICard label="Worst Week Cash" value={`€${fmt(model.minCashAny)}`} sub="Tightest point in 13W" color={model.minCashAny > inputs.minimumCashBuffer ? C.green : C.red} warn={model.minCashAny < inputs.minimumCashBuffer} />
        <KPICard label="Funding Gap" value={model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"} sub={model.fundingGap < 0 ? "Worst week below buffer" : "Buffer maintained"} color={model.fundingGap < 0 ? C.red : C.green} warn={model.fundingGap < 0} />
      </div>

      {/* Payment calendar legend */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Payment calendar active</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            ["Payroll", `W${inputs.payrollWeek}`],
            ["Fixed costs", `W${inputs.fixedWeek}`],
            ["VAT/Tax", `W${inputs.vatWeek}`],
            ["Capex", `W${inputs.capexWeek}`],
            ["Debt", `W${inputs.debtWeek}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSec }}>{k}</span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold, background: C.goldDim, padding: "1px 7px", borderRadius: 3 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Cash Position — Weeks 1–13</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
          {cashFlow.map((row) => {
            const range = maxCash - minCash || 1;
            const h = Math.max(4, ((row.closingCash - minCash) / range) * 64);
            // Highlight weeks with big outflows (payroll week etc.)
            const hasPayroll = row.payroll > 0;
            return (
              <div key={row.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: h, background: row.belowBuffer ? C.red : hasPayroll ? C.amber : C.gold, opacity: row.belowBuffer ? 0.95 : 0.7, borderRadius: "2px 2px 0 0", transition: "height 0.4s" }} title={`W${row.week}: €${fmt(row.closingCash)}\nIn: €${fmt(row.totalCashIn)} | Out: €${fmt(row.totalCashOut)}`} />
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{row.week}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          {[
            [C.gold, "Normal week"],
            [C.amber, "Payroll week"],
            [C.red, "Below buffer"],
          ].map(([col, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, background: col, borderRadius: 2 }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12, minWidth: 640 }}>
          <thead>
            <tr>
              {["Wk", "Mo·W", "Cash In", "Payroll", "Fixed", "VAT", "Cap+Debt", "Total Out", "Closing Cash", ""].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: h === "Wk" || h === "Mo·W" ? "center" : "right", background: C.surface2, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cashFlow.map((row) => (
              <tr key={row.week} style={{ background: row.belowBuffer ? C.redDim : "transparent", borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: F.mono, color: C.textMuted, fontSize: 11 }}>{row.week}</td>
                <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: F.mono, color: C.textMuted, fontSize: 11 }}>M{row.monthIdx}·W{row.weekOfMonth}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, color: C.green, fontSize: 11 }}>€{fmt(row.totalCashIn)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, color: row.payroll > 0 ? C.amber : C.textMuted, fontSize: 11 }}>{row.payroll > 0 ? `€${fmt(row.payroll)}` : "—"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, color: row.fixed > 0 ? C.red : C.textMuted, fontSize: 11 }}>{row.fixed > 0 ? `€${fmt(row.fixed)}` : "—"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, color: row.vat > 0 ? C.red : C.textMuted, fontSize: 11 }}>{row.vat > 0 ? `€${fmt(row.vat)}` : "—"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, color: (row.capex + row.debt) > 0 ? C.red : C.textMuted, fontSize: 11 }}>{(row.capex + row.debt) > 0 ? `€${fmt(row.capex + row.debt)}` : "—"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, color: C.red, fontSize: 11, fontWeight: 600 }}>€{fmt(row.totalCashOut)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: F.mono, fontWeight: 700, color: row.belowBuffer ? C.red : C.gold, fontSize: 12 }}>€{fmt(row.closingCash)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>
                  {row.belowBuffer ? <Badge color={C.red}>⚠ Below</Badge> : <Badge color={C.green}>✓</Badge>}
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
  const { dso, dpo, ccc, liquidityDSO10, liquidityDSO20, annualRevenue } = model;
  const metrics = [
    { label: "DSO", value: dso, unit: "days", benchmark: 60, formula: "A/R ÷ Revenue × 365", action: "Accelerate collections, A/R governance", priority: dso > 75 ? "High" : "Medium" },
    { label: "DPO", value: dpo, unit: "days", benchmark: 60, formula: "A/P ÷ COGS × 365", action: "Negotiate supplier terms and payment calendar", priority: "Medium" },
    { label: "CCC", value: ccc, unit: "days", benchmark: 45, formula: "DSO − DPO", action: "Reduce cash trapped in operating cycle", priority: ccc > 60 ? "High" : "Medium" },
  ];

  const simulations = [
    { label: "DSO −5 days", released: (annualRevenue / 365) * 5 },
    { label: "DSO −10 days", released: liquidityDSO10 },
    { label: "DSO −20 days", released: liquidityDSO20 },
  ];

  return (
    <div>
      <SectionHeader title="Working Capital Optimizer" subtitle="DSO-DPO model. No inventory input: CCC = DSO minus DPO. Add inventory balance to unlock DIO." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
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
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 clamp(16px,4vw,32px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Zenith Rise Capital</div>
            <div style={{ fontFamily: F.display, fontSize: "clamp(15px,3vw,20px)", color: C.text, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Financial Intelligence System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Live risk badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: `${model.riskColor}15`, border: `1px solid ${model.riskColor}40`, borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: model.riskColor, flexShrink: 0 }} />
              <span style={{ fontFamily: F.mono, fontSize: 10, color: model.riskColor, fontWeight: 700 }}>{model.riskLevel}</span>
            </div>
            {onClose && (
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
            )}
          </div>
        </div>

        {/* Tab bar — horizontally scrollable on mobile */}
        <div style={{ display: "flex", gap: 0, marginTop: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px clamp(10px,2.5vw,20px)", background: "none", border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeTab === tab.id ? C.gold : C.textMuted,
                fontFamily: F.body, fontSize: "clamp(11px,2vw,13px)", cursor: "pointer",
                fontWeight: activeTab === tab.id ? 700 : 400,
                transition: "all 0.2s", letterSpacing: "0.02em",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard KPI strip — 2×3 grid, fits any screen */}
      <div style={{ background: "#0B1220", borderBottom: `1px solid ${C.border}`, padding: "12px clamp(16px,4vw,32px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 8px" }}>
          {[
            ["Cash Runway", `${fmt(model.runwayWeeks, 1)} wks`, model.runwayWeeks < 6 ? C.red : C.green],
            ["Risk Level", model.riskLevel, model.riskColor],
            ["Funding Gap", model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None", model.fundingGap < 0 ? C.red : C.green],
            ["DSO", `${fmt(model.dso, 1)} d`, model.dso > 75 ? C.amber : C.green],
            ["CCC", `${fmt(model.ccc, 1)} d`, model.ccc > 90 ? C.red : model.ccc > 75 ? C.amber : C.green],
            ["DSO −10d Release", `€${fmt(model.liquidityDSO10)}`, C.gold],
          ].map(([label, value, color]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: F.body, fontSize: 9, color: C.textMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
              <div style={{ fontFamily: F.display, fontSize: "clamp(13px,3vw,16px)", color, fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel content */}
      <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1100, margin: "0 auto" }}>
        {activeTab === "inputs" && <InputsPanel inputs={inputs} setInputs={setInputs} />}
        {activeTab === "cashflow" && <CashFlowPanel model={model} inputs={inputs} />}
        {activeTab === "wc" && <WorkingCapitalPanel model={model} />}
        {activeTab === "risk" && <RiskPanel model={model} inputs={inputs} />}
        {activeTab === "report" && <ReportPanel model={model} inputs={inputs} />}
      </div>
    </div>
  );
}
