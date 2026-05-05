import { useEffect, useRef, useState } from "react";
import EditionZero from "./EditionZero";

// ─────────────────────────────────────────────────────────────
//  THE INNER CIRCLE  ·  ZRC Platform Community Section
//  v3 — gated access: email check → approved shows full landing
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://zrc-api.onrender.com";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=Cormorant+SC:wght@300;400;500&display=swap');

.ic-root { position:relative; width:100%; height:100vh; background:#06080C; color:#E8E0CC; font-family:'Cormorant',serif; overflow:hidden; }
.ic-root *, .ic-root *::before, .ic-root *::after { box-sizing:border-box; margin:0; padding:0; }
.ic-grain { position:absolute; inset:-50%; width:200%; height:200%; pointer-events:none; z-index:2; opacity:.032; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); animation:ic-grain .8s steps(1) infinite; }
@keyframes ic-grain { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 20%{transform:translate(3%,1%)} 30%{transform:translate(-1%,4%)} 40%{transform:translate(4%,-2%)} 50%{transform:translate(-3%,2%)} 60%{transform:translate(2%,-4%)} 70%{transform:translate(-4%,1%)} 80%{transform:translate(1%,3%)} 90%{transform:translate(3%,-1%)} }
.ic-vig { position:absolute; inset:0; background:radial-gradient(ellipse 72% 72% at 50% 50%,transparent 0%,rgba(6,8,12,.82) 100%); pointer-events:none; z-index:1; }
.ic-light { position:absolute; top:-25vh; left:50%; transform:translateX(-50%); width:700px; height:700px; background:radial-gradient(ellipse at center,rgba(184,152,42,.045) 0%,transparent 65%); pointer-events:none; z-index:0; }
.ic-rule-top,.ic-rule-bottom { position:absolute; left:44px; right:44px; height:1px; background:linear-gradient(90deg,transparent,rgba(184,152,42,.18),transparent); z-index:5; opacity:0; animation:ic-appear 1s ease forwards 3.6s; }
.ic-rule-top { top:82px; } .ic-rule-bottom { bottom:70px; }
.ic-topbar { position:absolute; top:0; left:0; right:0; padding:28px 48px; display:flex; justify-content:space-between; align-items:center; z-index:10; opacity:0; animation:ic-appear 1.2s ease forwards 3.8s; }
.ic-tb-brand { font-family:'Cormorant SC',serif; font-size:12px; font-weight:300; letter-spacing:.38em; color:rgba(232,224,204,0.42); }
.ic-tb-right { font-family:'Cormorant SC',serif; font-size:12px; letter-spacing:.3em; color:rgba(184,152,42,.45); }
.ic-bottombar { position:absolute; bottom:0; left:0; right:0; padding:24px 48px; display:flex; justify-content:space-between; align-items:flex-end; z-index:10; opacity:0; animation:ic-appear 1.2s ease forwards 4.2s; }
.ic-bl-left { font-family:'Cormorant',serif; font-size:14px; font-style:italic; color:rgba(232,224,204,0.42); line-height:1.75; max-width:340px; }
.ic-bl-right { text-align:right; }
.ic-bl-label { font-family:'Cormorant SC',serif; font-size:12px; letter-spacing:.32em; color:rgba(184,152,42,.45); margin-bottom:5px; }
.ic-bl-email { font-family:'Cormorant',serif; font-size:16px; font-style:italic; color:#B8982A; text-decoration:none; letter-spacing:.02em; transition:color .35s; }
.ic-bl-email:hover { color:#D4B050; }
.ic-vert { position:absolute; top:50%; font-family:'Cormorant SC',serif; font-size:10px; letter-spacing:.45em; color:rgba(232,224,204,.1); z-index:4; opacity:0; animation:ic-appear 1s ease forwards 4.1s; }
.ic-vert-l { left:14px; writing-mode:vertical-rl; text-orientation:mixed; transform:translateY(-50%) rotate(180deg); }
.ic-vert-r { right:14px; writing-mode:vertical-rl; text-orientation:mixed; transform:translateY(-50%); }
.ic-stage { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; z-index:20; padding:100px 40px 40px; }
.ic-center { text-align:center; position:relative; }
.ic-center::before { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:500px; height:500px; border:1px solid rgba(184,152,42,.04); border-radius:50%; pointer-events:none; }
.ic-center::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:340px; height:340px; border:1px solid rgba(184,152,42,.035); border-radius:50%; pointer-events:none; }
.ic-eyebrow { display:block; font-family:'Cormorant SC',serif; font-size:12px; font-weight:300; letter-spacing:.55em; color:#B8982A; opacity:0; animation:ic-appear 1.4s ease forwards .5s; margin-bottom:34px; }
.ic-title { display:block; font-family:'Playfair Display',serif; font-size:clamp(62px,10vw,128px); font-weight:400; font-style:italic; line-height:.9; letter-spacing:-.025em; color:#E8E0CC; }
.ic-tw { display:block; opacity:0; transform:translateY(38px); }
 .ic-landing-mode .ic-title { font-size:clamp(44px,7vw,90px); line-height:.88; }
 .ic-landing-mode .ic-tagline { font-size:clamp(13px,1.4vw,17px); margin-top:14px; }
 .ic-landing-mode .ic-center { padding-bottom:0; } .ic-center { padding-bottom:20px; }
.ic-tw:nth-child(1) { animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.0s; }
.ic-tw:nth-child(2) { animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.3s; }
.ic-tw:nth-child(3) { animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.6s; color:rgba(232,224,204,.55); }
.ic-rule-gold { width:38px; height:1px; background:#B8982A; margin:38px auto; opacity:0; animation:ic-appear 1s ease forwards 2.4s; }
.ic-tagline { font-family:'Cormorant',serif; font-size:clamp(15px,1.9vw,19px); font-weight:300; font-style:italic; color:rgba(232,224,204,0.42); letter-spacing:.04em; line-height:1.75; opacity:0; animation:ic-appear 1.4s ease forwards 2.7s; max-width:420px; margin:0 auto; }
.ic-access { margin-top:32px; opacity:0; animation:ic-appear 0.8s ease forwards 0.6s; }
.ic-access-label { font-family:'Cormorant SC',serif; font-size:12px; letter-spacing:.5em; color:rgba(184,152,42,.75); margin-bottom:16px; }

/* Gate / email input */
.ic-overlay { position:absolute; bottom:0; left:0; right:0; z-index:30; display:flex; flex-direction:column; align-items:center; padding-bottom:80px; pointer-events:none; } .ic-overlay > * { pointer-events:auto; } .ic-gate { cursor:auto; margin-top:0; opacity:0; animation:ic-appear 1.2s ease forwards 1.0s; pointer-events:auto; position:relative; z-index:25; }
.ic-input-row { display:flex; gap:0; max-width:420px; margin:0 auto; border-bottom:1px solid rgba(184,152,42,.5); padding-bottom:8px; position:relative; z-index:26; cursor:text; }
.ic-email-input { flex:1; background:transparent; border:none; outline:none; font-family:'Cormorant',serif; font-size:17px; font-style:italic; color:#E8E0CC; letter-spacing:.02em; padding:4px 0; cursor:text; }
.ic-email-input::placeholder { color:rgba(232,224,204,.3); }
.ic-check-btn { cursor:pointer; background:none; border:none; cursor:pointer; font-family:'Cormorant SC',serif; font-size:12px; letter-spacing:.35em; color:#B8982A; padding:4px 0 4px 16px; transition:color .3s; white-space:nowrap; }
.ic-check-btn:hover { color:#D4B050; }
.ic-check-btn:disabled { opacity:.4; cursor:default; }
.ic-gate-msg { margin-top:14px; font-family:'Cormorant SC',serif; font-size:12px; letter-spacing:.3em; color:rgba(184,152,42,.55); }

/* Approved — Edition Zero link */
.ic-edition-link { display:inline-block; margin-top:18px; font-family:'Cormorant SC',serif; font-size:10px; letter-spacing:.38em; color:#B8982A; text-decoration:none; border-bottom:1px solid rgba(184,152,42,.28); padding-bottom:3px; transition:color .4s,border-color .4s; cursor:pointer; background:none; border-top:none; border-left:none; border-right:none; }
.ic-edition-link:hover { color:#D4B050; border-bottom-color:rgba(212,176,80,.55); }

/* Back button */
.ic-back { position:absolute; top:24px; left:48px; z-index:20; font-family:'Cormorant SC',serif; font-size:11px; letter-spacing:.35em; color:rgba(230,218,190,.9); cursor:pointer; background:none; border:none; transition:color .3s; padding:0; }
.ic-back:hover { color:#ffffff; }

@keyframes ic-appear { from{opacity:0} to{opacity:1} }
@keyframes ic-riseIn { from{opacity:0;transform:translateY(38px)} to{opacity:1;transform:translateY(0)} }
`;

export default function Community({ lang = "es" }) {
  const [view, setView]         = useState("gate"); // "gate"|"landing"|"edition-zero"
  const [email, setEmail]       = useState("");
  const [checking, setChecking] = useState(false);
  const [gateMsg, setGateMsg]   = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({name:"",company:"",role:"",reason:""});
  const [applyDone, setApplyDone] = useState(false);
  const [applying, setApplying] = useState(false);

  const cursorRef = useRef(null);
  const ringRef   = useRef(null);
  const rxRef = useRef(0), ryRef = useRef(0);
  const mxRef = useRef(0), myRef = useRef(0);
  const rafRef = useRef(null);

  const t = {
    es: {
      eyebrow:"ZRC Confidencial", the:"The", inner:"Inner", circle:"Circle",
      tagline:"Una nota de inteligencia privada para quienes\nhan ganado una lectura más cercana.",
      gateLabel:"Membresía por invitación",
      gatePlaceholder:"Su email...",
      gateBtn:"Acceder",
      pendingMsg:"Su solicitud está pendiente de aprobación.",
      noneMsg:"Este email no tiene acceso.",
      applyLabel:"Solicitar acceso",
      applyFormTitle:"Solicitud de acceso",
      applyName:"Nombre completo",
      applyCompany:"Empresa / Institución",
      applyRole:"Cargo",
      applyReason:"¿Por qué le interesa el Inner Circle?",
      applyNameOld:"Su nombre (opcional)",
      applyBtn:"Enviar solicitud",
      applySent:"Solicitud recibida. Le contactaremos pronto.",
      applyExisting:"Ya existe una solicitud para este email.",
      readEdition:"Leer Edition Zero →",
      bottomLeft:"Distribuido el primer martes de cada mes.\nNo reenviar. No citar parcialmente.\nPara el registro, y para quienes lo mantienen.",
      directLabel:"Directo", brand:"Zenith Rise Capital", location:"Madrid · Est. 2024",
      vertL:"Zenith Rise Capital · The Inner Circle", vertR:"ZRC Confidencial · Inteligencia Privada",
      backLabel:"← Volver",
    },
    en: {
      eyebrow:"ZRC Confidential", the:"The", inner:"Inner", circle:"Circle",
      tagline:"A private intelligence brief for those\nwho have earned a closer read.",
      gateLabel:"Membership by invitation",
      gatePlaceholder:"Your email...",
      gateBtn:"Enter",
      pendingMsg:"Your application is pending approval.",
      noneMsg:"This email does not have access.",
      applyLabel:"Request access",
      applyFormTitle:"Access request",
      applyName:"Full name",
      applyCompany:"Company / Institution",
      applyRole:"Role / Position",
      applyReason:"Why are you interested in the Inner Circle?",
      applyNameOld:"Your name (optional)",
      applyBtn:"Submit request",
      applySent:"Request received. We will be in touch.",
      applyExisting:"A pending request already exists for this email.",
      readEdition:"Read Edition Zero →",
      bottomLeft:"Distributed on the first Tuesday of each month.\nNot for forwarding. Not for excerpting.\nFor the record, and for those who keep one.",
      directLabel:"Direct", brand:"Zenith Rise Capital", location:"Madrid · Est. 2024",
      vertL:"Zenith Rise Capital · The Inner Circle", vertR:"ZRC Confidential · Private Intelligence",
      backLabel:"← Back",
    },
  };
  const tx = t[lang] || t.es;

  useEffect(() => {
    if (typeof window === "undefined") return;
    mxRef.current = window.innerWidth / 2; myRef.current = window.innerHeight / 2;
    rxRef.current = window.innerWidth / 2; ryRef.current = window.innerHeight / 2;
    const handleMove = (e) => {
      mxRef.current = e.clientX; myRef.current = e.clientY;
      if (cursorRef.current) { cursorRef.current.style.left = e.clientX + "px"; cursorRef.current.style.top = e.clientY + "px"; }
    };
    document.addEventListener("mousemove", handleMove);
    const loop = () => {
      rxRef.current += (mxRef.current - rxRef.current) * 0.11;
      ryRef.current += (myRef.current - ryRef.current) * 0.11;
      if (ringRef.current) { ringRef.current.style.left = rxRef.current + "px"; ringRef.current.style.top = ryRef.current + "px"; }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { document.removeEventListener("mousemove", handleMove); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const checkAccess = async () => {
    if (!email.includes("@")) return;
    setChecking(true);
    setGateMsg("");
    try {
      const res  = await fetch(API_BASE + "/api/inner-circle/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (data.approved) {
        setMemberEmail(email.toLowerCase().trim());
        setView("landing");
      } else if (data.status === "pending") {
        setGateMsg(tx.pendingMsg);
      } else {
        setGateMsg(tx.noneMsg);
      }
    } catch { setGateMsg("Error checking access. Please try again."); }
    finally { setChecking(false); }
  };

  
  const applyAccess = async () => {
    if (!email.includes("@")) return;
    setApplying(true);
    try {
      const res = await fetch(API_BASE + "/api/inner-circle/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), name: applyForm.name.trim(), company: applyForm.company.trim(), role: applyForm.role.trim(), reason: applyForm.reason.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setApplyDone(true);
        setGateMsg(data.existing ? tx.applyExisting : tx.applySent);
        setShowApply(false);
      } else { setGateMsg("Error. Please try again."); }
    } catch { setGateMsg("Error. Please try again."); }
    finally { setApplying(false); }
  };
  const taglineLines = tx.tagline.split("\n");

  // ── EDITION ZERO VIEW ──────────────────────────────────────
  if (view === "edition-zero") {
    return (
      <>
        <style>{css}</style>
        <div style={{
          position:"fixed",
          inset:0,
          overflowY:"auto",
          zIndex:100,
          background:"#E8E4DC"
        }}>
          <button
            className="ic-back"
            onClick={() => setView("landing")}
            style={{
              position:"fixed",
              top:20,
              left:20,
              zIndex:200,
              background:"rgba(10,22,40,0.85)",
              padding:"8px 18px",
              borderRadius:2,
              backdropFilter:"blur(6px)"
            }}
          >
            {tx.backLabel}
          </button>
          <EditionZero />
        </div>
      </>
    );
  }

  // ── SHARED CHROME (title + decorations) ────────────────────
  const chrome = (centerContent) => (
    <>
      <style>{css}</style>
      <div ref={cursorRef} style={{position:"fixed",width:5,height:5,background:"#B8982A",borderRadius:"50%",pointerEvents:"none",zIndex:9999,transform:"translate(-50%,-50%)",mixBlendMode:"difference"}} />
      <div ref={ringRef} style={{position:"fixed",width:30,height:30,border:"1px solid rgba(184,152,42,0.35)",borderRadius:"50%",pointerEvents:"none",zIndex:9998,transform:"translate(-50%,-50%)",opacity:0.65,transition:"width .4s,height .4s"}} />
      <div className="ic-root">
        <div className="ic-grain" /><div className="ic-vig" /><div className="ic-light" />
        <div className="ic-rule-top" /><div className="ic-rule-bottom" />
        <div className="ic-topbar"><div className="ic-tb-brand">{tx.brand}</div><div className="ic-tb-right">{tx.location}</div></div>
        <div className="ic-stage">
          <div className={`ic-center${memberEmail ? " ic-landing-mode" : ""}`}>
            <span className="ic-eyebrow">{tx.eyebrow}</span>
            <span className="ic-title">
              <span className="ic-tw">{tx.the}</span>
              <span className="ic-tw">{tx.inner}</span>
              <span className="ic-tw">{tx.circle}</span>
            </span>
            <div className="ic-rule-gold" />
            <p className="ic-tagline">{taglineLines.map((line,i)=>(<span key={i}>{line}{i<taglineLines.length-1&&<br/>}</span>))}</p>
            {centerContent}
          </div>
        </div>
        <div className="ic-bottombar">
          <div className="ic-bl-left">{tx.bottomLeft.split("\n").map((line,i,arr)=>(<span key={i}>{line}{i<arr.length-1&&<br/>}</span>))}</div>
          <div className="ic-bl-right">
            <div className="ic-bl-label">{tx.directLabel}</div>
            <a className="ic-bl-email" href="mailto:luis@zenithrisecapital.com">luis@zenithrisecapital.com</a>
          </div>
        </div>
        <div className="ic-vert ic-vert-l">{tx.vertL}</div>
        <div className="ic-vert ic-vert-r">{tx.vertR}</div>
      </div>
    </>
  );

  // ── GATE VIEW ──────────────────────────────────────────────
  if (view === "gate") {
    return (
      <>
        <style>{css}</style>
        <div className="ic-root">
          <div className="ic-grain" /><div className="ic-vig" /><div className="ic-light" />
          <div className="ic-rule-top" /><div className="ic-rule-bottom" />
          <div className="ic-topbar"><div className="ic-tb-brand">{tx.brand}</div><div className="ic-tb-right">{tx.location}</div></div>
          <div className="ic-stage">
            <div className="ic-center">
              <span className="ic-eyebrow">{tx.eyebrow}</span>
              <span className="ic-title">
                <span className="ic-tw">{tx.the}</span>
                <span className="ic-tw">{tx.inner}</span>
                <span className="ic-tw">{tx.circle}</span>
              </span>
            </div>
          </div>
          <div className="ic-overlay">
            <div className="ic-gate">
              <div className="ic-access-label">{tx.gateLabel}</div>
              <div className="ic-input-row">
                <input className="ic-email-input" type="email" placeholder={tx.gatePlaceholder}
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && checkAccess()} autoComplete="email" />
                <button className="ic-check-btn" onClick={checkAccess} disabled={checking}>
                  {checking ? "..." : tx.gateBtn}
                </button>
              </div>
              {gateMsg && <div className="ic-gate-msg">{gateMsg}</div>}
              {!showApply && !applyDone && gateMsg === tx.noneMsg && (
                <button className="ic-check-btn"
                  onClick={() => setShowApply(true)}
                  style={{marginTop:12,display:"block",margin:"12px auto 0"}}>
                  {tx.applyLabel}
                </button>
              )}
              {showApply && !applyDone && (
                <div style={{marginTop:20,textAlign:"left",maxWidth:360,margin:"20px auto 0",
                  background:"rgba(10,22,40,0.7)",border:"1px solid rgba(184,152,42,.25)",
                  padding:"20px 24px",backdropFilter:"blur(8px)"}}>
                  <div style={{fontFamily:"'Cormorant SC',serif",fontSize:11,letterSpacing:".35em",
                    color:"rgba(184,152,42,.85)",marginBottom:16,textAlign:"center"}}>
                    {tx.applyFormTitle}
                  </div>
                  {[
                    {key:"name",label:tx.applyName,required:true},
                    {key:"company",label:tx.applyCompany,required:false},
                    {key:"role",label:tx.applyRole,required:false},
                  ].map(f => (
                    <div key={f.key} style={{marginBottom:12}}>
                      <div style={{fontFamily:"'Cormorant SC',serif",fontSize:9,letterSpacing:".3em",
                        color:"rgba(184,152,42,.55)",marginBottom:4}}>
                        {f.label}{f.required ? " *" : ""}
                      </div>
                      <input type="text" value={applyForm[f.key]}
                        onChange={e => setApplyForm(prev => ({...prev,[f.key]:e.target.value}))}
                        style={{background:"transparent",border:"none",
                          borderBottom:"1px solid rgba(184,152,42,.3)",width:"100%",
                          padding:"3px 0",color:"#E8E0CC",fontFamily:"'Cormorant',serif",
                          fontSize:15,outline:"none",cursor:"text"}}
                      />
                    </div>
                  ))}
                  <div style={{marginBottom:16}}>
                    <div style={{fontFamily:"'Cormorant SC',serif",fontSize:9,letterSpacing:".3em",
                      color:"rgba(184,152,42,.55)",marginBottom:4}}>{tx.applyReason}</div>
                    <textarea value={applyForm.reason} rows={2}
                      onChange={e => setApplyForm(prev => ({...prev,reason:e.target.value}))}
                      style={{background:"transparent",border:"none",
                        borderBottom:"1px solid rgba(184,152,42,.3)",width:"100%",
                        padding:"3px 0",color:"#E8E0CC",fontFamily:"'Cormorant',serif",
                        fontSize:15,outline:"none",resize:"none",cursor:"text"}}
                    />
                  </div>
                  <div style={{textAlign:"center"}}>
                    <button className="ic-check-btn" onClick={applyAccess}
                      disabled={applying || !applyForm.name.trim()}>
                      {applying ? "..." : tx.applyBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="ic-bottombar">
            <div className="ic-bl-left">{tx.bottomLeft.split("\n").map((line,i,arr)=>(<span key={i}>{line}{i<arr.length-1&&<br/>}</span>))}</div>
            <div className="ic-bl-right">
              <div className="ic-bl-label">{tx.directLabel}</div>
              <a className="ic-bl-email" href="mailto:luis@zenithrisecapital.com">luis@zenithrisecapital.com</a>
            </div>
          </div>
          <div className="ic-vert ic-vert-l">{tx.vertL}</div>
          <div className="ic-vert ic-vert-r">{tx.vertR}</div>
        </div>
      </>
    );
  }

  // ── LANDING VIEW (approved member) ─────────────────────────
  return chrome(
    <div className="ic-access">
      <div className="ic-access-label">
        {lang === "es" ? "Bienvenido de nuevo" : "Welcome back"}
      </div>
      <button className="ic-edition-link" onClick={() => setView("edition-zero")}>
        {tx.readEdition}
      </button>
    </div>
  );
}
