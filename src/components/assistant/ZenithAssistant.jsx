import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════
// ZENITH ASSISTANT — concierge IA para visitantes
// Saluda al visitante y le guía hacia el Observatorio (buque insignia),
// GeoRisk Dashboard, Real Estate Visor y el resto de la plataforma.
// Reglas de negocio: nunca dirige a Brokerage/oportunidades de inversión
// y nunca promociona The Inner Circle.
// ══════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#09090B", surface: "#111113", surface2: "#18181B",
  border: "#27272A", text: "#FAFAFA", textSec: "#A1A1AA", textMuted: "#71717A",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.12)", goldBorder: "rgba(212,168,83,0.25)",
  green: "#22C55E",
};

const F = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body: "'Outfit', 'Helvetica Neue', sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', monospace",
};

const API_BASE = "https://zenith-risecapital.lmgomeze77.workers.dev";

// Acciones permitidas. El modelo solo puede emitir etiquetas de esta lista;
// cualquier otra se descarta. Brokerage e Inner Circle quedan fuera a propósito.
const ACTIONS = {
  "goto:observatory":   { type: "goto", target: "observatory",   label: { es: "Ir al Observatorio →",            en: "Go to the Observatory →" } },
  "goto:intelligence":  { type: "goto", target: "intelligence",  label: { es: "Ver las herramientas →",          en: "See the tools →" } },
  "goto:georisk-index": { type: "goto", target: "georisk-index", label: { es: "Ver el GeoRisk Index →",          en: "View the GeoRisk Index →" } },
  "goto:academia":      { type: "goto", target: "academia",      label: { es: "Ir a Zenith Academia →",          en: "Go to Zenith Academia →" } },
  "goto:advisory":      { type: "goto", target: "advisory",      label: { es: "Ir a Advisory →",                 en: "Go to Advisory →" } },
  "open:georisk":       { type: "open", target: "GeoRisk Dashboard",           label: { es: "Abrir GeoRisk Dashboard →",  en: "Open GeoRisk Dashboard →" } },
  "open:georisk-ml":    { type: "open", target: "GeoRisk Predictive ML",       label: { es: "Abrir GeoRisk ML →",         en: "Open GeoRisk ML →" } },
  "open:visor":         { type: "open", target: "Real Estate Visor",           label: { es: "Abrir el Visor →",           en: "Open the Visor →" } },
  "open:fis":           { type: "open", target: "Financial Intelligence System", label: { es: "Abrir FIS →",              en: "Open FIS →" } },
  "open:macro-pulse":   { type: "open", target: "Macro Pulse",                 label: { es: "Abrir Macro Pulse →",        en: "Open Macro Pulse →" } },
};

const T = {
  es: {
    title: "ZENITH ASSISTANT",
    status: "En línea",
    greeting: "Hola, soy el asistente de Zenith Rise Capital. ¿Quieres saber cómo valoramos el riesgo geopolítico y su impacto en determinados activos a 12 meses? ¿O probar el geolocalizador de referencias catastrales con capas de información de valor? Te enseño la plataforma.",
    chips: [
      { text: "Observatorio — nuestro buque insignia", action: "goto:observatory" },
      { text: "Riesgo geopolítico a 12 meses", action: "open:georisk" },
      { text: "Geolocalizador catastral nacional", action: "open:visor" },
      { text: "Señales de bancos centrales", action: "open:macro-pulse" },
    ],
    placeholder: "Pregúntame sobre la plataforma...",
    send: "Enviar",
    error: "No consigo conectar en este momento. Prueba de nuevo en unos segundos, o explora directamente el Observatorio.",
    open: "Abrir asistente",
    close: "Cerrar asistente",
  },
  en: {
    title: "ZENITH ASSISTANT",
    status: "Online",
    greeting: "Hi, I'm the Zenith Rise Capital assistant. Want to see how we score geopolitical risk and its 12-month impact on specific assets? Or try the national cadastral geolocator with value-added data layers? Let me show you around.",
    chips: [
      { text: "Observatory — our flagship", action: "goto:observatory" },
      { text: "12-month geopolitical risk", action: "open:georisk" },
      { text: "National cadastral geolocator", action: "open:visor" },
      { text: "Central bank signals", action: "open:macro-pulse" },
    ],
    placeholder: "Ask me about the platform...",
    send: "Send",
    error: "I can't connect right now. Try again in a few seconds, or explore the Observatory directly.",
    open: "Open assistant",
    close: "Close assistant",
  },
};

