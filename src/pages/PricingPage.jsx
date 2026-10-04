import { useState } from "react";

const C = {
  bg: "#09090B", surface: "#111113", surface2: "#18181B", surface3: "#1F1F23",
  border: "#27272A", borderHover: "#3F3F46",
  text: "#FAFAFA", textSec: "#A1A1AA", textMuted: "#71717A",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.12)", goldBorder: "rgba(212,168,83,0.25)",
};
const F = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body: "'Outfit', 'Helvetica Neue', sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', monospace",
};

const PLANS = [
  {
    id: "intelligence",
    name: "Intelligence",
    tagline: { es: "Para inversores y analistas", en: "For investors & analysts" },
    monthly: { price: "€99", period: "/mo", url: "https://buy.stripe.com/dRm3cwd5q5wEaEM1Mm2Nq0d" },
    annual:  { price: "€948", period: "/yr", url: "https://buy.stripe.com/7sYbJ22qMaQY5ksfDc2Nq0e", saving: { es: "Ahorra €240", en: "Save €240" } },
    highlight: false,
    features: {
      es: [
        "GeoRisk Dashboard · escenarios ilimitados",
        "GeoRisk Predictive ML · forecast IA, NLP y decision engine",
        "Real Estate Visor · referencias ilimitadas",
        "Financial Intelligence System",
        "Informe AI board-ready semanal",
        "Motor de riesgos 13-semanas",
        "Feed de inteligencia completo",
        "Acceso a Academia ZRC",
      ],
      en: [
        "GeoRisk Dashboard · unlimited scenarios",
        "GeoRisk Predictive ML · AI forecast, NLP and decision engine",
        "Real Estate Visor · unlimited references",
        "Financial Intelligence System",
        "Weekly AI board-ready report",
        "13-week risk engine",
        "Full intelligence feed",
        "ZRC Academia access",
      ],
    },
  },
  {
    id: "institutional",
    name: "Institutional",
    tagline: { es: "Para family offices y equipos", en: "For family offices & teams" },
    monthly: { price: "€299", period: "/mo", url: "https://buy.stripe.com/9B67sM5CY4sA5kscr02Nq02" },
    annual:  { price: "€2,868", period: "/yr", url: "https://buy.stripe.com/bJe9AU9TecZ6cMU8aK2Nq03", saving: { es: "Ahorra €720", en: "Save €720" } },
    highlight: true,
    features: {
      es: [
        "Todo lo de Intelligence",
        "Deal Flow Radar · ML-enhanced",
        "Valuation Engine · DCF automatizado",
        "Macro Pulse · bancos centrales NLP",
        "Matching con mandatos ZRC",
        "5 usuarios incluidos",
        "Acceso prioritario a oportunidades",
        "Briefing Inner Circle semanal",
        "Línea directa con equipo ZRC",
      ],
      en: [
        "Everything in Intelligence",
        "Deal Flow Radar · ML-enhanced",
        "Valuation Engine · automated DCF",
        "Macro Pulse · central bank NLP",
        "ZRC mandate matching",
        "5 users included",
        "Priority access to opportunities",
        "Weekly Inner Circle briefing",
        "Direct line to ZRC team",
      ],
    },
  },
];

const FOUNDING = {
  monthly: {
    price: "€29",
    period: "/mo",
    url: "https://buy.stripe.com/00waEYd5q3ow8wEgHg2Nq0h",
    priceId: "price_1UL8c0JXE9tayTtoodrqRvr9",
  },
  annual: {
    price: "€299",
    period: "/yr",
    url: "https://buy.stripe.com/eVq6oI7L6cZ6fZ60Ii2Nq0g",
    priceId: "price_1UL8d8JXE9tayTtoiDOKOT6T",
  },
};

