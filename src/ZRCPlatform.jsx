import { useState, useEffect, useRef, useCallback } from "react";
 
// ═══════════════════════════════════════════════════════════════════════
// ZENITH RISE CAPITAL — STRATEGIC INTELLIGENCE PLATFORM v2.1
// A data-centric, bilingual, institutional-grade intelligence hub
// NOW WITH: Dynamic daily headlines + source links
// ═══════════════════════════════════════════════════════════════════════
 
// ─── i18n SYSTEM ───
const LANG = {
  es: {
    nav: { observatory: "Observatorio", intelligence: "Intelligence", brokerage: "Brokerage", advisory: "Advisory", academia: "Academia", community: "Comunidad", access: "Acceso Privado" },
    hero: {
      tagline: "Inteligencia Estratégica · Inversión · Ejecución",
      h1_1: "Donde la Inteligencia",
      h1_2: "Geopolítica genera",
      h1_3: "Alpha Institucional",
      sub: "ZRC opera en la intersección entre inteligencia macro, advisory estratégico y ejecución de operaciones — transformando señales geopolíticas en decisiones de inversión de grado institucional.",
      cta1: "ACCEDER AL OBSERVATORIO",
      cta2: "VER OPORTUNIDADES",
      flywheel: ["OBSERVAR", "ANALIZAR", "EJECUTAR", "EDUCAR", "CONECTAR"],
    },
    observatory: {
      label: "01 — OBSERVATORIO GEOPOLÍTICO",
      title: "Feed de Inteligencia en Tiempo Real",
      sub: "Señales macro filtradas con lente de inversión. Cada señal mapeada a implicaciones de cartera.",
      fullAnalysis: "ANÁLISIS COMPLETO →",
      share: "COMPARTIR",
      source: "FUENTE",
      lastUpdate: "Última actualización",
      loading: "Cargando inteligencia...",
    },
    intelligence: {
      label: "02 — INVESTOR INTELLIGENCE",
      title: "Aplicaciones Analíticas Propietarias",
      sub: "Herramientas que transforman inteligencia bruta en señales de inversión accionables. ML-enhanced.",
      mlBadge: "MACHINE LEARNING · MODELOS PROPIETARIOS",
      mlText: "Nuestros protocolos de screening y forecasting están potenciados por modelos de machine learning propietarios en desarrollo continuo — optimizando identificación de oportunidades, scoring de riesgo y señales de asignación.",
    },
    brokerage: {
      label: "03 — BROKERAGE",
      title: "Singular Opportunities",
      sub: "Oportunidades de inversión off-market curadas a través de la red propietaria de ZRC. Due diligence de grado institucional.",
      requestTeaser: "SOLICITAR TEASER →",
    },
    advisory: {
      label: "04 — ADVISORY",
      title: "M&A & Growth Strategy",
      sub: "Advisory institucional para empresas navegando complejidad — desde reestructuración hasta expansión cross-border.",
    },
    academia: {
      label: "05 — ZENITH ACADEMIA",
      title: "Educación Impulsada por Inteligencia",
      sub: "Programas de nivel postgraduado impartidos por practitioners. Cada curso se nutre de mandatos reales de ZRC e inteligencia geopolítica en vivo.",
    },
    community: {
      label: "06 — THE INNER CIRCLE",
      title: "Comunidad de Inteligencia",
      sub: "Red privada de inversores, operadores y estrategas. Discusiones curadas donde la inteligencia se encuentra con la convicción.",
      applyTitle: "Solicitar Membresía",
      applyText: "The Inner Circle es solo por invitación. Envía tu perfil profesional y tesis de inversión para unirte a más de 200 miembros verificados.",
      applyCta: "SOLICITAR ACCESO →",
    },
    footer: {
      legal: "© 2026 Calesius Global SL · CIF B56399207 · Todos los derechos reservados",
      locations: "MADRID · LUXEMBURGO · GLOBAL",
    },
    ticker: { updated: "Actualizado", live: "EN VIVO" },
  },
  en: {
    nav: { observatory: "Observatory", intelligence: "Intelligence", brokerage: "Brokerage", advisory: "Advisory", academia: "Academia", community: "Community", access: "Private Access" },
    hero: {
      tagline: "Strategic Intelligence · Investment · Execution",
      h1_1: "Where Geopolitical",
      h1_2: "Intelligence Generates",
      h1_3: "Institutional Alpha",
      sub: "ZRC operates at the intersection of macro intelligence, strategic advisory, and deal execution — transforming geopolitical signals into institutional-grade investment decisions.",
      cta1: "ENTER OBSERVATORY",
      cta2: "VIEW OPPORTUNITIES",
      flywheel: ["OBSERVE", "ANALYZE", "EXECUTE", "EDUCATE", "CONNECT"],
    },
    observatory: {
      label: "01 — GEOPOLITICAL OBSERVATORY",
      title: "Real-Time Intelligence Feed",
      sub: "Macro signals filtered through an investment lens. Every signal mapped to portfolio implications.",
      fullAnalysis: "FULL ANALYSIS →",
      share: "SHARE",
      source: "SOURCE",
      lastUpdate: "Last updated",
      loading: "Loading intelligence...",
    },
    intelligence: {
      label: "02 — INVESTOR INTELLIGENCE",
      title: "Proprietary Analytical Applications",
      sub: "Tools that transform raw intelligence into actionable investment signals. ML-enhanced.",
      mlBadge: "MACHINE LEARNING · PROPRIETARY MODELS",
      mlText: "Our screening and forecasting protocols are powered by proprietary machine learning models under continuous development — optimizing opportunity identification, risk scoring, and allocation signals.",
    },
    brokerage: {
      label: "03 — BROKERAGE",
      title: "Singular Opportunities",
      sub: "Curated off-market investment opportunities sourced through ZRC's proprietary network. Institutional-grade due diligence.",
      requestTeaser: "REQUEST TEASER →",
    },
    advisory: {
      label: "04 — ADVISORY",
      title: "M&A & Growth Strategy",
      sub: "Institutional advisory for companies navigating complexity — from restructuring to cross-border expansion.",
    },
    academia: {
      label: "05 — ZENITH ACADEMIA",
      title: "Intelligence-Driven Education",
      sub: "Postgraduate-level programs taught by practitioners. Every course draws from live ZRC mandates and real geopolitical intelligence.",
    },
    community: {
      label: "06 — THE INNER CIRCLE",
      title: "Intelligence Community",
      sub: "Private network of investors, operators, and strategists. Curated discussions where intelligence meets conviction.",
      applyTitle: "Apply for Membership",
      applyText: "The Inner Circle is invitation-only. Submit your professional background and investment thesis to join 200+ vetted members.",
      applyCta: "APPLY NOW →",
    },
    footer: {
      legal: "© 2026 Calesius Global SL · CIF B56399207 · All rights reserved",
      locations: "MADRID · LUXEMBOURG · GLOBAL",
    },
    ticker: { updated: "Updated", live: "LIVE" },
  },
};
 