const buildSystemPrompt = (lang) => `Eres el asistente virtual de la web de Zenith Rise Capital (ZRC), una plataforma de inteligencia geopolítica, análisis de inversión, advisory y formación (zenithrisecapital.com). Tu trabajo es dar la bienvenida a los visitantes, sugerirles qué explorar y responder dudas sobre la plataforma.

SECCIONES Y HERRAMIENTAS (con su etiqueta de acción):
- Observatorio Geopolítico — EL BUQUE INSIGNIA de la plataforma. Feed de inteligencia en tiempo real: señales macro filtradas con lente de inversión, cada señal mapeada a implicaciones de cartera. Etiqueta: [[goto:observatory]]
- GeoRisk Dashboard — scoring de riesgo geopolítico en tiempo real con sliders de escenario y su impacto estimado en determinados activos a 12 meses. Etiqueta: [[open:georisk]]
- GeoRisk Predictive ML — análisis geopolítico predictivo con IA: forecast a 12 meses, NLP analyzer, matriz de correlaciones. Etiqueta: [[open:georisk-ml]]
- GeoRisk Index — índice de riesgo geopolítico de ZRC. Etiqueta: [[goto:georisk-index]]
- Real Estate Visor — geolocalizador de referencias catastrales a nivel nacional (España) con capas de información de valor (catastro, riesgo, planeamiento) que ayudan en la selección de oportunidades inmobiliarias. Etiqueta: [[open:visor]]
- Financial Intelligence System (FIS) — motor de inteligencia financiera para PYMEs: cash flow 13 semanas, capital circulante, motor de riesgos e informe generado por IA. Etiqueta: [[open:fis]]
- Macro Pulse — tracker de señales de bancos centrales con NLP: ciclos de tipos, divergencia Fed–BCE. Etiqueta: [[open:macro-pulse]]
- Zenith Academia — programas de formación de nivel postgrado impartidos por practitioners. Etiqueta: [[goto:academia]]
- Advisory — M&A y growth strategy institucional para empresas. Etiqueta: [[goto:advisory]]
- Vista general de las herramientas de Intelligence. Etiqueta: [[goto:intelligence]]

DATOS DE ACCESO: el registro en la web es gratuito y desbloquea el análisis completo del Observatorio y el Real Estate Visor. Las herramientas avanzadas (GeoRisk Dashboard, GeoRisk ML, FIS, Macro Pulse) requieren el plan Intelligence (99 €/mes).

REGLAS ESTRICTAS — cúmplelas siempre:
1. NUNCA dirijas al visitante a oportunidades de inversión ni a la sección Brokerage. Ese acceso está reservado a perfiles cualificados. Si preguntan por invertir o por oportunidades concretas, dilo con elegancia y redirige al Observatorio o al contacto de Advisory.
2. NUNCA menciones ni promociones "The Inner Circle" por iniciativa propia. Si el visitante pregunta directamente por él, responde únicamente que es una comunidad privada solo por invitación, sin más detalles y sin animar a solicitar acceso.
3. NUNCA des asesoramiento de inversión, recomendaciones de compra/venta, ni predicciones personalizadas. El contenido de ZRC es informativo y educativo. Si te lo piden, decláralo y sugiere el Observatorio.
4. Sé breve: 1 a 3 frases por respuesta. Tono profesional, cercano y directo. Sin emojis.
5. Cuando sugieras una sección o herramienta, termina la respuesta con EXACTAMENTE UNA etiqueta de acción de la lista anterior, en su formato literal [[...]]. Nunca inventes etiquetas nuevas ni uses más de una.
6. Responde en el idioma en el que te escriba el usuario. Si no está claro, usa ${lang === "en" ? "inglés" : "español"}.
7. No inventes datos, precios ni funcionalidades que no estén en esta lista. Si no sabes algo, dilo y sugiere el formulario de contacto de Advisory.`;

