// Observatory.jsx — ZRC Platform Intelligence Feed
// Self-contained component: FEED data + freshness + status + counter + CIO note
// Import in App.jsx: import Observatory from "./pages/intelligence/Observatory";

import { useState } from "react";

// ── DESIGN TOKENS (mirrors App.jsx) ─────────────────────────
const C = {
  bg:"#09090B", surface:"#111113", surface2:"#18181B", surface3:"#1F1F23",
  border:"#27272A", borderHover:"#3F3F46",
  text:"#FAFAFA", textSec:"#A1A1AA", textMuted:"#71717A",
  gold:"#D4A853", goldDim:"rgba(212,168,83,0.12)", goldBorder:"rgba(212,168,83,0.25)",
  red:"#EF4444", green:"#22C55E", blue:"#3B82F6", amber:"#F59E0B",
};
const F = {
  display:"'Cormorant Garamond','Georgia',serif",
  body:"'Outfit','Helvetica Neue',sans-serif",
  mono:"'IBM Plex Mono','Fira Code',monospace",
};

// ── STATIC FEED ──────────────────────────────────────────────
const FEED = [
  {
    id:1, tag:"CRITICAL", region:"EU", status:"live",
    title:{es:"BCE mantiene tipos — Lagarde abre puerta a recorte en junio ante desinflacion en servicios",en:"ECB holds rates — Lagarde signals June cut as services disinflation accelerates"},
    source:"Financial Times", source_url:"https://www.ft.com/content/ecb-rates-june-2026",
    published_at:"2026-05-06", time:"4h", impact:"high", confidence:88,
    summary:{es:"El BCE mantuvo los tipos en el 3.15% pero el tono de Lagarde fue acomodaticio. La inflacion en servicios bajo al 3.4%, abriendo la puerta a un recorte en junio.",en:"The ECB held rates at 3.15% but Lagarde was unambiguously dovish. Services inflation fell to 3.4%, opening the door to a June cut."},
    situation:{es:"El ciclo de desinflacion europeo lleva seis meses superando expectativas. El diferencial con la Fed se amplia — la Fed no recortara antes de septiembre. Los bonos soberanos europeos ya descuentan dos recortes en 2026.",en:"The European disinflation cycle has beaten expectations for six months. The Fed-ECB differential is widening — the Fed will not cut before September. European sovereign bonds are already pricing in two 2026 cuts."},
    investment_impact:{es:"Positivo para bonos soberanos europeos 2-5 anos. Presion bajista sobre EUR/USD. Utilities y REITs europeos podrian revalorizarse. Bancos enfrentan compresion de margen si los recortes se aceleran.",en:"Positive for European sovereign bonds 2-5yr. Structural downward pressure on EUR/USD. European utilities and REITs may reprice upward. Banks face NIM compression if cuts accelerate."},
    zrc_signal:{es:"SOBREPONDERAR bonos soberanos europeos 2-5 anos. El mercado no ha descontado completamente un tercer recorte. BTP italiano 3 anos ofrece relacion riesgo/retorno favorable con spread vs Bund en 165pb.",en:"OVERWEIGHT European sovereign bonds 2-5yr. The market has not fully priced in a third cut. Italian BTP 3yr offers favorable risk/return at 165bps vs Bund."},
    signals:["ECB","rates","EUR/USD","European bonds","disinflation"],
    develops_into_edition:true,
    edition_note:{es:"El nuevo ciclo de divergencia monetaria Fed-BCE: implicaciones para carteras mixtas europeas.",en:"The new Fed-ECB monetary divergence cycle: implications for European multi-asset portfolios."},
    cio_note:{es:"Llevo posicionado en duracion europea desde enero. Este movimiento confirma la tesis — el mercado aun tiene margen para moverse. Detallo el sizing en la Edicion de Mayo.",en:"I have been positioned in European duration since January. This confirms the thesis — the market still has room to move. I detail the sizing in the May Edition."}
  },
  {
    id:2, tag:"ALERT", region:"MENA", status:"developing",
    title:{es:"Iran restringe paso por Ormuz a buques con seguro israelí — flete GNL +18%",en:"Iran restricts Hormuz passage for Israeli-insured vessels — LNG freight +18%"},
    source:"Reuters", source_url:"https://www.reuters.com/world/middle-east/iran-hormuz-lng-2026",
    published_at:"2026-05-05", time:"12h", impact:"high", confidence:82,
    summary:{es:"Iran anuncio restricciones de transito en Ormuz para buques con seguro israelí. El mercado de fletes GNL reacciono con una subida del 18%.",en:"Iran announced Hormuz transit restrictions for Israeli-insured vessels. The LNG freight market reacted with an immediate 18% spike."},
    situation:{es:"Ormuz canaliza el 21% del comercio mundial de petroleo y el 17% del GNL. La reaccion saudita en 48h determinara si es escalada real. Europa importa el 12% de su GNL por rutas que transitan el estrecho.",en:"Hormuz channels 21% of global oil trade and 17% of LNG. Saudi Arabia's 48h response will determine if this is real escalation. Europe imports 12% of its LNG via Hormuz routes."},
    investment_impact:{es:"Alza en futuros TTF europeo y Henry Hub. Positivo para productores de GNL americanos y australianos. Presion sobre EUR por riesgo inflacionario de segunda ronda.",en:"Upside for European TTF and Henry Hub LNG futures. Positive for US and Australian LNG exporters. Pressure on EUR given second-round inflation risk."},
    zrc_signal:{es:"COBERTURA via futuros TTF o ETFs de energia europea. Si la escalada se confirma en 48h, rotar hacia productores americanos de LNG.",en:"HEDGE via TTF futures or European energy ETFs. If escalation confirmed in 48h, rotate toward US LNG producers."},
    signals:["Hormuz","LNG","energy security","Iran","freight"],
    develops_into_edition:false, edition_note:null, cio_note:null
  },
  {
    id:3, tag:"WATCH", region:"LATAM", status:"live",
    title:{es:"Brazil eleva Selic al 13.75% sorprendiendo al mercado — real se aprecia 2.1%",en:"Brazil hikes Selic to 13.75% surprising markets — real appreciates 2.1% intraday"},
    source:"Bloomberg", source_url:"https://www.bloomberg.com/news/brazil-selic-hike-2026",
    published_at:"2026-05-06", time:"6h", impact:"medium", confidence:91,
    summary:{es:"El BCB subio la Selic 50pb hasta el 13.75%, sorprendiendo al mercado que esperaba 25pb. El real se aprecio un 2.1% frente al dolar.",en:"Brazil's Central Bank hiked the Selic 50bps to 13.75%, surprising markets expecting 25bps. The real appreciated 2.1% against the dollar."},
    situation:{es:"La inflacion brasilena se mantiene por encima del objetivo (5.8% vs 4.5%). La sorpresa hawkish recupera credibilidad del BCB. El diferencial Brasil-EEUU de 650pb hace al BRL uno de los carry trades mas atractivos del G20.",en:"Brazilian inflation remains above target (5.8% vs 4.5%). The hawkish surprise rebuilds BCB credibility. The 650bp Brazil-US differential makes BRL one of the most attractive G20 carry trades."},
    investment_impact:{es:"BRL favorable para exportadores con costes en real. Atractivo renovado para bonos soberanos en moneda local. Riesgo: reversion si ciclo global de risk-off se activa.",en:"BRL favorable for exporters with real-denominated costs. Renewed appeal for local-currency sovereign bonds. Risk: reversal if global risk-off activates."},
    zrc_signal:{es:"MONITOREAR con sesgo positivo en BRL y bonos locales. El carry es atractivo pero la ventana es estrecha. Stop si BRL supera 5.20/USD.",en:"MONITOR with positive bias on BRL and local bonds. The carry is attractive but the window is narrow. Stop if BRL crosses 5.20/USD."},
    signals:["Selic","BRL","carry trade","Brazil rates","LATAM"],
    develops_into_edition:false, edition_note:null, cio_note:null
  },
  {
    id:4, tag:"DATA", region:"GLOBAL", status:"priced_in",
    title:{es:"FMI revisa PIB global 2026 a 2.8% — fragmentacion comercial como riesgo principal",en:"IMF revises 2026 global GDP to 2.8% — trade fragmentation as primary risk"},
    source:"Wall Street Journal", source_url:"https://www.wsj.com/economy/imf-gdp-revision-2026",
    published_at:"2026-05-05", time:"1d", impact:"medium", confidence:85,
    summary:{es:"El FMI reviso el PIB global 2026 a la baja hasta el 2.8% (desde 3.1%). Principal razon: fragmentacion comercial. EEUU revisado al 1.9%, China al 4.2%.",en:"The IMF revised 2026 global GDP down to 2.8% (from 3.1%). Primary reason: trade fragmentation. US revised to 1.9%, China to 4.2%."},
    situation:{es:"El FMI cuantifica por primera vez el impacto de la fragmentacion comercial. Los paises mas expuestos: Mexico, Vietnam, Malasia. El diferencial de crecimiento emergente/desarrollado se amplia.",en:"The IMF quantifies trade fragmentation's growth impact for the first time. Most exposed: Mexico, Vietnam, Malaysia. The EM/developed growth differential is widening."},
    investment_impact:{es:"Presion en activos EM integrados en cadenas de suministro globales. Beneficiarios: India, Indonesia. Negativo para indices globales de RV market-cap weighted.",en:"Downward pressure on EM assets in global supply chains. Beneficiaries: India, Indonesia. Negative for market-cap-weighted global equity indices."},
    zrc_signal:{es:"INFRAPONDERAR indices globales en favor de seleccion regional activa. Sobreponderar India e Indonesia dentro de emergentes. Reducir Mexico y Vietnam.",en:"UNDERWEIGHT global equity indices in favor of active regional selection. Overweight India and Indonesia within EM. Reduce Mexico and Vietnam."},
    signals:["IMF","GDP revision","trade fragmentation","tariffs","EM"],
    develops_into_edition:true,
    edition_note:{es:"La nueva geografia del crecimiento global: ganadores y perdedores de la desglobalizacion.",en:"The new geography of global growth: winners and losers from deglobalization."},
    cio_note:null
  },
  {
    id:5, tag:"WATCH", region:"APAC", status:"live",
    title:{es:"PBOC inyecta 500.000M CNY — yuan onshore toca minimo de 3 meses vs USD",en:"PBOC injects CNY 500bn — onshore yuan hits 3-month low vs USD"},
    source:"Nikkei Asia", source_url:"https://asia.nikkei.com/economy/pboc-yuan-2026",
    published_at:"2026-05-06", time:"8h", impact:"medium", confidence:79,
    summary:{es:"El PBOC inyecto 500.000M CNY via operaciones repo a 7 dias, la mayor inyeccion desde febrero. El yuan onshore se deprecio a 7.28/USD.",en:"The PBOC injected CNY 500bn via 7-day repo operations, its largest injection since February. The onshore yuan depreciated to 7.28/USD."},
    situation:{es:"La inyeccion responde al enfriamiento del credito privado y la debilidad inmobiliaria. La depreciacion del CNY es tolerada como compensacion competitiva ante aranceles EEUU.",en:"The injection responds to cooling private credit and persistent real estate weakness. CNY depreciation is tolerated as a competitive offset to US tariffs."},
    investment_impact:{es:"Presion sobre divisas asiaticas vinculadas al yuan (KRW, TWD, THB). Negativo para RV china en moneda local. Positivo para exportadores chinos.",en:"Pressure on yuan-linked Asian currencies (KRW, TWD, THB). Negative for Chinese equities in local currency. Positive for Chinese manufacturers."},
    zrc_signal:{es:"INFRAPONDERAR RV china A-shares y H-shares con exposicion a demanda interna. MONITOREAR salidas de capital asiatico como indicador adelantado.",en:"UNDERWEIGHT Chinese A-shares and H-shares with domestic demand exposure. MONITOR Asian EM capital outflows as leading indicator."},
    signals:["PBOC","CNY","yuan","China liquidity","Asian FX"],
    develops_into_edition:false, edition_note:null, cio_note:null
  }
];
// ── LOCKED OVERLAY ───────────────────────────────────────────
function LockedOverlay({ lang, openRegister, openLogin }) {
  return (
    <div style={{ padding:"24px 20px", textAlign:"center", background:C.surface, borderRadius:6, border:`1px solid ${C.border}` }}>
      <p style={{ fontFamily:F.body, fontSize:13, color:C.textSec, marginBottom:16 }}>
        {lang==="es"
          ? "El analisis de inversion completo — situacion, exposicion de activos y senal ZRC — esta disponible para miembros registrados."
          : "The complete investment analysis — situation, asset exposure and ZRC signal — is available to registered members."}
      </p>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <button onClick={openRegister} style={{ background:C.gold, border:"none", color:"#000", padding:"10px 24px", fontFamily:F.mono, fontSize:11, letterSpacing:"0.08em", cursor:"pointer", borderRadius:4, fontWeight:600 }}>
          {lang==="es" ? "CREAR CUENTA GRATUITA" : "CREATE FREE ACCOUNT"}
        </button>
        <button onClick={openLogin} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textSec, padding:"8px 24px", fontFamily:F.mono, fontSize:11, letterSpacing:"0.08em", cursor:"pointer", borderRadius:4 }}>
          {lang==="es" ? "INICIAR SESION" : "SIGN IN"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────
export default function Observatory({ lang, useAuth, useHeadlines, FadeIn, Sec, SH, GoldDivider, T }) {
  const t = T[lang].obs;
  const { user, openRegister, openLogin } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter]     = useState("ALL");
  const regions = ["ALL","MENA","EU","LATAM","APAC","AFRICA"];

  // Live data from daily pipeline. Static FEED only when API has nothing.
  const liveData = useHeadlines(null);
  const feed = (liveData && liveData.length > 0)
    ? liveData
    : FEED.map(f => ({ ...f, _static: true }));

  const filtered = filter === "ALL" ? feed : feed.filter(f => f.region === filter);

  // ── FRESHNESS ─────────────────────────────────────────────
  const getFreshness = (d) => {
    if (!d) return { dot:"#555", lbl:"" };
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days <= 1) return { dot:C.green, lbl: lang==="es" ? "Hoy" : "Today" };
    if (days <= 3) return { dot:C.amber, lbl: days+"d" };
    return { dot:"#555", lbl: days+"d" };
  };

  // ── STATUS CONFIG ─────────────────────────────────────────
  const sCfg = {
    live:       { c:C.green, l:{es:"EN VIVO",     en:"LIVE"       } },
    developing: { c:C.amber, l:{es:"EN CURSO",    en:"DEVELOPING" } },
    priced_in:  { c:"#777",  l:{es:"DESCONTADO",  en:"PRICED IN"  } },
    resolved:   { c:"#777",  l:{es:"RESUELTO",    en:"RESOLVED"   } },
  };

  // ── TAG COLORS ────────────────────────────────────────────
  const tagColors = {
    CRITICAL:{ bg:"rgba(239,68,68,0.12)", c:"#EF4444" },
    ALERT:   { bg:"rgba(245,158,11,0.12)", c:"#F59E0B" },
    WATCH:   { bg:"rgba(59,130,246,0.12)", c:"#3B82F6" },
    DATA:    { bg:"rgba(212,168,83,0.12)", c:"#D4A853" },
  };

  // Directional count for public teaser
  const directionalCount = feed.filter(f => f.zrc_signal).length;

  return (
    <Sec id="observatory">
      <SH label={t.label} title={t.title} sub={t.sub} extra={
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontFamily:F.mono, fontSize:10, color:"#71717A" }}>
            ({feed.length} {lang==="es" ? "señales" : "signals"})
          </span>
          {!user && directionalCount > 0 && (
            <span style={{ fontFamily:F.mono, fontSize:9, color:C.gold, letterSpacing:"0.05em" }}>
              {directionalCount} {lang==="es"
                ? "con posición direccional ZRC — regístrate para ver"
                : "carry a ZRC directional position — sign in to view"}
            </span>
          )}
        </div>
      } />

      {/* REGION FILTER */}
      <FadeIn delay={0.1}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24 }}>
          {regions.map(r => (
            <button key={r} onClick={() => setFilter(r)} style={{
              fontFamily:F.mono, fontSize:9, letterSpacing:"0.08em", padding:"4px 10px",
              background: filter===r ? C.gold : C.surface2,
              color: filter===r ? "#000" : "#71717A",
              border:`1px solid ${filter===r ? C.gold : C.border}`,
              borderRadius:3, cursor:"pointer", transition:"all 0.2s"
            }}>{r}</button>
          ))}
        </div>
      </FadeIn>

      {/* SIGNAL CARDS */}
      <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
        {filtered.map((item, i) => {
          const tc   = tagColors[item.tag] || tagColors.DATA;
          const fr   = getFreshness(item.published_at);
          const stat = sCfg[item.status];
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
                    {/* TOP ROW: tag + meta */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:F.mono, fontSize:9, letterSpacing:"0.1em", color:tc.c, background:tc.bg, padding:"2px 6px", borderRadius:2, textTransform:"uppercase", flexShrink:0 }}>
                        {item.tag}
                      </span>

                      {/* FRESHNESS DOT */}
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

                      {/* STATUS BADGE */}
                      {stat && (
                        <span style={{ fontFamily:F.mono, fontSize:8, letterSpacing:"0.08em", color:stat.c, fontWeight:700, flexShrink:0 }}>
                          · {stat.l[lang]}
                        </span>
                      )}
                    </div>

                    {/* TITLE */}
                    <h3 style={{ fontFamily:F.body, fontSize:14, fontWeight:500, color:"#FAFAFA", lineHeight:1.4, margin:"0 0 4px" }}>
                      {item.title[lang]}
                    </h3>

                    {/* SOURCE LINK — only render for live (non-static) items with valid Tier-1 URL */}
                    {(() => {
                      if (item._static || !item.source_url) return null;
                      const TIER1 = ["bbc.co.uk","bbc.com","dw.com","lemonde.fr","elpais.com","france24.com","aljazeera.com","theguardian.com","nytimes.com","reuters.com","ft.com","bloomberg.com","wsj.com","economist.com"];
                      let host = "";
                      try { host = new URL(item.source_url).hostname; } catch { return null; }
                      const ok = TIER1.some(d => host.endsWith(d));
                      if (!ok) return null;
                      return (
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontFamily:F.mono, fontSize:9, color:C.gold, textDecoration:"none", letterSpacing:"0.05em" }}>
                          {lang==="es" ? "Ver artículo →" : "Read article →"}
                        </a>
                      );
                    })()}
                  </div>

                  {/* IMPACT + EXPAND */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                    <span style={{ fontFamily:F.mono, fontSize:8, letterSpacing:"0.06em", padding:"2px 6px", borderRadius:2,
                      color: item.impact==="high" ? "#EF4444" : item.impact==="medium" ? "#F59E0B" : "#71717A",
                      background: item.impact==="high" ? "rgba(239,68,68,0.1)" : item.impact==="medium" ? "rgba(245,158,11,0.1)" : "transparent"
                    }}>{item.impact?.toUpperCase()}</span>
                    <span style={{ fontFamily:F.mono, fontSize:10, color:"#71717A" }}>{isOpen ? "−" : "+"}</span>
                  </div>
                </div>

                {/* EXPANDED: MEMBER ANALYSIS */}
                {isOpen && (
                  <div style={{ padding:"0 18px 18px", borderTop:`1px solid ${C.border}` }}>
                    {user ? (
                      <div style={{ paddingTop:16 }}>

                        {/* SITUATION */}
                        <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", margin:"0 0 4px" }}>
                          {lang==="es" ? "Situación" : "Situation"}
                        </p>
                        <p style={{ fontFamily:F.body, fontSize:13, color:"#A1A1AA", lineHeight:1.7, margin:"0 0 14px", fontWeight:300 }}>
                          {(item.situation || item.summary)[lang]}
                        </p>

                        {/* ASSET EXPOSURE */}
                        <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", margin:"0 0 4px" }}>
                          {lang==="es" ? "Exposición de activos" : "Asset exposure"}
                        </p>
                        <p style={{ fontFamily:F.body, fontSize:13, color:"#A1A1AA", lineHeight:1.7, margin:"0 0 14px", fontWeight:300 }}>
                          {item.investment_impact ? item.investment_impact[lang] : ""}
                        </p>

                        {/* ZRC SIGNAL */}
                        {item.zrc_signal && (
                          <div style={{ background:"rgba(212,168,83,0.08)", border:"1px solid rgba(212,168,83,0.22)", borderRadius:6, padding:"12px 16px", marginBottom:14 }}>
                            <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.gold, margin:"0 0 6px" }}>
                              ZRC SIGNAL
                            </p>
                            <p style={{ fontFamily:F.body, fontSize:13, color:"#FAFAFA", lineHeight:1.65, margin:0 }}>
                              {item.zrc_signal[lang]}
                            </p>
                          </div>
                        )}

                        {/* SIGNAL TAGS */}
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                          {(item.signals||[]).map((s,j) => (
                            <span key={j} style={{ fontFamily:F.mono, fontSize:9, letterSpacing:"0.04em", padding:"3px 8px", background:C.surface2, color:"#71717A", borderRadius:3 }}>
                              {s}
                            </span>
                          ))}
                        </div>

                        {/* MONTHLY EDITION FLAG */}
                        {item.develops_into_edition && item.edition_note && (
                          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginBottom:12 }}>
                            <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.amber, margin:"0 0 4px" }}>
                              {lang==="es" ? "→ EDICIÓN MENSUAL" : "→ MONTHLY EDITION"}
                            </p>
                            <p style={{ fontFamily:F.body, fontSize:12, color:"#A1A1AA", lineHeight:1.6, margin:0, fontStyle:"italic" }}>
                              {item.edition_note[lang]}
                            </p>
                          </div>
                        )}

                        {/* CIO NOTE */}
                        {item.cio_note && item.cio_note[lang] && (
                          <div style={{ padding:"12px 14px", background:"rgba(212,168,83,0.06)", borderLeft:"3px solid #D4A853", borderRadius:"0 4px 4px 0" }}>
                            <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.gold, margin:"0 0 6px" }}>
                              L. GÓMEZ · CIO
                            </p>
                            <p style={{ fontFamily:F.body, fontSize:13, color:"#FAFAFA", lineHeight:1.7, margin:0, fontStyle:"italic" }}>
                              {item.cio_note[lang]}
                            </p>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div style={{ paddingTop:16 }}>
                        <LockedOverlay lang={lang} openRegister={openRegister} openLogin={openLogin} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>
          );
        })}
      </div>
      <GoldDivider />
    </Sec>
  );
}
