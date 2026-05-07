import { useEffect, useRef, useState } from "react";
import EditionZero from "./EditionZero";

const API_BASE = "https://zrc-api.onrender.com";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=Cormorant+SC:wght@300;400&display=swap');

.ic-root{position:relative;width:100%;height:100vh;min-height:520px;background:#06080C;color:#E8E0CC;font-family:'Cormorant',serif;overflow:hidden;display:flex;flex-direction:column;}
.ic-root *,.ic-root *::before,.ic-root *::after{box-sizing:border-box;margin:0;padding:0;}
.ic-grain{position:absolute;inset:-50%;width:200%;height:200%;pointer-events:none;z-index:0;opacity:.032;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:ic-grain .8s steps(1) infinite;}
@keyframes ic-grain{0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}20%{transform:translate(3%,1%)}30%{transform:translate(-1%,4%)}40%{transform:translate(4%,-2%)}50%{transform:translate(-3%,2%)}60%{transform:translate(2%,-4%)}70%{transform:translate(-4%,1%)}80%{transform:translate(1%,3%)}90%{transform:translate(3%,-1%)}}
.ic-vig{position:absolute;inset:0;background:radial-gradient(ellipse 72% 72% at 50% 50%,transparent 0%,rgba(6,8,12,.82) 100%);pointer-events:none;z-index:0;}
.ic-light{position:absolute;top:-20vh;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(ellipse at center,rgba(184,152,42,.045) 0%,transparent 65%);pointer-events:none;z-index:0;}
.ic-top{position:relative;z-index:5;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:20px 48px;border-bottom:1px solid rgba(184,152,42,.12);opacity:0;animation:ic-appear 1s ease forwards 3.6s;}
.ic-tb-brand{font-family:'Cormorant SC',serif;font-size:10px;letter-spacing:.38em;color:rgba(232,224,204,.42);}
.ic-tb-right{font-family:'Cormorant SC',serif;font-size:9px;letter-spacing:.3em;color:rgba(184,152,42,.45);}
.ic-middle{position:relative;z-index:5;flex:1;display:flex;align-items:center;justify-content:center;padding:20px 40px;min-height:0;overflow:hidden;}
.ic-center{text-align:center;width:100%;max-width:640px;}
.ic-eyebrow{display:block;font-family:'Cormorant SC',serif;font-size:10px;letter-spacing:.55em;color:#B8982A;opacity:0;animation:ic-appear 1.4s ease forwards .5s;margin-bottom:18px;}
.ic-title{display:block;font-family:'Playfair Display',serif;font-size:clamp(52px,8vw,118px);font-weight:400;font-style:italic;line-height:1;letter-spacing:-.025em;color:#E8E0CC;}
.ic-tw{display:block;opacity:0;transform:translateY(30px);}
.ic-tw:nth-child(1){animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.0s;}
.ic-tw:nth-child(2){animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.3s;}
.ic-tw:nth-child(3){animation:ic-riseIn 1.2s cubic-bezier(.16,1,.3,1) forwards 1.6s;color:rgba(232,224,204,.55);}
.ic-rule{width:30px;height:1px;background:#B8982A;margin:18px auto;opacity:0;animation:ic-appear 1s ease forwards 2.4s;}
.ic-tagline{font-family:'Cormorant',serif;font-size:clamp(14px,1.7vw,17px);font-style:italic;color:rgba(232,224,204,.42);letter-spacing:.04em;line-height:1.65;opacity:0;animation:ic-appear 1.4s ease forwards 2.7s;max-width:400px;margin:0 auto;}
.ic-gate{margin-top:22px;opacity:0;animation:ic-appear 1.2s ease forwards 3.1s;}
.ic-access-label{font-family:'Cormorant SC',serif;font-size:8.5px;letter-spacing:.5em;color:rgba(184,152,42,.45);margin-bottom:10px;}
.ic-input-row{display:flex;max-width:320px;margin:0 auto;border-bottom:1px solid rgba(184,152,42,.35);padding-bottom:5px;}
.ic-email-input{flex:1;background:transparent;border:none;outline:none;font-family:'Cormorant',serif;font-size:16px;font-style:italic;color:#E8E0CC;padding:3px 0;min-width:0;}
.ic-email-input::placeholder{color:rgba(232,224,204,.28);}
.ic-check-btn{background:none;border:none;cursor:pointer;font-family:'Cormorant SC',serif;font-size:9px;letter-spacing:.35em;color:#B8982A;padding:3px 0 3px 12px;white-space:nowrap;transition:color .3s;}
.ic-check-btn:hover{color:#D4B050;}.ic-check-btn:disabled{opacity:.4;cursor:default;}
.ic-gate-msg{margin-top:10px;font-family:'Cormorant SC',serif;font-size:9px;letter-spacing:.28em;color:rgba(184,152,42,.55);}
.ic-welcome{margin-top:22px;opacity:0;animation:ic-appear 1.2s ease forwards 3.1s;}
.ic-edition-link{display:inline-block;font-family:'Cormorant SC',serif;font-size:10px;letter-spacing:.38em;color:#B8982A;border-bottom:1px solid rgba(184,152,42,.28);padding-bottom:3px;transition:color .4s,border-color .4s;cursor:pointer;background:none;border-top:none;border-left:none;border-right:none;}
.ic-edition-link:hover{color:#D4B050;border-bottom-color:rgba(212,176,80,.55);}
.ic-bottom{position:relative;z-index:5;flex-shrink:0;display:flex;justify-content:space-between;align-items:flex-end;padding:12px 48px 16px;border-top:1px solid rgba(184,152,42,.1);opacity:0;animation:ic-appear 1.2s ease forwards 4.0s;}
.ic-bl-left{font-family:'Cormorant',serif;font-size:11px;font-style:italic;color:rgba(232,224,204,.35);line-height:1.5;max-width:55%;}
.ic-bl-right{text-align:right;flex-shrink:0;margin-left:12px;}
.ic-bl-label{font-family:'Cormorant SC',serif;font-size:8px;letter-spacing:.32em;color:rgba(184,152,42,.4);margin-bottom:3px;}
.ic-bl-email{font-family:'Cormorant',serif;font-size:12px;font-style:italic;color:#B8982A;text-decoration:none;transition:color .35s;}
.ic-bl-email:hover{color:#D4B050;}
.ic-back{position:absolute;top:24px;left:48px;z-index:20;font-family:'Cormorant SC',serif;font-size:9px;letter-spacing:.35em;color:rgba(184,152,42,.5);cursor:pointer;background:none;border:none;transition:color .3s;padding:0;}
.ic-back:hover{color:rgba(212,176,80,.9);}
@keyframes ic-appear{from{opacity:0}to{opacity:1}}
@keyframes ic-riseIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:768px){
  .ic-top{padding:12px 18px;}
  .ic-tb-right{display:none;}
  .ic-middle{padding:10px 20px;}
  .ic-title{font-size:clamp(40px,12vw,64px);}
  .ic-tagline{font-size:15px;max-width:88vw;}
  .ic-rule{margin:12px auto;}
  .ic-eyebrow{margin-bottom:12px;}
  .ic-gate{margin-top:16px;}
  .ic-input-row{max-width:min(300px,84vw);}
  .ic-bottom{padding:10px 18px 14px;flex-direction:column;align-items:flex-start;gap:3px;}
  .ic-bl-left{max-width:100%;font-size:11px;}
  .ic-bl-right{text-align:left;margin-left:0;}
}
@media (max-width:420px){
  .ic-title{font-size:clamp(34px,13vw,50px);}
  .ic-top{padding:10px 14px;}
  .ic-middle{padding:8px 14px;}
  .ic-bottom{padding:8px 14px 12px;}
  .ic-input-row{max-width:88vw;}
  .ic-tagline{font-size:14px;}
}
`
export default function Community({ lang = "es" }) {
  const [view, setView]         = useState("gate");
  const [email, setEmail]       = useState("");
  const [checking, setChecking] = useState(false);
  const [gateMsg, setGateMsg]   = useState("");
  const cursorRef = useRef(null);
  const ringRef   = useRef(null);
  const rxRef = useRef(0), ryRef = useRef(0);
  const mxRef = useRef(0), myRef = useRef(0);
  const rafRef = useRef(null);

  const t = {
    es:{
      eyebrow:"ZRC Confidencial",the:"The",inner:"Inner",circle:"Circle",
      tagline:"Una nota de inteligencia privada para quienes han ganado una lectura mas cercana.",
      gateLabel:"Membresia por invitacion",gatePlaceholder:"Su email...",gateBtn:"Acceder",
      pendingMsg:"Su solicitud esta pendiente de aprobacion.",
      noneMsg:"Este email no tiene acceso. Puede solicitar membresia.",
      welcomeLabel:"Bienvenido de nuevo",readEdition:"Leer Edition Zero ->",
      bottomLeft:"Distribuido el primer martes de cada mes.",
      directLabel:"Directo",brand:"Zenith Rise Capital",location:"Madrid - Est. 2024",backLabel:"<- Volver",
    },
    en:{
      eyebrow:"ZRC Confidential",the:"The",inner:"Inner",circle:"Circle",
      tagline:"A private intelligence brief for those who have earned a closer read.",
      gateLabel:"Membership by invitation",gatePlaceholder:"Your email...",gateBtn:"Enter",
      pendingMsg:"Your application is pending approval.",
      noneMsg:"This email does not have access. You may request membership.",
      welcomeLabel:"Welcome back",readEdition:"Read Edition Zero ->",
      bottomLeft:"Distributed on the first Tuesday of each month.",
      directLabel:"Direct",brand:"Zenith Rise Capital",location:"Madrid - Est. 2024",backLabel:"<- Back",
    },
  };
  const tx = t[lang] || t.es;

  useEffect(() => {
    if (typeof window === "undefined") return;
    mxRef.current = window.innerWidth/2; myRef.current = window.innerHeight/2;
    rxRef.current = window.innerWidth/2; ryRef.current = window.innerHeight/2;
    const onMove = (e) => {
      mxRef.current = e.clientX; myRef.current = e.clientY;
      if (cursorRef.current) { cursorRef.current.style.left = e.clientX+"px"; cursorRef.current.style.top = e.clientY+"px"; }
    };
    document.addEventListener("mousemove", onMove);
    const loop = () => {
      rxRef.current += (mxRef.current - rxRef.current) * 0.11;
      ryRef.current += (myRef.current - ryRef.current) * 0.11;
      if (ringRef.current) { ringRef.current.style.left = rxRef.current+"px"; ringRef.current.style.top = ryRef.current+"px"; }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { document.removeEventListener("mousemove", onMove); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const checkAccess = async () => {
    if (!email.includes("@")) return;
    setChecking(true); setGateMsg("");
    try {
      const res  = await fetch(API_BASE + "/api/inner-circle/check", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (data.approved) setView("landing");
      else if (data.status === "pending") setGateMsg(tx.pendingMsg);
      else setGateMsg(tx.noneMsg);
    } catch { setGateMsg("Error. Intentelo de nuevo."); }
    finally { setChecking(false); }
  };

  if (view === "edition-zero") return (
    <>
      <style>{css}</style>
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,overflowY:"auto",overflowX:"hidden",zIndex:200,background:"#E8E4DC",WebkitOverflowScrolling:"touch"}}>
        <button className="ic-back" onClick={() => setView("landing")} style={{position:"fixed",top:20,left:20,zIndex:210,background:"rgba(10,22,40,0.92)",color:"#B8982A",padding:"8px 16px",border:"1px solid rgba(184,152,42,0.4)",borderRadius:2}}>{tx.backLabel}</button>
        <EditionZero />
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div ref={cursorRef} style={{position:"fixed",width:5,height:5,background:"#B8982A",borderRadius:"50%",pointerEvents:"none",zIndex:9999,transform:"translate(-50%,-50%)",mixBlendMode:"difference"}} />
      <div ref={ringRef}   style={{position:"fixed",width:28,height:28,border:"1px solid rgba(184,152,42,0.35)",borderRadius:"50%",pointerEvents:"none",zIndex:9998,transform:"translate(-50%,-50%)",opacity:.65}} />
      <div className="ic-root" style={{cursor:"none"}}>
        <div className="ic-grain"/><div className="ic-vig"/><div className="ic-light"/>
        <div className="ic-top">
          <div className="ic-tb-brand">{tx.brand}</div>
          <div className="ic-tb-right">{tx.location}</div>
        </div>
        <div className="ic-middle">
          <div className="ic-center">
            <span className="ic-eyebrow">{tx.eyebrow}</span>
            <span className="ic-title">
              <span className="ic-tw">{tx.the}</span>
              <span className="ic-tw">{tx.inner}</span>
              <span className="ic-tw">{tx.circle}</span>
            </span>
            <div className="ic-rule"/>
            <p className="ic-tagline">{tx.tagline}</p>
            {view === "gate" && (
              <div className="ic-gate">
                <div className="ic-access-label">{tx.gateLabel}</div>
                <div className="ic-input-row">
                  <input className="ic-email-input" type="email" placeholder={tx.gatePlaceholder}
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && checkAccess()} autoComplete="email"/>
                  <button className="ic-check-btn" onClick={checkAccess} disabled={checking}>
                    {checking ? "..." : tx.gateBtn}
                  </button>
                </div>
                {gateMsg && <div className="ic-gate-msg">{gateMsg}</div>}
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