// ── Capa 0: respuestas locales de coste cero ────────────────────────────────
// Las preguntas más comunes se responden sin llamar a ninguna API.
// El orden importa: las reglas de negocio (inversión, Inner Circle) van primero.
const FAQ = [
  {
    re: /inner\s*circle/,
    a: {
      es: "The Inner Circle es una comunidad privada, solo por invitación. No puedo contarte más por aquí.",
      en: "The Inner Circle is a private, invitation-only community. That's all I can share here.",
    },
    action: null,
  },
  {
    re: /(invertir|inversion|inversor|oportunidad|brokerage|off.?market|comprar (un|una|activos)|rentabilidad|ticket)/,
    a: {
      es: "El acceso a oportunidades de inversión está reservado a perfiles cualificados. Mientras tanto, el Observatorio te enseña cómo pensamos: señales macro con lente de inversión.",
      en: "Access to investment opportunities is reserved for qualified profiles. In the meantime, the Observatory shows you how we think: macro signals through an investment lens.",
    },
    action: "goto:observatory",
  },
  {
    re: /(asesor|recomiendas|deberia (comprar|vender)|que (compro|vendo)|advice|should i (buy|sell))/,
    a: {
      es: "No doy asesoramiento de inversión: el contenido de ZRC es informativo y educativo. Para ver cómo analizamos el mercado, empieza por el Observatorio.",
      en: "I don't give investment advice: ZRC content is informational and educational. To see how we analyse markets, start with the Observatory.",
    },
    action: "goto:observatory",
  },
  {
    re: /(precio|cuanto cuesta|coste|cost|price|pricing|plan(es)?\b|suscripcion|subscription|gratis|free)/,
    a: {
      es: "El registro es gratuito y desbloquea el análisis completo del Observatorio y el Real Estate Visor. Las herramientas avanzadas requieren el plan Intelligence (99 €/mes).",
      en: "Registration is free and unlocks the full Observatory analysis and the Real Estate Visor. Advanced tools require the Intelligence plan (€99/month).",
    },
    action: "goto:intelligence",
  },
  {
    re: /(georisk|geopolitic|riesgo|12 meses|12.?month)/,
    a: {
      es: "El GeoRisk Dashboard puntúa el riesgo geopolítico en tiempo real y estima su impacto en determinados activos a 12 meses, con sliders de escenario.",
      en: "The GeoRisk Dashboard scores geopolitical risk in real time and estimates its 12-month impact on specific assets, with scenario sliders.",
    },
    action: "open:georisk",
  },
  {
    re: /(visor|catastr|inmobiliari|real.?estate|parcela|referencia|suelo|finca)/,
    a: {
      es: "El Real Estate Visor geolocaliza referencias catastrales a nivel nacional con capas de información de valor: catastro, riesgo y planeamiento.",
      en: "The Real Estate Visor geolocates cadastral references nationwide with value-added data layers: cadastre, risk and planning.",
    },
    action: "open:visor",
  },
  {
    re: /(macro|banco.?s? centrale?s?|central bank|\bfed\b|\bbce\b|\becb\b|tipos de interes|interest rate)/,
    a: {
      es: "Macro Pulse rastrea señales de bancos centrales con NLP: ciclos de tipos y divergencia Fed–BCE.",
      en: "Macro Pulse tracks central-bank signals with NLP: rate cycles and Fed–ECB divergence.",
    },
    action: "open:macro-pulse",
  },
  {
    re: /(\bfis\b|pyme|financial intelligence|cash.?flow|tesoreria|circulante)/,
    a: {
      es: "El Financial Intelligence System es un motor financiero para PYMEs: cash flow a 13 semanas, capital circulante e informe generado por IA.",
      en: "The Financial Intelligence System is a financial engine for SMEs: 13-week cash flow, working capital and an AI-generated report.",
    },
    action: "open:fis",
  },
  {
    re: /(academia|curso|formacion|course|education|master|programa)/,
    a: {
      es: "Zenith Academia ofrece programas de nivel postgrado impartidos por practitioners.",
      en: "Zenith Academia offers postgraduate-level programs taught by practitioners.",
    },
    action: "goto:academia",
  },
  {
    re: /(advisory|m&a|fusiones|adquisicion|growth|capital raising|asesoria)/,
    a: {
      es: "Advisory acompaña a empresas en M&A y estrategia de crecimiento con framework institucional.",
      en: "Advisory supports companies through M&A and growth strategy with an institutional framework.",
    },
    action: "goto:advisory",
  },
  {
    re: /(observatorio|observatory|feed|senales|signals|noticias|briefing)/,
    a: {
      es: "El Observatorio es el buque insignia: un feed de inteligencia en tiempo real donde cada señal macro se mapea a implicaciones de cartera.",
      en: "The Observatory is our flagship: a real-time intelligence feed where every macro signal maps to portfolio implications.",
    },
    action: "goto:observatory",
  },
  {
    re: /(registr|crear cuenta|cuenta gratis|sign.?up|acceder|login)/,
    a: {
      es: "Puedes crear una cuenta gratuita con el botón LOGIN de la barra superior. Desbloquea el Observatorio completo y el Real Estate Visor.",
      en: "You can create a free account via the LOGIN button in the top bar. It unlocks the full Observatory and the Real Estate Visor.",
    },
    action: null,
  },
  {
    re: /^(hola|buenas|buenos dias|buenas tardes|hey|hi|hello)\b/,
    a: {
      es: "Hola. Pregúntame por cualquier sección de la plataforma, o elige una de las sugerencias de arriba.",
      en: "Hi. Ask me about any section of the platform, or pick one of the suggestions above.",
    },
    action: null,
  },
];