// ─── DATA ───
 
// Fallback market data — used only if /data/headlines.json has no market_ticker
const FALLBACK_MARKET_TICKER = [
  { symbol: "EUR/USD", value: "1.0847", change: "+0.12%", up: true },
  { symbol: "IBEX 35", value: "13,245", change: "+0.67%", up: true },
  { symbol: "BRENT", value: "$78.32", change: "-1.24%", up: false },
  { symbol: "GOLD", value: "$3,042", change: "+0.89%", up: true },
  { symbol: "BTC", value: "$87,412", change: "+2.31%", up: true },
  { symbol: "VIX", value: "18.7", change: "+4.2%", up: true },
  { symbol: "US 10Y", value: "4.28%", change: "+0.03", up: true },
  { symbol: "EUR/GBP", value: "0.8634", change: "-0.08%", up: false },
];
 
// Fallback headlines — used only if /data/headlines.json is unavailable
const FALLBACK_GEO_FEED = [
  { id: 1, tag: "CRITICAL", region: "MENA", title: { es: "Disrupción en corredor del Mar Rojo — fletes +340% YTD", en: "Red Sea corridor disruption — freight rates +340% YTD" }, time: "2h", impact: "high", summary: { es: "Escalada Houtí fuerza redireccionamiento vía Cabo de Buena Esperanza. Impacto directo en costes de importación europeos, logística energética y primas de seguro en rutas comerciales mediterráneas.", en: "Houthi escalation forces rerouting via Cape of Good Hope. Direct impact on European import costs, energy logistics, and insurance premiums across Mediterranean trade routes." }, signals: ["OIL +", "SHIPPING +", "EUR -"], confidence: 92, source: "Reuters", url: "https://www.reuters.com" },
  { id: 2, tag: "MONITOR", region: "EU", title: { es: "BCE señala divergencia de tipos frente a la Fed — implicaciones EUR/USD", en: "ECB signals rate path divergence from Fed — EUR/USD implications" }, time: "4h", impact: "medium", summary: { es: "Última orientación de Lagarde sugiere 2-3 recortes en 2026 mientras la Fed mantiene. Ventanas de arbitraje cambiario abiertas para M&A cross-border.", en: "Lagarde's latest guidance suggests 2-3 cuts in 2026 while Fed holds. Currency arbitrage windows opening for cross-border M&A." }, signals: ["EUR/USD -", "BONDS +", "EQUITIES ?"], confidence: 78, source: "Financial Times", url: "https://www.ft.com" },
  { id: 3, tag: "EMERGING", region: "LATAM", title: { es: "Reformas de Milei desbloquean pipeline de IED congelada por $12B", en: "Milei reforms unlock $12B in frozen FDI pipeline" }, time: "6h", impact: "high", summary: { es: "Paquete de desregulación aprobado en Senado. Sectores de minería, agritech y energía posicionados para ventaja de first-mover. ZRC monitorizando 4 mandatos activos.", en: "Deregulation package clears Senate. Mining, agritech, and energy sectors positioned for first-mover advantage. ZRC tracking 4 live mandates." }, signals: ["ARS +", "MINING +", "AGRI +"], confidence: 85, source: "Bloomberg", url: "https://www.bloomberg.com" },
  { id: 4, tag: "STRATEGIC", region: "APAC", title: { es: "Retrasos en fab TSMC Arizona reconfiguran tesis de cadena de suministro de semiconductores", en: "TSMC Arizona fab delays reshape semiconductor supply chain thesis" }, time: "8h", impact: "medium", summary: { es: "Timeline de producción desplazado a Q3 2027. Narrativa de soberanía europea de chips se fortalece — implicaciones para inversiones en política industrial de la UE.", en: "Production timeline pushed to Q3 2027. European chip sovereignty narrative strengthens — implications for EU industrial policy investments." }, signals: ["SEMIS -", "EU TECH +"], confidence: 71, source: "Nikkei Asia", url: "https://asia.nikkei.com" },
  { id: 5, tag: "ALERT", region: "AFRICA", title: { es: "Gasoducto Morocco-Nigeria asegura tramo de financiación de €4.2B", en: "Morocco-Nigeria gas pipeline secures €4.2B financing tranche" }, time: "12h", impact: "high", summary: { es: "Consorcio AfDB y fondos soberanos cierran financiación. Transforma infraestructura energética de África Occidental — zonas de acuicultura e industriales a lo largo del corredor se benefician.", en: "AfDB and sovereign wealth consortium close financing. Transforms West African energy infrastructure — aquaculture and industrial zones along corridor benefit." }, signals: ["ENERGY +", "INFRA +", "NGN +"], confidence: 88, source: "African Business", url: "https://african.business" },
];
 
