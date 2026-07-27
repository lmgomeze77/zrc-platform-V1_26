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
// NOTE: at most ONE signal per underlying story/topic cluster — if a story
// keeps developing (e.g. an ongoing conflict), it should be reflected via
// `status` ("developing" → "resolved") on the SAME item, not as new entries.
// Each signal carries a structured `market_impact` (asset + direction +
// magnitude) instead of freeform tags, so price/macro impact is explicit.
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
    market_impact:[
      { asset:{es:"Bonos soberanos EU 2-5a",en:"EU sovereign bonds 2-5yr"}, direction:"up", magnitude:"high", note:{es:"Mercado aun no descuenta un tercer recorte",en:"Market has not priced a third cut yet"} },
      { asset:"EUR/USD", direction:"down", magnitude:"medium", note:{es:"Presion bajista estructural por diferencial Fed-BCE",en:"Structural downward pressure from Fed-ECB differential"} },
      { asset:{es:"Utilities y REITs europeos",en:"European utilities & REITs"}, direction:"up", magnitude:"medium", note:{es:"Sensibles a menor coste de capital",en:"Sensitive to lower cost of capital"} },
      { asset:{es:"Banca europea",en:"European banks"}, direction:"down", magnitude:"low", note:{es:"Riesgo de compresion de margen si se acelera el ciclo",en:"NIM compression risk if the cutting cycle accelerates"} },
    ],
    develops_into_edition:true,
    edition_note:{es:"El nuevo ciclo de divergencia monetaria Fed-BCE: implicaciones para carteras mixtas europeas.",en:"The new Fed-ECB monetary divergence cycle: implications for European multi-asset portfolios."},
    cio_note:{es:"Llevo posicionado en duracion europea desde enero. Este movimiento confirma la tesis — el mercado aun tiene margen para moverse. Detallo el sizing en la Edicion de Mayo.",en:"I have been positioned in European duration since January. This confirms the thesis — the market still has room to move. I detail the sizing in the May Edition."}
  },
  {
    id:2, tag:"CRITICAL", region:"MENA", status:"developing",
    title:{es:"EEUU e Iran intercambian ataques en el Golfo — trafico por Ormuz cae con fuerza",en:"US and Iran trade strikes across the Gulf — Hormuz transit drops sharply"},
    source:"Reuters", source_url:"https://www.reuters.com/world/middle-east/iran-hormuz-2026",
    published_at:"2026-07-09", time:"3h", impact:"high", confidence:95,
    summary:{es:"Iran ataco intereses vinculados a EEUU en el Golfo y restringio el transito de buques con seguro israeli por Ormuz. El trafico ha caido con fuerza y el flete de GNL se dispara.",en:"Iran struck US-linked interests across the Gulf and restricted transit for Israeli-insured vessels through Hormuz. Transit has dropped sharply and LNG freight is spiking."},
    situation:{es:"Ormuz canaliza cerca del 20% del petroleo mundial y una parte relevante del GNL destinado a Europa y Asia. Es, con diferencia, la historia geopolitica dominante de la jornada — el resto de titulares sobre Iran de hoy son variaciones de esta misma historia y se han consolidado aqui en una unica senal.",en:"Hormuz channels roughly 20% of global oil flows and a meaningful share of LNG bound for Europe and Asia. This is by far the dominant geopolitical story of the day — today's other Iran-related headlines are variations of this same story and have been consolidated here into a single signal."},
    investment_impact:{es:"Alza en futuros de crudo y GNL (TTF, Henry Hub). Positivo para productores americanos y de Oriente Medio no iranies. Presion sobre renta variable global y demanda de refugio (oro, bonos core).",en:"Upside for crude and LNG futures (TTF, Henry Hub). Positive for US and non-Iranian Middle East producers. Pressure on global equities and safe-haven demand (gold, core bonds)."},
    zrc_signal:{es:"COBERTURA via futuros de crudo/GNL o ETFs de energia. Reducir exposicion direccional a renta variable global hasta que se confirme una desescalada de 48h.",en:"HEDGE via crude/LNG futures or energy ETFs. Trim directional exposure to global equities until a 48h de-escalation is confirmed."},
    market_impact:[
      { asset:{es:"Crudo Brent/WTI",en:"Brent/WTI crude"}, direction:"up", magnitude:"high", note:{es:"~20% del petroleo mundial transita Ormuz",en:"~20% of global oil transits Hormuz"} },
      { asset:{es:"Oro",en:"Gold"}, direction:"up", magnitude:"medium", note:{es:"Demanda de refugio ante escalada militar",en:"Safe-haven demand on military escalation"} },
      { asset:{es:"Renta variable global",en:"Global equities"}, direction:"down", magnitude:"medium", note:{es:"Aversion al riesgo generalizada",en:"Broad-based risk aversion"} },
      { asset:{es:"Bonos soberanos core",en:"Core sovereign bonds"}, direction:"up", magnitude:"medium", note:{es:"Flujo hacia activos refugio",en:"Flight to safe-haven duration"} },
    ],
    develops_into_edition:true,
    edition_note:{es:"El shock energetico Ormuz 2026: escenarios de escalada y su transmision a inflacion y bancos centrales.",en:"The 2026 Hormuz energy shock: escalation scenarios and transmission to inflation and central banks."},
    cio_note:null
  },
  {
    id:3, tag:"ALERT", region:"EU", status:"live",
    title:{es:"Cumbre de la OTAN en Turquia — EEUU autoriza produccion de Patriot bajo licencia para Ucrania",en:"NATO Summit in Turkey — US authorizes licensed Patriot missile production for Ukraine"},
    source:"Le Monde", source_url:"https://www.lemonde.fr/international/nato-summit-2026",
    published_at:"2026-07-09", time:"5h", impact:"high", confidence:88,
    summary:{es:"En la cumbre de la OTAN, EEUU reafirmo el compromiso con el articulo 5 y autorizo a Ucrania a fabricar misiles Patriot bajo licencia, reforzando el apoyo militar occidental.",en:"At the NATO summit, the US reaffirmed Article 5 commitment and authorized Ukraine to manufacture Patriot missiles under license, reinforcing Western military backing."},
    situation:{es:"La reafirmacion del articulo 5 reduce el riesgo de fractura intraalianza a corto plazo. El anuncio sobre Patriot refuerza la capacidad defensiva de Kiev y beneficia al sector de defensa europeo.",en:"The Article 5 reaffirmation reduces near-term intra-alliance fracture risk. The Patriot announcement strengthens Kyiv's defensive capacity and benefits the European defense sector."},
    investment_impact:{es:"Positivo para fabricantes de defensa europeos con contratos de licencia. Sesgo alcista para el gasto militar en presupuestos 2027 de miembros de la OTAN.",en:"Positive for European defense manufacturers with licensing contracts. Bullish bias for 2027 defense budgets across NATO members."},
    zrc_signal:{es:"SOBREPONDERAR defensa europea con exposicion a contratos de licencia de sistemas de misiles. Monitorear presupuestos de defensa 2027 como catalizador.",en:"OVERWEIGHT European defense names with missile-system licensing exposure. Monitor 2027 defense budgets as a catalyst."},
    market_impact:[
      { asset:{es:"Defensa europea (equities)",en:"European defense equities"}, direction:"up", magnitude:"high", note:{es:"Contratos de licencia y presupuestos 2027",en:"Licensing contracts and 2027 budget outlook"} },
      { asset:"EUR/USD", direction:"mixed", magnitude:"low", note:{es:"Compromiso de seguridad compensa incertidumbre comercial",en:"Security commitment offsets trade uncertainty"} },
    ],
    develops_into_edition:false, edition_note:null, cio_note:null
  },
  {
    id:4, tag:"WATCH", region:"APAC", status:"developing",
    title:{es:"Washington amplia controles de exportacion de semiconductores avanzados a China",en:"Washington broadens advanced semiconductor export controls on China"},
    source:"Nikkei Asia", source_url:"https://asia.nikkei.com/economy/us-china-chip-controls-2026",
    published_at:"2026-07-08", time:"1d", impact:"medium", confidence:83,
    summary:{es:"EEUU amplio la lista de equipos de litografia y chips de IA sujetos a control de exportacion hacia China, endureciendo la disputa por soberania tecnologica.",en:"The US expanded the list of lithography equipment and AI chips subject to export controls on China, hardening the technology sovereignty dispute."},
    situation:{es:"China ha respondido en el pasado con restricciones a tierras raras. El mercado vigila una posible represalia sobre galio, germanio o grafito, insumos criticos para semiconductores y defensa.",en:"China has previously responded with rare-earth restrictions. Markets are watching for possible retaliation on gallium, germanium or graphite — critical inputs for semiconductors and defense."},
    investment_impact:{es:"Presion sobre fabricantes chinos de chips y sus proveedores de equipos. Beneficia a alternativas de fundicion fuera de China (Taiwan, Corea, EEUU). Riesgo de represalia sobre tierras raras.",en:"Pressure on Chinese chipmakers and their equipment suppliers. Benefits non-China foundry alternatives (Taiwan, Korea, US). Retaliation risk on rare earths."},
    zrc_signal:{es:"MONITOREAR cadena de suministro de tierras raras como indicador adelantado de represalia. Sesgo positivo en foundries fuera de China.",en:"MONITOR the rare-earth supply chain as a leading indicator of retaliation. Positive bias on non-China foundries."},
    market_impact:[
      { asset:{es:"Semiconductores chinos",en:"Chinese semiconductor equities"}, direction:"down", magnitude:"medium", note:{es:"Acceso restringido a equipos de litografia avanzada",en:"Restricted access to advanced lithography equipment"} },
      { asset:{es:"Tierras raras / criticos",en:"Rare earths / critical minerals"}, direction:"up", magnitude:"medium", note:{es:"Riesgo de represalia china sobre exportaciones",en:"Risk of Chinese retaliation on exports"} },
    ],
    develops_into_edition:false, edition_note:null, cio_note:null
  },
  {
    id:5, tag:"WATCH", region:"AFRICA", status:"developing",
    title:{es:"RD Congo y Ruanda avanzan un corredor minero de cobalto respaldado por EEUU",en:"DR Congo and Rwanda advance a US-backed cobalt mining corridor"},
    source:"Al Jazeera", source_url:"https://www.aljazeera.com/economy/drc-rwanda-cobalt-corridor-2026",
    published_at:"2026-07-07", time:"2d", impact:"medium", confidence:74,
    summary:{es:"RD Congo y Ruanda avanzan en un marco de tregua que habilita un corredor minero para cobalto y coltan respaldado por inversion estadounidense, buscando estabilizar el este del pais.",en:"DR Congo and Rwanda are advancing a truce framework enabling a US-backed mining corridor for cobalt and coltan, aiming to stabilize the country's east."},
    situation:{es:"El este de RD Congo concentra cerca del 70% del cobalto mundial, insumo critico para baterias de vehiculos electricos. Este tema apenas recibe cobertura de primera plana pero tiene relevancia geopolitica directa sobre las cadenas de suministro de la transicion energetica.",en:"Eastern DR Congo holds roughly 70% of global cobalt supply, a critical input for EV batteries. This story barely makes front pages but carries direct geopolitical relevance for energy-transition supply chains."},
    investment_impact:{es:"Reduce la prima de riesgo de suministro de cobalto si la tregua se mantiene. Positivo para fabricantes de baterias con contratos de suministro directo. Riesgo: fragilidad historica de acuerdos similares en la region.",en:"Lowers the cobalt supply risk premium if the truce holds. Positive for battery makers with direct offtake contracts. Risk: historical fragility of similar regional deals."},
    zrc_signal:{es:"MONITOREAR como indicador adelantado de precios de cobalto. No es aun una posicion direccional — la ventana de confirmacion es 60-90 dias.",en:"MONITOR as a leading indicator for cobalt prices. Not yet a directional position — the confirmation window is 60-90 days."},
    market_impact:[
      { asset:"Cobalto", direction:"down", magnitude:"low", note:{es:"Menor prima de riesgo de suministro si la tregua se sostiene",en:"Lower supply risk premium if the truce holds"} },
      { asset:{es:"Fabricantes de baterias EV",en:"EV battery makers"}, direction:"up", magnitude:"low", note:{es:"Mayor visibilidad de suministro a medio plazo",en:"Improved medium-term supply visibility"} },
    ],
    develops_into_edition:false, edition_note:null, cio_note:null
  },
  {
    id:6, tag:"WATCH", region:"EURASIA", status:"developing",
    title:{es:"Armenia y Azerbaiyan avanzan la apertura del corredor de Zangezur",en:"Armenia and Azerbaijan advance opening of the Zangezur corridor"},
    source:"Deutsche Welle", source_url:"https://www.dw.com/en/armenia-azerbaijan-zangezur-corridor-2026",
    published_at:"2026-07-06", time:"3d", impact:"medium", confidence:70,
    summary:{es:"Armenia y Azerbaiyan avanzan en la apertura del corredor de Zangezur, una ruta de transito que conectaria Azerbaiyan con su enclave de Najicheván y Turquia, con implicaciones para las rutas energeticas del Caspio.",en:"Armenia and Azerbaijan are advancing the opening of the Zangezur corridor, a transit route that would connect Azerbaijan with its Nakhchivan exclave and Turkey, with implications for Caspian energy routes."},
    situation:{es:"Un corredor operativo reconfiguraria las rutas de transito de gas y petroleo del Caspio hacia Europa, reduciendo la dependencia de rutas rusas e iranies. Es una historia de bajo perfil mediatico pero con relevancia estructural para la diversificacion energetica europea.",en:"An operational corridor would reshape Caspian gas and oil transit routes toward Europe, reducing dependence on Russian and Iranian routes. It is a low-profile story with structural relevance for European energy diversification."},
    investment_impact:{es:"Positivo para infraestructura de transporte energetico turca y azeri. Reduce a medio plazo el poder de negociacion de Rusia e Iran sobre rutas de transito regionales.",en:"Positive for Turkish and Azeri energy transport infrastructure. Medium-term reduction in Russian and Iranian leverage over regional transit routes."},
    zrc_signal:{es:"MONITOREAR como opcionalidad de largo plazo sobre infraestructura energetica turca. Sin posicion direccional hasta acuerdo operativo firmado.",en:"MONITOR as a long-term optionality on Turkish energy infrastructure. No directional position until an operational agreement is signed."},
    market_impact:[
      { asset:{es:"Infraestructura energetica turca",en:"Turkish energy infrastructure"}, direction:"up", magnitude:"low", note:{es:"Nueva ruta de transito Caspio-Europa",en:"New Caspian-to-Europe transit route"} },
      { asset:{es:"Gas natural (rutas alternativas)",en:"Natural gas (alternative routes)"}, direction:"down", magnitude:"low", note:{es:"Diversificacion reduce prima de riesgo de suministro",en:"Diversification lowers supply risk premium"} },
    ],
    develops_into_edition:false, edition_note:null, cio_note:null
  }
];

