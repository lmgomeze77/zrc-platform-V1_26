import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import GeoRiskDashboard from "./pages/intelligence/GeoRiskDashboard";
import Observatory from "./pages/intelligence/Observatory";
import RealEstateVisor from "./pages/labs/RealEstateVisor";
import FinancialIntelligenceSystem from "./pages/labs/FinancialIntelligenceSystem";
import Community from "./pages/community/Community";
import InnerCircleAccess from "./pages/innercircle/InnerCircleAccess";
import ProtectedInnerCircle from "./pages/innercircle/ProtectedInnerCircle";
import PricingPage from "./pages/PricingPage";
import MacroPulse from "./pages/intelligence/MacroPulse";
import GeoRiskML from "./pages/intelligence/GeoRiskML";
import GeoRiskIndex from "./pages/intelligence/GeoRiskIndex";
import ZenithAssistant from "./components/assistant/ZenithAssistant";

// ══════════════════════════════════════════════════════════════════════════
// ZENITH RISE CAPITAL — PLATFORM v3.4
// Live ticker · Clickable hero nav · GeoRisk Dashboard + GeoRiskML
// Hero Background: Dark Overlay v1 — mapa, radar, montañas, nodos
// + Financial Intelligence System (FIS) · + GeoRisk Predictive ML
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

// API base — always hits the Cloudflare Worker regardless of frontend host
const API_BASE = "https://zenith-risecapital.lmgomeze77.workers.dev";

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children, lang }) => {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authCallback, setAuthCallback] = useState(null);
  const [showPricing, setShowPricing] = useState(false);

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
        openPricing: () => setShowPricing(true),
      }}
    >
      {children}
      {showAuth && <AuthModal />}
      {showPricing && <PricingPage onClose={() => setShowPricing(false)} lang={lang} onRegister={openRegister} />}
    </AuthContext.Provider>
  );
};

