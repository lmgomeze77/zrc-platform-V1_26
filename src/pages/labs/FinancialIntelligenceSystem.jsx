import { useState, useEffect, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════
// ZRC FINANCIAL INTELLIGENCE SYSTEM — v2.0
// Engine: fully days-based AR/AP timing. No "week of month" heuristics.
//
// CASH IN logic:
//   Cash sales       → collected same week as the invoice
//   Credit sales     → collected collectionDelayDays after invoice date
//   Opening AR       → drains evenly over the collection lag window
//
// CASH OUT logic:
//   Variable costs   → paid to suppliers supplierPaymentDays after incurred
//   Opening AP       → drains evenly over the supplier payment lag window
//   Payroll/Fixed/VAT/Capex/Debt → fire once per month on their contract day-of-month
//
// Week mapping (91-day horizon):
//   Week w covers days (w-1)×7+1 … w×7.
//   A "day-of-month" outflow fires in week w when that calendar day falls in w.
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

// ── Default inputs ────────────────────────────────────────────────────────
const DEFAULT_INPUTS = {
  companyName: "Example Family-Owned GrowthCo",
  startingCash: 250000,
  monthlyRevenue: 650000,
  monthlyGrowthRate: 0.025,

  // Revenue collection timing
  cashSalesPct: 0.25,
  collectionDelayDays: 60,      // e.g. 60d → credit collections arrive week 9

  // Variable cost payment timing
  variableCostPct: 0.30,
  supplierPaymentDays: 45,      // e.g. 45d → variable costs leave bank week 7

  // Fixed monthly outflow amounts
  payroll: 95000,
  fixedCosts: 85000,
  vatTaxPayments: 42000,
  capex: 25000,
  debtService: 18000,

  // Payment day-of-month for fixed outflows (1–28)
  payrollDayOfMonth: 28,        // last working day → week 4
  fixedDayOfMonth: 1,           // 1st of month → week 1
  vatDayOfMonth: 20,            // mid-late month → week 3
  capexDayOfMonth: 10,          // 2nd week
  debtDayOfMonth: 15,           // mid-month → week 3

  // Risk threshold
  minimumCashBuffer: 150000,

  // Working capital anchors (balance sheet)
  openingAR: 950000,
  openingAP: 520000,
  annualCOGS: 4050000,
};

// ── Financial Engine ─────────────────────────────────────────────────────
function computeModel(inp) {
  const annualRev = inp.monthlyRevenue * 12;

  // Revenue for week w, with monthly growth applied at month boundaries
  const weeklyRevenue = (w) => {
    if (w < 1) return inp.monthlyRevenue / 4.33;
    const monthIdx = Math.floor((w - 1) / 4);
    return (inp.monthlyRevenue / 4.33) * Math.pow(1 + inp.monthlyGrowthRate, monthIdx);
  };

  // Convert days to lag weeks (minimum 1)
  const arLagWeeks = Math.max(1, Math.round(inp.collectionDelayDays / 7));
  const apLagWeeks = Math.max(1, Math.round(inp.supplierPaymentDays / 7));
  const creditPct  = 1 - inp.cashSalesPct;

  // Opening AR/AP drain evenly over their respective lag windows
  const arWeeklyRelease = inp.openingAR / arLagWeeks;
  const apWeeklyPayment  = inp.openingAP / apLagWeeks;

  // Map day-of-month (1–28) → week-of-month (1–4)
  const dayToWeekOfMonth = (d) => Math.min(4, Math.ceil(Math.max(1, d) / 7));

  // Does week w fire the monthly outflow scheduled on dayOfMonth?
  const firesThisWeek = (w, dayOfMonth) => {
    const weekOfMonth = ((w - 1) % 4) + 1;
    return weekOfMonth === dayToWeekOfMonth(dayOfMonth);
  };

  const cashFlow = [];

  for (let w = 1; w <= 13; w++) {
    const rev = weeklyRevenue(w);

    // ── CASH IN ─────────────────────────────────────────────────────────
    const cashSales = rev * inp.cashSalesPct;

    // Credit collections: drain opening AR first, then lagged new sales
    const creditCollections = w <= arLagWeeks
      ? arWeeklyRelease
      : weeklyRevenue(w - arLagWeeks) * creditPct;

    const totalCashIn = cashSales + creditCollections;

    // ── CASH OUT ─────────────────────────────────────────────────────────
    // Variable costs: drain opening AP first, then lagged new variable costs
    const variablePayment = w <= apLagWeeks
      ? apWeeklyPayment
      : weeklyRevenue(w - apLagWeeks) * inp.variableCostPct;

    // Fixed outflows fire on their contract day-of-month
    const payrollOut = firesThisWeek(w, inp.payrollDayOfMonth) ? inp.payroll        : 0;
    const fixedOut   = firesThisWeek(w, inp.fixedDayOfMonth)   ? inp.fixedCosts     : 0;
    const vatOut     = firesThisWeek(w, inp.vatDayOfMonth)     ? inp.vatTaxPayments : 0;
    const capexOut   = firesThisWeek(w, inp.capexDayOfMonth)   ? inp.capex          : 0;
    const debtOut    = firesThisWeek(w, inp.debtDayOfMonth)    ? inp.debtService    : 0;

    const totalCashOut = variablePayment + payrollOut + fixedOut + vatOut + capexOut + debtOut;

    const prev = w === 1 ? inp.startingCash : cashFlow[w - 2].closingCash;
    const closingCash = prev + totalCashIn - totalCashOut;

    cashFlow.push({
      week: w,
      monthIdx:    Math.floor((w - 1) / 4) + 1,
      weekOfMonth: ((w - 1) % 4) + 1,
      revenue: rev, cashSales, creditCollections, totalCashIn,
      variablePayment, payroll: payrollOut, fixed: fixedOut,
      vat: vatOut, capex: capexOut, debt: debtOut, totalCashOut,
      closingCash,
      belowBuffer: closingCash < inp.minimumCashBuffer,
    });
  }

  // ── Working Capital ──────────────────────────────────────────────────────
  const dso = (inp.openingAR / annualRev) * 365;
  const dpo = (inp.openingAP / inp.annualCOGS) * 365;
  const ccc = dso - dpo;
  const liquidityDSO10 = (annualRev / 365) * 10;
  const liquidityDSO20 = (annualRev / 365) * 20;

  // ── Summary ──────────────────────────────────────────────────────────────
  const week13Cash      = cashFlow[12].closingCash;
  const minCashAny      = Math.min(...cashFlow.map(r => r.closingCash));
  const fundingGap      = Math.min(0, minCashAny - inp.minimumCashBuffer);
  const avgWeeklyOut    = cashFlow.reduce((s, r) => s + r.totalCashOut, 0) / 13;
  const runwayWeeks     = avgWeeklyOut > 0 ? Math.max(0, week13Cash - inp.minimumCashBuffer) / avgWeeklyOut : 99;
  const belowBufferWeeks = cashFlow.filter(r => r.belowBuffer).length;

  // ── Risk Rules ────────────────────────────────────────────────────────────
  const rules = [
    { name: "Cash runway",        value: runwayWeeks,       threshold: 6,                    pass: runwayWeeks >= 6,                   score: runwayWeeks < 6 ? 2 : 0 },
    { name: "Min cash breach",    value: minCashAny,        threshold: inp.minimumCashBuffer, pass: minCashAny >= inp.minimumCashBuffer, score: minCashAny < inp.minimumCashBuffer ? 2 : 0 },
    { name: "DSO efficiency",     value: dso,               threshold: 75,                   pass: dso <= 75,                          score: dso > 75 ? 2 : dso > 60 ? 1 : 0 },
    { name: "CCC pressure",       value: ccc,               threshold: 60,                   pass: ccc <= 60,                          score: ccc > 60 ? 2 : ccc > 45 ? 1 : 0 },
    { name: "Weeks below buffer", value: belowBufferWeeks,  threshold: 3,                    pass: belowBufferWeeks <= 3,              score: belowBufferWeeks > 3 ? 2 : 0 },
  ];
  const totalScore = rules.reduce((s, r) => s + r.score, 0);
  const riskLevel  = totalScore >= 4 ? "HIGH" : totalScore >= 2 ? "MEDIUM" : "LOW";
  const riskColor  = riskLevel === "HIGH" ? C.red : riskLevel === "MEDIUM" ? C.amber : C.green;

  return {
    cashFlow, dso, dpo, ccc, liquidityDSO10, liquidityDSO20,
    runwayWeeks, fundingGap, week13Cash, minCashAny,
    rules, totalScore, riskLevel, riskColor,
    annualRevenue: annualRev, avgWeeklyOut, belowBufferWeeks,
    arLagWeeks, apLagWeeks,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
};

// ── UI Atoms ─────────────────────────────────────────────────────────────
const Badge = ({ color, children }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 3, fontSize: 11, fontFamily: F.body, fontWeight: 700, letterSpacing: "0.06em", color: C.bg, background: color }}>
    {children}
  </span>
);

