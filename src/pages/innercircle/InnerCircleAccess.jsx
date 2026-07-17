import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  const [mode, setMode]         = useState("check");
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
    if (!email || !name || !profile) return;
    setLoading(true);

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
    background:"#06080C", padding:"48px 28px",
  };
  const cardStyle = {
    maxWidth:460, width:"100%", textAlign:"center",
  };

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
        {onBack && <button onClick={onBack} style={{ marginTop:36, background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.5vw,11px)", letterSpacing:"0.3em", color:"rgba(232,224,204,0.5)", cursor:"pointer" }}>← VOLVER</button>}
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
            El acceso es por invitación y aprobación manual.<br/>Completa tu perfil para que podamos evaluar tu solicitud.
          </p>
        </div>
        <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Nombre completo *</span>
            <input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} required placeholder="Luis García" />
          </label>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Email</span>
            <input style={{ ...inputStyle, color:"rgba(232,224,204,0.6)" }} value={email} readOnly />
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
          <button onClick={() => { setMode("check"); setMessage(""); }} style={{ background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.5vw,11px)", letterSpacing:"0.3em", color:"rgba(232,224,204,0.5)", cursor:"pointer" }}>← VOLVER</button>
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
        <p style={{ fontFamily:"'Cormorant',serif", fontSize:"clamp(16px,4.5vw,18px)", fontStyle:"italic", color:"rgba(232,224,204,0.65)", marginBottom:52, lineHeight:1.75 }}>
          Inteligencia privada. Acceso por invitación.
        </p>
        <form onSubmit={handleCheck} style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="Su email..."
            style={{ ...inputStyle, textAlign:"center", fontSize:"clamp(16px,4.5vw,18px)", borderBottom:`1px solid rgba(184,152,42,0.55)` }} />
          <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
            <input type={showPw ? "text" : "password"} required value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Contraseña..."
              style={{ ...inputStyle, textAlign:"center", fontSize:"clamp(16px,4.5vw,18px)", borderBottom:`1px solid rgba(184,152,42,0.55)`, paddingRight:36 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position:"absolute", right:0, background:"none", border:"none", cursor:"pointer", padding:"6px", color:"rgba(184,152,42,0.7)", display:"flex", alignItems:"center" }}>
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
        {onBack && <button onClick={onBack} style={{ marginTop:28, background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:"clamp(10px,2.5vw,11px)", letterSpacing:"0.3em", color:"rgba(232,224,204,0.4)", cursor:"pointer" }}>← VOLVER</button>}
      </div>
    </div>
  );
}