const OPPORTUNITIES = [
  { id: 1, type: "REAL ESTATE", name: "Automotive Platform Madrid", loc: "Chamberí, Madrid", size: "320m² · Active License", yield: "8.2%", status: "EXCLUSIVE", price: "€1.2M" },
  { id: 2, type: "AGRI-LAND", name: "Finca Cabrerizas", loc: "Vilches, Jaén", size: "337 hectares", yield: "Agri + Dev", status: "EXCLUSIVE", price: "€2.8M" },
  { id: 3, type: "RESIDENTIAL", name: "Edificio Salamanca", loc: "Barrio de Salamanca, Madrid", size: "2,042m² · 12 units", yield: "6.5% net", status: "ADVISORY", price: "€11.6M" },
];
 
const TOOLS = [
  { name: "GeoRisk Dashboard", desc: { es: "Scoring de riesgo geopolítico en tiempo real con sliders de escenario. Mapeo de eventos macro a exposición sectorial y de cartera.", en: "Real-time geopolitical risk scoring with scenario sliders. Map macro events to sector and portfolio exposure." }, icon: "◈", status: "LIVE", ml: true },
  { name: "Valuation Engine", desc: { es: "DCF automatizado, múltiplos y valoración normalizada para PYMEs — incluyendo ajustes por ingresos no declarados.", en: "Automated DCF, multiples, and normalized valuation for SMEs — including adjustments for undeclared revenue." }, icon: "◇", status: "BETA", ml: true },
  { name: "Deal Flow Radar", desc: { es: "Pipeline ML-enhanced que identifica empresas financieramente sub-optimizadas en Europa del Sur. Scoring listo para conversión.", en: "ML-enhanced pipeline identifying financially sub-optimized companies across Southern Europe. Conversion-ready scoring." }, icon: "◆", status: "LIVE", ml: true },
  { name: "Macro Pulse", desc: { es: "Tracker de señales de bancos centrales. Análisis NLP de comunicaciones del BCE, Fed, BoE mapeadas a implicaciones por clase de activo.", en: "Central bank signal tracker. NLP analysis of ECB, Fed, BoE communications mapped to asset class implications." }, icon: "○", status: "Q3 2026", ml: true },
];
 
const ADVISORY_SERVICES = [
  { title: "M&A Advisory", desc: { es: "Soporte transaccional end-to-end desde identificación de target hasta integración post-fusión. Especializado en operaciones mid-market cross-border en Europa del Sur.", en: "End-to-end transaction support from target identification to post-merger integration. Specialized in cross-border mid-market deals across Southern Europe." }, metric: "€50M+" },
  { title: "Growth Advisory", desc: { es: "Consultoría estratégica para empresas en puntos de inflexión. Optimización de ingresos, expansión de mercado y reestructuración operativa con framework cuantitativo.", en: "Strategic consulting for companies at inflection points. Revenue optimization, market expansion, and operational restructuring with a quantitative framework." }, metric: "12 mandates" },
  { title: "Capital Raising", desc: { es: "Soluciones de capital estructurado conectando empresas en crecimiento con inversores institucionales, family offices y socios estratégicos.", en: "Structured capital solutions connecting growth companies with institutional investors, family offices, and strategic partners." }, metric: "3 sectors" },
];
 