const LEGAL_TEXT = {
  es: {
    privacy: {
      title: "Política de Privacidad",
      updated: "Última actualización: julio 2026",
      sections: [
        { h: "1. Responsable del tratamiento", p: ["Calesius Global SL (\"ZRC\", \"nosotros\"), CIF B56399207, con domicilio en Madrid, España, es responsable del tratamiento de los datos personales que nos facilitas a través de zenithrisecapital.com. Puedes contactarnos en luis@zenithrisecapital.com para cualquier cuestión relativa a privacidad."] },
        { h: "2. Datos que recopilamos", p: ["Recopilamos los datos que nos facilitas voluntariamente al registrarte, solicitar información, aplicar a The Inner Circle o contactar con Advisory/Brokerage: nombre, email, teléfono, empresa, cargo y mensaje. También recopilamos datos técnicos de navegación (dirección IP, tipo de dispositivo, páginas visitadas) a través de cookies y herramientas analíticas."] },
        { h: "3. Finalidad del tratamiento", p: ["Utilizamos tus datos para gestionar el acceso a la plataforma, responder a solicitudes de información, prestar los servicios de Observatorio, Intelligence, Brokerage, Advisory y Academia, gestionar la membresía de The Inner Circle, y enviar comunicaciones relacionadas cuando lo hayas autorizado."] },
        { h: "4. Base legal", p: ["El tratamiento se basa en la ejecución de una relación contractual o precontractual, en el consentimiento del usuario y, en su caso, en el interés legítimo de ZRC para el correcto funcionamiento y seguridad de la plataforma."] },
        { h: "5. Conservación de datos", p: ["Conservamos los datos personales durante el tiempo necesario para cumplir la finalidad para la que se recabaron y, posteriormente, durante los plazos de prescripción legal aplicables."] },
        { h: "6. Destinatarios y transferencias", p: ["No cedemos tus datos a terceros salvo obligación legal o proveedores tecnológicos necesarios para operar la plataforma (hosting, email, procesamiento de pagos), que actúan como encargados del tratamiento bajo contrato. Algunos proveedores pueden ubicarse fuera del Espacio Económico Europeo, en cuyo caso se aplican garantías adecuadas conforme al RGPD (cláusulas contractuales tipo)."] },
        { h: "7. Tus derechos", p: ["Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de los datos escribiendo a luis@zenithrisecapital.com. Asimismo, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es)."] },
        { h: "8. Cookies", p: ["Utilizamos cookies propias y de terceros para el funcionamiento esencial de la plataforma y, con tu consentimiento, para análisis de uso. Puedes gestionar tus preferencias desde la configuración de tu navegador."] },
        { h: "9. Seguridad", p: ["Aplicamos medidas técnicas y organizativas razonables para proteger tus datos frente a accesos no autorizados, pérdida o alteración."] },
      ],
    },
    legal: {
      title: "Aviso Legal",
      updated: "Última actualización: julio 2026",
      sections: [
        { h: "1. Datos identificativos", p: ["El presente sitio web zenithrisecapital.com (\"ZRC\", \"Zenith Rise Capital\") es titularidad de Calesius Global SL, con CIF B56399207 y domicilio social en Madrid, España. Presencia adicional en Luxemburgo. Contacto: luis@zenithrisecapital.com."] },
        { h: "2. Objeto", p: ["ZRC opera una plataforma de inteligencia geopolítica, análisis de inversión, brokerage de oportunidades off-market, advisory estratégico y formación (Zenith Academia). El acceso y uso de este sitio atribuye la condición de usuario e implica la aceptación de las condiciones aquí recogidas."] },
        { h: "3. Naturaleza de los contenidos — no es asesoramiento de inversión", p: ["Los contenidos, señales, análisis y datos publicados en ZRC tienen carácter informativo y educativo. No constituyen recomendación personalizada de inversión, asesoramiento financiero, legal o fiscal, ni una oferta o invitación a comprar o vender ningún instrumento financiero. Toda decisión de inversión es responsabilidad exclusiva del usuario, que debe contar con asesoramiento profesional independiente cuando sea necesario."] },
        { h: "4. Propiedad intelectual", p: ["Todos los contenidos del sitio (textos, marcas, logotipos, diseño, bases de datos, software) son propiedad de Calesius Global SL o de terceros licenciantes, y están protegidos por la normativa de propiedad intelectual e industrial. Queda prohibida su reproducción o distribución sin autorización expresa."] },
        { h: "5. Exclusión de responsabilidad", p: ["ZRC no garantiza la exactitud, exhaustividad o actualidad permanente de la información publicada, ni se hace responsable de las decisiones adoptadas con base en ella. El acceso a determinadas secciones (Observatorio, Intelligence, Inner Circle) puede estar restringido a usuarios registrados o autorizados."] },
        { h: "6. Enlaces a terceros", p: ["El sitio puede incluir enlaces a fuentes o webs de terceros (medios, datos de mercado). ZRC no controla ni se responsabiliza del contenido de dichos sitios externos."] },
        { h: "7. Legislación aplicable y jurisdicción", p: ["Las presentes condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a los Juzgados y Tribunales de Madrid, salvo que la normativa de consumidores establezca un fuero distinto de carácter imperativo."] },
        { h: "8. Modificaciones", p: ["Calesius Global SL se reserva el derecho a modificar el presente aviso legal para adaptarlo a novedades legislativas o cambios en el servicio."] },
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: July 2026",
      sections: [
        { h: "1. Data controller", p: ["Calesius Global SL (\"ZRC\", \"we\"), tax ID B56399207, registered in Madrid, Spain, is the controller of the personal data you provide through zenithrisecapital.com. You can contact us at luis@zenithrisecapital.com for any privacy-related matter."] },
        { h: "2. Data we collect", p: ["We collect data you voluntarily provide when registering, requesting information, applying to The Inner Circle, or contacting Advisory/Brokerage: name, email, phone, company, role and message. We also collect technical browsing data (IP address, device type, pages visited) through cookies and analytics tools."] },
        { h: "3. Purpose of processing", p: ["We use your data to manage platform access, respond to information requests, deliver the Observatory, Intelligence, Brokerage, Advisory and Academia services, manage The Inner Circle membership, and send related communications when authorized."] },
        { h: "4. Legal basis", p: ["Processing is based on the performance of a contract or pre-contractual relationship, user consent, and, where applicable, ZRC's legitimate interest in the proper functioning and security of the platform."] },
        { h: "5. Data retention", p: ["We retain personal data for as long as necessary to fulfil the purpose for which it was collected, and afterwards for the applicable legal limitation periods."] },
        { h: "6. Recipients and international transfers", p: ["We do not share your data with third parties except where legally required or with technology providers necessary to operate the platform (hosting, email, payment processing), acting as data processors under contract. Some providers may be located outside the European Economic Area, in which case appropriate GDPR safeguards apply (standard contractual clauses)."] },
        { h: "7. Your rights", p: ["You may exercise your rights of access, rectification, erasure, objection, restriction of processing and data portability by writing to luis@zenithrisecapital.com. You also have the right to lodge a complaint with the Spanish Data Protection Agency (aepd.es)."] },
        { h: "8. Cookies", p: ["We use first- and third-party cookies for the essential operation of the platform and, with your consent, for usage analytics. You can manage your preferences in your browser settings."] },
        { h: "9. Security", p: ["We apply reasonable technical and organizational measures to protect your data against unauthorized access, loss or alteration."] },
      ],
    },
    legal: {
      title: "Legal Notice",
      updated: "Last updated: July 2026",
      sections: [
        { h: "1. Identification", p: ["This website zenithrisecapital.com (\"ZRC\", \"Zenith Rise Capital\") is owned by Calesius Global SL, tax ID B56399207, registered office in Madrid, Spain, with additional presence in Luxembourg. Contact: luis@zenithrisecapital.com."] },
        { h: "2. Purpose", p: ["ZRC operates a platform for geopolitical intelligence, investment analysis, off-market brokerage opportunities, strategic advisory, and education (Zenith Academia). Access to and use of this site grants the status of user and implies acceptance of the terms set out here."] },
        { h: "3. Nature of content — not investment advice", p: ["Content, signals, analysis and data published on ZRC are for informational and educational purposes only. They do not constitute personalized investment advice, financial, legal or tax advice, nor an offer or solicitation to buy or sell any financial instrument. Any investment decision is the sole responsibility of the user, who should seek independent professional advice where necessary."] },
        { h: "4. Intellectual property", p: ["All content on the site (text, trademarks, logos, design, databases, software) is owned by Calesius Global SL or third-party licensors and is protected by intellectual and industrial property law. Reproduction or distribution without express authorization is prohibited."] },
        { h: "5. Disclaimer", p: ["ZRC does not guarantee the accuracy, completeness or ongoing timeliness of the information published, nor is it liable for decisions made based on it. Access to certain sections (Observatory, Intelligence, Inner Circle) may be restricted to registered or authorized users."] },
        { h: "6. Third-party links", p: ["The site may include links to third-party sources or websites (media, market data). ZRC does not control and is not responsible for the content of such external sites."] },
        { h: "7. Governing law and jurisdiction", p: ["These terms are governed by Spanish law. Any dispute shall be submitted to the Courts of Madrid, unless mandatory consumer-protection rules establish a different venue."] },
        { h: "8. Changes", p: ["Calesius Global SL reserves the right to amend this legal notice to reflect legislative developments or changes to the service."] },
      ],
    },
  },
};

const T = {
  es: {
    nav: ["Observatorio", "Intelligence", "GeoRisk Index", "Brokerage", "Advisory", "Academia", "Inner Circle"],
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
      soonLabel: "PRÓXIMAMENTE",
      soonSub: "En desarrollo activo. Disponibles próximamente.",
    },
    brok: {
      label: "04 — BROKERAGE",
      title: "Singular Opportunities",
      sub: "Oportunidades off-market curadas. Due diligence de grado institucional.",
      req: "SOLICITAR TEASER →",
    },
    adv: {
      label: "05 — ADVISORY",
      title: "M&A & Growth Strategy",
      sub: "Advisory institucional para empresas navegando complejidad.",
    },
    acad: {
      label: "06 — ZENITH ACADEMIA",
      title: "Educación Impulsada por Inteligencia",
      sub: "Programas de nivel postgraduado impartidos por practitioners.",
    },
    comm: {
      label: "07 — THE INNER CIRCLE",
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
      privacyLink: "Política de Privacidad",
      legalLink: "Aviso Legal",
    },
    live: "EN VIVO",
  },
  en: {
    nav: ["Observatory", "Intelligence", "GeoRisk Index", "Brokerage", "Advisory", "Academia", "Inner Circle"],
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
      soonLabel: "COMING SOON",
      soonSub: "In active development. Available soon.",
    },
    brok: {
      label: "04 — BROKERAGE",
      title: "Singular Opportunities",
      sub: "Curated off-market opportunities. Institutional-grade due diligence.",
      req: "REQUEST TEASER →",
    },
    adv: {
      label: "05 — ADVISORY",
      title: "M&A & Growth Strategy",
      sub: "Institutional advisory for companies navigating complexity.",
    },
    acad: {
      label: "06 — ZENITH ACADEMIA",
      title: "Intelligence-Driven Education",
      sub: "Postgraduate programs taught by practitioners.",
    },
    comm: {
      label: "07 — THE INNER CIRCLE",
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
      privacyLink: "Privacy Policy",
      legalLink: "Legal Notice",
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

const useSubscription = (email) => {
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!email) { setTier("free"); setLoading(false); return; }
    setLoading(true);
    const normalised = email.trim().toLowerCase();
    fetch(`${API_BASE}/api/subscription?email=${encodeURIComponent(normalised)}`)
      .then((r) => (r.ok ? r.json() : { tier: "free" }))
      .then((d) => { setTier(d.tier || "free"); setLoading(false); })
      .catch(() => { setTier("free"); setLoading(false); });
  }, [email]);
  return { tier, loading };
};

