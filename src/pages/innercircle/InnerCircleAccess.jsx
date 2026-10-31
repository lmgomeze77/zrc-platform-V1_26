import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import InnerCircleValue from "./InnerCircleValue";

const IC_API = "https://zenith-risecapital.lmgomeze77.workers.dev";
const IC_EMAIL_KEY = "zrc-ic-email";

const G = "#D4A853";
const PROFILE_CATEGORIES = [
  "Investor — Family Office",
  "Investor — Institutional",
  "Investor — Private Equity / VC",
  "Investor — Real Assets",
  "Investment Manager / Portfolio Manager",
  "CIO / Chief Investment Officer",
  "CFO / Finance Director",
  "Investment Banker / M&A Advisor",
  "Broker / Capital Markets",
  "Real Estate Professional",
  "Corporate Executive / CEO",
  "Entrepreneur / Business Owner",
  "Academic / Researcher",
  "Geopolitical Analyst / Strategist",
  "Legal / Regulatory Professional",
  "Other",
];

const inputStyle = {
  width:"100%", border:"none", borderBottom:"1px solid rgba(184,152,42,0.5)",
  background:"transparent", outline:"none", padding:"12px 0",
  fontFamily:"'Outfit',sans-serif", fontSize:"clamp(15px,4vw,17px)", color:"#E8E0CC",
  boxSizing:"border-box",
};
const labelStyle = {
  display:"block", fontFamily:"'IBM Plex Mono',monospace",
  fontSize:"clamp(10px,2.5vw,11px)",
  letterSpacing:"0.3em", textTransform:"uppercase", color:"rgba(232,224,204,0.65)",
  marginBottom:8,
};