const COURSES = [
  { id: 1, title: { es: "Riesgo Geopolítico y Estrategia de Inversión", en: "Geopolitical Risk & Investment Strategy" }, modules: 12, hours: 24, level: "Advanced", status: "ENROLLING" },
  { id: 2, title: { es: "Masterclass de Valoración Corporativa", en: "Corporate Valuation Masterclass" }, modules: 8, hours: 16, level: "Intermediate", status: "ENROLLING" },
  { id: 3, title: { es: "M&A: De la LOI al Cierre", en: "M&A Execution: From LOI to Close" }, modules: 10, hours: 20, level: "Advanced", status: "COMING" },
  { id: 4, title: { es: "Macro y Estrategia de Bancos Centrales", en: "Macro & Central Bank Strategy" }, modules: 6, hours: 12, level: "Intermediate", status: "COMING" },
];
 
const THREADS = [
  { id: 1, author: "L. Gómez Elvira", role: "Founder & CIO", title: { es: "Por qué la disrupción del Mar Rojo es un evento de reasignación de €200B", en: "Why the Red Sea disruption is a €200B reallocation event" }, replies: 34, views: 1247 },
  { id: 2, author: "Guest Analyst", role: "Macro Strategist", title: { es: "Divergencia de tipos del BCE: posicionamiento para carry trades en EUR", en: "ECB rate divergence: positioning for EUR carry trades" }, replies: 18, views: 892 },
  { id: 3, author: "ZRC Research", role: "Observatorio", title: { es: "Briefing Semanal #47: Ola de desregulación LATAM — mapa sectorial", en: "Weekly Briefing #47: LATAM deregulation wave — sector map" }, replies: 22, views: 1560 },
];
 
// ─── DESIGN TOKENS ───
const C = {
  bg: "#09090B", surface: "#111113", surface2: "#18181B", surface3: "#1F1F23",
  border: "#27272A", borderHover: "#3F3F46",
  text: "#FAFAFA", textSec: "#A1A1AA", textMuted: "#71717A",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.12)", goldBorder: "rgba(212,168,83,0.25)",
  red: "#EF4444", green: "#22C55E", blue: "#3B82F6", amber: "#F59E0B",
};
const F = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body: "'Outfit', 'Helvetica Neue', sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', monospace",
};
 
// ─── UTILITY COMPONENTS ───
 
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

// ─── DYNAMIC INTELLIGENCE HOOK (headlines + market ticker) ───
const useIntelligence = () => {
  const [headlines, setHeadlines] = useState(FALLBACK_GEO_FEED);
  const [marketTicker, setMarketTicker] = useState(FALLBACK_MARKET_TICKER);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch("/data/headlines.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.headlines && data.headlines.length > 0) {
            setHeadlines(data.headlines);
            setIsLive(true);
          }
          if (data.market_ticker && data.market_ticker.length > 0) {
            setMarketTicker(data.market_ticker);
          }
          if (data.generated_at) {
            setGeneratedAt(data.generated_at);
          }
        }
      } catch (err) {
        console.warn("Using fallback data:", err.message);
      }
    };
    fetchData();
    // Refresh every 30 minutes
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { headlines, marketTicker, generatedAt, isLive };
};
 
const FadeIn = ({ children, delay = 0, style = {} }) => {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
};
 
const Badge = ({ label, variant }) => {
  const map = {
    critical: { bg: "rgba(239,68,68,0.12)", c: C.red, b: "rgba(239,68,68,0.25)" },
    monitor: { bg: "rgba(59,130,246,0.12)", c: C.blue, b: "rgba(59,130,246,0.25)" },
    emerging: { bg: "rgba(34,197,94,0.12)", c: C.green, b: "rgba(34,197,94,0.25)" },
    strategic: { bg: C.goldDim, c: C.gold, b: C.goldBorder },
    alert: { bg: "rgba(239,68,68,0.18)", c: C.red, b: "rgba(239,68,68,0.35)" },
    exclusive: { bg: C.goldDim, c: C.gold, b: C.goldBorder },
    mandate: { bg: "rgba(59,130,246,0.12)", c: C.blue, b: "rgba(59,130,246,0.25)" },
    advisory: { bg: "rgba(34,197,94,0.12)", c: C.green, b: "rgba(34,197,94,0.25)" },
    live: { bg: "rgba(34,197,94,0.12)", c: C.green, b: "rgba(34,197,94,0.25)" },
    beta: { bg: "rgba(245,158,11,0.12)", c: C.amber, b: "rgba(245,158,11,0.25)" },
    ml: { bg: "rgba(139,92,246,0.12)", c: "#A78BFA", b: "rgba(139,92,246,0.25)" },
  };
  const s = map[(variant || label || "").toLowerCase()] || map.strategic;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", fontSize: 9, fontFamily: F.mono, fontWeight: 600, letterSpacing: "0.12em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, lineHeight: 1.6 }}>{label}</span>;
};
 
