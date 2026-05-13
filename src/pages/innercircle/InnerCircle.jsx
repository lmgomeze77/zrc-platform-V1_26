import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Lock, Globe2, Radar, Shield, Network, BarChart3,
  Map, FileText, Eye, KeyRound, CircleDot, RadioTower,
  BriefcaseBusiness, Layers,
} from "lucide-react";

const G = "#D4A853"; // ZRC gold

const IMG = {
  hero: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=80",
  map:  "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2000&q=80",
  boardroom: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=80",
  logistics: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1800&q=80",
  energy: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1800&q=80",
  report: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80",
};

const signals = [
  { id:"SIGNAL / 014", title:"Maritime Stress Repricing", region:"Red Sea · Suez · Eastern Mediterranean", impact:"Margin dispersion across industrials, logistics and consumer goods.", angle:"Infrastructure, storage capacity, logistics real estate, nearshoring corridors.", status:"Live" },
  { id:"SIGNAL / 027", title:"Capital Rotation Under Fragmentation", region:"Europe · GCC · LatAm", impact:"Family offices and strategic capital moving toward tangible-control assets.", angle:"Private credit, operating real estate, essential services, special situations.", status:"Active" },
  { id:"SIGNAL / 039", title:"Energy Security Premium", region:"Iberia · North Africa · Atlantic Axis", impact:"Energy resilience increasingly embedded into corporate valuation assumptions.", angle:"Grid infrastructure, storage, efficiency, industrial resilience, energy corridors.", status:"Watching" },
];

const layers = [
  { n:"01", Icon:RadioTower, title:"Strategic Signals", text:"Early indicators on geopolitical, financial and sector-specific shifts before they become consensus." },
  { n:"02", Icon:Network,    title:"Capital Intelligence", text:"Investor maps, capital allocation patterns, mandate intelligence and private market movement tracking." },
  { n:"03", Icon:Radar,      title:"Opportunity Radar", text:"Curated off-market opportunities, special situations, asset intelligence and strategic entry points." },
];

const deliverables = ["Weekly Intelligence Briefings","Private Market Signals","Geopolitical Risk Notes","Sector Watchlists","Capital Flow Maps","Off-Market Deal Alerts","Investor Roundtables","Strategic Memos"];

const membership = [
  { name:"Observer", label:"Selected Access", description:"Access to selected public and semi-private intelligence briefings.", items:["Monthly intelligence note","Selected signal archive","Public radar excerpts"], featured:false },
  { name:"Inner Circle", label:"Private Layer", description:"Full access to strategic briefings, private memos, opportunity radar and investor intelligence sessions.", items:["Weekly Black Brief","Private signal dashboard","Opportunity radar","Member-only sessions"], featured:true },
  { name:"Council", label:"Bespoke Intelligence", description:"Reserved for family offices, operators, investors and corporate leaders requiring bespoke intelligence.", items:["Bespoke intelligence memos","Scenario workshops","Capital strategy clinics","Deal-specific intelligence"], featured:false },
];

const regions = ["Madrid","Miami","Mexico City","Bogotá","Dubai","Singapore","Rotterdam","Suez","Panama","Tangier"];