const FEED = [
  {
    id: 1, tag: "CRITICAL", region: "EU",
    title: { es: "BCE mantiene tipos — Lagarde abre puerta a recorte en junio ante desinflacion en servicios", en: "ECB holds rates — Lagarde signals June cut as services disinflation accelerates" },
    source: "Financial Times", source_url: "https://www.ft.com/content/ecb-rates-june-2026",
    published_at: "2026-05-06", time: "4h", impact: "high", confidence: 88,
    summary: {
      es: "El BCE mantuvo los tipos de interes en el 3.15% pero el tono de Lagarde fue claramente acomodaticio. La inflacion en servicios bajo al 3.4%, el nivel mas bajo desde 2022, abriendo la puerta a un recorte de 25pb en junio.",
      en: "The ECB held rates at 3.15% but Lagarde's tone was unambiguously dovish. Services inflation fell to 3.4%, its lowest since 2022, opening the door to a 25bp cut in June."
    },
    situation: {
      es: "El ciclo de desinflacion europeo lleva seis meses superando las expectativas del mercado. El diferencial con la Fed se amplia — la Fed no recortara antes de septiembre. Esto presiona al EUR/USD hacia la banda baja del 1.06-1.10 que ha dominado el ano. Los bonos soberanos europeos ya descuentan dos recortes en 2026.",
      en: "The European disinflation cycle has beaten market expectations for six consecutive months. The differential with the Fed is widening — the Fed will not cut before September. This pressures EUR/USD toward the low end of the 1.06-1.10 band that has dominated the year. European sovereign bonds are already pricing in two cuts in 2026."
    },
    investment_impact: {
      es: "Positivo para bonos soberanos europeos a 2-5 anos (Bund, BTP, Bono). Presion bajista estructural sobre EUR/USD. Las utilities y REITs europeos — sectores sensibles a tipos — podrian revalorizarse. Los bancos europeos enfrentan compresion de margen de intermediacion si los recortes se aceleran.",
      en: "Positive for European sovereign bonds 2-5yr (Bund, BTP, Bono). Structural downward pressure on EUR/USD. European utilities and REITs — rate-sensitive sectors — may reprice upward. European banks face net interest margin compression if cuts accelerate."
    },
    zrc_signal: {
      es: "SOBREPONDERAR bonos soberanos europeos 2-5 anos. El mercado aun no ha descontado completamente un tercer recorte en 2026. La ventana de entrada en BTP italiano 3 anos ofrece una relacion riesgo/retorno favorable dado el spread vs Bund en 165pb.",
      en: "OVERWEIGHT European sovereign bonds 2-5yr. The market has not fully priced in a third 2026 cut. Entry in Italian BTP 3yr offers favorable risk/return with spread vs Bund at 165bps."
    },
    signals: ["ECB", "rates", "EUR/USD", "European bonds", "disinflation"],
    develops_into_edition: true,
    edition_note: {
      es: "El nuevo ciclo de divergencia monetaria Fed-BCE: implicaciones para carteras mixtas europeas con exposicion a renta fija y divisa.",
      en: "The new Fed-ECB monetary divergence cycle: implications for European multi-asset portfolios with fixed income and FX exposure."
    }
  },
  {
    id: 2, tag: "ALERT", region: "MENA",
    title: { es: "Iran cierra parcialmente el estrecho de Ormuz a buques con bandera israelí — flete GNL +18%", en: "Iran partially closes Strait of Hormuz to Israeli-flagged vessels — LNG freight +18%" },
    source: "Reuters", source_url: "https://www.reuters.com/world/middle-east/iran-hormuz-lng-2026",
    published_at: "2026-05-05", time: "12h", impact: "high", confidence: 82,
    summary: {
      es: "Iran anuncio restricciones de transito para buques con bandera o seguro israelí a traves del estrecho de Ormuz. El mercado de fletes de GNL reacciono con una subida inmediata del 18%. Arabia Saudita no ha confirmado posicion.",
      en: "Iran announced transit restrictions for Israeli-flagged or Israeli-insured vessels through the Strait of Hormuz. The LNG freight market reacted with an immediate 18% spike. Saudi Arabia has not confirmed its position."
    },
    situation: {
      es: "El estrecho de Ormuz canaliza el 21% del comercio mundial de petroleo y el 17% del GNL. Esta no es la primera amenaza de Iran pero si la primera con implementacion parcial verificable. La reaccion saudita en las proximas 48h determinara si se trata de una escalada real o de una movida diplomatica. Europa importa el 12% de su GNL de rutas que transitan Ormuz.",
      en: "The Strait of Hormuz channels 21% of global oil trade and 17% of LNG. This is not Iran's first threat but the first with verifiable partial implementation. Saudi Arabia's response in the next 48h will determine whether this is a real escalation or a diplomatic move. Europe imports 12% of its LNG via routes transiting Hormuz."
    },
    investment_impact: {
      es: "Alza inmediata en futuros de GNL TTF europeo y Henry Hub. Positivo para productores de GNL americanos (LNG exporters) y australianos. Compresion de margenes en sectores industriales europeos con alta dependencia energetica. Pressure sobre EUR dado riesgo inflacionario de segunda ronda.",
      en: "Immediate upside for European TTF and Henry Hub LNG futures. Positive for US and Australian LNG exporters. Margin compression for European energy-intensive industrials. Pressure on EUR given second-round inflation risk."
    },
    zrc_signal: {
      es: "COBERTURA en cartera via futuros de GNL TTF o ETFs de energia europea. Si la escalada se confirma en 48h, rotar hacia productores americanos de LNG. Reducir exposicion a utilities europeas con alta dependencia de gas de importacion.",
      en: "HEDGE portfolio via TTF LNG futures or European energy ETFs. If escalation is confirmed in 48h, rotate toward US LNG producers. Reduce exposure to European utilities with high import gas dependency."
    },
    signals: ["Hormuz", "LNG", "energy security", "Iran", "freight rates"],
    develops_into_edition: false,
    edition_note: null
  },
  {
    id: 3, tag: "WATCH", region: "LATAM",
    title: { es: "Brazil eleva tasa Selic al 13.75% — real se aprecia 2.1% en sesion ante carry trade renovado", en: "Brazil hikes Selic to 13.75% — real appreciates 2.1% intraday on renewed carry trade" },
    source: "Bloomberg", source_url: "https://www.bloomberg.com/news/brazil-selic-hike-2026",
    published_at: "2026-05-06", time: "6h", impact: "medium", confidence: 91,
    summary: {
      es: "El Banco Central de Brasil subio la Selic 50pb hasta el 13.75%, sorprendiendo al mercado que esperaba 25pb. El real se aprecio un 2.1% frente al dolar en sesion. Los bonos del Tesoro Tesouro Direto a 2 anos subieron 35pb en rendimiento.",
      en: "Brazil's Central Bank hiked the Selic by 50bps to 13.75%, surprising markets expecting 25bps. The real appreciated 2.1% against the dollar intraday. Tesouro Direto 2yr bonds rose 35bps in yield."
    },
    situation: {
      es: "La inflacion brasilena se mantiene por encima del rango objetivo (4.5% objetivo, 5.8% actual) impulsada por servicios y expectativas desancladas. La sorpresa hawkish del BCB recupera credibilidad pero aumenta el riesgo de recession en H2 2026. El diferencial de tipos Brasil-EEUU de 650pb hace al BRL uno de los carry trades mas atractivos del G20.",
      en: "Brazilian inflation remains above target range (4.5% target, 5.8% actual) driven by services and unanchored expectations. The BCB's hawkish surprise rebuilds credibility but raises H2 2026 recession risk. The 650bp Brazil-US rate differential makes BRL one of the most attractive G20 carry trades."
    },
    investment_impact: {
      es: "Apreciacion del BRL favorable para empresas exportadoras con costes en real (commodities agricolas brasilenas, Vale, Petrobras). Negativo para importadores domesticos. Atractivo renovado para bonos soberanos brasilenos en moneda local via NDF o fondos LATAM. Riesgo: reversion si el ciclo global de risk-off se activa.",
      en: "BRL appreciation favorable for exporters with real-denominated costs (Brazilian agricultural commodities, Vale, Petrobras). Negative for domestic importers. Renewed appeal for Brazilian local-currency sovereign bonds via NDF or LATAM funds. Risk: reversal if global risk-off cycle activates."
    },
    zrc_signal: {
      es: "MONITOREAR con sesgo positivo en BRL y bonos locales brasilenos. El carry es atractivo pero la ventana es estrecha — posicionarse antes de que el mercado descuente completamente la pausa del ciclo de subidas. Stop si BRL supera 5.20/USD.",
      en: "MONITOR with positive bias on BRL and Brazilian local bonds. The carry is attractive but the window is narrow — position before the market fully prices in the hike cycle pause. Stop if BRL crosses 5.20/USD."
    },
    signals: ["Selic", "BRL", "carry trade", "Brazil rates", "LATAM"],
    develops_into_edition: false,
    edition_note: null
  },
  {
    id: 4, tag: "DATA", region: "GLOBAL",
    title: { es: "FMI revisa PIB global 2026 a 2.8% — advierte de fragmentacion comercial como riesgo principal", en: "IMF revises 2026 global GDP to 2.8% — warns trade fragmentation is primary risk" },
    source: "Wall Street Journal", source_url: "https://www.wsj.com/economy/imf-gdp-revision-2026",
    published_at: "2026-05-05", time: "1d", impact: "medium", confidence: 85,
    summary: {
      es: "El FMI publico su revision del PIB global para 2026 a la baja hasta el 2.8% (desde 3.1%). La principal razon citada es la fragmentacion comercial y la proliferacion de barreras arancelarias. EEUU se revisa al 1.9%, China al 4.2%.",
      en: "The IMF published its 2026 global GDP revision down to 2.8% (from 3.1%). The primary reason cited is trade fragmentation and proliferating tariff barriers. US revised to 1.9%, China to 4.2%."
    },
    situation: {
      es: "La fragmentacion comercial no es un riesgo nuevo pero el FMI cuantifica por primera vez su impacto en el crecimiento con modelos de equilibrio general. El diferencial de crecimiento emergente/desarrollado se amplia. Los paises con mayor dependencia de cadenas de suministro globales (Mexico, Vietnam, Malasia) son los mas expuestos.",
      en: "Trade fragmentation is not a new risk but the IMF quantifies its growth impact for the first time using general equilibrium models. The EM/developed growth differential is widening. Countries with the highest global supply chain dependency (Mexico, Vietnam, Malaysia) are most exposed."
    },
    investment_impact: {
      es: "Presion a la baja en activos de mercados emergentes integrados en cadenas de suministro globales. Beneficiarios: economias con demanda interna solida y baja dependencia exportadora (India, Indonesia). Negativo para ETFs de renta variable global market-cap weighted. Positivo para estrategias de seleccion regional activa.",
      en: "Downward pressure on EM assets integrated in global supply chains. Beneficiaries: economies with solid domestic demand and low export dependency (India, Indonesia). Negative for market-cap-weighted global equity ETFs. Positive for active regional selection strategies."
    },
    zrc_signal: {
      es: "INFRAPONDERAR indices globales de RV en favor de seleccion regional activa. Sobreponderar India e Indonesia dentro de emergentes. Reducir exposicion a Mexico y Vietnam ante riesgo de recomposicion de cadenas de suministro acelerada por aranceles EEUU.",
      en: "UNDERWEIGHT global equity indices in favor of active regional selection. Overweight India and Indonesia within EM. Reduce Mexico and Vietnam exposure given supply chain recomposition risk from US tariffs."
    },
    signals: ["IMF", "GDP revision", "trade fragmentation", "tariffs", "emerging markets"],
    develops_into_edition: true,
    edition_note: {
      es: "La nueva geografia del crecimiento global: ganadores y perdedores de la desglobalizacion y como posicionar carteras institucionales para el ciclo 2026-2028.",
      en: "The new geography of global growth: winners and losers from deglobalization and how to position institutional portfolios for the 2026-2028 cycle."
    }
  },
  {
    id: 5, tag: "WATCH", region: "APAC",
    title: { es: "PBOC inyecta 500.000M CNY via operaciones repo — yuan onshore toca minimo de 3 meses vs USD", en: "PBOC injects CNY 500bn via repo operations — onshore yuan hits 3-month low vs USD" },
    source: "Nikkei Asia", source_url: "https://asia.nikkei.com/economy/pboc-yuan-2026",
    published_at: "2026-05-06", time: "8h", impact: "medium", confidence: 79,
    summary: {
      es: "El Banco Popular de China inyecto 500.000 millones de CNY en el sistema financiero a traves de operaciones repo a 7 dias, la mayor inyeccion desde febrero. El yuan onshore (CNY) se deprecio a 7.28/USD, minimo de tres meses.",
      en: "The People's Bank of China injected CNY 500bn into the financial system via 7-day repo operations, the largest injection since February. The onshore yuan (CNY) depreciated to 7.28/USD, a three-month low."
    },
    situation: {
      es: "La inyeccion de liquidez del PBOC es una respuesta al enfriamiento del credito privado y a la debilidad del sector inmobiliario que persiste a pesar de los estimulos de 2025. La depreciacion del CNY es tolerada por las autoridades como mecanismo de compensacion competitiva ante los aranceles EEUU. Historicamente, depreciaciones sostenidas del CNY generan salidas de capital de mercados emergentes asiaticos.",
      en: "The PBOC's liquidity injection responds to cooling private credit and persistent real estate weakness despite 2025 stimulus. CNY depreciation is being tolerated by authorities as a competitive offset to US tariffs. Historically, sustained CNY depreciation generates capital outflows from Asian EM markets."
    },
    investment_impact: {
      es: "Presion sobre divisas asiaticas vinculadas al yuan (KRW, TWD, THB). Negativo para renta variable china en moneda local para inversores extranjeros. Positivo para exportadores chinos de manufactura. Los mercados de materias primas denominados en USD se benefician de la debilidad del CNY (reduccion de demanda China en terminos reales menores).",
      en: "Pressure on Asian currencies linked to yuan (KRW, TWD, THB). Negative for Chinese equities in local currency for foreign investors. Positive for Chinese manufacturing exporters. USD-denominated commodity markets benefit from CNY weakness (lower effective Chinese demand in real terms)."
    },
    zrc_signal: {
      es: "INFRAPONDERAR renta variable china A-shares y H-shares con exposicion a demanda interna. MONITOREAR salidas de capital de mercados asiaticos emergentes como indicador adelantado. Oportunidad tactica en USD/CNH si deprecia mas alla de 7.35.",
      en: "UNDERWEIGHT Chinese A-shares and H-shares with domestic demand exposure. MONITOR Asian EM capital outflows as leading indicator. Tactical opportunity in USD/CNH if depreciation extends beyond 7.35."
    },
    signals: ["PBOC", "CNY", "yuan", "China liquidity", "Asian FX"],
    develops_into_edition: false,
    edition_note: null
  }
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
    icon: "◈", status: "LIVE", ml: true, requiredTier: "intelligence",
  },
  {
    name: "GeoRisk Predictive ML",
    desc: { es: "Análisis geopolítico predictivo con IA: forecast 12M, NLP analyzer, matriz de correlaciones y decision engine institucional.", en: "Predictive geopolitical intelligence with AI: 12M forecast, NLP analyzer, correlation matrix and institutional decision engine." },
    icon: "◈", status: "LIVE", ml: true, requiredTier: "intelligence",
  },
  {
    name: "Financial Intelligence System",
    desc: {
      es: "Motor de inteligencia financiera para PYMEs familiares: cash flow 13 semanas, capital circulante, motor de riesgos e informe semanal generado por IA.",
      en: "Financial intelligence engine for family-owned SMEs: 13-week cash flow, working capital optimizer, risk engine and AI-generated board report.",
    },
    icon: "◆", status: "LIVE", ml: true, requiredTier: "intelligence",
  },
  {
    name: "Macro Pulse",
    desc: { es: "Tracker de señales de bancos centrales con NLP. Ciclos de tipos, divergencia Fed–BCE, señales de cartera.", en: "Central bank signal tracker with NLP. Rate cycles, Fed–ECB divergence, portfolio signals." },
    icon: "○", status: "BETA", ml: true, requiredTier: "intelligence",
  },
  {
    name: "Real Estate Visor",
    desc: { es: "Visor inmobiliario con catastro, capas de riesgo, planeamiento y matching de mandatos ZRC.", en: "Real estate visor with cadastre, risk layers, planning and ZRC mandate matching." },
    icon: "◇", status: "BETA", ml: false, requiredTier: null,
  },
];

