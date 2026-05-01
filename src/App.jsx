import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import GeoRiskDashboard from "./pages/intelligence/GeoRiskDashboard";
import RealEstateVisor from "./pages/labs/RealEstateVisor";
import FinancialIntelligenceSystem from "./pages/labs/FinancialIntelligenceSystem";

// ══════════════════════════════════════════════════════════════════════════
// ZENITH RISE CAPITAL — PLATFORM v3.3
// Live ticker · Clickable hero nav · GeoRisk Dashboard integration
// Hero Background: Dark Overlay v1 — mapa, radar, montañas, nodos
// + Financial Intelligence System (FIS)
// ══════════════════════════════════════════════════════════════════════════

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

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authCallback, setAuthCallback] = useState(null);

  const login = (userData) => {
    setUser(userData);
    setShowAuth(false);
    if (authCallback) {
      authCallback();
      setAuthCallback(null);
    }
  };

  const logout = () => setUser(null);

  const requireAuth = (callback) => {
    if (user) {
      callback();
    } else {
      setAuthCallback(() => callback);
      setAuthMode("register");
      setShowAuth(true);
    }
  };

  const openLogin = () => {
    setAuthMode("login");
    setShowAuth(true);
  };

  const openRegister = () => {
    setAuthMode("register");
    setShowAuth(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        requireAuth,
        openLogin,
        openRegister,
        showAuth,
        setShowAuth,
        authMode,
        setAuthMode,
      }}
    >
      {children}
      {showAuth && <AuthModal />}
    </AuthContext.Provider>
  );
};

const T = {
  es: {
    nav: ["Observatorio", "Intelligence", "Brokerage", "Advisory", "Academia", "Comunidad"],
    hero: {
      tag: "INTELIGENCIA ESTRATÉGICA · INVERSIÓN · EJECUCIÓN",
      h1: "Donde la Inteligencia",
      h2: "Geopolítica genera",
      h3: "Alpha Institucional",
      sub: "ZRC opera en la intersección entre inteligencia macro, advisory estratégico y ejecución de operaciones — transformando señales geopolíticas en decisiones de inversión de grado institucional.",
      cta1: "ACCEDER AL OBSERVATORIO",
      cta2: "VER OPORTUNIDADES",
      fw: ["OBSERVAR", "ANALIZAR", "EJECUTAR", "EDUCAR", "CONECTAR"],
    },
    obs: {
      label: "01 — OBSERVATORIO GEOPOLÍTICO",
      title: "Feed de Inteligencia en Tiempo Real",
      sub: "Señales macro filtradas con lente de inversión. Cada señal mapeada a implicaciones de cartera.",
      full: "ANÁLISIS COMPLETO →",
      share: "COMPARTIR",
      locked: "Registrate para acceder al análisis completo",
    },
    intel: {
      label: "02 — INVESTOR INTELLIGENCE",
      title: "Aplicaciones Analíticas Propietarias",
      sub: "Herramientas que transforman inteligencia bruta en señales de inversión accionables.",
      mlBadge: "MACHINE LEARNING · MODELOS PROPIETARIOS",
      mlText: "Nuestros protocolos de screening y forecasting están potenciados por modelos de machine learning propietarios en desarrollo continuo.",
      locked: "Acceso exclusivo para miembros registrados",
    },
    brok: {
      label: "03 — BROKERAGE",
      title: "Singular Opportunities",
      sub: "Oportunidades off-market curadas. Due diligence de grado institucional.",
      req: "SOLICITAR TEASER →",
    },
    adv: {
      label: "04 — ADVISORY",
      title: "M&A & Growth Strategy",
      sub: "Advisory institucional para empresas navegando complejidad.",
    },
    acad: {
      label: "05 — ZENITH ACADEMIA",
      title: "Educación Impulsada por Inteligencia",
      sub: "Programas de nivel postgraduado impartidos por practitioners.",
    },
    comm: {
      label: "06 — THE INNER CIRCLE",
      title: "Comunidad de Inteligencia",
      sub: "Red privada de inversores, operadores y estrategas.",
      applyTitle: "Solicitar Membresía",
      applyText: "The Inner Circle es solo por invitación. Envía tu perfil profesional y tesis de inversión.",
      applyCta: "SOLICITAR ACCESO →",
    },
    auth: {
      login: "Iniciar Sesión",
      register: "Crear Cuenta",
      name: "Nombre completo",
      email: "Email",
      pass: "Contraseña",
      company: "Empresa / Institución",
      role: "Cargo",
      interest: "Área de interés principal",
      submit: "Acceder",
      registerBtn: "Registrarse",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      create: "Crear cuenta",
      loginLink: "Iniciar sesión",
    },
    form: {
      title: "Solicitar Información",
      name: "Nombre",
      email: "Email",
      phone: "Teléfono",
      company: "Empresa",
      message: "Mensaje",
      send: "ENVIAR SOLICITUD →",
      sent: "Solicitud enviada correctamente",
      teaserTitle: "Solicitar Investment Teaser",
      enrollTitle: "Solicitar Inscripción",
      contactTitle: "Contactar Advisory",
      applyTitle: "Solicitar Membresía — Inner Circle",
    },
    footer: {
      legal: "© 2026 Calesius Global SL · CIF B56399207 · Todos los derechos reservados",
      loc: "MADRID · LUXEMBURGO · GLOBAL",
    },
    live: "EN VIVO",
  },
  en: {
    nav: ["Observatory", "Intelligence", "Brokerage", "Advisory", "Academia", "Community"],
    hero: {
      tag: "STRATEGIC INTELLIGENCE · INVESTMENT · EXECUTION",
      h1: "Where Geopolitical",
      h2: "Intelligence Generates",
      h3: "Institutional Alpha",
      sub: "ZRC operates at the intersection of macro intelligence, strategic advisory, and deal execution — transforming geopolitical signals into institutional-grade investment decisions.",
      cta1: "ENTER OBSERVATORY",
      cta2: "VIEW OPPORTUNITIES",
      fw: ["OBSERVE", "ANALYZE", "EXECUTE", "EDUCATE", "CONNECT"],
    },
    obs: {
      label: "01 — GEOPOLITICAL OBSERVATORY",
      title: "Real-Time Intelligence Feed",
      sub: "Macro signals filtered through an investment lens. Every signal mapped to portfolio implications.",
      full: "FULL ANALYSIS →",
      share: "SHARE",
      locked: "Register to access full analysis",
    },
    intel: {
      label: "02 — INVESTOR INTELLIGENCE",
      title: "Proprietary Analytical Applications",
      sub: "Tools that transform raw intelligence into actionable investment signals.",
      mlBadge: "MACHINE LEARNING · PROPRIETARY MODELS",
      mlText: "Our screening and forecasting protocols are powered by proprietary machine learning models under continuous development.",
      locked: "Exclusive access for registered members",
    },
    brok: {
      label: "03 — BROKERAGE",
      title: "Singular Opportunities",
      sub: "Curated off-market opportunities. Institutional-grade due diligence.",
      req: "REQUEST TEASER →",
    },
    adv: {
      label: "04 — ADVISORY",
      title: "M&A & Growth Strategy",
      sub: "Institutional advisory for companies navigating complexity.",
    },
    acad: {
      label: "05 — ZENITH ACADEMIA",
      title: "Intelligence-Driven Education",
      sub: "Postgraduate programs taught by practitioners.",
    },
    comm: {
      label: "06 — THE INNER CIRCLE",
      title: "Intelligence Community",
      sub: "Private network of investors, operators, and strategists.",
      applyTitle: "Apply for Membership",
      applyText: "The Inner Circle is invitation-only. Submit your professional background and investment thesis.",
      applyCta: "APPLY NOW →",
    },
    auth: {
      login: "Sign In",
      register: "Create Account",
      name: "Full name",
      email: "Email",
      pass: "Password",
      company: "Company / Institution",
      role: "Position",
      interest: "Primary area of interest",
      submit: "Sign In",
      registerBtn: "Register",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      create: "Create account",
      loginLink: "Sign in",
    },
    form: {
      title: "Request Information",
      name: "Name",
      email: "Email",
      phone: "Phone",
      company: "Company",
      message: "Message",
      send: "SEND REQUEST →",
      sent: "Request sent successfully",
      teaserTitle: "Request Investment Teaser",
      enrollTitle: "Request Enrollment",
      contactTitle: "Contact Advisory",
      applyTitle: "Apply for Membership — Inner Circle",
    },
    footer: {
      legal: "© 2026 Calesius Global SL · CIF B56399207 · All rights reserved",
      loc: "MADRID · LUXEMBOURG · GLOBAL",
    },
    live: "LIVE",
  },
};

