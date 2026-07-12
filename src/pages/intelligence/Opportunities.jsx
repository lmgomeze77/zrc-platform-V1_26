// Opportunities.jsx — "Oportunidades" sub-section, embedded inside Observatory
// Positive-progress counterpart to the Observatory feed: agreements,
// breakthroughs and development stories with a genuine thematic-investment
// angle. Rendered as a sub-block within Observatory.jsx (same convention as
// its "International Agenda" block) — no own nav entry, no own Sec/SH.
// Import in Observatory.jsx: import Opportunities from "./Opportunities";

import { useState } from "react";

// ── DESIGN TOKENS (mirrors App.jsx / Observatory.jsx) ────────
const C = {
  bg:"#09090B", surface:"#111113", surface2:"#18181B", surface3:"#1F1F23",
  border:"#27272A", borderHover:"#3F3F46",
  text:"#FAFAFA", textSec:"#A1A1AA", textMuted:"#71717A",
  gold:"#D4A853", goldDim:"rgba(212,168,83,0.12)", goldBorder:"rgba(212,168,83,0.25)",
  green:"#22C55E", greenDim:"rgba(34,197,94,0.12)", blue:"#3B82F6", violet:"#A78BFA",
};
const F = {
  display:"'Cormorant Garamond','Georgia',serif",
  body:"'Outfit','Helvetica Neue',sans-serif",
  mono:"'IBM Plex Mono','Fira Code',monospace",
};