// Apps sin funcionalidad activa todavia: se muestran aparte como "próximamente".
const TOOLS_SOON = [
  {
    name: "Valuation Engine",
    desc: { es: "DCF automatizado, múltiplos y valoración normalizada para PYMEs.", en: "Automated DCF, multiples, and normalized valuation for SMEs." },
    icon: "◇", status: "SOON", ml: true, requiredTier: "intelligence",
  },
  {
    name: "Deal Flow Radar",
    desc: { es: "Pipeline ML-enhanced identificando empresas sub-optimizadas en Europa del Sur.", en: "ML-enhanced pipeline identifying sub-optimized companies across Southern Europe." },
    icon: "◆", status: "SOON", ml: true, requiredTier: "intelligence",
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
    soon:      { bg: "rgba(148,163,184,0.10)",  c: C.textMuted, b: "rgba(148,163,184,0.22)" },
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
  const { openRegister, openLogin } = useAuth();
  return (
    <div style={{ padding: "32px 24px", background: `linear-gradient(180deg, transparent, ${C.bg})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔒</div>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, textAlign: "center" }}>{message}</p>
      <button onClick={openRegister} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
        {lang === "es" ? "CREAR CUENTA GRATUITA →" : "CREATE FREE ACCOUNT →"}
      </button>
      <button onClick={openLogin} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textSec, padding: "10px 24px", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.08em", cursor: "pointer", borderRadius: 4, marginTop: 8 }}>
        {lang === "es" ? "INICIAR SESIÓN" : "SIGN IN"}
      </button>
    </div>
  );
};

const MarketTicker = ({ lang }) => {
  const { data, lastUpdate } = useTickerData();

  if (data.length === 0) {
    return (
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "fixed", top: 0, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101 }}>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>LOADING MARKET DATA…</span>
      </div>
    );
  }

  const doubled = [...data, ...data];

  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, overflow: "hidden", position: "fixed", top: 0, left: 0, right: 0, height: 44, zIndex: 101 }}>
      <div style={{ display: "flex", alignItems: "center", position: "absolute", whiteSpace: "nowrap", animation: "tickerScroll 60s linear infinite" }}>
        {doubled.map((m, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0 28px", height: 44 }}>
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
  const { user, openLogin, logout, openPricing } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ids = ["observatory", "intelligence", "georisk-index", "brokerage", "advisory", "academia", "inner-circle"];

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = (id) => { onNav(id); setMobileOpen(false); };

  return (
    <nav style={{ position: "fixed", top: 44, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(9,9,11,0.95)" : "rgba(9,9,11,0.7)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${scrolled ? C.border : "rgba(255,255,255,0.06)"}`, transition: "all 0.4s" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 76, padding: "0 clamp(20px,3vw,40px)" }}>
        <div onClick={() => go("hero")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, border: `1.5px solid ${C.gold}`, transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 6, height: 6, background: C.gold, transform: "rotate(-45deg)" }} />
          </div>
          <span style={{ fontFamily: F.display, fontSize: 15, color: C.text, fontWeight: 400, letterSpacing: "0.12em" }}>ZRC</span>
        </div>

        <button className="nav-hamburger" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu"
          style={{ display: "none", background: "none", border: `1px solid ${C.border}`, color: C.gold, width: 36, height: 36, alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <span style={{ fontFamily: F.mono, fontSize: 14 }}>{mobileOpen ? "✕" : "☰"}</span>
        </button>

        <div className={`nav-links${mobileOpen ? " nav-links-open" : ""}`} style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {T[lang].nav.map((label, i) => (
            <button key={ids[i]} onClick={() => go(ids[i])}
              style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.1em", color: C.textMuted, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "6px 0", transition: "color 0.3s" }}
              onMouseEnter={(e) => { e.target.style.color = C.gold; }}
              onMouseLeave={(e) => { e.target.style.color = C.textMuted; }}
            >
              {label.toUpperCase()}
            </button>
          ))}
          <button onClick={() => { openPricing(); setMobileOpen(false); }} style={{ fontFamily: F.mono, fontSize: 10, padding: "5px 14px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", fontWeight: 600, letterSpacing: "0.08em" }}>
            PRICING
          </button>
          <button onClick={() => setLang(lang === "es" ? "en" : "es")} style={{ fontFamily: F.mono, fontSize: 10, padding: "5px 14px", background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", fontWeight: 600 }}>
            {lang === "es" ? "EN" : "ES"}
          </button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold }}>{user.name}</span>
              <button onClick={logout} style={{ fontFamily: F.mono, fontSize: 8, padding: "2px 8px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { openLogin(); setMobileOpen(false); }} style={{ fontFamily: F.mono, fontSize: 9, padding: "4px 12px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>LOGIN</button>
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
        padding: "132px clamp(16px,4vw,48px) 60px",
        background: "#050C16",
      }}
    >
      <img
        src="/globe-bg.png"
        aria-hidden="true"
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center", display:"block", userSelect:"none", pointerEvents:"none" }}
      />
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 80% at 50% 50%, transparent 28%, rgba(4,10,18,0.48) 100%), linear-gradient(to bottom, rgba(4,10,18,0.32) 0%, transparent 18%, transparent 74%, rgba(4,10,18,0.60) 100%)", pointerEvents:"none" }} />
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

const STRIPE_BUY_BUTTON_ID = "buy_btn_1Tq8ynJXE9tayTtocEsR3EAW";
const STRIPE_PUBLISHABLE_KEY = "pk_live_51TRu5kJXE9tayTtonMWDzgXR6MH9Nwe7rM7nICKMJjdntuGp583eWF9whqI4dQcvgvCcdrpwBdxBg0fsh7V7dPmI00ZowEZyOo";

const StripeBuyButton = () => {
  useEffect(() => {
    if (document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/buy-button.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <stripe-buy-button
      buy-button-id={STRIPE_BUY_BUTTON_ID}
      publishable-key={STRIPE_PUBLISHABLE_KEY}
    />
  );
};

const UpgradeModal = ({ tool, lang, onClose, onOpenPricing }) => {
  const isGeoRisk = tool.name === "GeoRisk Dashboard" || tool.name === "GeoRisk Predictive ML";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 310, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, maxWidth: 460, width: "100%", padding: 36, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.gold }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.15em" }}>INTELLIGENCE · {lang === "es" ? "ACCESO PREMIUM" : "PREMIUM ACCESS"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
        </div>
        <h3 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 400, color: C.text, margin: "0 0 10px" }}>{tool.name}</h3>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.65, fontWeight: 300, margin: "0 0 24px" }}>{tool.desc[lang]}</p>
        <div style={{ padding: "16px 20px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, marginBottom: 20 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 6 }}>
            {lang === "es" ? "DESDE" : "FROM"}
          </div>
          <div style={{ fontFamily: F.display, fontSize: 32, color: C.gold, lineHeight: 1 }}>€99<span style={{ fontSize: 14, color: C.textMuted, fontFamily: F.mono }}>/mo</span></div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginTop: 4 }}>Intelligence · {lang === "es" ? "todas las herramientas" : "all tools"}</div>
        </div>

        {isGeoRisk && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8, textAlign: "center" }}>
              {lang === "es" ? "COMPRA DIRECTA · PAGO SEGURO VÍA STRIPE" : "DIRECT PURCHASE · SECURE STRIPE CHECKOUT"}
            </div>
            <StripeBuyButton />
          </div>
        )}

        <button
          onClick={() => { onClose(); onOpenPricing(); }}
          style={{
            width: "100%", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", padding: "12px 20px",
            background: isGeoRisk ? "transparent" : C.gold, color: isGeoRisk ? C.gold : C.bg,
            border: isGeoRisk ? `1px solid ${C.goldBorder}` : "none", cursor: "pointer", fontWeight: 600,
          }}
        >
          {lang === "es" ? "VER TODOS LOS PLANES →" : "VIEW ALL PLANS →"}
        </button>
      </div>
    </div>
  );
};