const TICKER_DISPLAY = {
  "EUR/USD": "EUR/USD",
  "IBEX 35": "IBEX 35",
  "BRENT crude": "BRENT",
  "WTI crude": "WTI",
  "GOLD (XAU/USD)": "GOLD",
  "BTC/USD": "BTC",
  VIX: "VIX",
  "US 10Y yield": "US 10Y",
  "S&P 500": "S&P 500",
  "DAX 40": "DAX",
  "EUR/GBP": "EUR/GBP",
  "DXY dollar index": "DXY",
  "Natural Gas": "NATGAS",
  Copper: "COPPER",
  "USD/CNY": "USD/CNY",
};

const TICKER_SHOW = [
  "EUR/USD", "IBEX 35", "S&P 500", "BRENT crude", "GOLD (XAU/USD)",
  "BTC/USD", "VIX", "US 10Y yield", "DAX 40", "EUR/GBP",
  "DXY dollar index", "Natural Gas", "Copper", "USD/CNY",
];

const DOLLAR_SYMBOLS = [
  "BRENT crude", "WTI crude", "GOLD (XAU/USD)", "BTC/USD", "Copper", "Natural Gas",
];

const useTickerData = () => {
  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch("/data/headlines.json?v=" + Date.now());
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();

        if (json.market_ticker && Array.isArray(json.market_ticker) && mounted) {
          const mapped = [];
          for (let i = 0; i < TICKER_SHOW.length; i++) {
            const symbol = TICKER_SHOW[i];
            const item = json.market_ticker.find((t) => t.symbol === symbol);
            if (item) {
              let displayVal = item.value;
              if (DOLLAR_SYMBOLS.indexOf(symbol) >= 0) {
                const num = parseFloat(String(item.value).replace(/[,$]/g, ""));
                if (!isNaN(num)) {
                  displayVal = "$" + num.toLocaleString("en-US", {
                    minimumFractionDigits: num >= 1000 ? 0 : 2,
                    maximumFractionDigits: num >= 1000 ? 0 : 2,
                  });
                }
              } else if (symbol === "US 10Y yield") {
                displayVal = String(item.value).indexOf("%") >= 0 ? item.value : item.value + "%";
              }
              mapped.push({
                s: TICKER_DISPLAY[symbol] || symbol,
                v: displayVal,
                c: item.change || "—",
                up: item.up !== false,
                live: true,
              });
            }
          }
          setData(mapped);
          setLastUpdate(json.market_updated_at ? new Date(json.market_updated_at) : new Date());
        }
      } catch (err) {
        console.warn("Ticker fetch failed:", err.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return { data, lastUpdate };
};

const useHeadlines = (fallback) => {
  const [data, setData] = useState(fallback);

  useEffect(() => {
    let mounted = true;
    fetch("/data/headlines.json?v=" + Date.now())
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (mounted && json && Array.isArray(json.headlines) && json.headlines.length > 0) {
          setData(json.headlines);
        }
      })
      .catch((err) => console.warn("Headlines fetch failed:", err.message));
    return () => { mounted = false; };
  }, []);

  return data;
};

const FEED = [
  {
    id: 1, tag: "CRITICAL", region: "MENA",
    title: { es: "Disrupción en corredor del Mar Rojo — fletes +340% YTD", en: "Red Sea corridor disruption — freight rates +340% YTD" },
    time: "2h", impact: "high", confidence: 92,
    summary: {
      es: "Escalada Houtí fuerza redireccionamiento vía Cabo de Buena Esperanza. Impacto directo en costes de importación europeos, logística energética y primas de seguro en rutas comerciales mediterráneas.",
      en: "Houthi escalation forces rerouting via Cape of Good Hope. Direct impact on European import costs, energy logistics, and insurance premiums across Mediterranean trade routes.",
    },
    signals: ["OIL +", "SHIPPING +", "EUR -"],
  },
  {
    id: 2, tag: "MONITOR", region: "EU",
    title: { es: "BCE señala divergencia de tipos frente a la Fed", en: "ECB signals rate path divergence from Fed" },
    time: "4h", impact: "medium", confidence: 78,
    summary: {
      es: "Última orientación de Lagarde sugiere 2-3 recortes en 2026 mientras la Fed mantiene. Ventanas de arbitraje cambiario para M&A cross-border.",
      en: "Lagarde's guidance suggests 2-3 cuts in 2026 while Fed holds. Currency arbitrage windows opening for cross-border M&A.",
    },
    signals: ["EUR/USD -", "BONDS +", "EQUITIES ?"],
  },
  {
    id: 3, tag: "EMERGING", region: "LATAM",
    title: { es: "Reformas de Milei desbloquean pipeline de IED por $12B", en: "Milei reforms unlock $12B in frozen FDI pipeline" },
    time: "6h", impact: "high", confidence: 85,
    summary: {
      es: "Paquete de desregulación aprobado en Senado. Minería, agritech y energía posicionados para first-mover. ZRC monitorizando 4 mandatos activos.",
      en: "Deregulation package clears Senate. Mining, agritech, and energy positioned for first-mover advantage. ZRC tracking 4 live mandates.",
    },
    signals: ["ARS +", "MINING +", "AGRI +"],
  },
  {
    id: 4, tag: "STRATEGIC", region: "APAC",
    title: { es: "Retrasos fab TSMC Arizona — tesis semiconductores", en: "TSMC Arizona fab delays reshape semiconductor thesis" },
    time: "8h", impact: "medium", confidence: 71,
    summary: {
      es: "Timeline producción desplazado a Q3 2027. Soberanía europea de chips se fortalece.",
      en: "Production timeline pushed to Q3 2027. European chip sovereignty narrative strengthens.",
    },
    signals: ["SEMIS -", "EU TECH +"],
  },
  {
    id: 5, tag: "ALERT", region: "AFRICA",
    title: { es: "Gasoducto Morocco-Nigeria: €4.2B en financiación", en: "Morocco-Nigeria gas pipeline secures €4.2B financing" },
    time: "12h", impact: "high", confidence: 88,
    summary: {
      es: "Consorcio AfDB y fondos soberanos cierran financiación. Transforma infraestructura energética de África Occidental.",
      en: "AfDB and sovereign wealth consortium close financing. Transforms West African energy infrastructure.",
    },
    signals: ["ENERGY +", "INFRA +", "NGN +"],
  },
];

