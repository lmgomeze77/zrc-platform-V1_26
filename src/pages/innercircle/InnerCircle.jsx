import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Lock, Radar, Shield, Network,
  FileText, Eye, KeyRound, CircleDot, RadioTower,
  BriefcaseBusiness, Layers,
  MapPin, Zap, Building2, Landmark, ChevronRight, Activity,
} from "lucide-react";

const G = "#D4A853";

const IMG = {
  hero:       "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=80",
  map:        "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2000&q=80",
  boardroom:  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=80",
  report:     "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80",
  solar:      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1800&q=80",
};

const S = {
  serif:     { fontFamily:"'Cormorant Garamond','Georgia',serif" },
  label:     { fontFamily:"'Outfit','Helvetica Neue',sans-serif", fontSize:10, letterSpacing:"0.28em", textTransform:"uppercase" },
  goldLabel: { fontFamily:"'Outfit','Helvetica Neue',sans-serif", fontSize:10, letterSpacing:"0.28em", textTransform:"uppercase", color:G },
  border:    "1px solid rgba(255,255,255,0.1)",
  goldBorder:`1px solid rgba(212,168,83,0.5)`,
  page:      { minHeight:"100vh", background:"#000", color:"#fff", cursor:"crosshair" },
};

const signals = [
  { id:"SIGNAL / 014", title:"Maritime Stress Repricing",          region:"Red Sea · Suez · Eastern Mediterranean", impact:"Margin dispersion across industrials, logistics and consumer goods.",              angle:"Infrastructure, storage capacity, logistics real estate, nearshoring corridors.", status:"Live" },
  { id:"SIGNAL / 027", title:"Capital Rotation Under Fragmentation",region:"Europe · GCC · LatAm",                  impact:"Family offices and strategic capital moving toward tangible-control assets.",     angle:"Private credit, operating real estate, essential services, special situations.",  status:"Active" },
  { id:"SIGNAL / 039", title:"Energy Security Premium",             region:"Iberia · North Africa · Atlantic Axis",  impact:"Energy resilience increasingly embedded into corporate valuation assumptions.", angle:"Grid infrastructure, storage, efficiency, industrial resilience, energy corridors.", status:"Watching" },
];

const layers = [
  { n:"01", Icon:RadioTower, title:"Strategic Signals",    text:"Early indicators on geopolitical, financial and sector-specific shifts before they become consensus." },
  { n:"02", Icon:Network,    title:"Capital Intelligence", text:"Investor maps, capital allocation patterns, mandate intelligence and private market movement tracking." },
  { n:"03", Icon:Radar,      title:"Opportunity Radar",    text:"Curated off-market opportunities, special situations, asset intelligence and strategic entry points." },
];

const deliverables = ["Weekly Intelligence Briefings","Private Market Signals","Geopolitical Risk Notes","Sector Watchlists","Capital Flow Maps","Off-Market Deal Alerts","Investor Roundtables","Strategic Memos"];

const membership = [
  { name:"Observer",     label:"Selected Access",    description:"Access to selected public and semi-private intelligence briefings.",                                                                                     items:["Monthly intelligence note","Selected signal archive","Public radar excerpts"],                              featured:false },
  { name:"Inner Circle", label:"Private Layer",       description:"Full access to strategic briefings, private memos, opportunity radar and investor intelligence sessions.",                                             items:["Weekly Black Brief","Private signal dashboard","Opportunity radar","Member-only sessions"],                  featured:true  },
  { name:"Council",      label:"Bespoke Intelligence",description:"Reserved for family offices, operators, investors and corporate leaders requiring bespoke intelligence.",                                              items:["Bespoke intelligence memos","Scenario workshops","Capital strategy clinics","Deal-specific intelligence"],     featured:false },
];

const regions = ["Madrid","Miami","Mexico City","Bogotá","Dubai","Singapore","Rotterdam","Suez","Panama","Tangier"];

// ── MEMBER CONTENT DATA ─────────────────────────────────────

