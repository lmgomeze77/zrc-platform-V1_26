import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// MACRO PULSE — Central Bank Signal Tracker · Zenith Rise Capital
// NLP statement analyser · Rate cycle dashboard · Portfolio signals
// ═══════════════════════════════════════════════════════════════

const C = {
  bg: "#0A0C10", surface: "#12141A", surface2: "#181B22", surface3: "#20232C",
  border: "#252932", borderHover: "#39404C",
  text: "#F1EFE8", textSec: "#98A0AC", textMuted: "#5B6270",
  gold: "#BFA06A", goldDim: "rgba(191,160,106,0.10)", goldBorder: "rgba(191,160,106,0.28)",
  red: "#C05B4F", green: "#4E9B76", blue: "#5C82AD", amber: "#C99A4C",
  purple: "#8A7EBF",
};
const F = {
  display: "'Fraunces','Georgia',serif",
  body: "'Inter','Helvetica Neue',sans-serif",
  mono: "'IBM Plex Mono','Fira Code',monospace",
};
const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');";

// ── Data ────────────────────────────────────────────────────────

const BANKS = [
  {
    id: "fed", name: "Federal Reserve", short: "FED", flag: "🇺🇸",
    rate: 4.50, prev: 5.25, target: 3.75,
    stance: "hold", cycle: "plateau",
    lastMeeting: "07 May 2026", nextMeeting: "18 Jun 2026",
    governor: "Jerome Powell",
    statement: "The Committee seeks to achieve maximum employment and inflation at the rate of 2 percent over the longer run.",
    lastMove: { dir: "cut", bps: 25, date: "Dec 2025" },
    signals: { rates: 0, bonds: +1, eurusd: +1, equities: 0 },
    keyPhrase: "data dependent",
  },
  {
    id: "ecb", name: "European Central Bank", short: "ECB", flag: "🇪🇺",
    rate: 3.15, prev: 4.00, target: 2.50,
    stance: "dovish", cycle: "cutting",
    lastMeeting: "17 Apr 2026", nextMeeting: "05 Jun 2026",
    governor: "Christine Lagarde",
    statement: "Inflation is returning sustainably to the 2% target. Services disinflation is accelerating ahead of forecasts.",
    lastMove: { dir: "cut", bps: 25, date: "Apr 2026" },
    signals: { rates: +2, bonds: +2, eurusd: -1, equities: +1 },
    keyPhrase: "disinflation on track",
  },
  {
    id: "boe", name: "Bank of England", short: "BoE", flag: "🇬🇧",
    rate: 4.25, prev: 5.25, target: 3.50,
    stance: "cautious", cycle: "cutting",
    lastMeeting: "08 May 2026", nextMeeting: "19 Jun 2026",
    governor: "Andrew Bailey",
    statement: "The MPC will continue to take a gradual and careful approach to reducing bank rate as inflation risks remain two-sided.",
    lastMove: { dir: "cut", bps: 25, date: "Mar 2026" },
    signals: { rates: +1, bonds: +1, eurusd: 0, equities: 0 },
    keyPhrase: "gradual and careful",
  },
  {
    id: "boj", name: "Bank of Japan", short: "BoJ", flag: "🇯🇵",
    rate: 0.50, prev: -0.10, target: 1.00,
    stance: "hawkish", cycle: "hiking",
    lastMeeting: "26 Apr 2026", nextMeeting: "17 Jun 2026",
    governor: "Kazuo Ueda",
    statement: "The Bank will continue to raise the policy interest rate in line with its outlook for economic activity and prices.",
    lastMove: { dir: "hike", bps: 25, date: "Jan 2026" },
    signals: { rates: -1, bonds: -2, eurusd: 0, equities: -1 },
    keyPhrase: "gradual adjustment",
  },
  {
    id: "pboc", name: "People's Bank of China", short: "PBoC", flag: "🇨🇳",
    rate: 3.10, prev: 3.65, target: 2.75,
    stance: "dovish", cycle: "easing",
    lastMeeting: "20 Apr 2026", nextMeeting: "20 May 2026",
    governor: "Pan Gongsheng",
    statement: "Prudent monetary policy will be more accommodative. The central bank stands ready to provide ample liquidity.",
    lastMove: { dir: "cut", bps: 15, date: "Feb 2026" },
    signals: { rates: +1, bonds: +1, eurusd: 0, equities: +1 },
    keyPhrase: "ample liquidity",
  },
  {
    id: "snb", name: "Swiss National Bank", short: "SNB", flag: "🇨🇭",
    rate: 0.25, prev: 1.75, target: 0.00,
    stance: "dovish", cycle: "cutting",
    lastMeeting: "20 Mar 2026", nextMeeting: "19 Jun 2026",
    governor: "Martin Schlegel",
    statement: "Inflationary pressure has again decreased significantly. The SNB is lowering the SNB policy rate to 0.25%.",
    lastMove: { dir: "cut", bps: 25, date: "Mar 2026" },
    signals: { rates: +1, bonds: +1, eurusd: 0, equities: +1 },
    keyPhrase: "inflationary pressure decreased",
  },
];