const Intelligence = ({ lang }) => {
  const t = T[lang].intel;
  const { user, openPricing, setShowAuth } = useAuth();
  const { tier, loading: tierLoading } = useSubscription(user?.email);
  const [showGeoRisk, setShowGeoRisk] = useState(false);
  const [showGeoRiskML, setShowGeoRiskML] = useState(false);
  const [showVisor, setShowVisor] = useState(false);
  const [showFIS, setShowFIS] = useState(false);
  const [showMacroPulse, setShowMacroPulse] = useState(false);
  const [upgradeTool, setUpgradeTool] = useState(null);
  const [pendingVisorReport, setPendingVisorReport] = useState(null);

  // Vuelta desde el Payment Link de Stripe tras comprar el Teaser/Informe
  // Investigado del Visor Inmobiliario: ?visor_report=teaser|informe&session_id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportType = params.get("visor_report");
    const sessionId = params.get("session_id");
    if ((reportType === "teaser" || reportType === "informe") && sessionId) {
      setPendingVisorReport({ type: reportType, sessionId });
      setShowVisor(true);
      params.delete("visor_report");
      params.delete("session_id");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, []);

  const canAccess = (tool) => {
    if (!tool.requiredTier) return true;
    if (tier === "institutional") return true;
    return tier === tool.requiredTier;
  };

  const handleLaunch = (tool) => {
    if (!canAccess(tool)) { setUpgradeTool(tool); return; }
    if (tool.name === "GeoRisk Dashboard") setShowGeoRisk(true);
    if (tool.name === "GeoRisk Predictive ML") setShowGeoRiskML(true);
    if (tool.name === "Real Estate Visor") setShowVisor(true);
    if (tool.name === "Financial Intelligence System") setShowFIS(true);
    if (tool.name === "Macro Pulse") setShowMacroPulse(true);
  };

  // Peticiones del asistente IA para abrir una herramienta.
  // Aplica el mismo gating que los botones del grid: registro y tier.
  useEffect(() => {
    const onAssistantOpenTool = (e) => {
      const tool = TOOLS.find((tl) => tl.name === e.detail?.tool);
      if (!tool) return;
      if (!user) { setShowAuth(true); return; }
      handleLaunch(tool);
    };
    window.addEventListener("zrc-open-tool", onAssistantOpenTool);
    return () => window.removeEventListener("zrc-open-tool", onAssistantOpenTool);
  }, [user, tier, tierLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {TOOLS.map((tool, i) => {
          const locked = user && !tierLoading && !canAccess(tool);
          const checking = user && tierLoading && !!tool.requiredTier;
          return (
            <FadeIn key={i} delay={i * 0.08}>
              <div style={{ padding: 28, background: C.surface, border: `1px solid ${locked ? C.goldBorder : C.border}`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: tool.status === "LIVE" ? C.green : tool.status === "BETA" ? C.amber : "transparent" }} />
                {locked && (
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 8, color: C.gold, background: C.goldDim, border: `1px solid ${C.goldBorder}`, padding: "2px 7px", letterSpacing: "0.1em" }}>INTELLIGENCE</span>
                  </div>
                )}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 22, color: locked ? C.textMuted : C.gold, opacity: locked ? 0.4 : 0.6 }}>{tool.icon}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {tool.ml && <Badge label="ML" variant="ml" />}
                      <Badge label={tool.status} variant={tool.status.toLowerCase()} />
                    </div>
                  </div>
                  <h3 style={{ fontFamily: F.display, fontSize: 19, fontWeight: 400, color: locked ? C.textSec : C.text, margin: "0 0 10px" }}>{tool.name}</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textSec, lineHeight: 1.6, fontWeight: 300 }}>{tool.desc[lang]}</p>
                </div>
                {user ? (
                  checking ? (
                    <div style={{ marginTop: 20, fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>
                      · · ·
                    </div>
                  ) : locked ? (
                    <button
                      onClick={() => setUpgradeTool(tool)}
                      style={{ marginTop: 20, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "7px 16px", background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", alignSelf: "flex-start" }}
                    >
                      🔒 {lang === "es" ? "DESBLOQUEAR →" : "UNLOCK →"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLaunch(tool)}
                      style={{ marginTop: 20, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "7px 16px", background: "transparent", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", alignSelf: "flex-start" }}
                    >
                      {tool.status === "LIVE" ? "LAUNCH →" : tool.status === "BETA" ? "LAUNCH BETA →" : "NOTIFY ME"}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{ marginTop: 20, padding: "12px 16px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, textAlign: "center", width: "100%", cursor: "pointer" }}
                  >
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.1em" }}>🔒 {t.locked}</span>
                  </button>
                )}
              </div>
            </FadeIn>
          );
        })}
      </div>

      <FadeIn delay={(TOOLS.length + 1) * 0.08}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "48px 0 20px" }}>
          <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.15em", color: C.textMuted }}>{t.soonLabel}</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, fontWeight: 300, margin: "0 0 20px" }}>{t.soonSub}</p>
      </FadeIn>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1, opacity: 0.7 }}>
        {TOOLS_SOON.map((tool, i) => (
          <FadeIn key={tool.name} delay={(TOOLS.length + 2 + i) * 0.08}>
            <div style={{ padding: 28, background: C.surface, border: `1px dashed ${C.border}`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 22, color: C.textMuted, opacity: 0.4 }}>{tool.icon}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {tool.ml && <Badge label="ML" variant="ml" />}
                    <Badge label={t.soonLabel} variant="soon" />
                  </div>
                </div>
                <h3 style={{ fontFamily: F.display, fontSize: 19, fontWeight: 400, color: C.textSec, margin: "0 0 10px" }}>{tool.name}</h3>
                <p style={{ fontFamily: F.body, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, fontWeight: 300 }}>{tool.desc[lang]}</p>
              </div>
              <div style={{ marginTop: 20, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", padding: "7px 16px", color: C.textMuted, border: `1px solid ${C.border}`, alignSelf: "flex-start" }}>
                {t.soonLabel}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {!user && <FadeIn delay={0.3}><LockedOverlay message={t.locked} lang={lang} /></FadeIn>}

      {/* Upgrade CTA for free members */}
      {user && !tierLoading && tier === "free" && (
        <FadeIn delay={0.3}>
          <div style={{ marginTop: 28, padding: "20px 24px", background: C.goldDim, border: `1px solid ${C.goldBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, letterSpacing: "0.12em", marginBottom: 4 }}>INTELLIGENCE · €99/MO</div>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, margin: 0, fontWeight: 300 }}>
                {lang === "es" ? "Desbloquea el Financial Intelligence System y Macro Pulse, además de acceso anticipado a Valuation Engine y Deal Flow Radar (próximamente)." : "Unlock the Financial Intelligence System and Macro Pulse, plus early access to Valuation Engine and Deal Flow Radar (coming soon)."}
              </p>
            </div>
            <button
              onClick={openPricing}
              style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", padding: "10px 24px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              {lang === "es" ? "VER PLANES →" : "VIEW PLANS →"}
            </button>
          </div>
        </FadeIn>
      )}

      {upgradeTool && (
        <UpgradeModal
          tool={upgradeTool}
          lang={lang}
          onClose={() => setUpgradeTool(null)}
          onOpenPricing={openPricing}
        />
      )}

      {/* Tool overlays */}
      {showGeoRisk && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <button onClick={() => setShowGeoRisk(false)} style={{ position: "fixed", top: 16, right: 24, zIndex: 301, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
            ✕ CLOSE DASHBOARD
          </button>
          <GeoRiskDashboard />
        </div>
      )}

      {showGeoRiskML && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <button onClick={() => setShowGeoRiskML(false)} style={{ position: "fixed", top: 16, right: 24, zIndex: 301, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
            ✕ CLOSE ML DASHBOARD
          </button>
          <GeoRiskML />
        </div>
      )}

      {showVisor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <button onClick={() => setShowVisor(false)} style={{ position: "fixed", top: 16, right: 24, zIndex: 301, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", padding: "8px 20px", background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontWeight: 600 }}>
            ✕ CLOSE VISOR
          </button>
          <RealEstateVisor
            pendingReport={pendingVisorReport}
            onReportHandled={() => setPendingVisorReport(null)}
            useAuth={useAuth}
          />
        </div>
      )}

      {showFIS && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <FinancialIntelligenceSystem onClose={() => setShowFIS(false)} />
        </div>
      )}

      {showMacroPulse && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "auto" }}>
          <MacroPulse onClose={() => setShowMacroPulse(false)} />
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



const LegalModal = ({ open, onClose, content }) => {
  if (!open || !content) return null;
  return (
    <Modal open={open} onClose={onClose} title={content.title}>
      <p style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", color: C.textMuted, marginTop: 0, marginBottom: 20 }}>{content.updated}</p>
      {content.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <h4 style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 6px" }}>{s.h}</h4>
          {s.p.map((para, j) => (
            <p key={j} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.6, color: C.textSec, margin: "0 0 8px" }}>{para}</p>
          ))}
        </div>
      ))}
    </Modal>
  );
};

const Footer = ({ lang }) => {
  const t = T[lang].footer;
  const [legalModal, setLegalModal] = useState(null);
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px clamp(16px,4vw,48px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
          <button onClick={() => setLegalModal("privacy")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.08em", color: C.textMuted, textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t.privacyLink}
          </button>
          <button onClick={() => setLegalModal("legal")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.08em", color: C.textMuted, textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t.legalLink}
          </button>
        </div>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em" }}>{t.legal}</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.15em" }}>{t.loc}</span>
        </div>
      </div>
      <LegalModal open={!!legalModal} onClose={() => setLegalModal(null)} content={legalModal ? LEGAL_TEXT[lang][legalModal] : null} />
    </footer>
  );
};

const ZRCPlatform = () => {
  const [lang, setLang] = useState("es");
  const [icPage, setIcPage] = useState(null);

  const onNav = (id) => {
    if (id === "inner-circle") { setIcPage("inner-circle"); return; }
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AuthProvider lang={lang}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; color: ${C.text}; }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        button { transition: opacity 0.2s; }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        html { overflow-x: hidden; }
        body { overflow-x: hidden; }

        @media (max-width: 860px) {
          .nav-hamburger { display: flex !important; }
          .nav-links {
            display: none !important;
          }
          .nav-links.nav-links-open {
            display: flex !important;
            flex-direction: column;
            align-items: stretch;
            gap: 2px;
            position: fixed;
            top: 120px;
            left: 0;
            right: 0;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            background: rgba(9,9,11,0.98);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid ${C.border};
            padding: 8px 20px 20px;
          }
          .nav-links.nav-links-open button {
            width: 100%;
            text-align: left;
            padding: 12px 0 !important;
            border-bottom: 1px solid ${C.border};
          }
        }
      `}</style>

      {icPage === "inner-circle" && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, overflow:"auto", background:"#09090B" }}>
          <InnerCircleAccess
            onBack={() => setIcPage(null)}
            onApproved={() => {
              localStorage.setItem("zrc-inner-circle-access", "true");
              setIcPage("inner-circle-private");
            }}
          />
        </div>
      )}
      {icPage === "inner-circle-private" && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, overflow:"auto", background:"#09090B" }}>
          <ProtectedInnerCircle
            onBack={() => setIcPage(null)}
            onUnauthorized={() => setIcPage("inner-circle")}
          />
        </div>
      )}
      <Nav lang={lang} setLang={setLang} onNav={onNav} />
      <MarketTicker lang={lang} />
      <Hero lang={lang} onNav={onNav} />
      <GoldDivider />
      <Observatory lang={lang} useAuth={useAuth} useHeadlines={useHeadlines} FadeIn={FadeIn} Sec={Sec} SH={SH} GoldDivider={GoldDivider} T={T} />
      <GoldDivider />
      <Intelligence lang={lang} />
      <GoldDivider />
      <GeoRiskIndex lang={lang} FadeIn={FadeIn} Sec={Sec} SH={SH} GoldDivider={GoldDivider} />
      <GoldDivider />
      <Brokerage lang={lang} />
      <GoldDivider />
      <Advisory lang={lang} />
      <GoldDivider />
      <Academia lang={lang} />
      <GoldDivider />


      <Community lang={lang} onAccess={() => setIcPage("inner-circle-private")} />
      <Footer lang={lang} />
      <ZenithAssistant lang={lang} onNav={onNav} hidden={!!icPage} />
    </AuthProvider>
  );
};

export { ZRCPlatform };
export default ZRCPlatform;