const events = [
  { id:"EVT / 001", type:"Roundtable",        title:"Iberia Real Assets & Private Credit",             subtitle:"Deuda privada, activos reales y compresión de spreads en el ciclo post-BCE",                                              date:"12 Jun 2026",   location:"Madrid",          format:"Presencial — aforo limitado",          seats:"14 plazas",                              tags:["Real Estate","Private Credit","Iberia"] },
  { id:"EVT / 002", type:"Workshop",           title:"Energy Transition Mandates in Southern Europe",   subtitle:"Infraestructura de almacenamiento, contratos PPA y posicionamiento en el corredor atlántico",                            date:"3 Jul 2026",    location:"Bilbao",          format:"Presencial — formato taller",          seats:"20 plazas",                              tags:["Energía","Infraestructura","ESG Capital"] },
  { id:"EVT / 003", type:"Private Dinner",     title:"GCC–Iberia Capital Corridor",                    subtitle:"Capital soberano del Golfo, vehículos de co-inversión y mandatos de diversificación hacia Europa",                       date:"18 Sep 2026",   location:"Dubai",           format:"Cena privada — solo por invitación",   seats:"12 plazas",                              tags:["GCC","Sovereign Capital","Co-investment"] },
  { id:"EVT / 004", type:"Intelligence Session",title:"Special Situations Europe 2026",                 subtitle:"Distressed assets, recapitalizaciones y oportunidades de turnaround en el ciclo actual",                                 date:"29 May 2026",   location:"Virtual — cifrado",format:"Sesión cerrada — máx. 30 asistentes", seats:"Plazas disponibles", upcoming:true,  tags:["Special Situations","Distressed","Europa"] },
  { id:"EVT / 005", type:"Annual Forum",        title:"ZRC Intelligence Forum 2026",                    subtitle:"Perspectivas macro, asignación de capital y señales de posicionamiento para el siguiente ciclo",                         date:"16–17 Oct 2026",location:"Madrid",           format:"Conferencia anual de miembros",         seats:"Sólo Inner Circle y Council",            tags:["Macro","Capital Allocation","Networking"] },
];

const opportunities = [
  {
    id:"OPP / 011", geography:"España",    sector:"Logística",            icon:Building2,
    title:"Plataformas logísticas peri-urbanas — Corredor Madrid–Valencia",
    thesis:"La aceleración del nearshoring industrial y la presión sobre plazos de entrega last-mile están generando escasez de superficie logística de Clase A en un radio de 30–60 km de los nodos urbanos de Madrid y Valencia. Los yields se mantienen 80–120 bps sobre la media europea.",
    signal:"Demanda corporativa confirmada. Escasez de suelo finalista. Ventana de entrada 12–18 meses.",
    type:"Core+ / Value-Add", return:"7.8–9.2% TIR est.", horizon:"5–7 años", status:"Active",
  },
  {
    id:"OPP / 014", geography:"España",    sector:"Energía",              icon:Zap,
    title:"Solar + almacenamiento — Corredor Extremadura–Andalucía",
    thesis:"España tiene una de las irradiaciones más altas de Europa occidental y un marco regulatorio que favorece contratos PPA a largo plazo. El corredor Extremadura–Andalucía concentra proyectos en fase RTB con acceso a red confirmado, permitiendo estructuras de financiación de proyecto con leverage conservador.",
    signal:"Precios eléctricos volátiles. Demanda corporativa de PPAs verdes en expansión. Infraestructura de conexión disponible.",
    type:"Infrastructure / Project Finance", return:"8.5–11% TIR est.", horizon:"15–20 años", status:"Watching",
  },
  {
    id:"OPP / 019", geography:"Europa Sur", sector:"Digital Infrastructure",icon:Activity,
    title:"Data Centers de edge computing — Sur de Europa",
    thesis:"La expansión de la IA generativa y los requisitos de soberanía de datos están creando una demanda estructural de capacidad de cómputo distribuida. El sur de Europa combina costes energéticos competitivos, latencia favorable hacia África y Oriente Medio, y marcos regulatorios estables.",
    signal:"Compromisos de hiperescalares confirmados en Barcelona y Lisboa. Escasez de suelo con acceso a red de alta tensión.",
    type:"Infrastructure / Growth", return:"10–14% TIR est.", horizon:"7–10 años", status:"Live",
  },
  {
    id:"OPP / 023", geography:"GCC / MENA", sector:"Private Credit",      icon:Landmark,
    title:"Financiación puente en transición energética — Arabia Saudí y Emiratos",
    thesis:"Visión 2030 y las metas net-zero de los Emiratos generan una pipeline de infraestructura energética que supera la capacidad de los bancos regionales. El private credit internacional accede a estructuras senior secured con colateral real y rendimientos superiores al mercado europeo.",
    signal:"Spreads 350–450 bps sobre SOFR. Garantías soberanas parciales. Vehículos de acceso para inversores institucionales cualificados.",
    type:"Private Credit / Senior Secured", return:"SOFR + 380 bps est.", horizon:"3–5 años", status:"Active",
  },
];