const OPS = [
  { id: 1, type: "REAL ESTATE", name: "Automotive Platform Madrid", loc: "Chamberí, Madrid", size: "320m² · Active License", yield: "5.2%", status: "EXCLUSIVE", price: "€8.2M" },
  { id: 2, type: "AGRI-LAND", name: "Finca Cabrerizas", loc: "Vilches, Jaén", size: "337 hectares", yield: "Agri + Dev", status: "EXCLUSIVE", price: "€2.8M" },
  { id: 3, type: "RESIDENTIAL", name: "Edificio Salamanca", loc: "Barrio de Salamanca, Madrid", size: "2,042m² · 12 units", yield: "6.5% net", status: "ADVISORY", price: "€11.6M" },
];

const TOOLS = [
  {
    name: "GeoRisk Dashboard",
    desc: { es: "Scoring de riesgo geopolítico en tiempo real con sliders de escenario.", en: "Real-time geopolitical risk scoring with scenario sliders." },
    icon: "◈", status: "LIVE", ml: true,
  },
  {
    name: "Real Estate Visor",
    desc: { es: "Visor inmobiliario con catastro, capas de riesgo, planeamiento y matching de mandatos ZRC.", en: "Real estate visor with cadastre, risk layers, planning and ZRC mandate matching." },
    icon: "◇", status: "BETA", ml: false,
  },
  {
    name: "Financial Intelligence System",
    desc: {
      es: "Motor de inteligencia financiera para PYMEs familiares: cash flow 13 semanas, capital circulante, motor de riesgos e informe semanal generado por IA.",
      en: "Financial intelligence engine for family-owned SMEs: 13-week cash flow, working capital optimizer, risk engine and AI-generated board report.",
    },
    icon: "◆", status: "LIVE", ml: true,
  },
  {
    name: "Valuation Engine",
    desc: { es: "DCF automatizado, múltiplos y valoración normalizada para PYMEs.", en: "Automated DCF, multiples, and normalized valuation for SMEs." },
    icon: "◇", status: "BETA", ml: true,
  },
  {
    name: "Deal Flow Radar",
    desc: { es: "Pipeline ML-enhanced identificando empresas sub-optimizadas en Europa del Sur.", en: "ML-enhanced pipeline identifying sub-optimized companies across Southern Europe." },
    icon: "◆", status: "LIVE", ml: true,
  },
  {
    name: "Macro Pulse",
    desc: { es: "Tracker de señales de bancos centrales con NLP.", en: "Central bank signal tracker with NLP analysis." },
    icon: "○", status: "Q3 2026", ml: true,
  },
];

const SERVICES = [
  {
    title: "M&A Advisory",
    desc: { es: "Soporte transaccional end-to-end. Especializado en mid-market cross-border en Europa del Sur.", en: "End-to-end transaction support. Specialized in cross-border mid-market deals across Southern Europe." },
    metric: "€50M+",
  },
  {
    title: "Growth Advisory",
    desc: { es: "Consultoría estratégica para empresas en puntos de inflexión. Framework cuantitativo.", en: "Strategic consulting for companies at inflection points. Quantitative framework." },
    metric: "12 mandates",
  },
  {
    title: "Capital Raising",
    desc: { es: "Soluciones de capital estructurado conectando empresas con inversores institucionales.", en: "Structured capital solutions connecting companies with institutional investors." },
    metric: "3 sectors",
  },
];

const COURSES = [
  { id: 1, title: { es: "Riesgo Geopolítico y Estrategia de Inversión", en: "Geopolitical Risk & Investment Strategy" }, mod: 12, hrs: 24, level: "Advanced", status: "ENROLLING" },
  { id: 2, title: { es: "Masterclass de Valoración Corporativa", en: "Corporate Valuation Masterclass" }, mod: 8, hrs: 16, level: "Intermediate", status: "ENROLLING" },
  { id: 3, title: { es: "M&A: De la LOI al Cierre", en: "M&A Execution: From LOI to Close" }, mod: 10, hrs: 20, level: "Advanced", status: "COMING" },
  { id: 4, title: { es: "Macro y Estrategia de Bancos Centrales", en: "Macro & Central Bank Strategy" }, mod: 6, hrs: 12, level: "Intermediate", status: "COMING" },
];

const THREADS = [
  { id: 1, author: "L. Gómez Elvira", role: "Founder & CIO", title: { es: "Por qué el Mar Rojo es un evento de reasignación de €200B", en: "Why the Red Sea is a €200B reallocation event" }, replies: 34, views: 1247 },
  { id: 2, author: "Guest Analyst", role: "Macro Strategist", title: { es: "Divergencia BCE: posicionamiento para carry trades EUR", en: "ECB divergence: positioning for EUR carry trades" }, replies: 18, views: 892 },
  { id: 3, author: "ZRC Research", role: "Observatorio", title: { es: "Briefing Semanal #47: Desregulación LATAM", en: "Weekly Briefing #47: LATAM deregulation wave" }, replies: 22, views: 1560 },
];

const useInView = (th = 0.12) => {
  const r = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: th });
    if (r.current) o.observe(r.current);
    return () => o.disconnect();
  }, [th]);
  return [r, v];
};