const NLP_HAWKISH = [
  "inflation", "inflación", "price stability", "estabilidad precios",
  "tighten", "restrictive", "restrictivo", "hike", "subida",
  "overheat", "wage growth", "labor market tight", "above target",
  "vigilant", "vigilante", "upside risk", "riesgo al alza",
  "persistent", "persistente", "remain elevated", "elevated inflation",
];

const NLP_DOVISH = [
  "cut", "recorte", "easing", "relajación", "accommodative", "acomodaticio",
  "disinflation", "desinflación", "below target", "below 2",
  "slowdown", "desaceleración", "recession", "recesión",
  "gradual", "careful", "cautious", "cauteloso",
  "data dependent", "downside risk", "riesgo a la baja",
  "labor market cooling", "cooling", "moderate",
];

const PORTFOLIO_SIGNALS = [
  { asset: "Bonos soberanos core (Bund / UST)", key: "bonds" },
  { asset: "EUR/USD", key: "eurusd" },
  { asset: "Renta variable growth", key: "equities" },
  { asset: "Tipos cortos (money market)", key: "rates" },
];

const SIGNAL_LABELS = { "-2": "VENDER", "-1": "INFRAPONDERAR", "0": "NEUTRAL", "1": "SOBREPONDERAR", "2": "COMPRAR" };
const SIGNAL_COLORS = { "-2": C.red, "-1": "#B97848", "0": C.textMuted, "1": C.green, "2": "#5FAE86" };

const STANCE_META = {
  hawkish:  { label: "HAWKISH",  color: C.red,    bg: "rgba(192,91,79,0.12)",   border: "rgba(192,91,79,0.28)" },
  hold:     { label: "HOLD",     color: C.amber,  bg: "rgba(201,154,76,0.12)",  border: "rgba(201,154,76,0.28)" },
  cautious: { label: "CAUTIOUS", color: C.amber,  bg: "rgba(201,154,76,0.12)",  border: "rgba(201,154,76,0.28)" },
  dovish:   { label: "DOVISH",   color: C.green,  bg: "rgba(78,155,118,0.12)",  border: "rgba(78,155,118,0.28)" },
  neutral:  { label: "NEUTRAL",  color: C.textMuted, bg: "rgba(91,98,112,0.12)", border: "rgba(91,98,112,0.28)" },
};

const CYCLE_COLORS = {
  hiking:   C.red,
  plateau:  C.amber,
  cutting:  C.green,
  easing:   C.green,
  holding:  C.amber,
};

// ── Helpers ─────────────────────────────────────────────────────

function analyseNLP(text) {
  if (!text.trim()) return null;
  const lower = text.toLowerCase();
  let hawkScore = 0, dovScore = 0, hawkHits = [], dovHits = [];
  NLP_HAWKISH.forEach(w => { if (lower.includes(w)) { hawkScore++; hawkHits.push(w); } });
  NLP_DOVISH.forEach(w => { if (lower.includes(w)) { dovScore++; dovHits.push(w); } });
  const total = hawkScore + dovScore || 1;
  const netScore = (hawkScore - dovScore) / total; // -1 = pure dovish, +1 = pure hawkish
  let stance, color;
  if (netScore > 0.3)       { stance = "HAWKISH";   color = C.red; }
  else if (netScore > 0.05) { stance = "LEAN HAWKISH"; color = "#B97848"; }
  else if (netScore < -0.3) { stance = "DOVISH";    color = C.green; }
  else if (netScore < -0.05){ stance = "LEAN DOVISH"; color = "#5FAE86"; }
  else                       { stance = "NEUTRAL";   color = C.textMuted; }
  return { hawkScore, dovScore, netScore, stance, color, hawkHits, dovHits };
}

function aggregateSignals(banks) {
  const totals = { rates: 0, bonds: 0, eurusd: 0, equities: 0 };
  banks.forEach(b => {
    Object.keys(totals).forEach(k => { totals[k] += b.signals[k]; });
  });
  const n = banks.length;
  Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k] / n * 10) / 10; });
  return totals;
}

// ── Sub-components ───────────────────────────────────────────────