const KPICard = ({ label, value, sub, color = C.gold, warn }) => (
  <div style={{ background: C.surface2, border: `1px solid ${warn ? "rgba(239,68,68,0.4)" : C.goldBorder}`, padding: "16px 18px", borderRadius: 6 }}>
    <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: F.display, fontSize: 26, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{sub}</div>}
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
      {label}{unit && <span style={{ color: C.textMuted }}> ({unit})</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
      style={{ width: "100%", boxSizing: "border-box", background: C.surface3, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 12px", fontFamily: F.mono, fontSize: 13, color: C.text, outline: "none", transition: "border-color 0.2s" }}
      onFocus={e => e.target.style.borderColor = C.gold}
      onBlur={e => e.target.style.borderColor = C.border}
    />
    {hint && <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 3 }}>{hint}</div>}
  </div>
);

const Divider = () => <div style={{ borderTop: `1px solid ${C.border}`, margin: "20px 0" }} />;

const TABS = [
  { id: "inputs",   label: "Client Inputs",  icon: "⚙" },
  { id: "cashflow", label: "13W Cash Flow",   icon: "📊" },
  { id: "wc",       label: "Working Capital", icon: "⚡" },
  { id: "risk",     label: "Risk Engine",     icon: "🛡" },
  { id: "report",   label: "AI Report",       icon: "🧠" },
];