const Dot = ({ level }) => {
  const c = level === "high" ? C.red : level === "medium" ? C.amber : C.green;
  return <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}`, display: "inline-block" }} />;
};
 
const GoldDivider = () => (
  <div style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${C.goldBorder} 30%, ${C.gold}44 50%, ${C.goldBorder} 70%, transparent 100%)`, margin: 0 }} />
);
 
const Section = ({ id, children }) => (
  <section id={id} style={{ padding: "clamp(60px,10vw,120px) clamp(16px,4vw,48px)", maxWidth: 1100, margin: "0 auto" }}>
    {children}
  </section>
);
 
const SectionHead = ({ label, title, sub, extra }) => (
  <FadeIn style={{ marginBottom: 48 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold, letterSpacing: "0.18em", fontWeight: 500 }}>{label}</span>
      {extra}
    </div>
    <h2 style={{ fontFamily: F.display, fontSize: "clamp(28px,4vw,42px)", fontWeight: 300, color: C.text, margin: 0, lineHeight: 1.15, letterSpacing: "-0.01em" }}>{title}</h2>
    {sub && <p style={{ fontFamily: F.body, fontSize: 15, color: C.textSec, marginTop: 12, maxWidth: 640, lineHeight: 1.65, fontWeight: 300 }}>{sub}</p>}
  </FadeIn>
);
 
// ─── MARKET TICKER (DYNAMIC) ───
const MarketTicker = ({ lang, data }) => {
  const t = LANG[lang].ticker;
  const doubled = [...data, ...data];
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, overflow: "hidden", position: "relative", height: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, position: "absolute", whiteSpace: "nowrap", animation: "tickerScroll 50s linear infinite" }}>
        {doubled.map((m, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 24px", height: 36 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.05em" }}>{m.symbol}</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.text, fontWeight: 500 }}>{m.value}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: m.up ? C.green : C.red, fontWeight: 500 }}>{m.change}</span>
            <span style={{ width: 1, height: 12, background: C.border }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, background: `linear-gradient(90deg, transparent, ${C.surface} 40%)`, zIndex: 2 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.green, letterSpacing: "0.1em" }}>{t.live}</span>
        </span>
      </div>
    </div>
  );
};
 
// ─── NAV ───
const Nav = ({ lang, setLang, onNav }) => {
  const [scrolled, setScrolled] = useState(false);
  const t = LANG[lang].nav;
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  const links = [
    { id: "observatory", label: t.observatory },
    { id: "intelligence", label: t.intelligence },
    { id: "brokerage", label: t.brokerage },
    { id: "advisory", label: t.advisory },
    { id: "academia", label: t.academia },
    { id: "community", label: t.community },
  ];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(9,9,11,0.92)" : "transparent", backdropFilter: scrolled ? "blur(24px) saturate(1.4)" : "none", borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent", transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56, padding: "0 clamp(16px,3vw,32px)" }}>
        {/* Logo */}
        <div onClick={() => onNav("hero")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, border: `1.5px solid ${C.gold}`, transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 6, height: 6, background: C.gold, transform: "rotate(-45deg)" }} />
          </div>
          <span style={{ fontFamily: F.display, fontSize: 15, color: C.text, fontWeight: 400, letterSpacing: "0.12em" }}>ZRC</span>
        </div>
        {/* Links */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", overflowX: "auto" }}>
          {links.map(l => (
            <button key={l.id} onClick={() => onNav(l.id)} style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: "0.08em", color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: "4px 0", transition: "color 0.3s", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.target.style.color = C.gold}
              onMouseLeave={e => e.target.style.color = C.textMuted}>
              {l.label.toUpperCase()}
            </button>
          ))}
          {/* Lang toggle */}
          <button onClick={() => setLang(lang === "es" ? "en" : "es")} style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "3px 10px", background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", fontWeight: 600, marginLeft: 8 }}>
            {lang === "es" ? "EN" : "ES"}
          </button>
        </div>
      </div>
    </nav>
  );
};
 