const FadeIn = ({ children, delay = 0, style = {} }) => {
  const [r, v] = useInView();
  return (
    <div ref={r} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(20px)", transition: `all 0.6s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
};

const Badge = ({ label, variant }) => {
  const m = {
    critical:  { bg: "rgba(239,68,68,0.12)",   c: C.red,   b: "rgba(239,68,68,0.25)" },
    monitor:   { bg: "rgba(59,130,246,0.12)",   c: C.blue,  b: "rgba(59,130,246,0.25)" },
    emerging:  { bg: "rgba(34,197,94,0.12)",    c: C.green, b: "rgba(34,197,94,0.25)" },
    strategic: { bg: C.goldDim,                 c: C.gold,  b: C.goldBorder },
    alert:     { bg: "rgba(239,68,68,0.18)",    c: C.red,   b: "rgba(239,68,68,0.35)" },
    exclusive: { bg: C.goldDim,                 c: C.gold,  b: C.goldBorder },
    mandate:   { bg: "rgba(59,130,246,0.12)",   c: C.blue,  b: "rgba(59,130,246,0.25)" },
    advisory:  { bg: "rgba(34,197,94,0.12)",    c: C.green, b: "rgba(34,197,94,0.25)" },
    live:      { bg: "rgba(34,197,94,0.12)",    c: C.green, b: "rgba(34,197,94,0.25)" },
    beta:      { bg: "rgba(245,158,11,0.12)",   c: C.amber, b: "rgba(245,158,11,0.25)" },
    ml:        { bg: "rgba(139,92,246,0.12)",   c: "#A78BFA", b: "rgba(139,92,246,0.25)" },
  };
  const s = m[(variant || label || "").toLowerCase()] || m.strategic;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", fontSize: 9, fontFamily: F.mono, fontWeight: 600, letterSpacing: "0.12em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, lineHeight: 1.6 }}>
      {label}
    </span>
  );
};

const GoldDivider = () => (
  <div style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${C.goldBorder} 30%, ${C.gold}44 50%, ${C.goldBorder} 70%, transparent 100%)` }} />
);

const Sec = ({ id, children }) => (
  <section id={id} style={{ padding: "clamp(60px,10vw,120px) clamp(16px,4vw,48px)", maxWidth: 1100, margin: "0 auto" }}>
    {children}
  </section>
);

const SH = ({ label, title, sub, extra }) => (
  <FadeIn style={{ marginBottom: 44 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.gold, letterSpacing: "0.18em", fontWeight: 500 }}>{label}</span>
      {extra}
    </div>
    <h2 style={{ fontFamily: F.display, fontSize: "clamp(28px,4vw,42px)", fontWeight: 300, color: C.text, margin: 0, lineHeight: 1.15 }}>{title}</h2>
    {sub && <p style={{ fontFamily: F.body, fontSize: 15, color: C.textSec, marginTop: 12, maxWidth: 640, lineHeight: 1.65, fontWeight: 300 }}>{sub}</p>}
  </FadeIn>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto", position: "relative" }}>
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 400, color: C.text, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: "24px 28px" }}>{children}</div>
      </div>
    </div>
  );
};

const FormInput = ({ label, type = "text", value, onChange, required = true }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
      {label}{required && " *"}
    </label>
    {type === "textarea" ? (
      <textarea value={value} onChange={onChange} rows={4} style={{ width: "100%", padding: "10px 14px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: F.body, fontSize: 14, resize: "vertical", outline: "none" }} />
    ) : type === "select" ? (
      <select value={value} onChange={onChange} style={{ width: "100%", padding: "10px 14px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: F.body, fontSize: 14, outline: "none" }}>
        <option value="">—</option>
        <option value="geopolitics">Geopolitical Intelligence</option>
        <option value="brokerage">Brokerage / Investment</option>
        <option value="advisory">M&A / Advisory</option>
        <option value="academia">Academia / Education</option>
        <option value="community">Community / Networking</option>
      </select>
    ) : (
      <input type={type} value={value} onChange={onChange} style={{ width: "100%", padding: "10px 14px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: F.body, fontSize: 14, outline: "none" }} />
    )}
  </div>
);

const ContactForm = ({ context, onClose, lang }) => {
  const t = T[lang].form;
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    try {
      const res = await fetch("https://zrc-api.onrender.com/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contact", ...form, context }),
      });
      if (res.ok) setSent(true);
    } catch (err) {
      console.error("Submit error:", err);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>✓</div>
        <h3 style={{ fontFamily: F.display, fontSize: 22, color: C.gold, marginBottom: 8 }}>{t.sent}</h3>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSec }}>{lang === "es" ? "Nuestro equipo se pondrá en contacto en las próximas 24h." : "Our team will reach out within 24h."}</p>
        <button onClick={onClose} style={{ marginTop: 24, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", padding: "10px 24px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>OK</button>
      </div>
    );
  }

  return (
    <div>
      {context && <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", marginBottom: 16, padding: "8px 12px", background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>{context}</div>}
      <FormInput label={t.name} value={form.name} onChange={set("name")} />
      <FormInput label={t.email} type="email" value={form.email} onChange={set("email")} />
      <FormInput label={t.phone} value={form.phone} onChange={set("phone")} required={false} />
      <FormInput label={t.company} value={form.company} onChange={set("company")} />
      <FormInput label={t.message} type="textarea" value={form.message} onChange={set("message")} required={false} />
      <button onClick={handleSubmit} style={{ width: "100%", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.12em", padding: "13px 24px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600, marginTop: 8 }}>{t.send}</button>
    </div>
  );
};

const AuthModal = () => {
  const { authMode, setAuthMode, login, setShowAuth } = useAuth();
  const [lang] = useState("es");
  const t = T[lang].auth;
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", role: "", interest: "" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) return;
    login({ name: form.name || form.email.split("@")[0], email: form.email, tier: "member" });
    try {
      await fetch("https://zrc-api.onrender.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, company: form.company, role: form.role, interest: form.interest }),
      });
    } catch (err) { console.error("Reg error:", err); }
  };

  return (
    <Modal open={true} onClose={() => setShowAuth(false)} title={authMode === "login" ? t.login : t.register}>
      {authMode === "register" && <FormInput label={t.name} value={form.name} onChange={set("name")} />}
      <FormInput label={t.email} type="email" value={form.email} onChange={set("email")} />
      <FormInput label={t.pass} type="password" value={form.password} onChange={set("password")} />
      {authMode === "register" && (
        <>
          <FormInput label={t.company} value={form.company} onChange={set("company")} required={false} />
          <FormInput label={t.role} value={form.role} onChange={set("role")} required={false} />
          <FormInput label={t.interest} type="select" value={form.interest} onChange={set("interest")} required={false} />
        </>
      )}
      <button onClick={handleSubmit} style={{ width: "100%", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.12em", padding: "13px 24px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600, marginTop: 8 }}>
        {authMode === "login" ? t.submit : t.registerBtn}
      </button>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted }}>{authMode === "login" ? t.noAccount : t.hasAccount} </span>
        <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ background: "none", border: "none", color: C.gold, fontFamily: F.body, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
          {authMode === "login" ? t.create : t.loginLink}
        </button>
      </div>
    </Modal>
  );
};

const LockedOverlay = ({ message, lang }) => {
  const { openRegister } = useAuth();
  return (
    <div style={{ padding: "32px 24px", background: `linear-gradient(180deg, transparent, ${C.bg})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔒</div>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, textAlign: "center" }}>{message}</p>
      <button onClick={openRegister} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
        {lang === "es" ? "CREAR CUENTA GRATUITA →" : "CREATE FREE ACCOUNT →"}
      </button>
    </div>
  );
};