function StanceBadge({ stance }) {
  const m = STANCE_META[stance] || STANCE_META.neutral;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", fontSize: 9, fontFamily: F.mono, fontWeight: 600, letterSpacing: "0.12em", color: m.color, background: m.bg, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

function RateBar({ rate, prev, target }) {
  const max = Math.max(prev, 6);
  const pct = v => `${(v / max * 100).toFixed(1)}%`;
  return (
    <div style={{ position: "relative", height: 6, background: C.surface3, borderRadius: 3, marginTop: 8 }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: pct(rate), background: C.gold, borderRadius: 3, transition: "width 0.5s" }} />
      <div style={{ position: "absolute", top: -3, left: pct(target), width: 2, height: 12, background: C.green, borderRadius: 1 }} title={`Target: ${target}%`} />
      <div style={{ position: "absolute", top: -3, left: pct(prev), width: 1, height: 12, background: C.textMuted, borderRadius: 1 }} title={`Peak: ${prev}%`} />
    </div>
  );
}

function SignalCell({ value }) {
  const v = Math.round(value);
  const key = String(Math.max(-2, Math.min(2, v)));
  return (
    <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: SIGNAL_COLORS[key] || C.textMuted, letterSpacing: "0.08em" }}>
      {SIGNAL_LABELS[key] || "—"}
    </span>
  );
}