// ── STATIC FEED ──────────────────────────────────────────────
// Fallback shown only when the live daily pipeline (generate-opportunities.js)
// has no data yet. Same convention as Observatory.jsx's static FEED.
const FEED = [
  {
    id:1, tag:"AGREEMENT", category:"paz-diplomacia", region:"MENA",
    title:{es:"Corredor humanitario en Gaza se amplia tras acuerdo de mediacion egipcio-catari",en:"Gaza humanitarian corridor expands after Egyptian-Qatari mediated agreement"},
    source:"Al Jazeera", source_url:"https://www.aljazeera.com/news/gaza-corridor-agreement-2026",
    published_at:"2026-07-11", time:"1d", confidence:82,
    summary:{es:"Egipto y Catar mediaron un acuerdo que amplia el acceso humanitario y restablece un cruce fronterizo adicional, tras semanas de negociacion tecnica entre las partes.",en:"Egypt and Qatar mediated an agreement that expands humanitarian access and reopens an additional border crossing, following weeks of technical negotiation between the parties."},
    why_it_matters:{es:"Es un acuerdo tecnico ya implementado, no una promesa — el cruce esta operativo desde ayer con verificacion de la ONU.",en:"This is an already-implemented technical agreement, not a pledge — the crossing has been operational since yesterday with UN verification."},
    opportunity:{es:"Reduce la prima de riesgo regional a corto plazo y respalda la tesis de reconstruccion de infraestructura en la region una vez estabilizado el marco humanitario.",en:"Lowers near-term regional risk premium and supports the regional infrastructure-reconstruction thesis once the humanitarian framework stabilizes."},
  },
  {
    id:2, tag:"MILESTONE", category:"clima-energia", region:"EU",
    title:{es:"España supera el 60% de generacion renovable en el primer semestre, record historico",en:"Spain surpasses 60% renewable generation in H1, a historic record"},
    source:"El País", source_url:"https://elpais.com/economia/espana-renovables-record-2026",
    published_at:"2026-07-10", time:"2d", confidence:90,
    summary:{es:"Red Electrica confirmo que la generacion renovable alcanzo el 60.4% del mix electrico en el primer semestre, impulsada por nueva capacidad solar y eolica conectada en 2025.",en:"Red Eléctrica confirmed renewable generation reached 60.4% of the electricity mix in H1, driven by new solar and wind capacity connected in 2025."},
    why_it_matters:{es:"Es un dato verificado de la operadora del sistema, no una proyeccion — confirma que la curva de despliegue esta por delante del calendario oficial.",en:"This is a verified data point from the system operator, not a projection — it confirms the deployment curve is ahead of the official schedule."},
    opportunity:{es:"Refuerza la tesis de infraestructura de almacenamiento y redes de transporte como cuello de botella de la siguiente fase de la transicion energetica iberica.",en:"Reinforces the thesis on storage and grid-transmission infrastructure as the bottleneck for the next phase of the Iberian energy transition."},
  },
  {
    id:3, tag:"BREAKTHROUGH", category:"salud-ciencia", region:"AFRICA",
    title:{es:"La OMS certifica a Ruanda libre de transmision de malaria en cuatro provincias",en:"WHO certifies Rwanda malaria-transmission-free in four provinces"},
    source:"BBC News", source_url:"https://www.bbc.co.uk/news/world-africa-rwanda-malaria-2026",
    published_at:"2026-07-09", time:"3d", confidence:85,
    summary:{es:"La certificacion de la OMS se apoyo en tres años consecutivos sin casos autoctonos, resultado de un programa combinado de mosquiteras, fumigacion y vacunacion RTS,S.",en:"The WHO certification rests on three consecutive years without locally transmitted cases, the result of a combined program of bed nets, spraying and RTS,S vaccination."},
    why_it_matters:{es:"Certificacion formal de la OMS, no un anuncio gubernamental — el estandar de verificacion es el mismo que se usa para certificar erradicacion de polio.",en:"A formal WHO certification, not a government announcement — the verification standard is the same used to certify polio eradication."},
    opportunity:{es:"Mejora el perfil de riesgo sanitario para inversion en agricultura y turismo en las provincias certificadas, con posible efecto demostrativo regional.",en:"Improves the health-risk profile for agriculture and tourism investment in the certified provinces, with a possible regional demonstration effect."},
  },
  {
    id:4, tag:"AGREEMENT", category:"economia-desarrollo", region:"LATAM",
    title:{es:"Banco Interamericano de Desarrollo aprueba paquete de 2.400M$ para infraestructura hidrica en Centroamerica",en:"Inter-American Development Bank approves $2.4bn package for Central American water infrastructure"},
    source:"Reuters", source_url:"https://www.reuters.com/world/americas/idb-water-infrastructure-2026",
    published_at:"2026-07-08", time:"4d", confidence:80,
    summary:{es:"El directorio del BID aprobo la financiacion, que se ejecutara en cinco paises con cofinanciacion privada del 30% del total, priorizando cuencas con estres hidrico severo.",en:"The IDB's board approved the financing, to be executed across five countries with 30% private co-financing, prioritizing basins under severe water stress."},
    why_it_matters:{es:"Financiacion ya aprobada por el directorio, con estructura de cofinanciacion definida — no es un anuncio de intencion.",en:"Financing already approved by the board, with a defined co-financing structure — not a statement of intent."},
    opportunity:{es:"Abre una ventana de coinversion privada en infraestructura hidrica regulada, un segmento con flujos de caja contractuales de largo plazo.",en:"Opens a private co-investment window in regulated water infrastructure, a segment with long-duration contractual cash flows."},
  },
  {
    id:5, tag:"PROGRESS", category:"tecnologia", region:"APAC",
    title:{es:"India conecta a 50 millones de hogares rurales adicionales a internet de banda ancha",en:"India connects an additional 50 million rural households to broadband"},
    source:"France 24", source_url:"https://www.france24.com/en/asia-pacific/india-rural-broadband-2026",
    published_at:"2026-07-07", time:"5d", confidence:76,
    summary:{es:"El programa BharatNet reporto la conexion de 50 millones de hogares rurales adicionales en los ultimos 18 meses, superando la meta intermedia fijada para 2026.",en:"The BharatNet program reported connecting an additional 50 million rural households over the past 18 months, exceeding the interim 2026 target."},
    why_it_matters:{es:"Cifra de conexiones activas reportada por el regulador de telecomunicaciones, con meta intermedia ya superada antes de plazo.",en:"Active-connection figure reported by the telecom regulator, with the interim target already exceeded ahead of schedule."},
    opportunity:{es:"Amplia la base direccionable para fintech, comercio electronico y servicios financieros digitales en mercados rurales indios de mas rapido crecimiento.",en:"Expands the addressable base for fintech, e-commerce and digital financial services across India's fastest-growing rural markets."},
  },
  {
    id:6, tag:"MILESTONE", category:"clima-energia", region:"GLOBAL",
    title:{es:"El precio del almacenamiento en baterias cae otro 18% interanual, segun BloombergNEF",en:"Battery storage costs fall another 18% year-on-year, per BloombergNEF"},
    source:"The Guardian", source_url:"https://www.theguardian.com/environment/battery-storage-costs-2026",
    published_at:"2026-07-06", time:"6d", confidence:88,
    summary:{es:"El informe anual de BloombergNEF confirma una nueva caida de costes de almacenamiento en baterias de ion-litio, acelerando el punto de equilibrio economico frente al gas peninsular.",en:"BloombergNEF's annual report confirms a fresh drop in lithium-ion battery storage costs, accelerating the economic break-even point against peaking gas plants."},
    why_it_matters:{es:"Dato de un informe de mercado independiente y consistente con la tendencia de los ultimos cinco años, no una estimacion puntual.",en:"A data point from an independent market report, consistent with the trend of the past five years — not a one-off estimate."},
    opportunity:{es:"Refuerza la tesis de sobreponderar almacenamiento en red frente a generacion de respaldo con gas en carteras de infraestructura energetica.",en:"Reinforces the thesis of overweighting grid-scale storage relative to gas peaker capacity within energy-infrastructure portfolios."},
  },
];