const MarketTicker = ({ lang }) => {
  const { data, lastUpdate } = useTickerData();

  if (data.length === 0) {
    return (
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>LOADING MARKET DATA…</span>
      </div>
    );
  }

  const doubled = [...data, ...data];

  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, overflow: "hidden", position: "relative", height: 36 }}>
      <div style={{ display: "flex", alignItems: "center", position: "absolute", whiteSpace: "nowrap", animation: "tickerScroll 60s linear infinite" }}>
        {doubled.map((m, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 24px", height: 36 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.05em" }}>{m.s}</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.text, fontWeight: 500 }}>{m.v}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: m.up ? C.green : C.red, fontWeight: 500 }}>{m.c}</span>
            <span style={{ width: 1, height: 12, background: C.border }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 100, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, background: `linear-gradient(90deg, transparent, ${C.surface} 40%)`, zIndex: 2 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: lastUpdate ? C.green : C.amber, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: F.mono, fontSize: 9, color: lastUpdate ? C.green : C.amber, letterSpacing: "0.1em" }}>{T[lang].live}</span>
        </span>
      </div>
    </div>
  );
};

const Nav = ({ lang, setLang, onNav }) => {
  const { user, openLogin, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const ids = ["observatory", "intelligence", "brokerage", "advisory", "academia", "community"];

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(9,9,11,0.92)" : "transparent", backdropFilter: scrolled ? "blur(24px)" : "none", borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent", transition: "all 0.5s" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56, padding: "0 clamp(16px,3vw,32px)" }}>
        <div onClick={() => onNav("hero")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, border: `1.5px solid ${C.gold}`, transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 6, height: 6, background: C.gold, transform: "rotate(-45deg)" }} />
          </div>
          <span style={{ fontFamily: F.display, fontSize: 15, color: C.text, fontWeight: 400, letterSpacing: "0.12em" }}>ZRC</span>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", overflowX: "auto" }}>
          {T[lang].nav.map((label, i) => (
            <button key={ids[i]} onClick={() => onNav(ids[i])}
              style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: "0.08em", color: C.textMuted, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "4px 0", transition: "color 0.3s" }}
              onMouseEnter={(e) => { e.target.style.color = C.gold; }}
              onMouseLeave={(e) => { e.target.style.color = C.textMuted; }}
            >
              {label.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setLang(lang === "es" ? "en" : "es")} style={{ fontFamily: F.mono, fontSize: 9, padding: "3px 10px", background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", fontWeight: 600 }}>
            {lang === "es" ? "EN" : "ES"}
          </button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold }}>{user.name}</span>
              <button onClick={logout} style={{ fontFamily: F.mono, fontSize: 8, padding: "2px 8px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={openLogin} style={{ fontFamily: F.mono, fontSize: 9, padding: "4px 12px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>LOGIN</button>
          )}
        </div>
      </div>
    </nav>
  );
};