// ── INTERNATIONAL AGENDA ─────────────────────────────────────
// Calendario de cumbres, reuniones ministeriales, elecciones y vencimientos
// con relevancia de mercado. Fechas de eventos aun no confirmados oficialmente
// se marcan status:"tentative" y se etiquetan como tales en la UI.
const AGENDA = [
  {
    id:"AG-1", date:"2026-08-03", type:{es:"Reunion Ministerial",en:"Ministerial Meeting"}, status:"confirmed",
    title:{es:"Reunion Ministerial OPEP+",en:"OPEC+ Ministerial Meeting"},
    location:{es:"Viena, Austria",en:"Vienna, Austria"},
    relevance:{es:"Decision de cuotas de produccion — impacto directo en Brent/WTI, especialmente sensible dado el shock de Ormuz en curso.",en:"Production quota decision — direct impact on Brent/WTI, especially sensitive given the ongoing Hormuz shock."},
  },
  {
    id:"AG-2", date:"2026-09-15", type:{es:"Asamblea",en:"Assembly"}, status:"confirmed",
    title:{es:"Debate General de la Asamblea General de la ONU",en:"UN General Assembly High-Level General Debate"},
    location:{es:"Nueva York, EEUU",en:"New York, USA"},
    relevance:{es:"Discursos de politica exterior con potencial de anuncios sobre sanciones, alto el fuego o alianzas comerciales.",en:"Foreign policy addresses with potential announcements on sanctions, ceasefires or trade alliances."},
  },
  {
    id:"AG-3", date:"2026-10-04", type:{es:"Eleccion",en:"Election"}, status:"confirmed",
    title:{es:"Elecciones Generales de Brasil (1ª y 2ª vuelta)",en:"Brazil General Election (1st & 2nd round)"},
    location:{es:"Brasil",en:"Brazil"},
    relevance:{es:"Define la trayectoria fiscal y el ciclo de la Selic post-electoral. Alta sensibilidad para BRL y deuda soberana en moneda local.",en:"Determines the post-election fiscal path and Selic cycle. High sensitivity for BRL and local-currency sovereign debt."},
  },
  {
    id:"AG-4", date:"2026-10-12", type:{es:"Asamblea",en:"Assembly"}, status:"tentative",
    title:{es:"Reuniones Anuales FMI-Banco Mundial",en:"IMF-World Bank Annual Meetings"},
    location:{es:"Washington D.C. (sede habitual, fecha por confirmar)",en:"Washington D.C. (customary venue, date TBC)"},
    relevance:{es:"Revision de previsiones de crecimiento global y riesgo soberano en emergentes — punto de referencia para el ciclo actual de fragmentacion comercial.",en:"Review of global growth forecasts and EM sovereign risk — reference point for the current trade-fragmentation cycle."},
  },
  {
    id:"AG-5", date:"2026-11-03", type:{es:"Eleccion",en:"Election"}, status:"confirmed",
    title:{es:"Elecciones de Mitad de Mandato de EEUU",en:"US Midterm Elections"},
    location:{es:"Estados Unidos",en:"United States"},
    relevance:{es:"Define el control del Congreso y la trayectoria fiscal y arancelaria de la segunda mitad del mandato.",en:"Determines control of Congress and the fiscal/tariff trajectory for the remainder of the term."},
  },
  {
    id:"AG-6", date:"2026-11-15", type:{es:"Cumbre",en:"Summit"}, status:"tentative",
    title:{es:"Cumbre BRICS",en:"BRICS Summit"},
    location:{es:"India (presidencia rotatoria; sede y fecha por confirmar)",en:"India (rotating presidency; venue and date TBC)"},
    relevance:{es:"Mecanismos de pago alternativos y desdolarizacion — vigilar anuncios sobre moneda comun o liquidacion bilateral.",en:"Alternative payment mechanisms and de-dollarization — watch for common-currency or bilateral-settlement announcements."},
  },
  {
    id:"AG-7", date:"2026-11-18", type:{es:"Cumbre",en:"Summit"}, status:"tentative",
    title:{es:"Cumbre de Lideres del G20",en:"G20 Leaders' Summit"},
    location:{es:"Miami, EEUU (fecha exacta por confirmar)",en:"Miami, USA (exact date TBC)"},
    relevance:{es:"Coordinacion fiscal global y postura arancelaria de EEUU frente al resto del G20.",en:"Global fiscal coordination and US tariff posture toward the rest of the G20."},
  },
  {
    id:"AG-8", date:"2026-11-25", type:{es:"Cumbre Climatica",en:"Climate Summit"}, status:"tentative",
    title:{es:"COP31",en:"COP31"},
    location:{es:"Sede en negociacion entre Turquia y Australia",en:"Venue under negotiation between Türkiye and Australia"},
    relevance:{es:"Financiacion climatica y transicion energetica — relevante para materias primas criticas y renovables.",en:"Climate finance and energy transition — relevant for critical minerals and renewables."},
  },
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
  const regions = ["ALL","MENA","EU","LATAM","APAC","AFRICA","EURASIA"];

  // Live data from daily pipeline. Static FEED only when API has nothing.
  const { headlines: liveData, generatedAt } = useHeadlines(null);
  const isLive = Array.isArray(liveData) && liveData.length > 0;
  const feed = isLive
    ? liveData
    : FEED.map(f => ({ ...f, _static: true }));

  const filtered = filter === "ALL" ? feed : feed.filter(f => f.region === filter);

  // El pipeline corre a diario. Si lleva más de 48h sin refrescar, algo se ha
  // roto aguas arriba (créditos de API, cron, RSS) y el feed queda congelado
  // mostrando titulares viejos como si fueran de hoy. Se avisa explícitamente.
  const staleDays = (isLive && generatedAt)
    ? Math.floor((Date.now() - new Date(generatedAt)) / 86400000)
    : null;
  const isStale = staleDays !== null && staleDays >= 2;

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

  // ── MARKET IMPACT HELPERS ─────────────────────────────────
  // `asset`/`note` may be a plain string (legacy/live pipeline) or {es,en}.
  const txt = (v) => (v == null ? "" : typeof v === "object" ? (v[lang] ?? v.es ?? v.en ?? "") : v);
  const dirCfg = {
    up:    { arrow:"▲", c:C.green },
    down:  { arrow:"▼", c:C.red },
    mixed: { arrow:"◆", c:C.amber },
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

      {/* STALE FEED NOTICE — pipeline diario sin refrescar */}
      {isStale && (
        <FadeIn delay={0.05}>
          <div style={{
            display:"flex", alignItems:"flex-start", gap:10, marginBottom:20,
            padding:"10px 14px", borderRadius:6,
            background:"rgba(245,158,11,0.08)", border:`1px solid rgba(245,158,11,0.25)`
          }}>
            <span style={{ color:C.amber, fontFamily:F.mono, fontSize:11, lineHeight:1.5, flexShrink:0 }}>⚠</span>
            <p style={{ fontFamily:F.body, fontSize:12, color:C.textSec, lineHeight:1.6, margin:0, fontWeight:300 }}>
              {lang==="es"
                ? `Última actualización del feed hace ${staleDays} días. Las señales mostradas no reflejan la actualidad de hoy.`
                : `Feed last updated ${staleDays} days ago. The signals below do not reflect today's developments.`}
            </p>
          </div>
        </FadeIn>
      )}

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

                    {/* MARKET IMPACT PREVIEW — public teaser: asset + direction, no rationale */}
                    {Array.isArray(item.market_impact) && item.market_impact.length > 0 && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", margin:"6px 0 2px" }}>
                        {item.market_impact.slice(0,3).map((mi, j) => {
                          const dc = dirCfg[mi.direction] || dirCfg.mixed;
                          return (
                            <span key={j} style={{ fontFamily:F.mono, fontSize:9, letterSpacing:"0.03em", padding:"2px 7px", borderRadius:3, background:C.surface2, color:C.textSec, display:"inline-flex", alignItems:"center", gap:4 }}>
                              <span style={{ color:dc.c }}>{dc.arrow}</span>{txt(mi.asset)}
                            </span>
                          );
                        })}
                      </div>
                    )}

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

                        {/* MARKET / MACRO IMPACT — structured asset · direction · magnitude */}
                        {Array.isArray(item.market_impact) && item.market_impact.length > 0 ? (
                          <div style={{ marginBottom:14 }}>
                            <p style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", margin:"0 0 8px" }}>
                              {lang==="es" ? "Impacto en precios / variables macro" : "Price / macro impact"}
                            </p>
                            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {item.market_impact.map((mi, j) => {
                                const dc = dirCfg[mi.direction] || dirCfg.mixed;
                                return (
                                  <div key={j} style={{ display:"flex", alignItems:"baseline", gap:8, padding:"6px 10px", background:C.surface2, borderRadius:4 }}>
                                    <span style={{ color:dc.c, fontFamily:F.mono, fontSize:11, flexShrink:0 }}>{dc.arrow}</span>
                                    <span style={{ fontFamily:F.mono, fontSize:10, color:"#FAFAFA", flexShrink:0, minWidth:110 }}>{txt(mi.asset)}</span>
                                    {mi.magnitude && (
                                      <span style={{ fontFamily:F.mono, fontSize:8, letterSpacing:"0.06em", color:C.textMuted, flexShrink:0, textTransform:"uppercase" }}>{mi.magnitude}</span>
                                    )}
                                    {mi.note && (
                                      <span style={{ fontFamily:F.body, fontSize:12, color:"#A1A1AA", fontWeight:300 }}>{txt(mi.note)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (item.signals||[]).length > 0 && (
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                            {item.signals.map((s,j) => (
                              <span key={j} style={{ fontFamily:F.mono, fontSize:9, letterSpacing:"0.04em", padding:"3px 8px", background:C.surface2, color:"#71717A", borderRadius:3 }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

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

      {/* ── INTERNATIONAL AGENDA ──────────────────────────── */}
      <FadeIn delay={0.15}>
        <div style={{ marginTop:40 }}>
          <div style={{ marginBottom:16 }}>
            <p style={{ fontFamily:F.mono, fontSize:10, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", margin:"0 0 4px" }}>
              {lang==="es" ? "Agenda Internacional" : "International Agenda"}
            </p>
            <p style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, margin:0 }}>
              {lang==="es"
                ? "Cumbres, reuniones ministeriales, elecciones y vencimientos con relevancia de mercado."
                : "Summits, ministerial meetings, elections and deadlines with market relevance."}
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {AGENDA
              .filter(ev => new Date(ev.date).getTime() >= Date.now() - 86400000)
              .sort((a,b) => new Date(a.date) - new Date(b.date))
              .map((ev, i) => {
                const d = new Date(ev.date);
                const dateLabel = d.toLocaleDateString(lang==="es" ? "es-ES" : "en-US", { day:"2-digit", month:"short", year:"numeric" });
                return (
                  <FadeIn key={ev.id} delay={i*0.03}>
                    <div style={{ display:"flex", gap:16, alignItems:"flex-start", padding:"12px 16px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:6 }}>
                      <div style={{ flexShrink:0, width:84, fontFamily:F.mono, fontSize:11, color:C.textSec }}>{dateLabel}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                          <span style={{ fontFamily:F.mono, fontSize:8, letterSpacing:"0.08em", color:C.blue, background:"rgba(59,130,246,0.1)", padding:"2px 6px", borderRadius:2, textTransform:"uppercase" }}>
                            {txt(ev.type)}
                          </span>
                          {ev.status==="tentative" && (
                            <span style={{ fontFamily:F.mono, fontSize:8, letterSpacing:"0.06em", color:C.amber }}>
                              {lang==="es" ? "· fecha/sede por confirmar" : "· date/venue TBC"}
                            </span>
                          )}
                        </div>
                        <h4 style={{ fontFamily:F.body, fontSize:13, fontWeight:500, color:"#FAFAFA", margin:"0 0 3px" }}>{txt(ev.title)}</h4>
                        <p style={{ fontFamily:F.mono, fontSize:9, color:C.textMuted, margin:"0 0 6px" }}>{txt(ev.location)}</p>
                        <p style={{ fontFamily:F.body, fontSize:12, color:"#A1A1AA", lineHeight:1.6, fontWeight:300, margin:0 }}>{txt(ev.relevance)}</p>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
          </div>
        </div>
      </FadeIn>

      <GoldDivider />
    </Sec>
  );
}