// ══════════════════════════════════════════════════════════════════════════
// PANEL: CLIENT INPUTS
// ══════════════════════════════════════════════════════════════════════════
function InputsPanel({ inputs, setInputs }) {
  const set = (k) => (v) => setInputs(prev => ({ ...prev, [k]: v }));
  const arLag = Math.max(1, Math.round(inputs.collectionDelayDays / 7));
  const apLag = Math.max(1, Math.round(inputs.supplierPaymentDays / 7));

  return (
    <div>
      <SectionHeader
        title="Client Financial Inputs — v2.0"
        subtitle="All payment timing is expressed in days from invoice date or fixed contract day. The model maps these to the correct week automatically."
      />

      {/* Model logic banner */}
      <div style={{ padding: "14px 18px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 6, marginBottom: 28 }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8 }}>Cash flow timing — how the model works</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "6px 24px" }}>
          {[
            ["✓ Cash sales (IN)",        `Collected same week as invoice`],
            [`✓ Credit sales (IN)`,      `Arrive week ${arLag} onwards (${inputs.collectionDelayDays}d delay)`],
            [`✓ Variable costs (OUT)`,   `Paid from week ${apLag} onwards (${inputs.supplierPaymentDays}d terms)`],
            [`✓ Payroll (OUT)`,          `Hits bank on day ${inputs.payrollDayOfMonth} of each month`],
            [`✓ Fixed/Rent (OUT)`,       `Hits bank on day ${inputs.fixedDayOfMonth} of each month`],
            [`✓ VAT/Tax (OUT)`,          `Hits bank on day ${inputs.vatDayOfMonth} of each month`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 6 }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold, flexShrink: 0 }}>{k}:</span>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textSec }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0 40px" }}>
        {/* LEFT */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>1 — Company & Revenue</div>
          <InputField label="Company name"      value={inputs.companyName}       onChange={set("companyName")}       type="text" />
          <InputField label="Starting cash"     value={inputs.startingCash}      onChange={set("startingCash")}      unit="EUR"     hint="Bank balance on day 1 of the projection" />
          <InputField label="Monthly revenue"   value={inputs.monthlyRevenue}    onChange={set("monthlyRevenue")}    unit="EUR/month" />
          <InputField label="Monthly growth"    value={inputs.monthlyGrowthRate} onChange={set("monthlyGrowthRate")} unit="decimal" hint="e.g. 0.025 = 2.5% per month" />

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>2 — Collection Timing (Cash IN)</div>
          <InputField
            label="Cash sales %"
            value={inputs.cashSalesPct}
            onChange={set("cashSalesPct")}
            unit="decimal"
            hint="Share of revenue collected the same week as the sale (no credit terms)"
          />
          <InputField
            label="Collection delay"
            value={inputs.collectionDelayDays}
            onChange={set("collectionDelayDays")}
            unit="days from invoice"
            hint={`DSO proxy. At ${inputs.collectionDelayDays}d, credit sales issued in W1 are collected in W${arLag}`}
          />

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>3 — Variable Cost Payments (Cash OUT)</div>
          <InputField
            label="Variable cost %"
            value={inputs.variableCostPct}
            onChange={set("variableCostPct")}
            unit="% of revenue"
            hint="COGS + variable OPEX as a share of weekly revenue"
          />
          <InputField
            label="Supplier payment terms"
            value={inputs.supplierPaymentDays}
            onChange={set("supplierPaymentDays")}
            unit="days from invoice"
            hint={`At ${inputs.supplierPaymentDays}d, costs incurred in W1 leave the bank in W${apLag}`}
          />

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>4 — Fixed Monthly Outflows</div>
          <InputField label="Payroll"        value={inputs.payroll}         onChange={set("payroll")}         unit="EUR/month" hint="Incl. social charges" />
          <InputField label="Fixed costs"    value={inputs.fixedCosts}      onChange={set("fixedCosts")}      unit="EUR/month" hint="Rent, utilities, admin" />
          <InputField label="VAT / tax"      value={inputs.vatTaxPayments}  onChange={set("vatTaxPayments")}  unit="EUR/month equiv." hint="Monthly equivalent of periodic tax obligations" />
          <InputField label="Capex"          value={inputs.capex}           onChange={set("capex")}           unit="EUR/month" />
          <InputField label="Debt service"   value={inputs.debtService}     onChange={set("debtService")}     unit="EUR/month" hint="Principal + interest per loan schedule" />

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>5 — Risk Threshold</div>
          <InputField label="Minimum cash buffer" value={inputs.minimumCashBuffer} onChange={set("minimumCashBuffer")} unit="EUR" hint="Breach triggers risk flag in the engine" />
        </div>

        {/* RIGHT */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>6 — Payment Day of Month</div>
          <div style={{ padding: "16px 18px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 20 }}>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
              Enter the day of the month (1–28) when each fixed outflow hits the bank account. The model converts this to the correct week in the 91-day horizon automatically.
            </div>
            <InputField label="Payroll — day of month"     value={inputs.payrollDayOfMonth} onChange={set("payrollDayOfMonth")} hint="Typical: day 28 (last working day)" />
            <InputField label="Fixed costs / rent — day"   value={inputs.fixedDayOfMonth}   onChange={set("fixedDayOfMonth")}   hint="Typical: day 1 (lease start)" />
            <InputField label="VAT / tax — day"            value={inputs.vatDayOfMonth}     onChange={set("vatDayOfMonth")}     hint="Spain: day 20 (Agencia Tributaria)" />
            <InputField label="Capex — day"                value={inputs.capexDayOfMonth}   onChange={set("capexDayOfMonth")}   hint="Per supplier contract" />
            <InputField label="Debt service — day"         value={inputs.debtDayOfMonth}    onChange={set("debtDayOfMonth")}    hint="Per loan agreement (e.g. day 15)" />
          </div>

          {/* Live timing summary */}
          <div style={{ padding: "14px 16px", background: C.surface3, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 20 }}>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Live timing summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                ["Credit collections arrive",  `${inputs.collectionDelayDays}d → from week ${arLag}`,           C.green],
                ["Supplier payments leave",    `${inputs.supplierPaymentDays}d → from week ${apLag}`,           C.red],
                ["Payroll hits bank",          `Day ${inputs.payrollDayOfMonth} each month`,                   C.amber],
                ["Rent / fixed hits bank",     `Day ${inputs.fixedDayOfMonth} each month`,                     C.red],
                ["VAT hits bank",              `Day ${inputs.vatDayOfMonth} each month`,                       C.red],
                ["Capex hits bank",            `Day ${inputs.capexDayOfMonth} each month`,                     C.red],
                ["Debt service hits bank",     `Day ${inputs.debtDayOfMonth} each month`,                      C.red],
              ].map(([k, v, col]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{k}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: col, background: `${col}15`, padding: "1px 8px", borderRadius: 3, whiteSpace: "nowrap" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider />
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>7 — Working Capital Anchors</div>
          <InputField label="Opening accounts receivable" value={inputs.openingAR}    onChange={set("openingAR")}    unit="EUR" hint={`Current AR balance — drains over ${arLag} weeks as collections clear`} />
          <InputField label="Opening accounts payable"    value={inputs.openingAP}    onChange={set("openingAP")}    unit="EUR" hint={`Current AP balance — drains over ${apLag} weeks as payments clear`} />
          <InputField label="Annual COGS"                 value={inputs.annualCOGS}   onChange={set("annualCOGS")}   unit="EUR/year" hint="Used for DPO ratio calculation only" />

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
  const { cashFlow, arLagWeeks, apLagWeeks } = model;
  const maxCash = Math.max(...cashFlow.map(r => r.closingCash));
  const minCash = Math.min(...cashFlow.map(r => r.closingCash));

  return (
    <div>
      <SectionHeader
        title="13-Week Cash Flow — Days-Based Model v2.0"
        subtitle={`Credit collections lag: ${inputs.collectionDelayDays}d → W${arLagWeeks}+.  Supplier payments lag: ${inputs.supplierPaymentDays}d → W${apLagWeeks}+.  Fixed outflows fire on their contract day.`}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard label="Week 13 Cash"    value={`€${fmt(model.week13Cash)}`}   sub="End of horizon"     color={model.week13Cash > inputs.minimumCashBuffer ? C.green : C.red} warn={model.week13Cash < inputs.minimumCashBuffer} />
        <KPICard label="Worst Week Cash" value={`€${fmt(model.minCashAny)}`}   sub="Tightest point 13W" color={model.minCashAny > inputs.minimumCashBuffer ? C.green : C.red} warn={model.minCashAny < inputs.minimumCashBuffer} />
        <KPICard label="Funding Gap"     value={model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"} sub={model.fundingGap < 0 ? "Worst week vs buffer" : "Buffer maintained"} color={model.fundingGap < 0 ? C.red : C.green} warn={model.fundingGap < 0} />
      </div>

      {/* Timing legend */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Cash flow timing active</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {[
            [`Cash sales`,          `same week`,                            C.green],
            [`Credit collections`,  `W${arLagWeeks}+ (${inputs.collectionDelayDays}d)`, C.green],
            [`Var. cost payments`,  `W${apLagWeeks}+ (${inputs.supplierPaymentDays}d)`, C.red],
            [`Payroll`,             `day ${inputs.payrollDayOfMonth}`,     C.amber],
            [`Fixed / rent`,        `day ${inputs.fixedDayOfMonth}`,       C.red],
            [`VAT / tax`,           `day ${inputs.vatDayOfMonth}`,         C.red],
          ].map(([k, v, col]) => (
            <div key={k} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textSec }}>{k}</span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: col, background: `${col}15`, padding: "1px 6px", borderRadius: 3 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Cash position — weeks 1–13</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
          {cashFlow.map((row) => {
            const range = maxCash - minCash || 1;
            const h = Math.max(4, ((row.closingCash - minCash) / range) * 64);
            return (
              <div key={row.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div
                  style={{ width: "100%", height: h, background: row.belowBuffer ? C.red : row.payroll > 0 ? C.amber : C.gold, opacity: row.belowBuffer ? 0.95 : 0.72, borderRadius: "2px 2px 0 0", transition: "height 0.4s" }}
                  title={`W${row.week}: €${fmt(row.closingCash)}\nIn: €${fmt(row.totalCashIn)} | Out: €${fmt(row.totalCashOut)}`}
                />
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{row.week}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          {[[C.gold, "Normal"], [C.amber, "Payroll week"], [C.red, "Below buffer"]].map(([col, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, background: col, borderRadius: 2 }} />
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12, minWidth: 720 }}>
          <thead>
            <tr>
              {["Wk", "Mo·W", "Cash In", "Var.Cost", "Payroll", "Fixed", "VAT", "Cap+Debt", "Total Out", "Closing", ""].map(h => (
                <th key={h} style={{ padding: "8px 9px", textAlign: ["Wk","Mo·W",""].includes(h) ? "center" : "right", background: C.surface2, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cashFlow.map((row) => (
              <tr key={row.week} style={{ background: row.belowBuffer ? C.redDim : "transparent", borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "7px 9px", textAlign: "center", fontFamily: F.mono, color: C.textMuted, fontSize: 11 }}>{row.week}</td>
                <td style={{ padding: "7px 9px", textAlign: "center", fontFamily: F.mono, color: C.textMuted, fontSize: 10 }}>M{row.monthIdx}·W{row.weekOfMonth}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: C.green,  fontSize: 11 }}>€{fmt(row.totalCashIn)}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: row.variablePayment > 0 ? C.red : C.textMuted, fontSize: 11 }}>{row.variablePayment > 0 ? `€${fmt(row.variablePayment)}` : "—"}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: row.payroll > 0 ? C.amber : C.textMuted, fontSize: 11 }}>{row.payroll > 0 ? `€${fmt(row.payroll)}` : "—"}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: row.fixed > 0 ? C.red : C.textMuted, fontSize: 11 }}>{row.fixed > 0 ? `€${fmt(row.fixed)}` : "—"}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: row.vat > 0 ? C.red : C.textMuted, fontSize: 11 }}>{row.vat > 0 ? `€${fmt(row.vat)}` : "—"}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: (row.capex + row.debt) > 0 ? C.red : C.textMuted, fontSize: 11 }}>{(row.capex + row.debt) > 0 ? `€${fmt(row.capex + row.debt)}` : "—"}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, color: C.red, fontSize: 11, fontWeight: 600 }}>€{fmt(row.totalCashOut)}</td>
                <td style={{ padding: "7px 9px", textAlign: "right", fontFamily: F.mono, fontWeight: 700, color: row.belowBuffer ? C.red : C.gold, fontSize: 12 }}>€{fmt(row.closingCash)}</td>
                <td style={{ padding: "7px 9px", textAlign: "center" }}>{row.belowBuffer ? <Badge color={C.red}>⚠</Badge> : <Badge color={C.green}>✓</Badge>}</td>
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
    { label: "DSO", value: dso, benchmark: 60, formula: "A/R ÷ Revenue × 365", action: "Accelerate collections, A/R governance",          priority: dso > 75 ? "High" : "Medium" },
    { label: "DPO", value: dpo, benchmark: 60, formula: "A/P ÷ COGS × 365",   action: "Negotiate longer supplier payment terms",           priority: "Medium" },
    { label: "CCC", value: ccc, benchmark: 45, formula: "DSO − DPO",           action: "Reduce cash trapped in the operating cycle",        priority: ccc > 60 ? "High" : "Medium" },
  ];
  const simulations = [
    { label: "DSO −5 days",  released: (annualRevenue / 365) * 5 },
    { label: "DSO −10 days", released: liquidityDSO10 },
    { label: "DSO −20 days", released: liquidityDSO20 },
  ];

  return (
    <div>
      <SectionHeader title="Working Capital Optimizer" subtitle="DSO-DPO model consistent with days-based inputs. CCC = DSO − DPO (no inventory term — add opening inventory to enable DIO)." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        {metrics.map(m => {
          const gap = m.value - m.benchmark;
          return <KPICard key={m.label} label={m.label} value={`${fmt(m.value, 1)} d`} sub={`Benchmark: ${m.benchmark}d · Gap: ${gap > 0 ? "+" : ""}${fmt(gap, 1)}d`} color={m.value > m.benchmark ? C.amber : C.green} warn={m.value > m.benchmark * 1.2} />;
        })}
      </div>
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12, minWidth: 560 }}>
            <thead>
              <tr>{["Metric","Formula","Current","Benchmark","Gap","Suggested Action","Priority"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", background: C.surface3, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => {
                const gap = m.value - m.benchmark;
                return (
                  <tr key={m.label} style={{ borderBottom: i < metrics.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: C.gold }}>{m.label}</td>
                    <td style={{ padding: "10px 14px", color: C.textMuted, fontFamily: F.mono, fontSize: 11 }}>{m.formula}</td>
                    <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: C.text }}>{fmt(m.value, 1)} d</td>
                    <td style={{ padding: "10px 14px", fontFamily: F.mono, color: C.textSec }}>{m.benchmark} d</td>
                    <td style={{ padding: "10px 14px", fontFamily: F.mono, color: gap > 0 ? C.amber : C.green, fontWeight: 700 }}>{gap > 0 ? "+" : ""}{fmt(gap, 1)} d</td>
                    <td style={{ padding: "10px 14px", color: C.textSec, fontSize: 11 }}>{m.action}</td>
                    <td style={{ padding: "10px 14px" }}><Badge color={m.priority === "High" ? C.amber : C.blue}>{m.priority}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: "20px 24px" }}>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Liquidity Release — DSO Reduction</div>
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
  const { rules, totalScore, riskLevel, riskColor, runwayWeeks } = model;
  return (
    <div>
      <SectionHeader title="ZRC Decision Rule Engine" subtitle="Rule-based risk scoring. Every flag is tied to a named financial metric." />
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", background: C.surface2, border: `1px solid ${riskColor}40`, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${riskColor}20`, border: `2px solid ${riskColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
          {riskLevel === "HIGH" ? "⚠" : riskLevel === "MEDIUM" ? "⚡" : "✓"}
        </div>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Overall Risk Level</div>
          <div style={{ fontFamily: F.display, fontSize: 30, color: riskColor, lineHeight: 1 }}>{riskLevel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>Risk score</div>
          <div style={{ fontFamily: F.display, fontSize: 30, color: riskColor }}>{totalScore} / 10</div>
        </div>
      </div>
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12, minWidth: 560 }}>
            <thead>
              <tr>{["Rule","Threshold","Current","Score","Status","ZRC Recommendation"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", background: C.surface3, color: C.textMuted, borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {[
                { ...rules[0], threshold: "≥ 6 weeks",                        displayVal: `${fmt(runwayWeeks, 1)} weeks`,        rec: "Secure short-term liquidity line and reduce discretionary outflows" },
                { ...rules[1], threshold: `≥ €${fmt(inputs.minimumCashBuffer)}`, displayVal: `€${fmt(rules[1].value)}`,          rec: "Prepare funding gap action plan. Pre-negotiate credit line." },
                { ...rules[2], threshold: "≤ 75 days",                        displayVal: `${fmt(rules[2].value, 1)} days`,      rec: "Launch receivables recovery sprint. A/R governance committee." },
                { ...rules[3], threshold: "≤ 60 days",                        displayVal: `${fmt(rules[3].value, 1)} days`,      rec: "Extend DPO or accelerate DSO reduction." },
                { ...rules[4], threshold: "≤ 3 weeks",                        displayVal: `${fmt(rules[4].value)} weeks`,        rec: "Weekly treasury committee until buffer restored." },
              ].map((rule, i) => (
                <tr key={i} style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : "none", background: !rule.pass ? C.redDim : "transparent" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{rule.name}</td>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{rule.threshold}</td>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: rule.pass ? C.green : C.red }}>{rule.displayVal}</td>
                  <td style={{ padding: "10px 14px", fontFamily: F.mono, fontWeight: 700, color: rule.score > 0 ? C.red : C.green }}>{rule.score}</td>
                  <td style={{ padding: "10px 14px" }}><Badge color={rule.pass ? C.green : C.red}>{rule.pass ? "LOW" : "RISK"}</Badge></td>
                  <td style={{ padding: "10px 14px", color: C.textSec, fontSize: 11 }}>{rule.rec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "18px 20px" }}>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>Scenario Stress Table</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Base",   color: C.green, desc: "Management case",                   cash: model.week13Cash },
            { label: "Growth", color: C.amber, desc: "+20% rev, +10d collection lag",      cash: model.week13Cash * 0.88 },
            { label: "Stress", color: C.red,   desc: "−15% rev, +20d lag, +5% var costs", cash: model.week13Cash * 0.62 },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface3, border: `1px solid ${s.color}30`, borderRadius: 4, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <Badge color={s.color}>{s.label}</Badge>
                <span style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted }}>{s.desc}</span>
              </div>
              <div style={{ fontFamily: F.display, fontSize: 20, color: s.cash < inputs.minimumCashBuffer ? C.red : C.gold }}>€{fmt(s.cash)}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 2 }}>W13 cash</div>
              {s.cash < inputs.minimumCashBuffer && <div style={{ fontFamily: F.mono, fontSize: 11, color: C.red, marginTop: 6 }}>Gap: €{fmt(Math.abs(s.cash - inputs.minimumCashBuffer))}</div>}
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
  const [report, setReport]   = useState(null);
  const [error, setError]     = useState(null);

  const generateReport = async () => {
    setLoading(true); setError(null); setReport(null);
    const payload = {
      client_name: inputs.companyName,
      report_date: new Date().toLocaleDateString("en-GB"),
      currency: "EUR",
      model_version: "v2.0 — days-based AR/AP timing",
      kpis: {
        cash_runway_weeks:          fmt(model.runwayWeeks, 1),
        risk_level:                 model.riskLevel,
        funding_gap:                model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))} shortfall` : "No gap",
        worst_week_cash:            `€${fmt(model.minCashAny)}`,
        week13_cash:                `€${fmt(model.week13Cash)}`,
        dso:                        fmt(model.dso, 1),
        dpo:                        fmt(model.dpo, 1),
        ccc:                        fmt(model.ccc, 1),
        collection_lag_weeks:       model.arLagWeeks,
        supplier_payment_lag_weeks: model.apLagWeeks,
        liquidity_released_dso_10d: `€${fmt(model.liquidityDSO10)}`,
      },
      risk_rules: model.rules.map(r => ({ name: r.name, status: r.pass ? "LOW" : "RISK", score: r.score })),
      total_risk_score: model.totalScore,
    };
    const systemPrompt = `You are a senior financial advisor at Zenith Rise Capital (ZRC), Madrid. Generate a board-grade Financial Intelligence Report. The cash flow model is days-based: credit collections lag ${inputs.collectionDelayDays} days from invoice (arriving week ${model.arLagWeeks}); supplier payments lag ${inputs.supplierPaymentDays} days (leaving week ${model.apLagWeeks}). Fixed outflows fire on their contracted day of month. Tone: premium, precise, conservative, actionable. Tie every recommendation to the data. No invented figures.
Return ONLY valid JSON, no markdown fences, no preamble:
{"executive_summary":"2-3 sentences","key_risks":["r1","r2","r3"],"recommended_actions":[{"priority":"High/Medium","action":"...","impact":"...","timing":"...","owner":"CEO/CFO/ZRC"}],"strategic_view":"2-3 sentences","forward_view":"2-3 sentences"}`;
    try {
      const res = await fetch("https://zenith-risecapital.lmgomeze77.workers.dev/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: `Generate the report:\n${JSON.stringify(payload, null, 2)}` }] }),
      });
      const data = await res.json();
      setReport(JSON.parse((data.content?.[0]?.text || "").replace(/```json|```/g, "").trim()));
    } catch (e) { setError("Failed to generate report. Check API connectivity."); }
    setLoading(false);
  };

  const exportHTML = () => {
    if (!report) return;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>ZRC Report — ${inputs.companyName}</title>
<style>body{font-family:Georgia,serif;margin:0;background:#f5f5f3;color:#111827}.page{max-width:920px;margin:32px auto;background:#fff;padding:42px 54px;border:1px solid #e5e7eb}.brand{color:#D4A853;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px}h1{font-size:34px;margin:10px 0 6px;color:#09090B}.subtitle{font-family:Arial,sans-serif;color:#6B7280;font-size:13px;margin-bottom:28px}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}.kpi{border:1px solid #D4A853;padding:16px;background:#0B1220;color:#fff}.kpi .label{font-family:Arial,sans-serif;font-size:11px;color:#CBD5E1}.kpi .value{font-size:26px;color:#D4A853;margin-top:6px}h2{font-size:20px;margin-top:28px;border-bottom:2px solid #D4A853;padding-bottom:6px}p,li{font-family:Arial,sans-serif;font-size:14px;line-height:1.55}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#0B1220;color:#fff;text-align:left;padding:9px;font-family:Arial,sans-serif;font-size:13px}td{border:1px solid #e5e7eb;padding:9px;font-family:Arial,sans-serif;font-size:13px}.footer{margin-top:36px;font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;text-align:center}</style></head>
<body><div class="page"><div class="brand">ZENITH RISE CAPITAL</div><h1>ZRC Financial Intelligence Report</h1>
<div class="subtitle">Client: ${inputs.companyName} · ${new Date().toLocaleDateString("en-GB")} · EUR · Model v2.0 (days-based)</div>
<div class="kpis"><div class="kpi"><div class="label">Cash runway</div><div class="value">${fmt(model.runwayWeeks, 1)} wks</div></div><div class="kpi"><div class="label">Risk level</div><div class="value">${model.riskLevel}</div></div><div class="kpi"><div class="label">Funding gap</div><div class="value">${model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"}</div></div><div class="kpi"><div class="label">DSO</div><div class="value">${fmt(model.dso, 1)} d</div></div><div class="kpi"><div class="label">CCC</div><div class="value">${fmt(model.ccc, 1)} d</div></div><div class="kpi"><div class="label">DSO −10d release</div><div class="value">€${fmt(model.liquidityDSO10)}</div></div></div>
<h2>1. Executive Summary</h2><p>${report.executive_summary}</p>
<h2>2. Key Risks</h2><ul>${report.key_risks.map(r => `<li>${r}</li>`).join("")}</ul>
<h2>3. Recommended Actions</h2><table><thead><tr><th>Priority</th><th>Action</th><th>Impact</th><th>Timing</th><th>Owner</th></tr></thead><tbody>${report.recommended_actions.map(a => `<tr><td>${a.priority}</td><td>${a.action}</td><td>${a.impact}</td><td>${a.timing}</td><td>${a.owner}</td></tr>`).join("")}</tbody></table>
<h2>4. Strategic View</h2><p>${report.strategic_view}</p>
<h2>5. Forward View</h2><p>${report.forward_view}</p>
<div class="footer">Zenith Rise Capital · Confidential · ZRC FIS v2.0 · ${new Date().toISOString().split("T")[0]}</div></div></body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `ZRC_FIS_${inputs.companyName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.html`;
    a.click();
  };

  return (
    <div>
      <SectionHeader title="AI Report Generator" subtitle="Structured KPI payload — collection lag and supplier payment lag included in model context for the AI." />
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>KPI Payload — sent to model</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          {[
            ["Client",            inputs.companyName],
            ["Risk level",        model.riskLevel],
            ["Cash runway",       `${fmt(model.runwayWeeks, 1)} weeks`],
            ["Worst week cash",   `€${fmt(model.minCashAny)}`],
            ["Funding gap",       model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None"],
            ["DSO",               `${fmt(model.dso, 1)} days`],
            ["DPO",               `${fmt(model.dpo, 1)} days`],
            ["CCC",               `${fmt(model.ccc, 1)} days`],
            ["Collection lag",    `${model.arLagWeeks} weeks`],
            ["Supplier lag",      `${model.apLagWeeks} weeks`],
            ["DSO −10d release",  `€${fmt(model.liquidityDSO10)}`],
            ["Risk score",        `${model.totalScore} / 10`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 6, padding: "5px 9px", background: C.surface3, borderRadius: 3 }}>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>{k}</span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: C.goldDim, borderRadius: 4, fontFamily: F.body, fontSize: 11, color: C.textSec }}>
          ✓ Guardrail: raw client files never sent. Only structured KPIs reach the model.
        </div>
      </div>
      <button onClick={generateReport} disabled={loading} style={{ padding: "12px 28px", background: loading ? C.surface3 : C.gold, color: C.bg, border: "none", borderRadius: 4, fontFamily: F.body, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginBottom: 24 }}>
        {loading ? "⏳ Generating report…" : "⚡ Generate AI Report"}
      </button>
      {error && <div style={{ padding: "14px 18px", background: C.redDim, border: `1px solid ${C.red}40`, borderRadius: 6, fontFamily: F.body, fontSize: 13, color: C.red, marginBottom: 20 }}>{error}</div>}
      {report && (
        <div>
          <div style={{ background: C.surface2, border: `1px solid ${C.goldBorder}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#0B1220", padding: "20px 28px", borderBottom: `2px solid ${C.gold}` }}>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Zenith Rise Capital</div>
              <div style={{ fontFamily: F.display, fontSize: 24, color: C.text, margin: "6px 0 4px" }}>ZRC Financial Intelligence Report</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>{inputs.companyName} · {new Date().toLocaleDateString("en-GB")} · EUR · v2.0</div>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
                {[["Cash runway",`${fmt(model.runwayWeeks,1)} wks`],["Risk",model.riskLevel],["Gap",model.fundingGap<0?`€${fmt(Math.abs(model.fundingGap))}`:"None"],["DSO",`${fmt(model.dso,1)} d`],["CCC",`${fmt(model.ccc,1)} d`],["DSO −10d",`€${fmt(model.liquidityDSO10)}`]].map(([l,v])=>(
                  <div key={l} style={{ background:"#0B1220",border:`1px solid ${C.gold}`,padding:"12px 14px" }}>
                    <div style={{ fontFamily:F.body,fontSize:9,color:"#CBD5E1",textTransform:"uppercase" }}>{l}</div>
                    <div style={{ fontFamily:F.display,fontSize:20,color:C.gold,marginTop:4 }}>{v}</div>
                  </div>
                ))}
              </div>
              {[["1. Executive Summary",<p style={{fontFamily:F.body,fontSize:14,color:C.textSec,lineHeight:1.6}}>{report.executive_summary}</p>],["2. Key Risks",<ul style={{margin:0,paddingLeft:20}}>{report.key_risks.map((r,i)=><li key={i} style={{fontFamily:F.body,fontSize:14,color:C.textSec,marginBottom:6,lineHeight:1.55}}>{r}</li>)}</ul>],["4. Strategic View",<p style={{fontFamily:F.body,fontSize:14,color:C.textSec,lineHeight:1.6}}>{report.strategic_view}</p>],["5. Forward View",<p style={{fontFamily:F.body,fontSize:14,color:C.textSec,lineHeight:1.6}}>{report.forward_view}</p>]].map(([title,content])=>(
                <div key={title} style={{marginBottom:20}}>
                  <h4 style={{fontFamily:F.display,fontSize:18,color:C.gold,borderBottom:`2px solid ${C.gold}`,paddingBottom:6,marginTop:0}}>{title}</h4>
                  {content}
                </div>
              ))}
              <div style={{marginBottom:20}}>
                <h4 style={{fontFamily:F.display,fontSize:18,color:C.gold,borderBottom:`2px solid ${C.gold}`,paddingBottom:6,marginTop:0}}>3. Recommended Actions</h4>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,fontSize:13,minWidth:480}}>
                    <thead><tr>{["Priority","Action","Impact","Timing","Owner"].map(h=><th key={h} style={{padding:"8px 10px",background:"#0B1220",color:C.text,textAlign:"left",fontSize:11,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                    <tbody>{report.recommended_actions.map((a,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}`}}><td style={{padding:"8px 10px"}}><Badge color={a.priority==="High"?C.red:C.amber}>{a.priority}</Badge></td><td style={{padding:"8px 10px",color:C.textSec}}>{a.action}</td><td style={{padding:"8px 10px",color:C.textMuted,fontSize:12}}>{a.impact}</td><td style={{padding:"8px 10px",fontFamily:F.mono,fontSize:11,color:C.textMuted}}>{a.timing}</td><td style={{padding:"8px 10px",fontFamily:F.mono,fontSize:11,color:C.textMuted}}>{a.owner}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
              <div style={{marginTop:24,textAlign:"center",fontFamily:F.body,fontSize:11,color:C.textMuted}}>Zenith Rise Capital · Confidential · ZRC FIS v2.0</div>
            </div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:16}}>
            <button onClick={exportHTML} style={{padding:"10px 22px",background:C.surface2,color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:4,fontFamily:F.body,fontSize:13,cursor:"pointer",fontWeight:600}}>↓ Export HTML</button>
            <button onClick={generateReport} style={{padding:"10px 22px",background:C.surface3,color:C.textSec,border:`1px solid ${C.border}`,borderRadius:4,fontFamily:F.body,fontSize:13,cursor:"pointer"}}>↻ Regenerate</button>
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
  const [inputs, setInputs]       = useState(DEFAULT_INPUTS);
  const model = computeModel(inputs);

  return (
    <div style={{ width: "100%", minHeight: "100%", background: C.bg, color: C.text, fontFamily: F.body }}>
      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 clamp(16px,4vw,32px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Zenith Rise Capital</div>
            <div style={{ fontFamily: F.display, fontSize: "clamp(14px,3vw,20px)", color: C.text, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Financial Intelligence System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: `${model.riskColor}15`, border: `1px solid ${model.riskColor}40`, borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: model.riskColor, flexShrink: 0 }} />
              <span style={{ fontFamily: F.mono, fontSize: 10, color: model.riskColor, fontWeight: 700 }}>{model.riskLevel}</span>
            </div>
            {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>}
          </div>
        </div>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, marginTop: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "10px clamp(10px,2.5vw,20px)", background: "none", border: "none", borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent", color: activeTab === tab.id ? C.gold : C.textMuted, fontFamily: F.body, fontSize: "clamp(11px,2vw,13px)", cursor: "pointer", fontWeight: activeTab === tab.id ? 700 : 400, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI strip — 2×3 grid ── */}
      <div style={{ background: "#0B1220", borderBottom: `1px solid ${C.border}`, padding: "12px clamp(16px,4vw,32px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 8px" }}>
          {[
            ["Cash Runway",     `${fmt(model.runwayWeeks, 1)} wks`,                                                           model.runwayWeeks < 6 ? C.red : C.green],
            ["Risk Level",      model.riskLevel,                                                                               model.riskColor],
            ["Funding Gap",     model.fundingGap < 0 ? `€${fmt(Math.abs(model.fundingGap))}` : "None",                        model.fundingGap < 0 ? C.red : C.green],
            ["DSO",             `${fmt(model.dso, 1)} d`,                                                                     model.dso > 75 ? C.amber : C.green],
            ["CCC",             `${fmt(model.ccc, 1)} d`,                                                                     model.ccc > 60 ? C.red : model.ccc > 45 ? C.amber : C.green],
            ["DSO −10d Release", `€${fmt(model.liquidityDSO10)}`,                                                             C.gold],
          ].map(([label, value, color]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: F.body, fontSize: 9, color: C.textMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
              <div style={{ fontFamily: F.display, fontSize: "clamp(13px,3vw,16px)", color, fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel content ── */}
      <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1100, margin: "0 auto" }}>
        {activeTab === "inputs"   && <InputsPanel   inputs={inputs} setInputs={setInputs} />}
        {activeTab === "cashflow" && <CashFlowPanel model={model} inputs={inputs} />}
        {activeTab === "wc"       && <WorkingCapitalPanel model={model} />}
        {activeTab === "risk"     && <RiskPanel     model={model} inputs={inputs} />}
        {activeTab === "report"   && <ReportPanel   model={model} inputs={inputs} />}
      </div>
    </div>
  );
}