const Hero = ({ lang, onNav }) => {
  const t = T[lang].hero;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="hero"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        padding: "80px clamp(16px,4vw,48px) 60px",
        background: "#09090B",
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 12% 72%, rgba(11,31,63,0.9) 0%, transparent 58%),
          radial-gradient(ellipse 55% 50% at 82% 78%, rgba(11,31,63,0.95) 0%, transparent 52%),
          radial-gradient(ellipse 40% 35% at 50% 92%, rgba(11,31,63,0.8) 0%, transparent 48%),
          radial-gradient(ellipse 100% 45% at 50% 115%, rgba(6,9,18,1) 0%, transparent 55%)
        `,
      }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g fill="#D4A853">
          <circle cx="780" cy="260" r="2"/><circle cx="800" cy="255" r="2"/><circle cx="820" cy="260" r="2"/>
          <circle cx="840" cy="265" r="2"/><circle cx="830" cy="275" r="2"/><circle cx="810" cy="280" r="2"/>
          <circle cx="790" cy="278" r="2"/><circle cx="770" cy="270" r="2"/><circle cx="760" cy="260" r="2"/>
          <circle cx="850" cy="258" r="2"/><circle cx="860" cy="268" r="2"/><circle cx="855" cy="280" r="2"/>
          <circle cx="760" cy="288" r="2"/><circle cx="775" cy="295" r="2"/><circle cx="795" cy="290" r="2"/>
          <circle cx="760" cy="310" r="2"/><circle cx="780" cy="308" r="2"/><circle cx="800" cy="306" r="2"/>
          <circle cx="820" cy="308" r="2"/><circle cx="840" cy="310" r="2"/><circle cx="860" cy="312" r="2"/>
          <circle cx="880" cy="315" r="2"/><circle cx="770" cy="325" r="2"/><circle cx="790" cy="320" r="2"/>
          <circle cx="810" cy="318" r="2"/><circle cx="830" cy="322" r="2"/><circle cx="850" cy="326" r="2"/>
          <circle cx="900" cy="318" r="2"/><circle cx="920" cy="322" r="2"/><circle cx="940" cy="328" r="2"/>
          <circle cx="900" cy="255" r="2"/><circle cx="920" cy="250" r="2"/><circle cx="940" cy="248" r="2"/>
          <circle cx="960" cy="252" r="2"/><circle cx="980" cy="258" r="2"/><circle cx="1000" cy="260" r="2"/>
          <circle cx="910" cy="268" r="2"/><circle cx="930" cy="265" r="2"/><circle cx="950" cy="262" r="2"/>
          <circle cx="970" cy="268" r="2"/><circle cx="990" cy="272" r="2"/><circle cx="1010" cy="270" r="2"/>
          <circle cx="1020" cy="258" r="2"/><circle cx="1030" cy="265" r="2"/><circle cx="1040" cy="272" r="2"/>
          <circle cx="1050" cy="260" r="2"/><circle cx="1060" cy="268" r="2"/>
          <circle cx="380" cy="240" r="2"/><circle cx="400" cy="245" r="2"/><circle cx="420" cy="248" r="2"/>
          <circle cx="440" cy="242" r="2"/><circle cx="460" cy="248" r="2"/><circle cx="390" cy="260" r="2"/>
          <circle cx="410" cy="258" r="2"/><circle cx="430" cy="262" r="2"/><circle cx="450" cy="265" r="2"/>
          <circle cx="420" cy="278" r="2"/><circle cx="440" cy="275" r="2"/><circle cx="460" cy="278" r="2"/>
          <circle cx="480" cy="270" r="2"/><circle cx="500" cy="262" r="2"/>
          <circle cx="440" cy="360" r="2"/><circle cx="460" cy="355" r="2"/><circle cx="480" cy="360" r="2"/>
          <circle cx="450" cy="375" r="2"/><circle cx="470" cy="370" r="2"/><circle cx="490" cy="365" r="2"/>
          <circle cx="455" cy="390" r="2"/><circle cx="475" cy="385" r="2"/><circle cx="460" cy="405" r="2"/>
          <circle cx="470" cy="420" r="2"/><circle cx="455" cy="435" r="2"/>
        </g>
      </svg>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.1 }} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#D4A853" strokeWidth="0.8">
          <circle cx="800" cy="430" r="180"/><circle cx="800" cy="430" r="290"/>
          <circle cx="800" cy="430" r="410"/><circle cx="800" cy="430" r="550"/>
        </g>
        <g fill="none" stroke="#D4A853" strokeWidth="0.4" opacity="0.5">
          <line x1="800" y1="60" x2="800" y2="870"/>
          <line x1="180" y1="430" x2="1420" y2="430"/>
        </g>
        <g transform="translate(155,155)">
          <circle cx="0" cy="0" r="30" fill="none" stroke="#D4A853" strokeWidth="0.8"/>
          <polygon points="0,-24 4,-8 0,-4 -4,-8" fill="#D4A853" opacity="0.7"/>
          <polygon points="0,24 4,8 0,4 -4,8" fill="#D4A853" opacity="0.3"/>
          <line x1="-24" y1="0" x2="24" y2="0" stroke="#D4A853" strokeWidth="0.8"/>
          <text x="0" y="-34" textAnchor="middle" fontFamily="serif" fontSize="10" fill="#D4A853" opacity="0.7">N</text>
          <text x="0"  y="44"  textAnchor="middle" fontFamily="serif" fontSize="10" fill="#D4A853" opacity="0.4">S</text>
          <text x="-38" y="4"  textAnchor="middle" fontFamily="serif" fontSize="10" fill="#D4A853" opacity="0.4">W</text>
          <text x="38"  y="4"  textAnchor="middle" fontFamily="serif" fontSize="10" fill="#D4A853" opacity="0.4">E</text>
        </g>
      </svg>
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "65%", opacity: 0.5 }} viewBox="0 0 1600 580" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="mtnA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2d52" stopOpacity="0.85"/>
            <stop offset="100%" stopColor="#0B1F3F" stopOpacity="0.5"/>
          </linearGradient>
          <linearGradient id="mtnB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1a30" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#060912" stopOpacity="0.8"/>
          </linearGradient>
        </defs>
        <path d="M -50 580 Q 0 400 100 420 Q 200 440 280 380 Q 350 320 420 360 Q 490 400 550 580 Z" fill="url(#mtnA)"/>
        <path d="M 1050 580 Q 1150 480 1250 510 Q 1350 540 1450 470 Q 1530 410 1650 580 Z" fill="url(#mtnA)"/>
        <path d="M -50 580 Q 50 500 150 520 Q 250 540 350 480 Q 430 420 480 440 Q 540 460 600 580 Z" fill="url(#mtnB)"/>
        <path d="M 1000 580 Q 1100 520 1200 540 Q 1300 560 1400 500 Q 1480 450 1650 580 Z" fill="url(#mtnB)"/>
        <path d="M -20 580 Q 80 540 130 558 L 162 538 Q 202 518 242 533 Q 282 550 320 580 Z" fill="#0B1F3F" opacity="0.9"/>
        <path d="M 1280 580 Q 1360 552 1402 563 Q 1442 543 1484 554 L 1524 580 Z" fill="#0B1F3F" opacity="0.9"/>
      </svg>
      <svg style={{ position: "absolute", right: 0, top: 0, width: "44%", height: "100%", opacity: 0.5 }} viewBox="0 0 700 900" preserveAspectRatio="xMaxYMid meet">
        <defs>
          <radialGradient id="nd">
            <stop offset="0%"   stopColor="#D4A853" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#D4A853" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <g stroke="#D4A853" strokeWidth="0.8" fill="none" opacity="0.45">
          <line x1="580" y1="275" x2="478" y2="418"/>
          <line x1="478" y1="418" x2="582" y2="558"/>
          <line x1="580" y1="275" x2="622" y2="418"/>
          <line x1="622" y1="418" x2="582" y2="558"/>
          <line x1="478" y1="418" x2="622" y2="418"/>
          <line x1="582" y1="558" x2="500" y2="678"/>
          <line x1="580" y1="275" x2="502" y2="178"/>
          <line x1="382" y1="338" x2="478" y2="418"/>
          <line x1="382" y1="498" x2="478" y2="418"/>
          <line x1="382" y1="338" x2="382" y2="498"/>
        </g>
        <circle cx="580" cy="275" r="14" fill="url(#nd)"/><circle cx="580" cy="275" r="4.5" fill="#D4A853" opacity="0.9"/>
        <circle cx="478" cy="418" r="14" fill="url(#nd)"/><circle cx="478" cy="418" r="4.5" fill="#D4A853" opacity="0.9"/>
        <circle cx="622" cy="418" r="11" fill="url(#nd)"/><circle cx="622" cy="418" r="3.5" fill="#D4A853" opacity="0.8"/>
        <circle cx="582" cy="558" r="16" fill="url(#nd)"/><circle cx="582" cy="558" r="5"   fill="#D4A853"/>
        <circle cx="500" cy="678" r="11" fill="url(#nd)"/><circle cx="500" cy="678" r="3.5" fill="#D4A853" opacity="0.7"/>
        <circle cx="502" cy="178" r="10" fill="url(#nd)"/><circle cx="502" cy="178" r="3"   fill="#D4A853" opacity="0.6"/>
        <circle cx="382" cy="338" r="10" fill="url(#nd)"/><circle cx="382" cy="338" r="3"   fill="#D4A853" opacity="0.65"/>
        <circle cx="382" cy="498" r="10" fill="url(#nd)"/><circle cx="382" cy="498" r="3"   fill="#D4A853" opacity="0.65"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(6,9,18,0.78) 0%, rgba(6,9,18,0.65) 45%, rgba(6,9,18,0.82) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.04, mixBlendMode: "overlay", pointerEvents: "none", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 860, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(30px)", transition: "all 1.2s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.35em", marginBottom: 40, fontWeight: 400, opacity: 0.9 }}>{t.tag}</div>
        <h1 style={{ fontFamily: F.display, fontSize: "clamp(36px,5.5vw,68px)", fontWeight: 300, color: C.text, margin: 0, lineHeight: 1.08, letterSpacing: "-0.02em" }}>
          {t.h1}<br />{t.h2}<br /><span style={{ color: C.gold, fontStyle: "italic", fontWeight: 400 }}>{t.h3}</span>
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 16, color: C.textSec, maxWidth: 540, margin: "36px auto 0", lineHeight: 1.7, fontWeight: 300 }}>{t.sub}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
          <button onClick={() => onNav("observatory")} style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.12em", padding: "13px 28px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>{t.cta1} {"→"}</button>
          <button onClick={() => onNav("brokerage")} style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.12em", padding: "13px 28px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", fontWeight: 500 }}>{t.cta2}</button>
        </div>
        <div style={{ marginTop: 72, display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap", alignItems: "center" }}>
          {t.fw.map((step, i) => {
            const targets = ["observatory", "intelligence", "brokerage", "academia", "community"];
            return (
              <div key={step} style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => onNav(targets[i])} style={{ padding: "6px 16px", border: `1px solid ${i === 0 ? C.gold : C.border}`, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.15em", color: i === 0 ? C.gold : C.textMuted, background: i === 0 ? C.goldDim : "transparent", cursor: "pointer" }}>{step}</button>
                {i < 4 && <span style={{ fontFamily: F.mono, color: C.textMuted, margin: "0 2px", fontSize: 10, opacity: 0.5 }}>{"→"}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const Observatory = ({ lang }) => {
  const t = T[lang].obs;
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const regions = ["ALL", "MENA", "EU", "LATAM", "APAC", "AFRICA"];
  const feed = useHeadlines(FEED);
  const filtered = filter === "ALL" ? feed : feed.filter((f) => f.region === filter);

  return (
    <Sec id="observatory">
      <SH label={t.label} title={t.title} sub={t.sub} extra={<span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>({FEED.length})</span>} />
      <FadeIn delay={0.1}>
        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {regions.map((r) => (
            <button key={r} onClick={() => setFilter(r)} style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "5px 14px", background: filter === r ? C.goldDim : "transparent", color: filter === r ? C.gold : C.textMuted, border: `1px solid ${filter === r ? C.goldBorder : C.border}`, cursor: "pointer" }}>{r}</button>
          ))}
        </div>
      </FadeIn>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {filtered.map((item, i) => (
          <FadeIn key={item.id} delay={i * 0.04}>
            <div onClick={() => setExpanded(expanded === item.id ? null : item.id)} style={{ padding: "18px 22px", background: expanded === item.id ? C.surface2 : C.surface, border: `1px solid ${expanded === item.id ? C.goldBorder : C.border}`, cursor: "pointer", transition: "all 0.3s" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Badge label={item.tag} variant={item.tag.toLowerCase()} />
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{item.region} {"·"} {item.time}</span>
                  </div>
                  <h3 style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.text, margin: 0, lineHeight: 1.45 }}>{item.title[lang]}</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 40, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${item.confidence}%`, height: "100%", background: item.confidence > 80 ? C.green : item.confidence > 60 ? C.amber : C.red, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{item.confidence}%</span>
                </div>
              </div>
              {expanded === item.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {user ? (
                    <>
                      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.65, margin: "0 0 14px", fontWeight: 300 }}>{item.summary[lang]}</p>
                      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                        {item.signals.map((s, j) => (
                          <span key={j} style={{ fontFamily: F.mono, fontSize: 9, padding: "2px 8px", background: s.includes("+") ? "rgba(34,197,94,0.08)" : s.includes("-") ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.08)", color: s.includes("+") ? C.green : s.includes("-") ? C.red : C.blue, border: `1px solid ${s.includes("+") ? "rgba(34,197,94,0.2)" : s.includes("-") ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}`, letterSpacing: "0.05em" }}>{s}</span>
                        ))}
                      </div>
                      {item.source && (
                        <div style={{ marginTop: 6, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>
                            {lang === "es" ? "FUENTE" : "SOURCE"}
                          </span>
                          {item.source_url ? (
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, textDecoration: "none", borderBottom: `1px solid ${C.goldBorder}`, paddingBottom: 1 }}>
                              {item.source} →
                            </a>
                          ) : (
                            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.gold }}>{item.source}</span>
                          )}
                          {item.published_at && (
                            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>
                              · {item.published_at}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <LockedOverlay message={t.locked} lang={lang} />
                  )}
                </div>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </Sec>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// INTELLIGENCE — includes Financial Intelligence System
// ══════════════════════════════════════════════════════════════════════════
const Intelligence = ({ lang }) => {
  const t = T[lang].intel;
  const { user } = useAuth();
  const [showGeoRisk, setShowGeoRisk] = useState(false);
  const [showVisor, setShowVisor] = useState(false);
  const [showFIS, setShowFIS] = useState(false);

  return (
    <Sec id="intelligence">
      <SH label={t.label} title={t.title} sub={t.sub} />

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
            <div style={{ padding: 28, background: C.surface, border: `1px solid ${C.border}`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
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
              {user ? (
                <button
                  onClick={() => {
                    if (tool.name === "GeoRisk Dashboard") setShowGeoRisk(true);
                    if (tool.name === "Real Estate Visor") setShowVisor(true);
                    if (tool.name === "Financial Intelligence System") setShowFIS(true);
                  }}
                  style={{ marginTop: 20, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "7px 16px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", alignSelf: "flex-start" }}
                >
                  {tool.status === "LIVE" ? "LAUNCH →" : tool.status === "BETA" ? "REQUEST ACCESS" : "NOTIFY ME"}
                </button>
              ) : (
                <div style={{ marginTop: 20, padding: "12px 16px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, textAlign: "center" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.1em" }}>🔒 {t.locked}</span>
                </div>
              )}
            </div>
          </FadeIn>
        ))}
      </div>

      {!user && <FadeIn delay={0.3}><LockedOverlay message={t.locked} lang={lang} /></FadeIn>}

      {/* GeoRisk Dashboard overlay */}
      {showGeoRisk && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <button onClick={() => setShowGeoRisk(false)} style={{ position: "fixed", top: 16, right: 24, zIndex: 301, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
            ✕ CLOSE DASHBOARD
          </button>
          <GeoRiskDashboard />
        </div>
      )}

      {/* Real Estate Visor overlay */}
      {showVisor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <button onClick={() => setShowVisor(false)} style={{ position: "fixed", top: 16, right: 24, zIndex: 301, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
            ✕ CLOSE VISOR
          </button>
          <RealEstateVisor />
        </div>
      )}

      {/* Financial Intelligence System overlay */}
      {showFIS && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <FinancialIntelligenceSystem onClose={() => setShowFIS(false)} />
        </div>
      )}
    </Sec>
  );
};

const Brokerage = ({ lang }) => {
  const t = T[lang].brok;
  const { requireAuth } = useAuth();
  const [modal, setModal] = useState(null);
  const [formContext, setFormContext] = useState("");

  const openTeaser = (op) => {
    requireAuth(() => {
      setFormContext(`${T[lang].form.teaserTitle}: ${op.name}`);
      setModal("teaser");
    });
  };

  return (
    <Sec id="brokerage">
      <SH label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {OPS.map((op, i) => (
          <FadeIn key={op.id} delay={i * 0.08}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "14px 20px", background: C.surface2, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>{op.type}</span>
                <Badge label={op.status} variant={op.status.toLowerCase()} />
              </div>
              <div style={{ padding: "20px", flex: 1 }}>
                <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 400, color: C.text, margin: "0 0 6px" }}>{op.name}</h3>
                <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, margin: "0 0 16px", letterSpacing: "0.05em" }}>{op.loc}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[["SIZE", op.size], ["YIELD", op.yield]].map(([k, v]) => (
                    <div key={k} style={{ padding: "10px 14px", background: C.surface2, border: `1px solid ${C.border}` }}>
                      <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: F.display, fontSize: 22, color: C.gold, marginBottom: 16 }}>{op.price}</div>
              </div>
              <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => openTeaser(op)} style={{ width: "100%", fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "9px 16px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer" }}>{t.req}</button>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
      <Modal open={modal === "teaser"} onClose={() => setModal(null)} title={T[lang].form.teaserTitle}>
        <ContactForm context={formContext} onClose={() => setModal(null)} lang={lang} />
      </Modal>
    </Sec>
  );
};