const CATEGORIES = ["ALL","paz-diplomacia","clima-energia","salud-ciencia","economia-desarrollo","tecnologia"];
const CATEGORY_LABELS = {
  "ALL":               { es:"Todas",                en:"All" },
  "paz-diplomacia":    { es:"Paz y Diplomacia",      en:"Peace & Diplomacy" },
  "clima-energia":     { es:"Clima y Energía",       en:"Climate & Energy" },
  "salud-ciencia":     { es:"Salud y Ciencia",       en:"Health & Science" },
  "economia-desarrollo": { es:"Economía y Desarrollo", en:"Economy & Development" },
  "tecnologia":        { es:"Tecnología",            en:"Technology" },
};

const TAG_COLORS = {
  BREAKTHROUGH: { bg:"rgba(34,197,94,0.12)",  c:C.green },
  AGREEMENT:    { bg:"rgba(59,130,246,0.12)", c:C.blue },
  MILESTONE:    { bg:C.goldDim,               c:C.gold },
  PROGRESS:     { bg:"rgba(167,139,250,0.12)",c:C.violet },
};

// ── MAIN COMPONENT ───────────────────────────────────────────
// Embedded sub-block (mirrors the AGENDA block further down in
// Observatory.jsx): its own eyebrow header + description, no Sec/SH wrapper,
// no trailing GoldDivider (Observatory renders one once, after everything).
export default function Opportunities({ lang, useOpportunities, FadeIn }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("ALL");

  // Live data from daily pipeline. Static FEED only when API has nothing.
  const liveData = useOpportunities(null);
  const feed = (liveData && liveData.length > 0)
    ? liveData
    : FEED.map(f => ({ ...f, _static: true }));

  const filtered = filter === "ALL" ? feed : feed.filter(f => f.category === filter);

  const getFreshness = (d) => {
    if (!d) return { dot:"#555", lbl:"" };
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days <= 1) return { dot:C.green, lbl: lang==="es" ? "Hoy" : "Today" };
    if (days <= 3) return { dot:C.gold, lbl: days+"d" };
    return { dot:"#555", lbl: days+"d" };
  };

  const txt = (v) => (v == null ? "" : typeof v === "object" ? (v[lang] ?? v.es ?? v.en ?? "") : v);

  return (
    <div style={{ marginTop:40 }}>
      <div style={{ marginBottom:16, display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
        <div>
          <p style={{ fontFamily:F.mono, fontSize:10, letterSpacing:"0.1em", color:C.green, textTransform:"uppercase", margin:"0 0 4px" }}>
            {lang==="es" ? "Oportunidades Globales" : "Global Opportunities"}
          </p>
          <p style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, margin:0 }}>
            {lang==="es"
              ? "Acuerdos, hitos y avances internacionales verificados con ángulo de inversión — la contraparte constructiva de las señales anteriores."
              : "Verified international agreements, milestones and breakthroughs with an investment angle — the constructive counterpart to the signals above."}
          </p>
        </div>
        <span style={{ fontFamily:F.mono, fontSize:10, color:"#71717A" }}>
          ({feed.length} {lang==="es" ? "señales" : "signals"})
        </span>
      </div>

      {/* CATEGORY FILTER */}
      <FadeIn delay={0.1}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              fontFamily:F.mono, fontSize:9, letterSpacing:"0.06em", padding:"4px 10px",
              background: filter===cat ? C.green : C.surface2,
              color: filter===cat ? "#000" : "#71717A",
              border:`1px solid ${filter===cat ? C.green : C.border}`,
              borderRadius:3, cursor:"pointer", transition:"all 0.2s"
            }}>{CATEGORY_LABELS[cat][lang]}</button>
          ))}
        </div>
      </FadeIn>

      {/* SIGNAL CARDS */}
      <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
        {filtered.map((item, i) => {
          const tc = TAG_COLORS[item.tag] || TAG_COLORS.PROGRESS;
          const fr = getFreshness(item.published_at);
          const isOpen = expanded === item.id;

          return (
            <FadeIn key={item.id} delay={i * 0.04}>
              <div style={{
                background:C.surface, border:`1px solid ${isOpen ? C.borderHover : C.border}`,
                borderRadius:6, marginBottom:4, overflow:"hidden",
                transition:"border-color 0.2s"
              }}>
                {/* CARD HEADER */}
                <div onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{ padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:F.mono, fontSize:9, letterSpacing:"0.1em", color:tc.c, background:tc.bg, padding:"2px 6px", borderRadius:2, textTransform:"uppercase", flexShrink:0 }}>
                        {item.tag}
                      </span>

                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:F.mono, fontSize:9, color:"#71717A" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:fr.dot, display:"inline-block", flexShrink:0 }} />
                        {fr.lbl}
                      </span>

                      <span style={{ color:"#3F3F46" }}>·</span>
                      <span style={{ fontFamily:F.mono, fontSize:9, color:"#71717A" }}>{item.region}</span>

                      {item.source && <>
                        <span style={{ color:"#3F3F46" }}>·</span>
                        <span style={{ fontFamily:F.mono, fontSize:9, color:"#71717A" }}>{item.source}</span>
                      </>}

                      {item.published_at && <>
                        <span style={{ color:"#3F3F46" }}>·</span>
                        <span style={{ fontFamily:F.mono, fontSize:9, color:"#71717A" }}>{item.published_at}</span>
                      </>}
                    </div>

                    <h3 style={{ fontFamily:F.body, fontSize:14, fontWeight:500, color:"#FAFAFA", lineHeight:1.4, margin:"0 0 4px" }}>
                      {txt(item.title)}
                    </h3>

                    <p style={{ fontFamily:F.body, fontSize:12.5, color:"#A1A1AA", lineHeight:1.6, fontWeight:300, margin:"4px 0 0" }}>
                      {txt(item.summary)}
                    </p>

                    {/* SOURCE LINK — only for live (non-static) items with valid Tier-1 URL */}
                    {(() => {
                      if (item._static || !item.source_url) return null;
                      const TIER1 = ["bbc.co.uk","bbc.com","dw.com","lemonde.fr","elpais.com","france24.com","aljazeera.com","theguardian.com","nytimes.com","reuters.com"];
                      let host = "";
                      try { host = new URL(item.source_url).hostname; } catch { return null; }
                      const ok = TIER1.some(d => host.endsWith(d));
                      if (!ok) return null;
                      return (
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontFamily:F.mono, fontSize:9, color:C.gold, textDecoration:"none", letterSpacing:"0.05em", display:"inline-block", marginTop:6 }}>
                          {lang==="es" ? "Ver artículo →" : "Read article →"}
                        </a>
                      );
                    })()}
                  </div>

                  <span style={{ fontFamily:F.mono, fontSize:10, color:"#71717A", flexShrink:0 }}>{isOpen ? "−" : "+"}</span>
                </div>

                {/* EXPANDED */}
                {isOpen && (
                  <div style={{ padding:"0 18px 18px", borderTop:`1px solid ${C.border}` }}>
                    <div style={{ paddingTop:16 }}>

                      <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.green, textTransform:"uppercase", margin:"0 0 4px" }}>
                        {lang==="es" ? "Por qué importa" : "Why it matters"}
                      </p>
                      <p style={{ fontFamily:F.body, fontSize:13, color:"#A1A1AA", lineHeight:1.7, margin:"0 0 14px", fontWeight:300 }}>
                        {txt(item.why_it_matters)}
                      </p>

                      {item.opportunity && (
                        <div style={{ background:"rgba(212,168,83,0.08)", border:"1px solid rgba(212,168,83,0.22)", borderRadius:6, padding:"12px 16px" }}>
                          <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.gold, margin:"0 0 6px" }}>
                            {lang==="es" ? "OPORTUNIDAD TEMÁTICA" : "THEMATIC OPPORTUNITY"}
                          </p>
                          <p style={{ fontFamily:F.body, fontSize:13, color:"#FAFAFA", lineHeight:1.65, margin:0 }}>
                            {txt(item.opportunity)}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