const featuredNote = {
  id:"BLACK BRIEF / MAYO 2026",
  title:"El Corredor Energético Ibérico",
  subtitle:"Una tesis de inversión estructural",
  author:"ZRC Intelligence Desk",
  date:"Mayo 2026",
  readTime:"12 min",
  classification:"INNER CIRCLE — CONFIDENTIAL",
  sections:[
    { heading:"La tesis",                body:"España y Portugal han pasado de ser importadores energéticos dependientes a convertirse en el eje de un corredor energético europeo. La combinación de capacidad renovable instalada (>80 GW en España a cierre de 2025), infraestructura de GNL de primer nivel y posición geográfica estratégica entre el Atlántico, el Mediterráneo y el Norte de África define una oportunidad de inversión de largo plazo que el mercado está subvalorando." },
    { heading:"Por qué ahora",           body:"Tres catalizadores concurren simultáneamente: (1) la REPowerEU acelera los flujos de capital hacia infraestructura energética ibérica, (2) el corredor submarino BarMar de hidrógeno verde conectará Barcelona con Marsella para 2030, y (3) la dependencia energética alemana y francesa crea demanda estructural de acuerdos de suministro a largo plazo. En los últimos 18 meses, más de €4.200M de capital privado han entrado en activos energéticos en la península." },
    { heading:"Transmisión al capital",  body:"Los inversores con exposición a activos de infraestructura energética ibérica están accediendo a yields en el rango 7–11% TIR dependiendo del perfil de riesgo: desde contratos PPA regulados hasta plataformas en fase greenfield. El denominador común es la reducción de la prima de riesgo geopolítico respecto a alternativas en Oriente Medio, manteniendo rendimientos superiores a la infraestructura core centroeuropea." },
    { heading:"Riesgos a vigilar",       body:"Riesgo regulatorio en revisión de mecanismos de captura de ingresos extraordinarios. Presión sobre márgenes si los precios spot continúan bajo presión. Riesgo de ejecución en proyectos de almacenamiento ante cuellos de botella en permisos municipales. Mitigante principal: estructuras con contratos PPA firmados previos al cierre de inversión." },
    { heading:"Ángulo de posicionamiento",body:"Favorecemos exposición a plataformas de proyecto en fase RTB (Ready to Build) con PPA firmados, almacenamiento con acceso a red confirmado y operadores con track record en el mercado español. Evitamos exposición especulativa a tecnologías de hidrógeno verde hasta que la infraestructura de transporte esté operativa (2028–2030). Vehículo preferido: equity directo o co-inversión junto a gestores especializados con presencia local." },
  ],
};

// ── UTILITY ─────────────────────────────────────────────────

function NoiseOverlay() {
  return <div aria-hidden style={{ pointerEvents:"none", position:"fixed", inset:0, zIndex:50, opacity:0.045, mixBlendMode:"screen", backgroundImage:"url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')" }} />;
}