// ─── HERO ───
const Hero = ({ lang, onNav }) => {
  const t = LANG[lang].hero;
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 150); }, []);
 
  return (
    <section id="hero" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden", padding: "80px clamp(16px,4vw,48px) 60px" }}>
      {/* Atmospheric layers */}
      <div style={{ position: "absolute", inset: 0, background: `
        radial-gradient(ellipse 60% 50% at 20% 30%, rgba(212,168,83,0.04) 0%, transparent 70%),
        radial-gradient(ellipse 40% 40% at 80% 70%, rgba(59,130,246,0.03) 0%, transparent 70%)
      ` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `
        linear-gradient(${C.border}22 1px, transparent 1px),
        linear-gradient(90deg, ${C.border}22 1px, transparent 1px)
      `, backgroundSize: "100px 100px" }} />
      {/* Diagonal accent line */}
      <div style={{ position: "absolute", top: "10%", right: "10%", width: 200, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}33, transparent)`, transform: "rotate(-35deg)" }} />
      <div style={{ position: "absolute", bottom: "15%", left: "5%", width: 300, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}22, transparent)`, transform: "rotate(25deg)" }} />
 
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 860, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(30px)", transition: "all 1.2s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.35em", marginBottom: 40, fontWeight: 400, opacity: 0.9 }}>
          {t.tagline.toUpperCase()}
        </div>
 
        <h1 style={{ fontFamily: F.display, fontSize: "clamp(36px, 5.5vw, 68px)", fontWeight: 300, color: C.text, margin: 0, lineHeight: 1.08, letterSpacing: "-0.02em" }}>
          {t.h1_1}<br />
          {t.h1_2}<br />
          <span style={{ color: C.gold, fontStyle: "italic", fontWeight: 400 }}>{t.h1_3}</span>
        </h1>
 
        <p style={{ fontFamily: F.body, fontSize: 16, color: C.textSec, maxWidth: 540, margin: "36px auto 0", lineHeight: 1.7, fontWeight: 300 }}>
          {t.sub}
        </p>
 
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
          <button onClick={() => onNav("observatory")} style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.12em", padding: "13px 28px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.3s" }}>
            {t.cta1} →
          </button>
          <button onClick={() => onNav("brokerage")} style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.12em", padding: "13px 28px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", fontWeight: 500, transition: "all 0.3s" }}>
            {t.cta2}
          </button>
        </div>
 
        {/* Flywheel */}
        <div style={{ marginTop: 72, display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap", alignItems: "center" }}>
{t.flywheel.map((step, i) => {
            const targets = ["observatory", "intelligence", "brokerage", "academia", "community"];
            return (
              <div key={step} style={{ display: "flex", alignItems: "center" }}>
                <div onClick={() => onNav(targets[i])} style={{ padding: "6px 16px", border: `1px solid ${i === 0 ? C.gold : C.border}`, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.15em", color: i === 0 ? C.gold : C.textMuted, background: i === 0 ? C.goldDim : "transparent", transition: "all 0.3s", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = i === 0 ? C.gold : C.border; e.currentTarget.style.color = i === 0 ? C.gold : C.textMuted; }}>
                  {step}
                </div>
                {i < 4 && <span style={{ fontFamily: F.mono, color: C.textMuted, margin: "0 2px", fontSize: 10, opacity: 0.5 }}>→</span>}
              </div>
            );
          })}
          ))}
        </div>
      </div>
    </section>
  );
};
 
