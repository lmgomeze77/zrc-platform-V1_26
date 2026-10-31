import { useState } from "react";
import EditionZero from "./EditionZero";
import InnerCircleValue from "../innercircle/InnerCircleValue";

const IC_API = "https://zenith-risecapital.lmgomeze77.workers.dev";

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

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=Cormorant+SC:wght@300;400&display=swap');

.ic-root{position:relative;width:100%;min-height:max(100vh,520px);clip-path:inset(0);background:#06080C;color:#E8E0CC;font-family:'Cormorant',serif;overflow:hidden;display:flex;flex-direction:column;}
.ic-root *,.ic-root *::before,.ic-root *::after{box-sizing:border-box;margin:0;padding:0;}
.ic-grain{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.032;background-size:256px 256px;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:ic-grain .8s steps(1) infinite;}
@keyframes ic-grain{0%,100%{background-position:0 0}10%{background-position:-20px -30px}20%{background-position:30px 10px}30%{background-position:-10px 40px}40%{background-position:40px -20px}50%{background-position:-30px 20px}60%{background-position:20px -40px}70%{background-position:-40px 10px}80%{background-position:10px 30px}90%{background-position:30px -10px}}
.ic-vig{position:absolute;inset:0;background:radial-gradient(ellipse 72% 72% at 50% 50%,transparent 0%,rgba(6,8,12,.82) 100%);pointer-events:none;z-index:0;}
.ic-light{position:absolute;top:-20vh;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(ellipse at center,rgba(184,152,42,.045) 0%,transparent 65%);pointer-events:none;z-index:0;}
.ic-top{position:relative;z-index:5;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:20px 48px;border-bottom:1px solid rgba(184,152,42,.12);opacity:0;animation:ic-appear 1s ease forwards 3.6s;}
.ic-tb-brand{font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.32em;color:rgba(232,224,204,.78);}
.ic-tb-right{font-family:'Cormorant SC',serif;font-size:12px;letter-spacing:.26em;color:rgba(212,176,80,.85);}
.ic-middle{position:relative;z-index:5;flex:1;display:flex;align-items:center;justify-content:center;padding:20px 40px;min-height:0;overflow:hidden;}
.ic-orbit{position:absolute;top:50%;left:50%;width:min(58vh,620px);height:min(58vh,620px);transform:translate(-50%,-50%);pointer-events:none;z-index:0;opacity:0;animation:ic-appear 2.2s ease forwards 2.0s;}
.ic-orbit-ring{position:absolute;inset:0;border:1px solid rgba(184,152,42,.13);border-radius:50%;animation:ic-orbit-spin 90s linear infinite;}
.ic-orbit-ring::before{content:"";position:absolute;top:-3px;left:calc(50% - 3px);width:6px;height:6px;border-radius:50%;background:rgba(212,176,80,.75);box-shadow:0 0 12px rgba(212,176,80,.5);}
.ic-orbit-inner{position:absolute;inset:9%;border:1px dashed rgba(184,152,42,.08);border-radius:50%;animation:ic-orbit-spin 140s linear infinite reverse;}
@keyframes ic-orbit-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ic-center{position:relative;z-index:1;text-align:center;width:100%;max-width:640px;}
.ic-pillars{display:flex;justify-content:center;gap:clamp(20px,4vw,44px);margin-top:20px;opacity:0;animation:ic-appear 1.4s ease forwards 3.0s;}
.ic-pillar{max-width:200px;}
.ic-pillar-title{font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.3em;color:#D4B050;margin-bottom:7px;white-space:nowrap;}
.ic-pillar-text{font-family:'Cormorant',serif;font-size:17px;font-style:italic;color:rgba(232,224,204,.82);line-height:1.45;}
.ic-eyebrow{display:block;font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.45em;color:#D4B050;opacity:0;animation:ic-appear 1.4s ease forwards .5s;margin-bottom:18px;}
.ic-title{display:block;font-family:'Playfair Display',serif;font-size:clamp(52px,8vw,118px);font-weight:400;font-style:italic;line-height:1;letter-spacing:-.025em;color:#E8E0CC;}
.ic-tw{display:block;opacity:0;transform:translateY(30px);}
.ic-tw:nth-child(1){animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.0s;}
.ic-tw:nth-child(2){animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.3s;}
.ic-tw:nth-child(3){animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.6s;color:rgba(232,224,204,.55);}
.ic-rule{width:30px;height:1px;background:#B8982A;margin:18px auto;opacity:0;animation:ic-appear 1s ease forwards 2.4s;}
.ic-tagline{font-family:'Cormorant',serif;font-size:clamp(19px,2.1vw,23px);font-style:italic;color:rgba(232,224,204,.88);letter-spacing:.02em;line-height:1.55;opacity:0;animation:ic-appear 1.4s ease forwards 2.7s;max-width:560px;margin:0 auto;}
.ic-gate{margin-top:22px;opacity:0;animation:ic-appear 1.2s ease forwards 3.1s;}
.ic-access-label{font-family:'Cormorant SC',serif;font-size:12px;letter-spacing:.4em;color:rgba(212,176,80,.9);margin-bottom:12px;}
.ic-input-row{display:flex;max-width:380px;margin:0 auto;border-bottom:1px solid rgba(212,176,80,.6);padding-bottom:5px;}
.ic-email-input{flex:1;background:transparent;border:none;outline:none;font-family:'Cormorant',serif;font-size:20px;font-style:italic;color:#F3EDE0;padding:5px 0;min-width:0;}
.ic-email-input::placeholder{color:rgba(232,224,204,.6);}
.ic-check-btn{background:none;border:none;cursor:pointer;font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.28em;color:#D4B050;padding:3px 0 3px 12px;white-space:nowrap;transition:color .3s;}
.ic-check-btn:hover{color:#D4B050;}.ic-check-btn:disabled{opacity:.4;cursor:default;}
.ic-gate-msg{margin-top:12px;font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.2em;color:rgba(212,176,80,.92);}
.ic-apply-link{background:none;border:none;cursor:pointer;font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.22em;color:#D4B050;text-decoration:underline;text-underline-offset:3px;padding:0;transition:color .3s;display:block;margin:6px auto 0;}
.ic-apply-link:hover{color:#D4B050;}
.ic-welcome{margin-top:22px;opacity:0;animation:ic-appear 1.2s ease forwards 3.1s;}
.ic-edition-link{display:inline-block;font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:.3em;color:#D4B050;border-bottom:1px solid rgba(184,152,42,.28);padding-bottom:3px;transition:color .4s,border-color .4s;cursor:pointer;background:none;border-top:none;border-left:none;border-right:none;}
.ic-edition-link:hover{color:#D4B050;border-bottom-color:rgba(212,176,80,.55);}
.ic-bottom{position:relative;z-index:5;flex-shrink:0;display:flex;justify-content:space-between;align-items:flex-end;padding:12px 48px 16px;border-top:1px solid rgba(184,152,42,.1);opacity:0;animation:ic-appear 1.2s ease forwards 4.0s;}
.ic-bl-left{font-family:'Cormorant',serif;font-size:15px;font-style:italic;color:rgba(232,224,204,.75);line-height:1.5;max-width:55%;}
.ic-bl-right{text-align:right;flex-shrink:0;margin-left:12px;}
.ic-bl-label{font-family:'Cormorant SC',serif;font-size:11px;letter-spacing:.26em;color:rgba(212,176,80,.82);margin-bottom:3px;}
.ic-bl-email{font-family:'Cormorant',serif;font-size:16px;font-style:italic;color:#D4B050;text-decoration:none;transition:color .35s;}
.ic-bl-email:hover{color:#D4B050;}
.ic-back{position:absolute;top:24px;left:48px;z-index:20;font-family:'Cormorant SC',serif;font-size:12px;letter-spacing:.28em;color:rgba(212,176,80,.88);cursor:pointer;background:none;border:none;transition:color .3s;padding:0;}
.ic-back:hover{color:rgba(212,176,80,.9);}
@keyframes ic-appear{from{opacity:0}to{opacity:1}}
@keyframes ic-riseIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@media (max-height:760px){
  .ic-pillars{display:none;}
}
@media (prefers-reduced-motion:reduce){
  .ic-grain,.ic-orbit-ring,.ic-orbit-inner{animation-duration:0.01s;animation-iteration-count:1;}
}
@media (max-width:768px){
  .ic-orbit{display:none;}
  .ic-pillars{flex-direction:column;align-items:center;gap:14px;margin-top:16px;}
  .ic-pillar{max-width:280px;}
  .ic-root{height:auto;min-height:0;}
  .ic-top{padding:12px 18px;}
  .ic-tb-right{display:none;}
  .ic-middle{padding:56px 20px;}
  .ic-title{font-size:clamp(40px,12vw,64px);}
  .ic-tagline{font-size:18px;max-width:90vw;}
  .ic-rule{margin:12px auto;}
  .ic-eyebrow{margin-bottom:12px;}
  .ic-gate{margin-top:16px;}
  .ic-input-row{max-width:min(300px,84vw);}
  .ic-bottom{padding:10px 18px 14px;flex-direction:column;align-items:flex-start;gap:3px;}
  .ic-bl-left{max-width:100%;font-size:14px;}
  .ic-bl-right{text-align:left;margin-left:0;}
}
@media (max-width:420px){
  .ic-title{font-size:clamp(34px,13vw,50px);}
  .ic-top{padding:10px 14px;}
  .ic-middle{padding:40px 14px;}
  .ic-bottom{padding:8px 14px 12px;}
  .ic-input-row{max-width:88vw;}
  .ic-tagline{font-size:17px;}
}
`

const valueCss = `
.ic-root{background:radial-gradient(ellipse at 70% 0%,#182b43 0%,#0a1220 55%);min-height:0}
.ic-root .ic-top,.ic-root .ic-eyebrow,.ic-root .ic-tw,.ic-root .ic-tagline,.ic-root .ic-rule,.ic-root .ic-pillars,.ic-root .ic-gate,.ic-root .ic-bottom{opacity:1;transform:none;animation:none}
.ic-root .ic-title{font-family:var(--zrc-font-display,Georgia,serif);font-style:normal;font-size:clamp(44px,6vw,78px)}
.ic-root .ic-tw{display:inline}.ic-root .ic-tw+.ic-tw:before{content:' '}
.ic-root .ic-middle{padding:64px 24px 20px}.ic-root .ic-center{max-width:900px}
.ic-root .ic-tagline{font-family:Outfit,sans-serif;font-size:18px;font-style:normal;max-width:650px}
.ic-root .ic-pillars,.ic-root .ic-orbit,.ic-root .ic-grain{display:none}
.ic-root .ic-gate{max-width:430px;margin:28px auto 0;border:1px solid #303b4b;border-radius:14px;padding:22px;background:#101a29}
.ic-root .ic-email-input{font-family:Outfit,sans-serif;font-size:16px;font-style:normal}
.ic-root .ic-apply-link{min-height:44px;margin-top:16px;font-family:Outfit,sans-serif;letter-spacing:.03em;font-size:14px}
.ic-root :focus-visible{outline:2px solid #dbbd7d;outline-offset:4px}
`;

const modalOverlayStyle = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(6,8,12,0.88)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "24px",
};
const modalCardStyle = {
  background: "#0C0F15", border: "1px solid rgba(184,152,42,0.25)",
  maxWidth: 480, width: "100%", padding: "32px 24px", maxHeight:"90vh", overflowY:"auto", colorScheme:"dark",
  fontFamily: "'Cormorant',serif",
};
const mLabelStyle = {
  display: "block", fontFamily: "'Cormorant SC',serif", fontSize: 11,
  letterSpacing: "0.35em", textTransform: "uppercase",
  color: "rgba(212,176,80,0.85)", marginBottom: 6,
};
const mInputStyle = {
  width: "100%", background: "transparent", border: "none",
  borderBottom: "1px solid rgba(184,152,42,0.25)", outline: "none",
  fontFamily: "'Cormorant',serif", fontSize: 18, color: "#F3EDE0",
  padding: "6px 0", boxSizing: "border-box",
};

function ApplyModal({ email, lang, onClose, onSuccess }) {
  const [applicationEmail, setApplicationEmail] = useState(email);
  const [name, setName]       = useState("");
  const [org, setOrg]         = useState("");
  const [profile, setProfile] = useState("");
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const t = {
    es: {
      title: "Solicitar membresía",
      sub: "Las admisiones son manuales y selectivas. Completa tu perfil.",
      nameLabel: "Nombre completo *", namePlaceholder: "Luis García",
      emailLabel: "Email", orgLabel: "Organización / Empresa",
      orgPlaceholder: "Firma, fondo, empresa...",
      profileLabel: "Perfil profesional *", profileDefault: "Selecciona tu perfil...",
      reasonLabel: "Motivo de acceso (opcional)",
      reasonPlaceholder: "Describe brevemente tu interés estratégico...",
      submitBtn: "Enviar solicitud", sending: "Enviando...",
      cancel: "Cancelar",
      errRequired: "Nombre y perfil son obligatorios.",
      errPending: "Ya tenemos una solicitud con este email. Te contactaremos pronto.",
      errApproved: "Este email ya tiene acceso. Usa el formulario de acceso.",
      errGeneric: "Error al enviar. Inténtalo de nuevo.",
    },
    en: {
      title: "Request membership",
      sub: "Admissions are manual and selective. Complete your profile.",
      nameLabel: "Full name *", namePlaceholder: "Luis García",
      emailLabel: "Email", orgLabel: "Organization / Company",
      orgPlaceholder: "Firm, fund, company...",
      profileLabel: "Professional profile *", profileDefault: "Select your profile...",
      reasonLabel: "Reason for access (optional)",
      reasonPlaceholder: "Briefly describe your strategic interest...",
      submitBtn: "Submit application", sending: "Sending...",
      cancel: "Cancel",
      errRequired: "Name and profile are required.",
      errPending: "We already have an application for this email. We'll be in touch.",
      errApproved: "This email already has access. Use the access form.",
      errGeneric: "Error sending. Please try again.",
    },
  };
  const tx = t[lang] || t.es;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !profile) { setError(tx.errRequired); return; }
    setLoading(true); setError("");
    const cleanEmail = applicationEmail.toLowerCase().trim();
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
        onSuccess();
      } else if (data.error === "already_pending") {
        setError(tx.errPending);
      } else if (data.error === "already_approved") {
        setError(tx.errApproved);
      } else {
        setError(data.error || tx.errGeneric);
      }
    } catch {
      setError(tx.errGeneric);
    }
    setLoading(false);
  }

  return (
    <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalCardStyle}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Cormorant SC',serif", fontSize: 9, letterSpacing: "0.5em", color: "rgba(184,152,42,0.5)", marginBottom: 12 }}>ZRC INNER CIRCLE</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontStyle: "italic", fontWeight: 400, color: "#E8E0CC", margin: "0 0 10px" }}>{tx.title}</h2>
          <p style={{ fontFamily: "'Cormorant',serif", fontSize: 14, fontStyle: "italic", color: "rgba(232,224,204,0.38)", lineHeight: 1.6, margin: 0 }}>{tx.sub}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <label style={{ display: "block" }}>
            <span style={mLabelStyle}>{tx.nameLabel}</span>
            <input style={mInputStyle} value={name} onChange={e => setName(e.target.value)} placeholder={tx.namePlaceholder} required />
          </label>

          <label style={{ display: "block" }}>
            <span style={mLabelStyle}>{tx.emailLabel}</span>
            <input type="email" required autoComplete="email" style={mInputStyle} value={applicationEmail} onChange={e=>setApplicationEmail(e.target.value)} />
          </label>

          <label style={{ display: "block" }}>
            <span style={mLabelStyle}>{tx.orgLabel}</span>
            <input style={mInputStyle} value={org} onChange={e => setOrg(e.target.value)} placeholder={tx.orgPlaceholder} />
          </label>

          <label style={{ display: "block" }}>
            <span style={mLabelStyle}>{tx.profileLabel}</span>
            <select required value={profile} onChange={e => setProfile(e.target.value)}
              style={{ ...mInputStyle, cursor: "pointer", appearance: "none" }}>
              <option value="">{tx.profileDefault}</option>
              {PROFILE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>

          <label style={{ display: "block" }}>
            <span style={mLabelStyle}>{tx.reasonLabel}</span>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder={tx.reasonPlaceholder}
              style={{ ...mInputStyle, resize: "none", paddingTop: 6 }} />
          </label>

          {error && (
            <p style={{ fontFamily: "'Cormorant SC',serif", fontSize: 9, letterSpacing: "0.25em", color: "rgba(184,152,42,0.7)", textAlign: "center", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: "none", border: "1px solid rgba(184,152,42,0.2)", color: "rgba(232,224,204,0.35)", fontFamily: "'Cormorant SC',serif", fontSize: 9, letterSpacing: "0.4em", padding: "11px 0", cursor: "pointer" }}>
              {tx.cancel}
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, background: "#B8982A", border: "none", color: "#000", fontFamily: "'Cormorant SC',serif", fontSize: 9, letterSpacing: "0.4em", fontWeight: 700, padding: "11px 0", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? tx.sending : tx.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuccessModal({ lang, onClose }) {
  const t = {
    es: { title: "Solicitud recibida", body: "Revisaremos tu perfil y te contactaremos en los próximos días. Las admisiones son manuales y selectivas.", close: "Cerrar" },
    en: { title: "Application received", body: "We'll review your profile and reach out within a few days. Admissions are manual and selective.", close: "Close" },
  };
  const tx = t[lang] || t.es;
  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, textAlign: "center", maxWidth: 400 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(184,152,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", background: "rgba(184,152,42,0.06)" }}>
          <span style={{ color: "#B8982A", fontSize: 18 }}>✓</span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontStyle: "italic", fontWeight: 400, color: "#E8E0CC", margin: "0 0 12px" }}>{tx.title}</h2>
        <p style={{ fontFamily: "'Cormorant',serif", fontSize: 15, fontStyle: "italic", color: "rgba(232,224,204,0.42)", lineHeight: 1.7, margin: "0 0 28px" }}>{tx.body}</p>
        <button onClick={onClose}
          style={{ background: "none", border: "1px solid rgba(184,152,42,0.3)", color: "rgba(184,152,42,0.7)", fontFamily: "'Cormorant SC',serif", fontSize: 9, letterSpacing: "0.4em", padding: "10px 28px", cursor: "pointer" }}>
          {tx.close}
        </button>
      </div>
    </div>
  );
}

export default function Community({ lang = "es", onAccess }) {
  const [view, setView]         = useState("gate");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [gateMsg, setGateMsg]   = useState("");
  const [showApply, setShowApply]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const t = {
    es:{
      eyebrow:"ZRC Confidencial",the:"The",inner:"Inner",circle:"Circle",
      tagline:"Prepara una decisión de expansión, adquisición o financiación. Identifica qué comprobar y llévate una ficha para tu próxima reunión.",
      pillars:[
        { title:"La Nota", text:"Inteligencia mensual, escrita para decidir." },
        { title:"El Círculo", text:"Inversores, operadores y estrategas seleccionados." },
        { title:"El Acceso", text:"Membresía gratuita. Admisión manual." },
      ],
      gateLabel:"Acceso exclusivo",gatePlaceholder:"Su email...",passwordPlaceholder:"Contraseña...",gateBtn:"Acceder",
      pendingMsg:"Su solicitud está pendiente de aprobación.",
      noneMsg:"Credenciales incorrectas.",
      applyLink:"Solicitar membresía →",
      welcomeLabel:"Bienvenido de nuevo",readEdition:"Leer Edition Zero ->",
      bottomLeft:"Nota mensual · Iberia, América Latina y MENA.",
      directLabel:"Directo",brand:"Zenith Rise Capital",location:"Madrid - Est. 2024",backLabel:"<- Volver",
    },
    en:{
      eyebrow:"ZRC Confidential",the:"The",inner:"Inner",circle:"Circle",
      tagline:"Prepare an expansion, acquisition or financing decision. Identify what to verify and take a brief to your next meeting.",
      pillars:[
        { title:"The Note", text:"Monthly intelligence, written to decide." },
        { title:"The Circle", text:"Selected investors, operators and strategists." },
        { title:"The Access", text:"Free membership. Reviewed admission." },
      ],
      gateLabel:"Exclusive access",gatePlaceholder:"Your email...",passwordPlaceholder:"Password...",gateBtn:"Enter",
      pendingMsg:"Your application is pending approval.",
      noneMsg:"Incorrect credentials.",
      applyLink:"Request membership →",
      welcomeLabel:"Welcome back",readEdition:"Read Edition Zero ->",
      bottomLeft:"Monthly note · Iberia, Latin America and MENA.",
      directLabel:"Direct",brand:"Zenith Rise Capital",location:"Madrid - Est. 2024",backLabel:"<- Back",
    },
  };
  const tx = t[lang] || t.es;

  const checkAccess = async () => {
    if (!email.includes("@") || !password) return;
    setChecking(true); setGateMsg("");
    const cleanEmail = email.toLowerCase().trim();
    try {
      const res = await fetch(`${IC_API}/api/inner-circle/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      if (data.status === "approved") {
        localStorage.setItem("zrc-inner-circle-access", "true");
        localStorage.setItem("zrc-ic-email", cleanEmail);
        if (onAccess) { onAccess(); } else { setView("landing"); }
      } else {
        setGateMsg(tx.noneMsg);
      }
    } catch { setGateMsg("Error. Intentelo de nuevo."); }
    finally { setChecking(false); }
  };

  if (view === "edition-zero") return (
    <>
      <style>{css}{valueCss}</style>
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,overflowY:"auto",overflowX:"hidden",zIndex:200,background:"#E8E4DC",WebkitOverflowScrolling:"touch"}}>
        <button className="ic-back" onClick={() => setView("landing")} style={{position:"fixed",top:20,left:20,zIndex:210,background:"rgba(10,22,40,0.92)",color:"#B8982A",padding:"8px 16px",border:"1px solid rgba(184,152,42,0.4)",borderRadius:2}}>{tx.backLabel}</button>
        <EditionZero />
      </div>
    </>
  );

  return (
    <>
      <style>{css}{valueCss}</style>
      {showApply && !showSuccess && (
        <ApplyModal
          email={email}
          lang={lang}
          onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); setShowSuccess(true); }}
        />
      )}
      {showSuccess && (
        <SuccessModal lang={lang} onClose={() => setShowSuccess(false)} />
      )}
      <div className="ic-root">
        <div className="ic-grain"/><div className="ic-vig"/><div className="ic-light"/>
        <div className="ic-top">
          <div className="ic-tb-brand">{tx.brand}</div>
          <div className="ic-tb-right">{tx.location}</div>
        </div>
        <div className="ic-middle">
          <div className="ic-orbit" aria-hidden="true">
            <div className="ic-orbit-ring"/>
            <div className="ic-orbit-inner"/>
          </div>
          <div className="ic-center">
            <span className="ic-eyebrow">{tx.eyebrow}</span>
            <span className="ic-title">
              <span className="ic-tw">{tx.the}</span>
              <span className="ic-tw">{tx.inner}</span>
              <span className="ic-tw">{tx.circle}</span>
            </span>
            <div className="ic-rule"/>
            <p className="ic-tagline">{tx.tagline}</p>
            <div className="ic-pillars">
              {tx.pillars.map((p) => (
                <div className="ic-pillar" key={p.title}>
                  <div className="ic-pillar-title">{p.title}</div>
                  <div className="ic-pillar-text">{p.text}</div>
                </div>
              ))}
            </div>
            <div className="ic-public-upgrade"><InnerCircleValue lang={lang}/></div>
            {view === "gate" && (
              <div className="ic-gate">
                <div className="ic-access-label">{tx.gateLabel}</div>
                <div className="ic-input-row">
                  <input className="ic-email-input" aria-label={lang === "es" ? "Email de miembro" : "Member email"} type="email" placeholder={tx.gatePlaceholder}
                    value={email} onChange={e => { setEmail(e.target.value); setGateMsg(""); }}
                    onKeyDown={e => e.key==="Enter" && checkAccess()} autoComplete="email"/>
                </div>
                <div className="ic-input-row" style={{marginTop:"10px"}}>
                  <input className="ic-email-input" aria-label={lang === "es" ? "Contraseña" : "Password"} type="password" placeholder={tx.passwordPlaceholder}
                    value={password} onChange={e => { setPassword(e.target.value); setGateMsg(""); }}
                    onKeyDown={e => e.key==="Enter" && checkAccess()} autoComplete="current-password"/>
                  <button className="ic-check-btn" onClick={checkAccess} disabled={checking}>
                    {checking ? "..." : tx.gateBtn}
                  </button>
                </div>
                {gateMsg && <div className="ic-gate-msg">{gateMsg}</div>}
                {<button className="ic-apply-link" onClick={() => setShowApply(true)}>
                    {tx.applyLink}
                  </button>}
              </div>
            )}
            {view === "landing" && (
              <div className="ic-welcome">
                <div className="ic-access-label">{tx.welcomeLabel}</div>
                <button className="ic-edition-link" onClick={() => setView("edition-zero")}>{tx.readEdition}</button>
              </div>
            )}
          </div>
        </div>
        <div className="ic-bottom">
          <div className="ic-bl-left">{tx.bottomLeft}</div>
          <div className="ic-bl-right">
            <div className="ic-bl-label">{tx.directLabel}</div>
            <a className="ic-bl-email" href="mailto:luis@zenithrisecapital.com">luis@zenithrisecapital.com</a>
          </div>
        </div>
      </div>
    </>
  );
}