export default function PricingPage({ onClose, lang = "es", onRegister }) {
  const [billing, setBilling] = useState("annual");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 350,
        background: "rgba(9,9,11,0.96)", backdropFilter: "blur(20px)",
        overflowY: "auto", display: "flex", flexDirection: "column",
        alignItems: "center", padding: "80px clamp(16px,4vw,48px) 60px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 900 }}>
        <div style={{ marginBottom: 28, padding: "18px 22px", border: `1px solid ${C.goldBorder}`, background: C.goldDim }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.16em", marginBottom: 7 }}>
            {lang === "es" ? "FOUNDING INTELLIGENCE · PRIMEROS 100 MIEMBROS" : "FOUNDING INTELLIGENCE · FIRST 100 MEMBERS"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.display, fontSize: 32, color: C.text }}>{billing === "annual" ? FOUNDING.annual.price : FOUNDING.monthly.price}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>{billing === "annual" ? FOUNDING.annual.period : FOUNDING.monthly.period}</span>
            <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSec }}>
              {lang === "es" ? "· tarifa bloqueada mientras mantengas la suscripción" : "· rate locked while your subscription remains active"}
            </span>
          </div>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.55, margin: "8px 0 14px" }}>
            {lang === "es"
              ? "Oferta fundadora limitada a los primeros 100 miembros. Acceso completo a ZRC Intelligence a una tarifa preferente bloqueada mientras mantengas activa la suscripción."
              : "Founding offer limited to the first 100 members. Full ZRC Intelligence access at a preferential rate locked while your subscription remains active."}
          </p>
          <a
            href={billing === "annual" ? FOUNDING.annual.url : FOUNDING.monthly.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, padding: "11px 18px", cursor: "pointer", background: C.gold, color: C.bg, border: `1px solid ${C.gold}`, textDecoration: "none" }}
          >
            {lang === "es" ? "UNIRME COMO FOUNDER →" : "JOIN AS A FOUNDER →"}
          </a>
        </div>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 12 }}>
              ZRC · INVESTOR INTELLIGENCE
            </div>
            <h1 style={{ fontFamily: F.display, fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, color: C.text, margin: 0, lineHeight: 1.1 }}>
              {lang === "es" ? "Acceso a Inteligencia Institucional" : "Institutional Intelligence Access"}
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 15, color: C.textSec, marginTop: 12, maxWidth: 560, lineHeight: 1.65, fontWeight: 300 }}>
              {lang === "es"
                ? "Herramientas propietarias, señales macro y deal flow curado para inversores y equipos que operan con grado institucional."
                : "Proprietary tools, macro signals and curated deal flow for investors and teams operating at institutional grade."}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 18, cursor: "pointer", padding: "6px 14px", flexShrink: 0, marginLeft: 24 }}
          >
            ✕
          </button>
        </div>

        {/* Billing toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40, gap: 0 }}>
          {["monthly", "annual"].map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em",
                padding: "8px 24px", cursor: "pointer", border: `1px solid ${C.border}`,
                background: billing === b ? C.gold : "transparent",
                color: billing === b ? C.bg : C.textSec,
                fontWeight: billing === b ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {b === "monthly"
                ? (lang === "es" ? "MENSUAL" : "MONTHLY")
                : (lang === "es" ? "ANUAL · -20%" : "ANNUAL · -20%")}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <p style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.7 }}>
          {lang === "es" ? "Los datos de divisas del BCE incluidos en GeoRisk también se pueden obtener gratuitamente en la web del BCE. La suscripción corresponde a las herramientas y al análisis de ZRC." : "ECB foreign exchange data included in GeoRisk are also freely available on the ECB website. Your subscription covers ZRC tools and analysis."}
          {" "}<a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>BCE / ECB</a>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 1 }}>
          {PLANS.map((plan) => {
            const billing_ = billing === "annual" ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.id}
                style={{
                  padding: 36, background: plan.highlight ? C.surface2 : C.surface,
                  border: `1px solid ${plan.highlight ? C.gold + "55" : C.border}`,
                  position: "relative", display: "flex", flexDirection: "column",
                }}
              >
                {plan.highlight && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.gold }} />
                )}
                {plan.highlight && (
                  <div style={{
                    position: "absolute", top: 16, right: 16,
                    fontFamily: F.mono, fontSize: 8, color: C.bg, background: C.gold,
                    padding: "3px 10px", letterSpacing: "0.12em", fontWeight: 600,
                  }}>
                    {lang === "es" ? "MÁS POPULAR" : "MOST POPULAR"}
                  </div>
                )}

                <div style={{ fontFamily: F.display, fontSize: 24, color: C.text, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 28 }}>
                  {plan.tagline[lang].toUpperCase()}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: F.display, fontSize: 44, color: C.gold, fontWeight: 300 }}>{billing_.price}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{billing_.period}</span>
                </div>
                {billing === "annual" && billing_.saving && (
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: C.green, letterSpacing: "0.1em", marginBottom: 28 }}>
                    {billing_.saving[lang].toUpperCase()}
                  </div>
                )}
                {billing === "monthly" && (
                  <div style={{ height: 22, marginBottom: 28 }} />
                )}

                <a
                  href={billing_.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block", textAlign: "center",
                    fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", fontWeight: 600,
                    padding: "13px 24px", textDecoration: "none",
                    background: plan.highlight ? C.gold : "transparent",
                    color: plan.highlight ? C.bg : C.gold,
                    border: `1px solid ${plan.highlight ? C.gold : C.goldBorder}`,
                    marginBottom: 28,
                    transition: "opacity 0.2s",
                  }}
                >
                  {lang === "es" ? "SUSCRIBIRME →" : "SUBSCRIBE →"}
                </a>

                <div style={{ height: 1, background: C.border, marginBottom: 24 }} />

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {plan.features[lang].map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ color: C.gold, fontSize: 10, marginTop: 2, flexShrink: 0 }}>◆</span>
                      <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.5, fontWeight: 300 }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Free tier note */}
        <div style={{
          marginTop: 32, padding: "20px 24px",
          border: `1px solid ${C.border}`,
          background: C.surface,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.12em", marginBottom: 4 }}>
              {lang === "es" ? "ACCESO GRATUITO" : "FREE ACCESS"}
            </div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, fontWeight: 300 }}>
              {lang === "es"
                ? "Real Estate Visor disponible con cuenta gratuita. GeoRisk Dashboard y GeoRisk Predictive ML requieren plan Intelligence o Institutional."
                : "Real Estate Visor available with a free account. GeoRisk Dashboard and GeoRisk Predictive ML require an Intelligence or Institutional plan."}
            </div>
          </div>
          <button
            onClick={() => { if (onRegister) { onClose(); onRegister(); } }}
            style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: "0.08em",
              color: C.gold, background: "none", border: `1px solid ${C.goldBorder}`,
              padding: "8px 18px", cursor: "pointer", whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
          >
            {lang === "es" ? "REGISTRATE GRATIS →" : "REGISTER FREE →"}
          </button>
        </div>

        {/* Trust */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>
            {lang === "es"
              ? "PAGO SEGURO VÍA STRIPE · CANCELA EN CUALQUIER MOMENTO · FACTURA DISPONIBLE"
              : "SECURE PAYMENT VIA STRIPE · CANCEL ANYTIME · INVOICE AVAILABLE"}
          </span>
        </div>
      </div>
    </div>
  );
}