const matchFAQ = (text) => {
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return FAQ.find((f) => f.re.test(norm)) || null;
};

// Extrae la primera etiqueta de acción válida y devuelve el texto limpio.
const parseAssistantReply = (raw) => {
  let action = null;
  const text = raw.replace(/\[\[([a-z-]+:[a-z-]+)\]\]/gi, (m, key) => {
    const k = key.toLowerCase();
    if (!action && ACTIONS[k]) action = k;
    return "";
  }).replace(/\s{2,}/g, " ").trim();
  return { text, action };
};

const ZenithAssistant = ({ lang = "es", onNav, hidden = false }) => {
  const t = T[lang] || T.es;
  const [open, setOpen] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-apertura: una vez por sesión, a los 2,5s de entrar en la web.
  useEffect(() => {
    if (sessionStorage.getItem("zrc-assistant-greeted")) { setGreeted(true); return; }
    const timer = setTimeout(() => {
      setOpen(true);
      setGreeted(true);
      sessionStorage.setItem("zrc-assistant-greeted", "1");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", text: t.greeting, chips: true }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  const runAction = useCallback((key) => {
    const a = ACTIONS[key];
    if (!a) return;
    setOpen(false);
    if (a.type === "goto") {
      onNav && onNav(a.target);
    } else if (a.type === "open") {
      onNav && onNav("intelligence");
      // Pequeño margen para que el scroll llegue antes de abrir la herramienta.
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("zrc-open-tool", { detail: { tool: a.target } }));
      }, 450);
    }
  }, [onNav]);

  const sendMessage = async (text) => {
    const clean = text.trim();
    if (!clean || loading) return;
    const nextMessages = [...messages, { role: "user", text: clean }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    // Capa 0 — respuesta local de coste cero para las preguntas más comunes.
    const faq = matchFAQ(clean);
    if (faq) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", text: faq.a[lang] || faq.a.es, action: faq.action }]);
        setLoading(false);
      }, 450);
      return;
    }

    // Historial para la API: desde el primer mensaje del usuario, texto plano.
    const firstUser = nextMessages.findIndex((m) => m.role === "user");
    const apiMessages = nextMessages.slice(firstUser).slice(-6).map((m) => ({
      role: m.role,
      content: m.text,
    }));

    // Capas 1 y 2 — el Worker intenta Claude Haiku y, si falla, Workers AI (gratis).
    try {
      const res = await fetch(`${API_BASE}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(lang),
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.text) throw new Error(data?.error || "empty");
      const { text: replyText, action } = parseAssistantReply(data.text);
      setMessages((prev) => [...prev, { role: "assistant", text: replyText || data.text, action }]);
    } catch {
      // Capa 3 — mensaje estático.
      setMessages((prev) => [...prev, { role: "assistant", text: t.error, action: "goto:observatory" }]);
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes za-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(212,168,83,0.35); } 50% { box-shadow: 0 0 0 10px rgba(212,168,83,0); } }
        @keyframes za-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes za-dot { 0%,80%,100% { opacity: 0.25; } 40% { opacity: 1; } }
        .za-panel ::-webkit-scrollbar { width: 4px; }
        .za-panel ::-webkit-scrollbar-thumb { background: ${C.border}; }
        .za-chip:hover, .za-action:hover { background: ${C.goldDim} !important; border-color: ${C.gold} !important; }
        @media (max-width: 480px) {
          .za-panel { right: 12px !important; left: 12px !important; width: auto !important; }
        }
      `}</style>

      {open && (
        <div
          className="za-panel"
          role="dialog"
          aria-label={t.title}
          style={{
            position: "fixed", bottom: 92, right: 24, zIndex: 250,
            width: 372, maxWidth: "calc(100vw - 32px)",
            height: "min(540px, calc(100dvh - 130px))",
            background: C.surface, border: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            animation: "za-in 0.35s ease",
          }}
        >
          {/* Cabecera */}
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.surface2 }}>
            <div style={{ width: 34, height: 34, border: `1px solid ${C.goldBorder}`, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: C.gold, fontSize: 15 }}>◈</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.18em", color: C.text, fontWeight: 600 }}>{t.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>{t.status}</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.close}
              style={{ background: "none", border: "none", color: C.textMuted, fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}
            >✕</button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                <div style={{
                  maxWidth: "88%", padding: "10px 14px",
                  background: m.role === "user" ? C.goldDim : C.surface2,
                  border: `1px solid ${m.role === "user" ? C.goldBorder : C.border}`,
                  fontFamily: F.body, fontSize: 13, lineHeight: 1.55, color: C.text, fontWeight: 300,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.text}
                </div>

                {m.action && ACTIONS[m.action] && (
                  <button
                    className="za-action"
                    onClick={() => runAction(m.action)}
                    style={{
                      fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em",
                      padding: "8px 14px", background: "transparent", color: C.gold,
                      border: `1px solid ${C.goldBorder}`, cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {ACTIONS[m.action].label[lang] || ACTIONS[m.action].label.es}
                  </button>
                )}

                {m.chips && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 2 }}>
                    {t.chips.map((chip, j) => (
                      <button
                        key={j}
                        className="za-chip"
                        onClick={() => runAction(chip.action)}
                        style={{
                          textAlign: "left", fontFamily: F.body, fontSize: 12.5, fontWeight: 300,
                          padding: "9px 13px", background: "transparent", color: C.textSec,
                          border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        <span style={{ color: C.gold, marginRight: 8 }}>{ACTIONS[chip.action]?.type === "open" ? "◈" : "→"}</span>
                        {chip.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 5, padding: "10px 14px", alignSelf: "flex-start", background: C.surface2, border: `1px solid ${C.border}` }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: C.gold, animation: `za-dot 1.2s ease infinite ${d * 0.2}s` }} />
                ))}
              </div>
            )}
          </div>

          {/* Entrada */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              style={{
                flex: 1, padding: "10px 12px", background: C.surface2,
                border: `1px solid ${C.border}`, color: C.text,
                fontFamily: F.body, fontSize: 13, outline: "none", minWidth: 0,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label={t.send}
              style={{
                fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", padding: "0 16px",
                background: input.trim() && !loading ? C.gold : C.surface2,
                color: input.trim() && !loading ? C.bg : C.textMuted,
                border: "none", cursor: input.trim() && !loading ? "pointer" : "default", fontWeight: 600,
              }}
            >→</button>
          </div>
        </div>
      )}

      {/* Lanzador */}
      <button
        onClick={() => { setOpen((o) => !o); if (!greeted) { setGreeted(true); sessionStorage.setItem("zrc-assistant-greeted", "1"); } }}
        aria-label={open ? t.close : t.open}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 250,
          width: 54, height: 54, borderRadius: "50%",
          background: C.surface, border: `1px solid ${C.goldBorder}`,
          color: C.gold, fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: greeted && !open ? "none" : "za-pulse 2.2s ease infinite",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {open ? "✕" : "◈"}
      </button>
    </>
  );
};

export default ZenithAssistant;