function TopNav({ onBack }) {
  const nav = ["Intelligence","Eventos","Oportunidades","Radar","Membership","Contacto"];
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
        <nav style={{ display:"flex", gap:24, alignItems:"center" }}>
          {nav.map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(" ","-")}`} style={{ ...S.label, color:"rgba(255,255,255,0.45)", textDecoration:"none", transition:"color 0.2s" }}>
              {item}
            </a>
          ))}
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
            <a href="#intelligence" style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"14px 24px", background:"#fff", color:"#000", borderRadius:40, ...S.label, textDecoration:"none" }}>
              Ver Inteligencia <ArrowRight size={15} />
            </a>
            <a href="#oportunidades" style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"14px 24px", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", borderRadius:40, ...S.label, textDecoration:"none" }}>
              Oportunidades
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
    <section id="intelligence" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
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

function FeaturedNoteSection() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? featuredNote.sections : featuredNote.sections.slice(0,2);
  return (
    <section style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:40 }}>
          {/* Left col */}
          <div>
            <div style={{ ...S.goldLabel, marginBottom:20 }}>Black Brief</div>
            <h2 style={{ ...S.serif, fontSize:"clamp(28px,4vw,44px)", fontWeight:300, color:"#fff", margin:"0 0 12px" }}>{featuredNote.title}</h2>
            <p style={{ ...S.serif, fontSize:18, fontStyle:"italic", color:"rgba(255,255,255,0.45)", margin:"0 0 28px" }}>{featuredNote.subtitle}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:G }}>■</span> {featuredNote.classification}
              </div>
              <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)" }}>{featuredNote.author} · {featuredNote.date}</div>
              <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)" }}>Lectura: {featuredNote.readTime}</div>
            </div>
            <div style={{ position:"relative", marginTop:32, overflow:"hidden" }}>
              <img src={IMG.solar} alt="Solar infrastructure Iberia" style={{ width:"100%", height:200, objectFit:"cover", filter:"grayscale(100%)", display:"block" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }} />
              <div style={{ position:"absolute", bottom:12, left:12, ...S.label, fontSize:9, color:"rgba(255,255,255,0.4)" }}>Infraestructura Solar — Corredor Atlántico</div>
            </div>
          </div>
          {/* Right col */}
          <div style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.02)", padding:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(255,255,255,0.1)", paddingBottom:20, marginBottom:28 }}>
              <FileText size={16} color={G} />
              <span style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.4)" }}>Nota de inteligencia — Edición Mayo 2026</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {visible.map((sec, i) => (
                <motion.div key={sec.heading} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:i*0.08 }}>
                  <div style={{ ...S.goldLabel, fontSize:9, marginBottom:10 }}>{sec.heading}</div>
                  <p style={{ lineHeight:1.85, color:"rgba(255,255,255,0.65)", margin:0 }}>{sec.body}</p>
                </motion.div>
              ))}
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:28, paddingTop:20 }}>
              <button onClick={() => setExpanded(e => !e)}
                style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.45)", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                {expanded ? "Cerrar" : "Leer análisis completo"} <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventBoardSection() {
  return (
    <section id="eventos" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <SectionLabel
          eyebrow="Agenda de Miembros"
          title="Eventos privados. Acceso restringido."
          text="Roundtables, sesiones de inteligencia y foros de capital reservados a miembros Inner Circle y Council. El formato es reducido por diseño."
        />
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {events.map((ev, i) => (
            <motion.div key={ev.id}
              initial={{ opacity:0, x:-16 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.45, delay:i*0.07 }}
              style={{ display:"grid", gridTemplateColumns:"120px 1fr 160px", gap:24, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.018)", padding:24 }}>
              {/* Date col */}
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                <div style={{ ...S.goldLabel, fontSize:9 }}>{ev.type}</div>
                <div style={{ ...S.serif, fontSize:22, color:"#fff", marginTop:12 }}>{ev.date}</div>
              </div>
              {/* Main col */}
              <div style={{ borderLeft:"1px solid rgba(255,255,255,0.1)", paddingLeft:24 }}>
                <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>{ev.id}</div>
                <h3 style={{ ...S.serif, fontSize:22, color:"#fff", margin:"0 0 8px", lineHeight:1.3 }}>{ev.title}</h3>
                <p style={{ fontSize:14, lineHeight:1.7, color:"rgba(255,255,255,0.5)", margin:"0 0 16px" }}>{ev.subtitle}</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {ev.tags.map(tag => (
                    <span key={tag} style={{ border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"2px 10px", ...S.label, fontSize:9, color:"rgba(255,255,255,0.4)" }}>{tag}</span>
                  ))}
                </div>
              </div>
              {/* Info col */}
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between", textAlign:"right" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6, ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)" }}>
                  <MapPin size={11} /> {ev.location}
                </div>
                <div>
                  <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:4 }}>{ev.format}</div>
                  <div style={{ ...S.label, fontSize:9, color: ev.upcoming ? G : "rgba(255,255,255,0.45)" }}>{ev.seats}</div>
                </div>
                <a href="#contacto" style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6, marginTop:8 }}>
                  Solicitar plaza <ChevronRight size={12} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpportunitiesSection() {
  return (
    <section id="oportunidades" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <SectionLabel
          eyebrow="Opportunity Radar — España & Internacional"
          title="Oportunidades de inversión curadas."
          text="Tesis con señal confirmada, geografía clara y ángulo de inversión para capital institucional. No son recomendaciones de inversión. Son inteligencia de posicionamiento."
        />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {opportunities.map((opp, i) => {
            const Icon = opp.icon;
            const dotColor = opp.status === "Live" ? G : opp.status === "Active" ? "#22c55e" : "rgba(255,255,255,0.3)";
            return (
              <motion.div key={opp.id}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.1 }}
                style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.022)", padding:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                  <div>
                    <div style={{ ...S.goldLabel, fontSize:9, marginBottom:8 }}>{opp.id}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {[opp.geography, opp.sector].map(t => (
                        <span key={t} style={{ border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"2px 8px", ...S.label, fontSize:9, color:"rgba(255,255,255,0.4)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:dotColor, display:"inline-block" }} />
                    <span style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)" }}>{opp.status}</span>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:4 }}>
                  <Icon size={18} color={G} style={{ flexShrink:0, marginTop:4 }} />
                  <h3 style={{ ...S.serif, fontSize:22, color:"#fff", lineHeight:1.3, margin:0 }}>{opp.title}</h3>
                </div>
                <p style={{ fontSize:14, lineHeight:1.8, color:"rgba(255,255,255,0.55)", margin:"16px 0 0" }}>{opp.thesis}</p>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:16, paddingTop:16 }}>
                  <div style={{ ...S.goldLabel, fontSize:9, marginBottom:8 }}>Señal</div>
                  <p style={{ fontSize:13, lineHeight:1.7, color:"rgba(255,255,255,0.45)", fontStyle:"italic", margin:0 }}>{opp.signal}</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:16, paddingTop:16 }}>
                  {[["Tipo", opp.type, "rgba(255,255,255,0.65)"],["Retorno Est.", opp.return, G],["Horizonte", opp.horizon, "rgba(255,255,255,0.65)"]].map(([label, val, col]) => (
                    <div key={label}>
                      <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:12, color:col }}>{val}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
        <div style={{ marginTop:20, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.012)", padding:16, textAlign:"center" }}>
          <p style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.28)", margin:0 }}>
            Las oportunidades presentadas tienen carácter exclusivamente informativo. No constituyen asesoramiento de inversión ni oferta de valores. Acceso reservado a miembros cualificados.
          </p>
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
            <div key={item} style={{ minHeight:140, background:"#000", padding:24, display:"flex", alignItems:"flex-end" }}>
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

function ContactSection() {
  return (
    <section id="contacto" style={{ borderTop:"1px solid rgba(255,255,255,0.1)", background:"#000", padding:"80px 32px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, opacity:0.18 }}>
        <img src={IMG.boardroom} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"grayscale(100%)" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.9)" }} />
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", position:"relative" }}>
        <SectionLabel eyebrow="Contacto & Soporte" title="Acceso directo al equipo ZRC." text="Como miembro Inner Circle tienes línea directa con el equipo. Escríbenos para consultas, oportunidades específicas o gestión de tu membresía." />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { Icon:KeyRound,         label:"Equipo ZRC",        value:"luis@zenithrisecapital.com",     sub:"Contacto directo" },
            { Icon:BriefcaseBusiness, label:"Deal Flow",         value:"investment@zenithrisecapital.com", sub:"Oportunidades & mandatos" },
            { Icon:Shield,           label:"Soporte",           value:"support@zenithrisecapital.com",  sub:"Acceso y plataforma" },
          ].map(({ Icon, label, value, sub }) => (
            <a key={label} href={`mailto:${value}`} style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.025)", padding:28, textDecoration:"none", display:"block", transition:"border-color 0.2s" }}>
              <Icon size={20} color={G} style={{ marginBottom:20, display:"block" }} />
              <div style={{ ...S.goldLabel, fontSize:9, marginBottom:8 }}>{label}</div>
              <div style={{ ...S.serif, fontSize:17, color:"#fff", marginBottom:6, wordBreak:"break-all" }}>{value}</div>
              <div style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.35)" }}>{sub}</div>
            </a>
          ))}
        </div>
        <div style={{ marginTop:20, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.012)", padding:20, textAlign:"center" }}>
          <p style={{ ...S.label, fontSize:9, color:"rgba(255,255,255,0.28)", margin:0 }}>
            Miembro Inner Circle verificado · Acceso activo · Zenith Rise Capital
          </p>
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
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
      <EntryGate />
      <NoiseOverlay />
      <TopNav onBack={onBack} />
      <Hero />
      <LayersSection />
      <FeaturedNoteSection />
      <EventBoardSection />
      <OpportunitiesSection />
      <BlackBrief />
      <RadarSection />
      <DeliverablesSection />
      <MembershipSection />
      <ContactSection />
      <ICFooter />
    </main>
  );
}