function NLPAnalyser() {
  const [text, setText] = useState("");
  const result = useMemo(() => analyseNLP(text), [text]);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 24 }}>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 16 }}>
        NLP · STATEMENT ANALYSER
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste any central bank statement, press release, or minutes excerpt here…"
        rows={5}
        style={{
          width: "100%", background: C.surface2, border: `1px solid ${C.border}`,
          color: C.text, fontFamily: F.body, fontSize: 13, padding: "12px 14px",
          resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
        }}
      />
      {result && text.trim() && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: "16px 18px", background: C.surface2, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>DIAGNÓSTICO</div>
            <div style={{ fontFamily: F.display, fontSize: 26, color: result.color, marginBottom: 4 }}>{result.stance}</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>
              {result.hawkScore} hawkish · {result.dovScore} dovish signals
            </div>
          </div>
          <div style={{ padding: "16px 18px", background: C.surface2, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>SEÑALES DETECTADAS</div>
            {result.hawkHits.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: F.mono, fontSize: 8, color: C.red, letterSpacing: "0.1em" }}>HAWK: </span>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textSec }}>{result.hawkHits.slice(0, 4).join(", ")}</span>
              </div>
            )}
            {result.dovHits.length > 0 && (
              <div>
                <span style={{ fontFamily: F.mono, fontSize: 8, color: C.green, letterSpacing: "0.1em" }}>DOVE: </span>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textSec }}>{result.dovHits.slice(0, 4).join(", ")}</span>
              </div>
            )}
            {result.hawkHits.length === 0 && result.dovHits.length === 0 && (
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>No keywords matched</span>
            )}
          </div>
          <div style={{ gridColumn: "1/-1", height: 8, background: C.surface3, borderRadius: 4, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: 0, height: "100%", borderRadius: 4, transition: "all 0.4s",
              background: result.netScore > 0 ? C.red : C.green,
              left: result.netScore > 0 ? "50%" : `${(0.5 + result.netScore / 2) * 100}%`,
              width: `${Math.abs(result.netScore) * 50}%`,
            }} />
            <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: C.border }} />
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: F.mono, fontSize: 8, color: C.green }}>◄ DOVISH</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted }}>NEUTRAL</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, color: C.red }}>HAWKISH ►</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function MacroPulse({ onClose }) {
  const [activeBank, setActiveBank] = useState("ecb");
  const [tab, setTab] = useState("dashboard"); // dashboard | analyser | signals
  const selected = BANKS.find(b => b.id === activeBank) || BANKS[0];
  const aggregate = useMemo(() => aggregateSignals(BANKS), []);

  const dovishCount = BANKS.filter(b => b.stance === "dovish" || b.stance === "cautious").length;
  const hawkishCount = BANKS.filter(b => b.stance === "hawkish").length;
  const holdCount = BANKS.filter(b => b.stance === "hold").length;

  const TABS = [
    { id: "dashboard", label: "RATE DASHBOARD" },
    { id: "analyser",  label: "NLP ANALYSER" },
    { id: "signals",   label: "PORTFOLIO SIGNALS" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        textarea:focus { border-color: ${C.goldBorder} !important; }
        @keyframes zrc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .zrc-close-btn { background: transparent; border: 1px solid ${C.goldBorder}; color: ${C.gold}; transition: background 0.25s ease, color 0.25s ease; }
        .zrc-close-btn:hover { background: ${C.gold}; color: ${C.bg}; }
        .zrc-tab-btn:hover { color: ${C.text} !important; }
        .zrc-bank-btn:hover { border-color: ${C.borderHover} !important; background: ${C.surface2} !important; }
      `}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(10,12,16,0.92)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, padding: "0 clamp(16px,3vw,40px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.22em", fontWeight: 500 }}>ZRC · MACRO PULSE</span>
              <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, fontWeight: 400, letterSpacing: "0.01em", marginTop: 2 }}>Central Bank Signal Tracker</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: 4, paddingLeft: 20, borderLeft: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.06em", color: C.green, background: "rgba(78,155,118,0.10)", border: "1px solid rgba(78,155,118,0.25)", padding: "3px 9px" }}>{dovishCount} DOVISH</span>
              <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.06em", color: C.amber, background: "rgba(201,154,76,0.10)", border: "1px solid rgba(201,154,76,0.25)", padding: "3px 9px" }}>{holdCount} HOLD</span>
              <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.06em", color: C.red, background: "rgba(192,91,79,0.10)", border: "1px solid rgba(192,91,79,0.25)", padding: "3px 9px" }}>{hawkishCount} HAWKISH</span>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="zrc-close-btn" style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>
              ✕ CLOSE
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px clamp(16px,3vw,40px) 60px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} className="zrc-tab-btn" onClick={() => setTab(t.id)} style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: "0.14em",
              padding: "12px 22px", background: "none", border: "none",
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
              color: tab === t.id ? C.gold : C.textMuted, cursor: "pointer",
              marginBottom: -1, transition: "color 0.2s", fontWeight: 500,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: RATE DASHBOARD ── */}
        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>

            {/* Bank list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {BANKS.map(b => (
                <button key={b.id} className="zrc-bank-btn" onClick={() => setActiveBank(b.id)} style={{
                  padding: "16px 18px", background: activeBank === b.id ? C.surface2 : "transparent",
                  border: `1px solid ${activeBank === b.id ? C.goldBorder : C.border}`,
                  cursor: "pointer", textAlign: "left", transition: "border-color 0.2s, background 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.04em" }}>{b.flag} {b.short}</span>
                    <StanceBadge stance={b.stance} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 400, color: activeBank === b.id ? C.gold : C.text }}>{b.rate.toFixed(2)}%</span>
                    <span style={{ fontFamily: F.mono, fontSize: 8, color: CYCLE_COLORS[b.cycle] || C.textMuted, letterSpacing: "0.1em" }}>{b.cycle.toUpperCase()}</span>
                  </div>
                  <RateBar rate={b.rate} prev={b.prev} target={b.target} />
                </button>
              ))}
            </div>

            {/* Bank detail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Header card */}
              <div style={{ padding: "30px 32px", background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.12em", marginBottom: 6 }}>{selected.flag} {selected.short}</div>
                    <div style={{ fontFamily: F.display, fontSize: 30, color: C.text, fontWeight: 400, letterSpacing: "0.01em" }}>{selected.name}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 4 }}>{selected.governor}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: F.display, fontSize: 48, fontWeight: 300, color: C.gold, lineHeight: 1 }}>{selected.rate.toFixed(2)}<span style={{ fontSize: 18, color: C.textMuted }}>%</span></div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginTop: 6 }}>
                      Peak {selected.prev}% · Target {selected.target}%
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, marginBottom: 24, background: C.border }}>
                  {[
                    ["LAST MEETING", selected.lastMeeting],
                    ["NEXT MEETING", selected.nextMeeting],
                    ["LAST MOVE", `${selected.lastMove.dir === "cut" ? "▼" : "▲"} ${selected.lastMove.bps}bp · ${selected.lastMove.date}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: "14px 16px", background: C.surface2 }}>
                      <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>{k}</div>
                      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "4px 0 4px 20px", borderLeft: `2px solid ${C.gold}` }}>
                  <div style={{ fontFamily: F.mono, fontSize: 8, color: C.gold, letterSpacing: "0.14em", marginBottom: 8 }}>KEY PHRASE · {selected.short}</div>
                  <div style={{ fontFamily: F.display, fontSize: 19, color: C.text, fontStyle: "italic", fontWeight: 400, marginBottom: 10 }}>"{selected.keyPhrase}"</div>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{selected.statement}</p>
                </div>
              </div>

              {/* Divergence vs Fed */}
              {selected.id !== "fed" && (
                <div style={{ padding: "22px 26px", background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.14em", marginBottom: 16 }}>
                    DIVERGENCIA · {selected.short} vs FED
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginBottom: 6 }}>FED</div>
                      <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 400, color: C.text }}>4.50%</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 400, color: Math.abs(selected.rate - 4.50) > 1 ? C.gold : C.textSec }}>
                        {selected.rate > 4.50 ? "+" : ""}{(selected.rate - 4.50).toFixed(2)}%
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginTop: 3 }}>SPREAD</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{selected.short}</div>
                      <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 400, color: C.gold }}>{selected.rate.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: NLP ANALYSER ── */}
        {tab === "analyser" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
            <div>
              <NLPAnalyser />
              <div style={{ marginTop: 12, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 10 }}>EJEMPLOS DE USO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {BANKS.slice(0, 3).map(b => (
                    <div key={b.id} style={{ fontFamily: F.mono, fontSize: 10, color: C.textSec, cursor: "pointer", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                      {b.flag} {b.short} — <span style={{ color: C.textMuted }}>"{b.keyPhrase}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "18px 20px", background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.15em", marginBottom: 14 }}>STANCES ACTUALES</div>
                {BANKS.map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textSec }}>{b.flag} {b.short}</span>
                    <StanceBadge stance={b.stance} />
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 18px", background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.1em", marginBottom: 8 }}>ZRC SIGNAL</div>
                <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textSec, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                  Ciclo global en divergencia. BCE y PBoC en modo dovish vs BoJ hawkish. Ventana abierta para posicionamiento en spreads FED–ECB.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: PORTFOLIO SIGNALS ── */}
        {tab === "signals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Aggregate signal summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 1 }}>
              {PORTFOLIO_SIGNALS.map(ps => {
                const v = aggregate[ps.key];
                const rounded = Math.round(v);
                const key = String(Math.max(-2, Math.min(2, rounded)));
                return (
                  <div key={ps.key} style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>{ps.asset.toUpperCase()}</div>
                    <div style={{ fontFamily: F.display, fontSize: 24, color: SIGNAL_COLORS[key] || C.textMuted, marginBottom: 4 }}>
                      {SIGNAL_LABELS[key] || "—"}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>Score agregado: {v > 0 ? "+" : ""}{v.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>

            {/* Per-bank signal matrix */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, overflow: "auto" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em" }}>MATRIX DE SEÑALES POR BANCO CENTRAL</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "12px 20px", fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", textAlign: "left", borderBottom: `1px solid ${C.border}`, fontWeight: 500 }}>BANCO</th>
                    {PORTFOLIO_SIGNALS.map(ps => (
                      <th key={ps.key} style={{ padding: "12px 16px", fontFamily: F.mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.08em", textAlign: "center", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontWeight: 500 }}>
                        {ps.asset.split("(")[0].trim().toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BANKS.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.text }}>{b.flag} {b.short}</span>
                          <StanceBadge stance={b.stance} />
                        </div>
                      </td>
                      {PORTFOLIO_SIGNALS.map(ps => (
                        <td key={ps.key} style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, textAlign: "center" }}>
                          <SignalCell value={b.signals[ps.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ background: C.surface2 }}>
                    <td style={{ padding: "14px 20px", borderTop: `1px solid ${C.goldBorder}` }}>
                      <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.1em" }}>AGREGADO</span>
                    </td>
                    {PORTFOLIO_SIGNALS.map(ps => (
                      <td key={ps.key} style={{ padding: "14px 16px", borderTop: `1px solid ${C.goldBorder}`, textAlign: "center" }}>
                        <SignalCell value={aggregate[ps.key]} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ZRC interpretation */}
            <div style={{ padding: "22px 26px", background: C.surface, border: `1px solid ${C.goldBorder}` }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.15em", marginBottom: 14 }}>ZRC MACRO INTERPRETATION · MAY 2026</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
                {[
                  { title: "Bonos soberanos", body: "BCE en ciclo de recortes activo con 2–3 bajadas adicionales en precio. Sobreponderar Bund 2–5Y y BTP italiano 3Y (spread 165bp vs Bund ofrece carry atractivo)." },
                  { title: "EUR/USD", body: "Divergencia Fed–BCE favorece USD en el corto plazo. Rango esperado 1.06–1.09. BoJ en modo hawkish añade complejidad: posible rotación hacia JPY en risk-off." },
                  { title: "Renta variable", body: "Entorno mixto. Europa sensible a tipos (utilities, REITs) se beneficia de recortes BCE. Cuidado con financieras europeas: compresión de NIM si los recortes se aceleran." },
                ].map(({ title, body }) => (
                  <div key={title}>
                    <div style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginBottom: 6 }}>{title}</div>
                    <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textSec, lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