// ─── OBSERVATORY (DYNAMIC HEADLINES + SOURCE LINKS) ───
const Observatory = ({ lang, headlines, generatedAt, isLive }) => {
  const t = LANG[lang].observatory;
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const regions = ["ALL", ...new Set(headlines.map(h => h.region))];
  const filtered = filter === "ALL" ? headlines : headlines.filter(f => f.region === filter);

  const formatTimestamp = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };
 
  return (
    <Section id="observatory">
      <SectionHead
        label={t.label}
        title={t.title}
        sub={t.sub}
        extra={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>({headlines.length})</span>
            {isLive && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
              </span>
            )}
          </div>
        }
      />

      {/* Last updated timestamp */}
      {generatedAt && (
        <FadeIn delay={0.05}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em" }}>
              {t.lastUpdate}: {formatTimestamp(generatedAt)}
            </span>
          </div>
        </FadeIn>
      )}
 
      <FadeIn delay={0.1}>
        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {regions.map(r => (
            <button key={r} onClick={() => setFilter(r)} style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "5px 14px", background: filter === r ? C.goldDim : "transparent", color: filter === r ? C.gold : C.textMuted, border: `1px solid ${filter === r ? C.goldBorder : C.border}`, cursor: "pointer", transition: "all 0.2s" }}>
              {r}
            </button>
          ))}
        </div>
      </FadeIn>
 
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {filtered.map((item, i) => (
          <FadeIn key={item.id} delay={i * 0.05}>
            <div onClick={() => setExpanded(expanded === item.id ? null : item.id)} style={{ padding: "18px 22px", background: expanded === item.id ? C.surface2 : C.surface, border: `1px solid ${expanded === item.id ? C.goldBorder : C.border}`, cursor: "pointer", transition: "all 0.3s" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Badge label={item.tag} variant={item.tag.toLowerCase()} />
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>{item.region}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, opacity: 0.5 }}>·</span>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{item.time}</span>
                    {item.source && (
                      <>
                        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, opacity: 0.5 }}>·</span>
                        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, opacity: 0.7 }}>{item.source}</span>
                      </>
                    )}
                  </div>
                  <h3 style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.text, margin: 0, lineHeight: 1.45 }}>{item.title[lang] || item.title.en || item.title.es}</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  {/* Confidence meter */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 40, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${item.confidence}%`, height: "100%", background: item.confidence > 80 ? C.green : item.confidence > 60 ? C.amber : C.red, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{item.confidence}%</span>
                  </div>
                  <Dot level={item.impact} />
                </div>
              </div>
 
              {expanded === item.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.65, margin: "0 0 14px", fontWeight: 300 }}>{item.summary[lang] || item.summary.en || item.summary.es}</p>
                  {/* Signal tags */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    {(item.signals || []).map((s, j) => (
                      <span key={j} style={{ fontFamily: F.mono, fontSize: 9, padding: "2px 8px", background: s.includes("+") ? "rgba(34,197,94,0.08)" : s.includes("-") ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.08)", color: s.includes("+") ? C.green : s.includes("-") ? C.red : C.blue, border: `1px solid ${s.includes("+") ? "rgba(34,197,94,0.2)" : s.includes("-") ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}`, letterSpacing: "0.05em" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {/* Source link — opens in new tab */}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "5px 14px", background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.25s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,168,83,0.22)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.goldDim; }}
                      >
                        <span style={{ fontSize: 11 }}>↗</span>
                        {t.source}: {item.source || "—"}
                      </a>
                    )}
                    <button
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "5px 14px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer" }}
                    >
                      {t.share}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
};
 
// ─── INVESTOR INTELLIGENCE ───
const Intelligence = ({ lang }) => {
  const t = LANG[lang].intelligence;
  return (
    <Section id="intelligence">
      <SectionHead label={t.label} title={t.title} sub={t.sub} />
 
      {/* ML Banner */}
      <FadeIn delay={0.1}>
        <div style={{ padding: "20px 24px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)", marginBottom: 32, display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 32, height: 32, border: "1px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.15em", color: "#A78BFA", marginBottom: 6 }}>{t.mlBadge}</div>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{t.mlText}</p>
          </div>
        </div>
      </FadeIn>
 
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1 }}>
        {TOOLS.map((tool, i) => (
          <FadeIn key={i} delay={i * 0.08}>
            <div style={{ padding: 28, background: C.surface, border: `1px solid ${C.border}`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", transition: "border-color 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.goldBorder}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: tool.status === "LIVE" ? C.green : tool.status === "BETA" ? C.amber : "transparent" }} />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 22, color: C.gold, opacity: 0.6 }}>{tool.icon}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {tool.ml && <Badge label="ML" variant="ml" />}
                    <Badge label={tool.status} variant={tool.status.toLowerCase()} />
                  </div>
                </div>
                <h3 style={{ fontFamily: F.display, fontSize: 19, fontWeight: 400, color: C.text, margin: "0 0 10px" }}>{tool.name}</h3>
                <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textSec, lineHeight: 1.6, fontWeight: 300 }}>{tool.desc[lang]}</p>
              </div>
              <button style={{ marginTop: 20, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "7px 16px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", alignSelf: "flex-start" }}>
                {tool.status === "LIVE" ? "LAUNCH →" : tool.status === "BETA" ? "REQUEST ACCESS" : "NOTIFY ME"}
              </button>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
};
 
// ─── BROKERAGE ───
const Brokerage = ({ lang }) => {
  const t = LANG[lang].brokerage;
  return (
    <Section id="brokerage">
      <SectionHead label={t.label} title={t.title} sub={t.sub} extra={<span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>({OPPORTUNITIES.length} live)</span>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {OPPORTUNITIES.map((op, i) => (
          <FadeIn key={op.id} delay={i * 0.06}>
            <div style={{ padding: "22px 24px", background: C.surface, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", transition: "border-color 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.goldBorder}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", color: C.textMuted }}>{op.type}</span>
                  <Badge label={op.status} variant={op.status.toLowerCase()} />
                </div>
                <h3 style={{ fontFamily: F.display, fontSize: 19, fontWeight: 400, color: C.text, margin: "0 0 6px" }}>{op.name}</h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontFamily: F.body, fontSize: 12.5, color: C.textSec, fontWeight: 300 }}>{op.loc}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{op.size}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.green, fontWeight: 500 }}>{op.yield}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, marginBottom: 8, fontWeight: 400 }}>{op.price}</div>
                <button style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "6px 16px", background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer" }}>{t.requestTeaser}</button>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
};
 
// ─── ADVISORY ───
const Advisory = ({ lang }) => {
  const t = LANG[lang].advisory;
  return (
    <Section id="advisory">
      <SectionHead label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1 }}>
        {ADVISORY_SERVICES.map((s, i) => (
          <FadeIn key={i} delay={i * 0.08}>
            <div style={{ padding: 28, background: C.surface, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
              <div>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.12em" }}>0{i + 1}</span>
                <h3 style={{ fontFamily: F.display, fontSize: 21, fontWeight: 400, color: C.text, margin: "14px 0 10px" }}>{s.title}</h3>
                <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textSec, lineHeight: 1.6, fontWeight: 300 }}>{s.desc[lang]}</p>
              </div>
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold }}>{s.metric}</span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
};
 
// ─── ACADEMIA ───
const Academia = ({ lang }) => {
  const t = LANG[lang].academia;
  return (
    <Section id="academia">
      <SectionHead label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {COURSES.map((c, i) => (
          <FadeIn key={c.id} delay={i * 0.06}>
            <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Badge label={c.level.toUpperCase()} variant="strategic" />
                  <Badge label={c.status} variant={c.status === "ENROLLING" ? "live" : "beta"} />
                </div>
                <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 400, color: C.text, margin: 0 }}>{c.title[lang]}</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>{c.modules} MOD · {c.hours}H</span>
                <button style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "6px 16px", background: c.status === "ENROLLING" ? C.goldDim : "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer" }}>
                  {c.status === "ENROLLING" ? "ENROLL →" : "WAITLIST"}
                </button>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
};
 
// ─── COMMUNITY ───
const Community = ({ lang }) => {
  const t = LANG[lang].community;
  return (
    <Section id="community">
      <SectionHead label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 40 }}>
        {THREADS.map((thread, i) => (
          <FadeIn key={thread.id} delay={i * 0.06}>
            <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.goldBorder}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.text, margin: "0 0 6px" }}>{thread.title[lang]}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: F.body, fontSize: 12, color: C.gold, fontWeight: 400 }}>{thread.author}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{thread.role}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>{thread.replies} replies</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>{thread.views.toLocaleString()} views</span>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
 
      {/* Membership CTA */}
      <FadeIn delay={0.2}>
        <div style={{ padding: "48px 36px", background: C.surface, border: `1px solid ${C.goldBorder}`, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, rgba(212,168,83,0.04), transparent 70%)` }} />
          <div style={{ position: "relative" }}>
            <h3 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 300, color: C.text, margin: "0 0 12px" }}>{t.applyTitle}</h3>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSec, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.65, fontWeight: 300 }}>{t.applyText}</p>
            <button style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.12em", padding: "13px 32px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>{t.applyCta}</button>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
};
 