const Advisory = ({ lang }) => {
  const t = T[lang].adv;
  const [modal, setModal] = useState(false);

  return (
    <Sec id="advisory">
      <SH label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1 }}>
        {SERVICES.map((s, i) => (
          <FadeIn key={i} delay={i * 0.08}>
            <div style={{ padding: "28px 24px", background: C.surface, border: `1px solid ${C.border}`, position: "relative" }}>
              <div style={{ fontFamily: F.display, fontSize: 28, color: C.gold, opacity: 0.4, marginBottom: 12 }}>{s.metric}</div>
              <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 400, color: C.text, margin: "0 0 10px" }}>{s.title}</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, fontWeight: 300 }}>{s.desc[lang]}</p>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn delay={0.2}>
        <div style={{ marginTop: 32, padding: "24px", background: C.surface, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", marginBottom: 4 }}>MANDATE INQUIRY</div>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, margin: 0 }}>{lang === "es" ? "Consulta de mandato confidencial. Respuesta en 48h." : "Confidential mandate inquiry. Response within 48h."}</p>
          </div>
          <button onClick={() => setModal(true)} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", padding: "10px 24px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
            {lang === "es" ? "CONSULTAR →" : "INQUIRE →"}
          </button>
        </div>
      </FadeIn>
      <Modal open={modal} onClose={() => setModal(false)} title={T[lang].form.contactTitle}>
        <ContactForm context="Advisory Mandate" onClose={() => setModal(false)} lang={lang} />
      </Modal>
    </Sec>
  );
};

