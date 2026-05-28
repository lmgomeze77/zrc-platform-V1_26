import { useState, useEffect } from "react";

// Always call the Cloudflare Worker — works regardless of frontend host
const IC_API = "https://zenith-risecapital.lmgomeze77.workers.dev";
const IC_EMAIL_KEY = "zrc-ic-email"; // localStorage key for email pre-fill

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
  width:"100%", border:"none", borderBottom:"1px solid rgba(184,152,42,0.3)",
  background:"transparent", outline:"none", padding:"8px 0",
  fontFamily:"'Outfit',sans-serif", fontSize:14, color:"#E8E0CC",
  boxSizing:"border-box",
};
const labelStyle = {
  display:"block", fontFamily:"'IBM Plex Mono',monospace", fontSize:9,
  letterSpacing:"0.35em", textTransform:"uppercase", color:"rgba(232,224,204,0.4)",
  marginBottom:6,
};

export default function InnerCircleAccess({ onBack, onApproved }) {
  const [mode, setMode]     = useState("check");
  const [email, setEmail]   = useState(() => localStorage.getItem(IC_EMAIL_KEY) || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Request form fields
  const [name, setName]         = useState("");
  const [org, setOrg]           = useState("");
  const [profile, setProfile]   = useState("");
  const [reason, setReason]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Auto-check on mount if a saved email exists
  useEffect(() => {
    const saved = localStorage.getItem(IC_EMAIL_KEY);
    if (saved && saved.includes("@")) autoCheck(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function autoCheck(savedEmail) {
    setLoading(true);
    try {
      const res = await fetch(`${IC_API}/api/inner-circle/check?email=${encodeURIComponent(savedEmail)}`);
      const data = await res.json();
      if (data.status === "approved") {
        if (onApproved) { onApproved(); return; }
        localStorage.setItem("zrc-inner-circle-access", "true");
        window.location.reload();
      }
    } catch { /* silent — user can still submit manually */ }
    setLoading(false);
  }

  // ── CHECK: is this email approved? ──────────────────────────
  async function handleCheck(e) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true); setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem(IC_EMAIL_KEY, cleanEmail); // remember for next time

    try {
      const res = await fetch(
        `${IC_API}/api/inner-circle/check?email=${encodeURIComponent(cleanEmail)}`
      );
      const data = await res.json();

      if (data.status === "approved") {
        setLoading(false);
        if (onApproved) { onApproved(); return; }
        // Fallback if parent doesn't pass onApproved
        localStorage.setItem("zrc-inner-circle-access", "true");
        window.location.reload();
        return;
      }
      if (data.status === "pending") {
        setMessage("Tu solicitud está siendo revisada. Te contactaremos pronto.");
        setLoading(false);
        return;
      }
    } catch {
      setMessage("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    // Not found — show request form
    setMode("request");
    setLoading(false);
  }

  // ── REQUEST: submit membership application ──────────────────
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
        setMessage("Este email ya tiene acceso. Usa el formulario anterior.");
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
    background:"#06080C", padding:"40px 24px",
  };
  const cardStyle = {
    maxWidth:460, width:"100%", textAlign:"center",
  };

  // ── SUBMITTED STATE ─────────────────────────────────────────
  if (submitted) return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ width:48, height:48, borderRadius:"50%", border:`1px solid ${G}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", background:"rgba(184,152,42,0.08)" }}>
          <span style={{ color:G, fontSize:20 }}>✓</span>
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontStyle:"italic", color:"#E8E0CC", marginBottom:12 }}>Solicitud recibida</h2>
        <p style={{ fontFamily:"'Cormorant',serif", fontSize:16, color:"rgba(232,224,204,0.5)", lineHeight:1.7, marginBottom:32 }}>
          Revisaremos tu perfil y te contactaremos en los próximos días.<br/>Las admisiones son manuales y selectivas.
        </p>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.3em", color:"rgba(184,152,42,0.5)" }}>
          luis@zenithrisecapital.com
        </p>
        {onBack && <button onClick={onBack} style={{ marginTop:32, background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.3em", color:"rgba(232,224,204,0.3)", cursor:"pointer" }}>← VOLVER</button>}
      </div>
    </div>
  );

  // ── REQUEST FORM ────────────────────────────────────────────
  if (mode === "request") return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, maxWidth:520, textAlign:"left" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.45em", color:"rgba(184,152,42,0.6)", marginBottom:20 }}>ZRC INNER CIRCLE</p>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontStyle:"italic", color:"#E8E0CC", marginBottom:12 }}>Solicitar acceso</h2>
          <p style={{ fontFamily:"'Cormorant',serif", fontSize:15, color:"rgba(232,224,204,0.45)", lineHeight:1.7 }}>
            El acceso es por invitación y aprobación manual.<br/>Completa tu perfil para que podamos evaluar tu solicitud.
          </p>
        </div>
        <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Nombre completo *</span>
            <input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} required placeholder="Luis García" />
          </label>
          <label style={{ display:"block" }}>
            <span style={labelStyle}>Email</span>
            <input style={{ ...inputStyle, color:"rgba(232,224,204,0.5)" }} value={email} readOnly />
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
              style={{ ...inputStyle, resize:"none", paddingTop:8 }} />
          </label>
          {message && <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.25em", color:"rgba(184,152,42,0.7)", textAlign:"center" }}>{message}</p>}
          <button type="submit" disabled={loading}
            style={{ marginTop:8, background:G, border:"none", color:"#000", padding:"12px 24px", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.4em", cursor:"pointer", borderRadius:4, fontWeight:600 }}>
            {loading ? "ENVIANDO..." : "ENVIAR SOLICITUD"}
          </button>
          <p style={{ textAlign:"center", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.25em", color:"rgba(232,224,204,0.25)", lineHeight:1.7 }}>
            Aprobación manual. El envío no garantiza acceso.
          </p>
        </form>
        <div style={{ textAlign:"center", marginTop:20 }}>
          <button onClick={() => setMode("check")} style={{ background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.3em", color:"rgba(232,224,204,0.3)", cursor:"pointer" }}>← VOLVER</button>
        </div>
      </div>
    </div>
  );

  // ── CHECK FORM (default) ────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.45em", color:"rgba(184,152,42,0.6)", marginBottom:32 }}>ZRC CONFIDENCIAL</p>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:38, fontStyle:"italic", color:"#E8E0CC", marginBottom:10, fontWeight:400 }}>The Inner Circle</h2>
        <p style={{ fontFamily:"'Cormorant',serif", fontSize:17, fontStyle:"italic", color:"rgba(232,224,204,0.45)", marginBottom:48, lineHeight:1.7 }}>
          Inteligencia privada. Acceso por invitación.
        </p>
        <form onSubmit={handleCheck} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="Su email..."
            style={{ ...inputStyle, textAlign:"center", fontSize:16, borderBottom:`1px solid rgba(184,152,42,0.4)` }} />
          <button type="submit" disabled={loading}
            style={{ background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.45em", color:G, cursor:"pointer", padding:"10px 0", transition:"opacity 0.2s" }}>
            {loading ? "..." : "ACCEDER"}
          </button>
        </form>
        {message && <p style={{ marginTop:20, fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.25em", color:"rgba(184,152,42,0.6)", lineHeight:1.8 }}>{message}</p>}
        {onBack && <button onClick={onBack} style={{ marginTop:36, background:"none", border:"none", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.3em", color:"rgba(232,224,204,0.25)", cursor:"pointer" }}>← VOLVER</button>}
      </div>
    </div>
  );
}