export default function InnerCircleAccess({ onBack, onApproved }) {
  const [mode, setMode]         = useState("overview");
  const [email, setEmail]       = useState(() => localStorage.getItem(IC_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");

  const [name, setName]         = useState("");
  const [org, setOrg]           = useState("");
  const [profile, setProfile]   = useState("");
  const [reason, setReason]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── LOGIN: verify email + password ──────────────────────────────────
  async function handleCheck(e) {
    e.preventDefault();
    if (!email.includes("@") || !password) return;
    setLoading(true); setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem(IC_EMAIL_KEY, cleanEmail);

    try {
      const res = await fetch(`${IC_API}/api/inner-circle/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();

      if (data.status === "approved") {
        localStorage.setItem("zrc-inner-circle-access", "true");
        setLoading(false);
        if (onApproved) { onApproved(); return; }
        window.location.reload();
        return;
      }

      setMessage("Credenciales incorrectas. Verifica tu email y contraseña.");
    } catch {
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
    setLoading(false);
  }

  // ── REQUEST: submit membership application ──────────────────────
  async function handleRequest(e) {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !profile) return;
    setLoading(true); setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(`${IC_API}/api/inner-circle/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim(),
          organization: org.trim() || null,
          profile_category: profile,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setSubmitted(true);
      } else if (data.error === "already_approved") {
        setMessage("Este email ya tiene acceso. Usa el formulario de inicio de sesión.");
        setMode("check");
      } else if (data.error === "already_pending") {
        setMessage("Ya tenemos una solicitud de este email. Te contactaremos pronto.");
      } else {
        setMessage(data.error || "Error al enviar la solicitud. Inténtalo de nuevo.");
      }
    } catch {
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
    setLoading(false);
  }

  const containerStyle = {
    minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
    background:"radial-gradient(ellipse at 70% 0%,#182b43,#0a1220 60%)", padding:"48px 28px", colorScheme:"dark",
  };
  const cardStyle = {
    maxWidth:460, width:"100%", textAlign:"center",
  };

  if (mode === "overview") return (
    <main className="ic-desk ic-entry">
      <header><div><span className="ic-kicker">ZENITH RISE CAPITAL</span><div style={{fontSize:20}}>The Inner Circle</div></div>{onBack && <button className="ic-button ic-button-quiet" onClick={onBack}>← Volver a ZRC</button>}</header>
      <section>
        <span className="ic-kicker">DESCUBRE LA MEMBRESÍA · SIN INICIAR SESIÓN</span>
        <h1>Decisiones internacionales.<br/><span style={{color:"var(--ic-gold)"}}>Más contexto. Un siguiente paso.</span></h1>
        <p className="ic-lead">Para empresarios, inversores y asesores que preparan una expansión, adquisición o financiación entre España y América Latina.</p>
        <div className="ic-actions"><button className="ic-button" onClick={()=>{setMode("request");setMessage("");}}>Solicitar membresía gratuita →</button><button className="ic-button ic-button-quiet" onClick={()=>{setMode("check");setMessage("");}}>Ya soy miembro · Iniciar sesión</button></div>
        <p className="ic-small">La presentación y la muestra son públicas. El área completa requiere una solicitud aprobada y las credenciales de acceso de Inner Circle.</p>
        <InnerCircleValue/>
        <div className="ic-panel" style={{marginTop:32}}><span className="ic-kicker">EN LA EDICIÓN DE OCTUBRE DE 2026</span><h2>La resiliencia tiene un coste</h2><p>Un informe sobre caja, energía y financiación, con fichas de México y Colombia, escenarios condicionales y una pauta para comité. Incluye cinco fuentes primarias y conserva el corte de información del 31 de octubre.</p><p className="ic-small">Aquí puedes valorar el enfoque; el comentario completo y la ficha personal están en el área de miembros.</p></div>
        <h2>Cómo funciona el acceso</h2>
        <div className="ic-three"><article className="ic-panel"><span className="ic-kicker">01 · SOLICITUD</span><h3>Presenta tu perfil</h3><p>Nombre, email y actividad profesional. Explica qué tipo de decisión te interesa preparar.</p></article><article className="ic-panel"><span className="ic-kicker">02 · REVISIÓN</span><h3>Admisión manual</h3><p>El equipo revisa la solicitud. Enviarla no activa el acceso ni inicia una suscripción de pago.</p></article><article className="ic-panel"><span className="ic-kicker">03 · ACCESO</span><h3>Entra con tus credenciales</h3><p>Tras la aprobación, utiliza el email y la contraseña de Inner Circle. Una cuenta gratuita de la plataforma no implica admisión en el círculo.</p></article></div>
        <details><summary>¿Qué incluye y qué se contrata aparte?</summary><p>La membresía incluye la edición mensual, los dossiers metodológicos y la ficha de decisión personal. Los planes Intelligence e Institutional y los encargos de Advisory tienen condiciones separadas. No se garantiza acceso a operaciones, presentaciones a inversores ni encuentros.</p></details>
        <details><summary>¿Dónde se guarda mi ficha?</summary><p>En el navegador donde trabajas, con opción de descarga. Actualmente no se sincroniza entre dispositivos y la fecha de revisión no genera avisos.</p></details>
      </section>
    </main>
  );

  // ── SUBMITTED STATE ───────────────────────────────────────────
  if (submitted) return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ width:56, height:56, borderRadius:"50%", border:`1px solid ${G}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 28px", background:"rgba(184,152,42,0.1)" }}>
          <span style={{ color:G, fontSize:24 }}>✓</span>
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(24px,6vw,30px)", fontStyle:"italic", color:"#E8E0CC", marginBottom:16 }}>Solicitud recibida</h2>
        <p style={{ fontFamily:"'Cormorant',serif", fontSize:"clamp(15px,4vw,17px)", color:"rgba(232,224,204,0.7)", lineHeight:1.75, marginBottom:36 }}>
          Revisaremos tu perfil y te contactaremos en los próximos días.<br/>Las admisiones son manuales y selectivas.
        </p>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,3vw,12px)", letterSpacing:"0.25em", color:"rgba(184,152,42,0.7)" }}>
          luis@zenithrisecapital.com
        </p>
        {onBack && <button onClick={onBack} style={{ marginTop:36, background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,2.8vw,13px)", letterSpacing:"0.3em", color:"rgba(232,224,204,0.85)", cursor:"pointer" }}>← VOLVER</button>}
      </div>
    </div>
  );

  // ── REQUEST FORM ────────────────────────────────────────────────────
  if (mode === "request") return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, maxWidth:520, textAlign:"left" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.5vw,11px)", letterSpacing:"0.45em", color:"rgba(184,152,42,0.75)", marginBottom:20 }}>ZRC INNER CIRCLE</p>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(26px,6.5vw,32px)", fontStyle:"italic", color:"#E8E0CC", marginBottom:14 }}>Solicitar acceso</h2>
          <p style={{ fontFamily:"'Cormorant',serif", fontSize:"clamp(15px,4vw,16px)", color:"rgba(232,224,204,0.65)", lineHeight:1.75 }}>
            La membresía es gratuita y requiere aprobación manual.<br/>Enviar el formulario no activa una suscripción de pago.
          </p>
        </div>
        <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Nombre completo *</span>
            <input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} required placeholder="Luis García" />
          </label>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Email</span>
            <input type="email" required style={inputStyle} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Organización / Empresa</span>
            <input style={inputStyle} value={org} onChange={e=>setOrg(e.target.value)} placeholder="Firma, fondo, empresa..." />
          </label>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Perfil profesional *</span>
            <select required value={profile} onChange={e=>setProfile(e.target.value)}
              style={{ ...inputStyle, cursor:"pointer", appearance:"none" }}>
              <option value="">Selecciona tu perfil...</option>
              {PROFILE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Motivo de acceso (opcional)</span>
            <textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)}
              placeholder="Describe brevemente tu interés estratégico..."
              style={{ ...inputStyle, resize:"none", paddingTop:10 }} />
          </label>
          {message && <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,3vw,12px)", letterSpacing:"0.2em", color:"rgba(184,152,42,0.85)", textAlign:"center" }}>{message}</p>}
          <button type="submit" disabled={loading}
            style={{ marginTop:8, background:G, border:"none", color:"#000", padding:"16px 24px", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,3vw,12px)", letterSpacing:"0.4em", cursor:"pointer", borderRadius:4, fontWeight:700, width:"100%" }}>
            {loading ? "ENVIANDO..." : "ENVIAR SOLICITUD"}
          </button>
          <p style={{ textAlign:"center", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.5vw,11px)", letterSpacing:"0.2em", color:"rgba(232,224,204,0.45)", lineHeight:1.8 }}>
            Aprobación manual. El envío no garantiza acceso.
          </p>
        </form>
        <div style={{ textAlign:"center", marginTop:24 }}>
          <button onClick={() => { setMode("overview"); setMessage(""); }} style={{ background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.5vw,11px)", letterSpacing:"0.3em", color:"rgba(232,224,204,0.5)", cursor:"pointer" }}>← VOLVER</button>
        </div>
      </div>
    </div>
  );

  // ── LOGIN FORM (default) ────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.8vw,11px)", letterSpacing:"0.45em", color:"rgba(184,152,42,0.8)", marginBottom:32 }}>ZRC CONFIDENCIAL</p>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(32px,9vw,42px)", fontStyle:"italic", color:"#E8E0CC", marginBottom:12, fontWeight:400 }}>The Inner Circle</h2>
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:16, color:"rgba(232,224,204,0.75)", marginBottom:32, lineHeight:1.75 }}>
          Acceso para miembros aprobados. Utiliza tus credenciales de Inner Circle.
        </p>
        <form onSubmit={handleCheck} style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
            aria-label="Email" autoComplete="email" placeholder="Su email..."
            style={{ ...inputStyle, textAlign:"center", fontSize:"clamp(16px,4.5vw,18px)", borderBottom:`1px solid rgba(184,152,42,0.55)` }} />
          <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
            <input type={showPw ? "text" : "password"} required value={password} onChange={e=>setPassword(e.target.value)}
              aria-label="Contraseña" autoComplete="current-password" placeholder="Contraseña..."
              style={{ ...inputStyle, textAlign:"center", fontSize:"clamp(16px,4.5vw,18px)", borderBottom:`1px solid rgba(184,152,42,0.55)`, paddingRight:36 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"} style={{ position:"absolute", right:0, background:"none", border:"none", cursor:"pointer", padding:"6px", color:"rgba(184,152,42,0.7)", display:"flex", alignItems:"center" }}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <button type="submit" disabled={loading}
            style={{
              marginTop:8,
              background: loading ? "rgba(184,152,42,0.15)" : "transparent",
              border:`1px solid rgba(184,152,42,0.6)`,
              borderRadius:4,
              fontFamily:"'IBM Plex Mono',monospace",
              fontSize:"clamp(12px,3.2vw,13px)",
              letterSpacing:"0.45em",
              color: G,
              cursor:"pointer",
              padding:"16px 0",
              width:"100%",
              transition:"background 0.2s, border-color 0.2s",
            }}>
            {loading ? "..." : "ACCEDER"}
          </button>
        </form>
        {message && <p style={{ marginTop:24, fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,3vw,12px)", letterSpacing:"0.2em", color:"rgba(184,152,42,0.85)", lineHeight:1.8 }}>{message}</p>}
        <div style={{ marginTop:36, borderTop:"1px solid rgba(184,152,42,0.12)", paddingTop:24 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.8vw,11px)", letterSpacing:"0.28em", color:"rgba(232,224,204,0.45)", marginBottom:12 }}>¿AÚN NO ERES MIEMBRO?</p>
          <button onClick={() => { setMode("request"); setMessage(""); }}
            style={{ background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,3vw,12px)", letterSpacing:"0.3em", color:"rgba(184,152,42,0.65)", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:3 }}>
            Solicitar membresía →
          </button>
        </div>
        <p style={{fontFamily:"Outfit,sans-serif",fontSize:13,marginTop:24}}><a style={{color:G}} href="mailto:luis@zenithrisecapital.com?subject=Inner%20Circle%20-%20Ayuda%20de%20acceso">¿Necesitas ayuda con tus credenciales?</a></p>
        <button type="button" onClick={()=>{setMode("overview");setMessage("");}} style={{marginTop:28,color:G,background:"transparent",border:"none",cursor:"pointer",fontFamily:"Outfit,sans-serif",fontSize:14}}>← Ver qué incluye la membresía</button>
        {onBack && <button onClick={onBack} style={{ marginTop:28, background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(11px,2.8vw,13px)", letterSpacing:"0.3em", color:"rgba(232,224,204,0.85)", cursor:"pointer" }}>← VOLVER</button>}
      </div>
    </div>
  );
}