const Academia = ({ lang }) => {
  const t = T[lang].acad;
  const { requireAuth } = useAuth();
  const [modal, setModal] = useState(null);
  const [formContext, setFormContext] = useState("");

  const openEnroll = (course) => {
    requireAuth(() => {
      setFormContext(`${T[lang].form.enrollTitle}: ${course.title[lang]}`);
      setModal("enroll");
    });
  };

  return (
    <Sec id="academia">
      <SH label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1 }}>
        {COURSES.map((c, i) => (
          <FadeIn key={c.id} delay={i * 0.06}>
            <div style={{ padding: "24px", background: C.surface, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Badge label={c.status} variant={c.status === "ENROLLING" ? "live" : "monitor"} />
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{c.level}</span>
              </div>
              <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.3 }}>{c.title[lang]}</h3>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{c.mod} {lang === "es" ? "módulos" : "modules"}</span>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{c.hrs}h</span>
              </div>
              {c.status === "ENROLLING" && (
                <button onClick={() => openEnroll(c)} style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "7px 14px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", alignSelf: "flex-start" }}>
                  {lang === "es" ? "INSCRIBIRSE →" : "ENROLL →"}
                </button>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
      <Modal open={modal === "enroll"} onClose={() => setModal(null)} title={T[lang].form.enrollTitle}>
        <ContactForm context={formContext} onClose={() => setModal(null)} lang={lang} />
      </Modal>
    </Sec>
  );
};

const Community = ({ lang }) => {
  const t = T[lang].comm;
  const [modal, setModal] = useState(false);

  return (
    <Sec id="community">
      <SH label={t.label} title={t.title} sub={t.sub} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
        <FadeIn>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {THREADS.map((th) => (
              <div key={th.id} style={{ padding: "18px 20px", background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold }}>{th.author}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>· {th.role}</span>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.text, margin: "0 0 10px", lineHeight: 1.45, fontWeight: 400 }}>{th.title[lang]}</p>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{th.replies} {lang === "es" ? "respuestas" : "replies"}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted }}>{th.views} {lang === "es" ? "vistas" : "views"}</span>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div style={{ padding: "28px 24px", background: C.surface, border: `1px solid ${C.goldBorder}` }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 16 }}>{t.applyTitle.toUpperCase()}</div>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 24, fontWeight: 300 }}>{t.applyText}</p>
            <button onClick={() => setModal(true)} style={{ width: "100%", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", padding: "12px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>{t.applyCta}</button>
          </div>
        </FadeIn>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={T[lang].form.applyTitle}>
        <ContactForm context="Inner Circle Application" onClose={() => setModal(false)} lang={lang} />
      </Modal>
    </Sec>
  );
};

const Footer = ({ lang }) => {
  const t = T[lang].footer;
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px clamp(16px,4vw,48px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em" }}>{t.legal}</span>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.15em" }}>{t.loc}</span>
      </div>
    </footer>
  );
};

const ZRCPlatform = () => {
  const [lang, setLang] = useState("es");

  const onNav = (id) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AuthProvider>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; color: ${C.text}; }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        button { transition: opacity 0.2s; }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; }
      `}</style>

      <Nav lang={lang} setLang={setLang} onNav={onNav} />
      <MarketTicker lang={lang} />
      <Hero lang={lang} onNav={onNav} />
      <GoldDivider />
      <Observatory lang={lang} />
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
    </AuthProvider>
  );
};

export { ZRCPlatform };
export default ZRCPlatform;