// ─── FOOTER ───
const Footer = ({ lang }) => {
  const t = LANG[lang].footer;
  return (
    <footer style={{ padding: "48px clamp(16px,4vw,48px)", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 18, height: 18, border: `1px solid ${C.gold}`, transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 4, height: 4, background: C.gold }} />
            </div>
            <span style={{ fontFamily: F.display, fontSize: 14, color: C.text, letterSpacing: "0.1em" }}>Zenith Rise Capital</span>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.12em" }}>{t.locations}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>zenrisecapital.com</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginTop: 4, letterSpacing: "0.03em" }}>{t.legal}</div>
        </div>
      </div>
    </footer>
  );
};
 
// ─── MAIN APP ───
export default function ZRCPlatform() {
  const [lang, setLang] = useState("es");
  const { headlines, marketTicker, generatedAt, isLive } = useIntelligence();
 
  const handleNav = useCallback((id) => {
    if (id === "hero") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
 
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: F.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Outfit:wght@200;300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body { background: ${C.bg}; }
        ::selection { background: rgba(212,168,83,0.25); color: ${C.text}; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textMuted}; }
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        button { transition: all 0.25s ease; }
        button:hover { opacity: 0.88; transform: translateY(-1px); }
        button:active { transform: translateY(0); }
      `}</style>
 
      <Nav lang={lang} setLang={setLang} onNav={handleNav} />
      <MarketTicker lang={lang} data={marketTicker} />
      <Hero lang={lang} onNav={handleNav} />
      <GoldDivider />
      <Observatory lang={lang} headlines={headlines} generatedAt={generatedAt} isLive={isLive} />
      <GoldDivider />
      <Intelligence lang={lang} />
      <GoldDivider />
      <Brokerage lang={lang} />
      <GoldDivider />
      <Advisory lang={lang} />
      <GoldDivider />
      <Academia lang={lang} />
      <GoldDivider />
      <Community lang={lang} />
      <Footer lang={lang} />
    </div>
  );
}