// ── STYLES ──────────────────────────────────────────────────
const S = {
  page: { minHeight:"100vh", background:"#000", color:"#fff", cursor:"crosshair", userSelect:"text" },
  mono: { fontFamily:"'IBM Plex Mono','Fira Code',monospace" },
  serif: { fontFamily:"'Cormorant Garamond','Georgia',serif" },
  sans: { fontFamily:"'Outfit','Helvetica Neue',sans-serif" },
  label: { fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.35em", textTransform:"uppercase" },
  goldLabel: { fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.35em", textTransform:"uppercase", color:G },
  border: "1px solid rgba(255,255,255,0.1)",
  goldBorder: `1px solid rgba(212,168,83,0.5)`,
};
function NoiseOverlay() {
  return <div aria-hidden style={{ pointerEvents:"none", position:"fixed", inset:0, zIndex:50, opacity:0.045, mixBlendMode:"screen", backgroundImage:"url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')" }} />;
}

function TopNav({ onBack }) {
  const nav = ["Layers","Black Brief","Radar","Membership","Access"];
  return (
    <header style={{ position:"fixed", left:0, right:0, top:0, zIndex:40, borderBottom:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.65)", backdropFilter:"blur(20px)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.03)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CircleDot size={15} color="#fff" />
          </div>
          <div>
            <div style={{ ...S.label, color:"rgba(255,255,255,0.5)", marginBottom:2 }}>Zenith Rise Capital</div>
            <div style={{ ...S.serif, fontSize:14, letterSpacing:"0.18em", color:"#fff" }}>Inner Circle</div>
          </div>
        </div>
        <nav style={{ display:"flex", gap:28, alignItems:"center" }}>
          {nav.map(item => <a key={item} href={`#${item.toLowerCase().replace(" ","-")}`} style={{ ...S.label, color:"rgba(255,255,255,0.45)", textDecoration:"none", transition:"color 0.2s" }}>{item}</a>)}
        </nav>
        {onBack && (
          <button onClick={onBack} style={{ ...S.label, color:"rgba(212,168,83,0.7)", background:"none", border:"1px solid rgba(212,168,83,0.3)", padding:"6px 16px", cursor:"pointer", borderRadius:20 }}>
            ← EXIT
          </button>
        )}
      </div>
    </header>
  );
}

function EntryGate() {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 1700); return () => clearTimeout(t); }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity:1 }} exit={{ opacity:0, transition:{duration:0.75} }}
          style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"#000" }}>
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7 }} style={{ textAlign:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.03)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 28px" }}>
              <Lock color="#fff" size={20} />
            </div>
            <div style={{ ...S.label, color:"rgba(255,255,255,0.45)", marginBottom:12 }}>Access Verified</div>
            <div style={{ ...S.serif, fontSize:40, letterSpacing:"0.2em", color:"#fff" }}>INNER CIRCLE</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:24, ...S.label, color:"rgba(255,255,255,0.35)" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:G, display:"inline-block", animation:"pulse 1.5s infinite" }} /> Verifying Signal
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ eyebrow, title, text }) {
  return (
    <div style={{ marginBottom:48, maxWidth:720 }}>
      <div style={{ ...S.goldLabel, marginBottom:20 }}>{eyebrow}</div>
      <h2 style={{ ...S.serif, fontSize:"clamp(32px,5vw,56px)", fontWeight:300, letterSpacing:"-0.035em", color:"#fff", margin:"0 0 20px" }}>{title}</h2>
      {text && <p style={{ fontSize:17, lineHeight:1.8, color:"rgba(255,255,255,0.56)", margin:0 }}>{text}</p>}
    </div>
  );
}
function Hero() {
  return (
    <section id="top" style={{ position:"relative", minHeight:"100vh", overflow:"hidden", background:"#000", paddingTop:112 }}>
      <div style={{ position:"absolute", inset:0 }}>
        <img src={IMG.hero} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"grayscale(100%)" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.75)" }} />
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 50% 30%, rgba(212,168,83,0.13), transparent 32%), linear-gradient(to bottom, transparent, #000 82%)" }} />
      </div>
      <div style={{ position:"relative", maxWidth:1200, margin:"0 auto", padding:"0 32px 80px", display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:48, alignItems:"center", minHeight:"calc(100vh - 112px)" }}>
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.9, delay:1.1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.03)", padding:"8px 16px", ...S.label, color:"rgba(255,255,255,0.55)", marginBottom:28 }}>
            <Lock size={13} color={G} /> Membership by approval only
          </div>
          <h1 style={{ ...S.serif, fontSize:"clamp(48px,8vw,96px)", fontWeight:300, lineHeight:0.92, letterSpacing:"-0.045em", color:"#fff", margin:"0 0 32px" }}>
            Where capital sees before markets react.
          </h1>
          <p style={{ fontSize:18, lineHeight:1.8, color:"rgba(255,255,255,0.62)", maxWidth:560, marginBottom:40 }}>
            A private intelligence environment for investors, operators and strategic decision-makers. ZRC Inner Circle connects geopolitical signals, private market intelligence and off-market opportunities into actionable capital context.
          </p>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <a href="#access" style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"14px 24px", background:"#fff", color:"#000", borderRadius:40, ...S.label, textDecoration:"none", transition:"background 0.2s" }}>
              Request Access <ArrowRight size={15} />
            </a>
            <a href="#layers" style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"14px 24px", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", borderRadius:40, ...S.label, textDecoration:"none" }}>
              View Intelligence Layers
            </a>
          </div>
        </motion.div>
        <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ duration:1, delay:1.25 }}
          style={{ position:"relative", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.55)", padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.1)", paddingBottom:16, marginBottom:20 }}>
            <span style={{ ...S.label, color:"rgba(255,255,255,0.45)" }}>Live Intelligence Layer</span>
            <span style={{ ...S.label, color:G, display:"flex", alignItems:"center", gap:6 }}><span style={{ width:6, height:6, borderRadius:"50%", background:G, display:"inline-block" }} /> Active</span>
          </div>
          <div style={{ position:"relative", height:400, overflow:"hidden", background:"rgba(255,255,255,0.025)" }}>
            <img src={IMG.map} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.25, filter:"grayscale(100%) invert(100%)" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, #000, rgba(0,0,0,0.35), rgba(0,0,0,0.8))" }} />
            {regions.slice(0,7).map((r,i) => (
              <motion.div key={r} animate={{ opacity:[0.35,1,0.35] }} transition={{ duration:2.8+i*0.25, repeat:Infinity }}
                style={{ position:"absolute", display:"flex", alignItems:"center", gap:6, ...S.label, fontSize:9, color:"rgba(255,255,255,0.65)", left:`${12+(i*13)%72}%`, top:`${18+(i*17)%63}%` }}>
                <span style={{ width:8, height:8, borderRadius:"50%", border:`1px solid ${G}`, background:`rgba(212,168,83,0.25)`, boxShadow:`0 0 18px rgba(212,168,83,0.6)`, display:"inline-block" }} /> {r}
              </motion.div>
            ))}
            <div style={{ position:"absolute", bottom:20, left:20, right:20, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.7)", padding:16, backdropFilter:"blur(8px)" }}>
              <div style={{ ...S.label, color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Current Signal</div>
              <div style={{ ...S.serif, fontSize:20, color:"#fff" }}>Fragmentation reprices logistics optionality.</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LayersSection() {
  return (
    <section id="layers" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <SectionLabel eyebrow="Intelligence Architecture" title="Three layers. One private operating picture." text="The Inner Circle transforms fragmented information into structured intelligence for capital allocation and strategic positioning." />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {layers.map(({ n, Icon, title, text }) => (
            <motion.div key={title} whileHover={{ y:-6 }}
              style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:28, cursor:"default" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:48 }}>
                <span style={{ ...S.label, color:"rgba(255,255,255,0.35)" }}>{n}</span>
                <Icon size={22} color="rgba(255,255,255,0.45)" />
              </div>
              <h3 style={{ ...S.serif, fontSize:28, color:"#fff", margin:"0 0 16px" }}>{title}</h3>
              <p style={{ lineHeight:1.7, color:"rgba(255,255,255,0.55)", margin:0 }}>{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RadarSection() {
  return (
    <section id="radar" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <SectionLabel eyebrow="Opportunity Radar" title="Signals become mandates. Mandates become access." text="The radar layer connects sector dislocation, capital appetite and off-market origination into curated opportunity intelligence." />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {signals.map(sig => (
            <div key={sig.id} style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:28 }}>
                <span style={{ ...S.goldLabel }}>{sig.id}</span>
                <span style={{ ...S.label, color:"rgba(255,255,255,0.45)", border:"1px solid rgba(255,255,255,0.1)", padding:"2px 10px", borderRadius:20 }}>{sig.status}</span>
              </div>
              <h3 style={{ ...S.serif, fontSize:26, color:"#fff", lineHeight:1.3, margin:"0 0 12px" }}>{sig.title}</h3>
              <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)", marginBottom:24 }}>{sig.region}</div>
              <div style={{ fontSize:14, lineHeight:1.7, color:"rgba(255,255,255,0.58)" }}>
                <p style={{ marginBottom:12 }}><span style={{ color:"rgba(255,255,255,0.85)" }}>Impact: </span>{sig.impact}</p>
                <p style={{ margin:0 }}><span style={{ color:"rgba(255,255,255,0.85)" }}>Investor Angle: </span>{sig.angle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeliverablesSection() {
  return (
    <section style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <SectionLabel eyebrow="Member Outputs" title="Not content. Intelligence products." text="Every output should feel like a private desk note: concise, relevant, decision-oriented and visually controlled." />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", border:"1px solid rgba(255,255,255,0.1)", gap:1, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
          {deliverables.map(item => (
            <div key={item} style={{ minHeight:140, background:"#000", padding:24, display:"flex", alignItems:"flex-end", transition:"background 0.2s" }}>
              <div>
                <div style={{ width:6, height:6, borderRadius:"50%", background:G, marginBottom:16 }} />
                <div style={{ ...S.serif, fontSize:22, color:"#fff" }}>{item}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MembershipSection() {
  return (
    <section id="membership" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <SectionLabel eyebrow="Membership" title="Access is limited by design." text="The Inner Circle remains selective. Members are admitted only when their profile fits the intelligence environment." />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {membership.map(plan => (
            <div key={plan.name} style={{ border: plan.featured ? `1px solid rgba(212,168,83,0.7)` : "1px solid rgba(255,255,255,0.1)", background: plan.featured ? "rgba(212,168,83,0.055)" : "rgba(255,255,255,0.025)", padding:28, position:"relative" }}>
              {plan.featured && <span style={{ position:"absolute", right:20, top:20, ...S.goldLabel, fontSize:9 }}>Core</span>}
              <div style={{ ...S.label, color:"rgba(255,255,255,0.35)", marginBottom:16 }}>{plan.label}</div>
              <h3 style={{ ...S.serif, fontSize:36, color:"#fff", margin:"0 0 16px" }}>{plan.name}</h3>
              <p style={{ lineHeight:1.7, color:"rgba(255,255,255,0.55)", minHeight:80, marginBottom:28 }}>{plan.description}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {plan.items.map(item => (
                  <div key={item} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:"rgba(255,255,255,0.58)" }}>
                    <Shield size={14} color={G} style={{ flexShrink:0 }} /> {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function AccessSection() {
  return (
    <section id="access" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, opacity:0.18 }}>
        <img src={IMG.boardroom} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"grayscale(100%)" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.9)" }} />
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", position:"relative", display:"grid", gridTemplateColumns:"1.05fr 0.95fr", gap:40 }}>
        <div>
          <SectionLabel eyebrow="Request Access" title="Private intelligence for capital, not a public feed." text="Access requests are reviewed manually. The goal is to preserve quality, confidentiality and strategic relevance across the membership base." />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[{ Icon:Eye, text:"Reviewed profile" },{ Icon:BriefcaseBusiness, text:"Strategic relevance" },{ Icon:Layers, text:"Controlled access" }].map(({ Icon, text }) => (
              <div key={text} style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:20 }}>
                <Icon size={19} color={G} style={{ marginBottom:28, display:"block" }} />
                <div style={{ ...S.label, fontSize:10, color:"rgba(255,255,255,0.55)" }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.75)", padding:28, backdropFilter:"blur(8px)" }}>
          <div style={{ ...S.goldLabel, marginBottom:28 }}>Access Form — Membership Request</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[["Full name","text"],["Email","email"],["Organization","text"],["LinkedIn / Website","url"]].map(([label, type]) => (
              <label key={label} style={{ display:"block" }}>
                <span style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)", display:"block", marginBottom:6 }}>{label}</span>
                <input type={type} placeholder={label} style={{ width:"100%", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:"12px 16px", color:"#fff", outline:"none", boxSizing:"border-box", fontFamily:"inherit", fontSize:14 }} />
              </label>
            ))}
            <label style={{ display:"block" }}>
              <span style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)", display:"block", marginBottom:6 }}>Reason for access</span>
              <textarea rows={3} placeholder="Briefly explain your strategic interest" style={{ width:"100%", resize:"none", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:"12px 16px", color:"#fff", outline:"none", boxSizing:"border-box", fontFamily:"inherit", fontSize:14 }} />
            </label>
          </div>
          <button style={{ marginTop:20, display:"inline-flex", width:"100%", alignItems:"center", justifyContent:"center", gap:12, padding:"14px 24px", background:"#fff", color:"#000", border:"none", ...S.label, cursor:"pointer", borderRadius:40, boxSizing:"border-box" }}>
            Submit Request <ArrowRight size={15} />
          </button>
          <p style={{ marginTop:16, textAlign:"center", ...S.label, fontSize:10, color:"rgba(255,255,255,0.35)", lineHeight:1.6 }}>Manual approval only. Submission does not guarantee membership.</p>
        </div>
      </div>
    </section>
  );
}

function BlackBrief() {
  return (
    <section id="black-brief" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, opacity:0.2 }}>
        <img src={IMG.report} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"grayscale(100%)" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.85)" }} />
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", position:"relative", display:"grid", gridTemplateColumns:"0.85fr 1.15fr", gap:32, alignItems:"start" }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.7)", padding:32, backdropFilter:"blur(8px)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:64 }}>
            <span style={{ ...S.label, color:"rgba(255,255,255,0.35)" }}>Confidential Memo</span>
            <FileText size={18} color={G} />
          </div>
          <div style={{ ...S.serif, fontSize:56, lineHeight:1, color:"#fff" }}>The<br/>Black<br/>Brief</div>
          <div style={{ height:1, background:"rgba(255,255,255,0.1)", margin:"28px 0 20px" }} />
          <div style={{ ...S.label, color:"rgba(255,255,255,0.35)" }}>ZRC / Inner Circle / Weekly</div>
        </div>
        <div>
          <SectionLabel eyebrow="Flagship Intelligence Product" title="A confidential intelligence memo for investors and strategic operators." text="Each edition connects geopolitical events, market signals, sector pressure points and actionable investment implications. The aim is not to describe events. The aim is to extract positioning intelligence." />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {["Signal thesis","Market transmission","Sector impact","Capital allocation angle"].map(item => (
              <div key={item} style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:18, ...S.label, color:"rgba(255,255,255,0.6)" }}>{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ICFooter() {
  return (
    <footer style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ ...S.serif, fontSize:20, letterSpacing:"0.14em", color:"#fff", marginBottom:6 }}>ZRC Inner Circle</div>
          <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)" }}>Investor Intelligence · Strategic Signals · Private Capital</div>
        </div>
        <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.3)" }}>© Zenith Rise Capital</div>
      </div>
    </footer>
  );
}

export default function InnerCircle({ onBack }) {
  return (
    <main style={S.page}>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      <EntryGate />
      <NoiseOverlay />
      <TopNav onBack={onBack} />
      <Hero />
      <LayersSection />
      <BlackBrief />
      <RadarSection />
      <DeliverablesSection />
      <MembershipSection />
      <AccessSection />
      <ICFooter />
    </main>
  );
}
