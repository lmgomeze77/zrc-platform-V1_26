import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Lock,
  Globe2,
  Radar,
  Shield,
  Network,
  BarChart3,
  Map,
  FileText,
  Eye,
  KeyRound,
  CircleDot,
  RadioTower,
  BriefcaseBusiness,
  Layers,
  Calendar,
  MapPin,
  TrendingUp,
  Zap,
  Building2,
  Landmark,
  ChevronRight,
  Users,
  Activity,
} from "lucide-react";

/**
 * ZRC INNER CIRCLE — Private Intelligence Site
 * -------------------------------------------------------------
 * Route suggestion: /inner-circle
 * Stack: React + Vite + Tailwind + Framer Motion + lucide-react
 *
 * Design language:
 * - Black institutional intelligence environment
 * - Monochrome photography placeholders
 * - Thin borders, discreet gold accents
 * - Private capital / geopolitical intelligence / off-market radar
 *
 * Integration:
 * 1. Save this file as src/pages/InnerCircle.jsx or src/components/InnerCircle.jsx
 * 2. Add route in App.jsx: <Route path="/inner-circle" element={<InnerCircle />} />
 * 3. Replace image placeholders in IMAGE_LIBRARY with curated assets from /public/inner-circle/
 */

const ZRC_GOLD = "#D4A853";

const IMAGE_LIBRARY = {
  hero: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=80",
  map: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2000&q=80",
  boardroom: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=80",
  logistics: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1800&q=80",
  energy: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1800&q=80",
  report: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80",
  iberia: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1800&q=80",
  solar: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1800&q=80",
  city: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1800&q=80",
  datacenter: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1800&q=80",
};

const signals = [
  {
    id: "SIGNAL / 014",
    title: "Maritime Stress Repricing",
    region: "Red Sea · Suez · Eastern Mediterranean",
    impact: "Margin dispersion across industrials, logistics and consumer goods.",
    angle: "Infrastructure, storage capacity, logistics real estate, nearshoring corridors.",
    status: "Live",
  },
  {
    id: "SIGNAL / 027",
    title: "Capital Rotation Under Fragmentation",
    region: "Europe · GCC · LatAm",
    impact: "Family offices and strategic capital moving toward tangible-control assets.",
    angle: "Private credit, operating real estate, essential services, special situations.",
    status: "Active",
  },
  {
    id: "SIGNAL / 039",
    title: "Energy Security Premium",
    region: "Iberia · North Africa · Atlantic Axis",
    impact: "Energy resilience increasingly embedded into corporate valuation assumptions.",
    angle: "Grid infrastructure, storage, efficiency, industrial resilience, energy corridors.",
    status: "Watching",
  },
];

const layers = [
  {
    number: "01",
    icon: RadioTower,
    title: "Strategic Signals",
    text: "Early indicators on geopolitical, financial and sector-specific shifts before they become consensus.",
  },
  {
    number: "02",
    icon: Network,
    title: "Capital Intelligence",
    text: "Investor maps, capital allocation patterns, mandate intelligence and private market movement tracking.",
  },
  {
    number: "03",
    icon: Radar,
    title: "Opportunity Radar",
    text: "Curated off-market opportunities, special situations, asset intelligence and strategic entry points.",
  },
];

const deliverables = [
  "Weekly Intelligence Briefings",
  "Private Market Signals",
  "Geopolitical Risk Notes",
  "Sector Watchlists",
  "Capital Flow Maps",
  "Off-Market Deal Alerts",
  "Investor Roundtables",
  "Strategic Memos",
];

const membership = [
  {
    name: "Observer",
    label: "Selected Access",
    description: "Access to selected public and semi-private intelligence briefings.",
    items: ["Monthly intelligence note", "Selected signal archive", "Public radar excerpts"],
  },
  {
    name: "Inner Circle",
    label: "Private Layer",
    description: "Full access to strategic briefings, private memos, opportunity radar and investor intelligence sessions.",
    items: ["Weekly Black Brief", "Private signal dashboard", "Opportunity radar", "Member-only sessions"],
    featured: true,
  },
  {
    name: "Council",
    label: "Bespoke Intelligence",
    description: "Reserved for family offices, operators, investors and corporate leaders requiring bespoke intelligence.",
    items: ["Bespoke intelligence memos", "Scenario workshops", "Capital strategy clinics", "Deal-specific intelligence"],
  },
];

const regions = ["Madrid", "Miami", "Mexico City", "Bogotá", "Dubai", "Singapore", "Rotterdam", "Suez", "Panama", "Tangier"];

const events = [
  {
    id: "EVT / 001",
    type: "Roundtable",
    title: "Iberia Real Assets & Private Credit",
    subtitle: "Deuda privada, activos reales y compresión de spreads en el ciclo post-BCE",
    date: "12 Jun 2026",
    location: "Madrid",
    format: "Presencial — aforo limitado",
    seats: "14 plazas",
    tags: ["Real Estate", "Private Credit", "Iberia"],
  },
  {
    id: "EVT / 002",
    type: "Workshop",
    title: "Energy Transition Mandates in Southern Europe",
    subtitle: "Infraestructura de almacenamiento, contratos PPA y posicionamiento en el corredor atlántico",
    date: "3 Jul 2026",
    location: "Bilbao",
    format: "Presencial — formato taller",
    seats: "20 plazas",
    tags: ["Energía", "Infraestructura", "ESG Capital"],
  },
  {
    id: "EVT / 003",
    type: "Private Dinner",
    title: "GCC–Iberia Capital Corridor",
    subtitle: "Capital soberano del Golfo, vehículos de co-inversión y mandatos de diversificación hacia Europa",
    date: "18 Sep 2026",
    location: "Dubai",
    format: "Cena privada — solo por invitación",
    seats: "12 plazas",
    tags: ["GCC", "Sovereign Capital", "Co-investment"],
  },
  {
    id: "EVT / 004",
    type: "Intelligence Session",
    title: "Special Situations Europe 2026",
    subtitle: "Distressed assets, recapitalizaciones y oportunidades de turnaround en el ciclo actual",
    date: "29 May 2026",
    location: "Virtual — cifrado",
    format: "Sesión cerrada — máx. 30 asistentes",
    seats: "Plazas disponibles",
    tags: ["Special Situations", "Distressed", "Europa"],
    upcoming: true,
  },
  {
    id: "EVT / 005",
    type: "Annual Forum",
    title: "ZRC Intelligence Forum 2026",
    subtitle: "Perspectivas macro, asignación de capital y señales de posicionamiento para el siguiente ciclo",
    date: "16–17 Oct 2026",
    location: "Madrid",
    format: "Conferencia anual de miembros",
    seats: "Sólo miembros Inner Circle y Council",
    tags: ["Macro", "Capital Allocation", "Networking"],
  },
];

const opportunities = [
  {
    id: "OPP / 011",
    geography: "España",
    sector: "Logística",
    title: "Plataformas logísticas peri-urbanas — Corredor Madrid–Valencia",
    thesis: "La aceleración del nearshoring industrial y la presión sobre plazos de entrega last-mile están generando escasez de superficie logística de Clase A en un radio de 30–60 km de los nodos urbanos de Madrid y Valencia. Los yields se mantienen 80–120 bps sobre la media europea.",
    signal: "Demanda corporativa confirmada. Escasez de suelo finalista. Ventana de entrada 12–18 meses.",
    type: "Core+ / Value-Add",
    return: "7.8–9.2% TIR est.",
    horizon: "5–7 años",
    status: "Active",
    icon: Building2,
  },
  {
    id: "OPP / 014",
    geography: "España",
    sector: "Energía",
    title: "Solar + almacenamiento en el corredor Extremadura–Andalucía",
    thesis: "España tiene una de las irradiaciones más altas de Europa occidental y un marco regulatorio que favorece contratos PPA a largo plazo. El corredor Extremadura–Andalucía concentra proyectos en fase RTB con acceso a red confirmado, permitiendo estructuras de financiación de proyecto con leverage conservador.",
    signal: "Contexto de precios eléctricos volátiles. Demanda corporativa de PPAs verdes en expansión. Infraestructura de conexión disponible.",
    type: "Infrastructure / Project Finance",
    return: "8.5–11% TIR est.",
    horizon: "15–20 años",
    status: "Watching",
    icon: Zap,
  },
  {
    id: "OPP / 019",
    geography: "Europa Sur",
    sector: "Digital Infrastructure",
    title: "Data Centers de edge computing — Sur de Europa",
    thesis: "La expansión de la IA generativa y los requisitos de soberanía de datos están creando una demanda estructural de capacidad de cómputo distribuida. El sur de Europa (España, Portugal, Italia) combina costes energéticos competitivos, latencia favorable hacia África y Oriente Medio, y marcos regulatorios estables.",
    signal: "Compromisos de hiperescalares confirmados en Barcelona y Lisboa. Escasez de suelo con acceso a red de alta tensión.",
    type: "Infrastructure / Growth",
    return: "10–14% TIR est.",
    horizon: "7–10 años",
    status: "Live",
    icon: Activity,
  },
  {
    id: "OPP / 023",
    geography: "GCC / MENA",
    sector: "Private Credit",
    title: "Financiación puente en transición energética — Arabia Saudí y Emiratos",
    thesis: "Visión 2030 y las metas net-zero de los Emiratos están generando una pipeline de proyectos de infraestructura energética que supera la capacidad de los bancos regionales. El private credit internacional puede acceder a estructuras senior secured con colateral real y rendimientos superiores al mercado europeo.",
    signal: "Spreads 350–450 bps sobre SOFR. Garantías soberanas parciales. Vehículos de acceso disponibles para inversores institucionales cualificados.",
    type: "Private Credit / Senior Secured",
    return: "SOFR + 380 bps est.",
    horizon: "3–5 años",
    status: "Active",
    icon: Landmark,
  },
];

const featuredNote = {
  id: "BLACK BRIEF / MAYO 2026",
  title: "El Corredor Energético Ibérico",
  subtitle: "Una tesis de inversión estructural",
  author: "ZRC Intelligence Desk",
  date: "Mayo 2026",
  readTime: "12 min",
  classification: "INNER CIRCLE — CONFIDENTIAL",
  sections: [
    {
      heading: "La tesis",
      body: "España y Portugal han pasado de ser importadores energéticos dependientes a convertirse en el eje de un corredor energético europeo. La combinación de capacidad renovable instalada (>80 GW en España a cierre de 2025), infraestructura de GNL de primer nivel y posición geográfica estratégica entre el Atlántico, el Mediterráneo y el Norte de África define una oportunidad de inversión de largo plazo que el mercado está subvalorando.",
    },
    {
      heading: "Por qué ahora",
      body: "Tres catalizadores concurren simultáneamente: (1) la REPowerEU acelera los flujos de capital hacia infraestructura energética ibérica, (2) el corredor submarino BarMar de hidrógeno verde conectará Barcelona con Marsella para 2030, y (3) la dependencia energética alemana y francesa crea demanda estructural de acuerdos de suministro a largo plazo. El capital institucional ya está moviéndose: en los últimos 18 meses, más de €4.200M de capital privado han entrado en activos energéticos en la península.",
    },
    {
      heading: "La transmisión al capital",
      body: "Los inversores con exposición a activos de infraestructura energética ibérica están accediendo a yields en el rango 7–11% TIR dependiendo del perfil de riesgo: desde contratos PPA regulados hasta plataformas de proyecto en fase greenfield. El denominador común es la reducción de la prima de riesgo geopolítico respecto a alternativas en Oriente Medio o África subsahariana, manteniendo rendimientos superiores a los de infraestructura core centroeuropea.",
    },
    {
      heading: "Riesgos a vigilar",
      body: "Riesgo regulatorio en revisión de mecanismos de captura de ingresos extraordinarios. Presión sobre márgenes si los precios spot del mercado eléctrico español continúan bajo presión. Riesgo de ejecución en proyectos de almacenamiento ante cuellos de botella en permisos municipales. Mitigante principal: estructuras con contratos PPA firmados previos al cierre de inversión.",
    },
    {
      heading: "Ángulo de posicionamiento",
      body: "Favorecemos exposición a plataformas de proyecto en fase RTB (Ready to Build) con PPA firmados, almacenamiento con acceso a red confirmado y operadores con track record en el mercado español. Evitamos exposición especulativa a tecnologías de hidrógeno verde hasta que la infraestructura de transporte esté operativa (2028–2030). El vehículo preferido es equity directo o co-inversión junto a gestores especializados con presencia local.",
    },
  ],
};

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.045] mix-blend-screen"
      style={{
        backgroundImage:
          "url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
      }}
    />
  );
}

function TopNav() {
  const nav = ["Intelligence", "Eventos", "Oportunidades", "Radar", "Membership", "Access"];
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/65 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <a href="#top" className="group flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.03]">
            <CircleDot size={15} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-white/50">Zenith Rise Capital</div>
            <div className="font-serif text-sm tracking-[0.18em] text-white">Inner Circle</div>
          </div>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="text-[10px] uppercase tracking-[0.22em] text-white/45 transition hover:text-white">
              {item}
            </a>
          ))}
        </nav>
        <a href="#access" className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/75 transition hover:border-[#D4A853]/70 hover:text-white md:flex">
          <KeyRound size={13} /> Request Access
        </a>
      </div>
    </header>
  );
}

function EntryGate() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.75 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
        >
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center">
            <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.03]">
              <Lock className="text-white" size={20} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.45em] text-white/45">Access Requested</div>
            <div className="mt-3 font-serif text-3xl tracking-[0.2em] text-white md:text-5xl">INNER CIRCLE</div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4A853]" /> Verifying Signal
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-screen overflow-hidden bg-black pt-28">
      <div className="absolute inset-0">
        <img src={IMAGE_LIBRARY.hero} alt="Monochrome satellite intelligence background" className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,168,83,0.13),transparent_32%),linear-gradient(to_bottom,transparent,black_82%)]" />
        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "72px 72px" }} />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-12 px-5 pb-20 md:grid-cols-[1.1fr_.9fr] md:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.1 }}>
          <div className="mb-7 inline-flex items-center gap-3 border border-white/12 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white/55">
            <Lock size={13} className="text-[#D4A853]" /> Membership by approval only
          </div>
          <h1 className="max-w-5xl font-serif text-6xl font-light leading-[0.92] tracking-[-0.045em] text-white md:text-8xl lg:text-9xl">
            Where capital sees before markets react.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-white/62 md:text-xl">
            A private intelligence environment for investors, operators and strategic decision-makers. ZRC Inner Circle connects geopolitical signals, private market intelligence and off-market opportunities into actionable capital context.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a href="#access" className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-xs font-medium uppercase tracking-[0.22em] text-black transition hover:bg-[#D4A853]">
              Request Access <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </a>
            <a href="#layers" className="inline-flex items-center justify-center gap-3 rounded-full border border-white/15 px-6 py-4 text-xs uppercase tracking-[0.22em] text-white/70 transition hover:border-white/40 hover:text-white">
              View Intelligence Layers
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 1.25 }} className="relative hidden md:block">
          <div className="absolute -inset-8 rounded-full border border-white/10" />
          <div className="absolute -inset-16 rounded-full border border-white/[0.045]" />
          <div className="relative overflow-hidden border border-white/10 bg-black/55 p-5 shadow-2xl backdrop-blur">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">Live Intelligence Layer</div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#D4A853]"><span className="h-1.5 w-1.5 rounded-full bg-[#D4A853]" /> Active</div>
            </div>
            <div className="relative h-[430px] overflow-hidden bg-white/[0.025]">
              <img src={IMAGE_LIBRARY.map} alt="Monochrome map intelligence layer" className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale invert" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/80" />
              {regions.slice(0, 7).map((region, index) => (
                <motion.div
                  key={region}
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 2.8 + index * 0.25, repeat: Infinity }}
                  className="absolute flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/65"
                  style={{ left: `${12 + (index * 13) % 72}%`, top: `${18 + (index * 17) % 63}%` }}
                >
                  <span className="h-2 w-2 rounded-full border border-[#D4A853] bg-[#D4A853]/25 shadow-[0_0_18px_rgba(212,168,83,0.6)]" /> {region}
                </motion.div>
              ))}
              <div className="absolute bottom-5 left-5 right-5 border border-white/10 bg-black/70 p-4 backdrop-blur-md">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Current Signal</div>
                <div className="mt-2 font-serif text-2xl text-white">Fragmentation reprices logistics optionality.</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SectionLabel({ eyebrow, title, text }) {
  return (
    <div className="mb-12 max-w-3xl">
      <div className="mb-5 text-[11px] uppercase tracking-[0.35em] text-[#D4A853]">{eyebrow}</div>
      <h2 className="font-serif text-4xl font-light tracking-[-0.035em] text-white md:text-6xl">{title}</h2>
      {text && <p className="mt-6 text-lg leading-8 text-white/56">{text}</p>}
    </div>
  );
}

function LayersSection() {
  return (
    <section id="intelligence" className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionLabel eyebrow="Intelligence Architecture" title="Three layers. One private operating picture." text="The Inner Circle transforms fragmented information into structured intelligence for capital allocation and strategic positioning." />
        <div className="grid gap-5 md:grid-cols-3">
          {layers.map((layer) => {
            const Icon = layer.icon;
            return (
              <motion.div key={layer.title} whileHover={{ y: -6 }} className="group border border-white/10 bg-white/[0.025] p-7 transition hover:border-[#D4A853]/50 hover:bg-white/[0.04]">
                <div className="mb-14 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/35">{layer.number}</div>
                  <Icon size={22} className="text-white/45 transition group-hover:text-[#D4A853]" />
                </div>
                <h3 className="font-serif text-3xl text-white">{layer.title}</h3>
                <p className="mt-5 leading-7 text-white/55">{layer.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BlackBrief() {
  return (
    <section id="black-brief" className="relative overflow-hidden border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="absolute inset-0 opacity-20">
        <img src={IMAGE_LIBRARY.report} alt="Black Brief report desk" className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-black/85" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-10 md:grid-cols-[.85fr_1.15fr]">
        <div className="border border-white/10 bg-black/70 p-8 backdrop-blur-md">
          <div className="mb-20 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/35">Confidential Memo</div>
            <FileText size={18} className="text-[#D4A853]" />
          </div>
          <div className="font-serif text-5xl leading-none text-white md:text-7xl">The<br />Black<br />Brief</div>
          <div className="mt-10 h-px w-full bg-white/10" />
          <div className="mt-6 text-[10px] uppercase tracking-[0.28em] text-white/35">ZRC / Inner Circle / Weekly</div>
        </div>
        <div className="flex flex-col justify-center">
          <SectionLabel eyebrow="Flagship Intelligence Product" title="A confidential intelligence memo for investors and strategic operators." text="Each edition connects geopolitical events, market signals, sector pressure points and actionable investment implications. The aim is not to describe events. The aim is to extract positioning intelligence." />
          <div className="grid gap-4 sm:grid-cols-2">
            {["Signal thesis", "Market transmission", "Sector impact", "Capital allocation angle"].map((item) => (
              <div key={item} className="border border-white/10 bg-white/[0.025] p-5 text-sm uppercase tracking-[0.18em] text-white/60">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RadarSection() {
  return (
    <section id="radar" className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionLabel eyebrow="Opportunity Radar" title="Signals become mandates. Mandates become access." text="The radar layer connects sector dislocation, capital appetite and off-market origination into curated opportunity intelligence." />
        <div className="grid gap-5 lg:grid-cols-3">
          {signals.map((signal) => (
            <div key={signal.id} className="border border-white/10 bg-white/[0.025] p-6">
              <div className="mb-8 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.26em] text-[#D4A853]">{signal.id}</div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-white/45">{signal.status}</div>
              </div>
              <h3 className="font-serif text-3xl leading-tight text-white">{signal.title}</h3>
              <div className="mt-4 text-[10px] uppercase tracking-[0.24em] text-white/35">{signal.region}</div>
              <div className="mt-8 space-y-5 text-sm leading-6 text-white/58">
                <p><span className="text-white/85">Impact:</span> {signal.impact}</p>
                <p><span className="text-white/85">Investor Angle:</span> {signal.angle}</p>
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
    <section className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionLabel eyebrow="Member Outputs" title="Not content. Intelligence products." text="Every output should feel like a private desk note: concise, relevant, decision-oriented and visually controlled." />
        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-4">
          {deliverables.map((item) => (
            <div key={item} className="flex min-h-[140px] items-end bg-black p-6 transition hover:bg-white/[0.035]">
              <div>
                <div className="mb-5 h-1.5 w-1.5 rounded-full bg-[#D4A853]" />
                <div className="font-serif text-2xl text-white">{item}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedNoteSection() {
  const [expanded, setExpanded] = useState(false);
  const visibleSections = expanded ? featuredNote.sections : featuredNote.sections.slice(0, 2);

  return (
    <section className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <div className="mb-5 text-[11px] uppercase tracking-[0.35em] text-[#D4A853]">Black Brief</div>
            <h2 className="font-serif text-4xl font-light tracking-[-0.035em] text-white md:text-5xl">{featuredNote.title}</h2>
            <p className="mt-4 font-serif text-xl italic text-white/45">{featuredNote.subtitle}</p>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-white/35">
                <span className="text-[#D4A853]">■</span> {featuredNote.classification}
              </div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">{featuredNote.author} · {featuredNote.date}</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Lectura estimada: {featuredNote.readTime}</div>
            </div>
            <div className="relative mt-10 overflow-hidden">
              <img
                src={IMAGE_LIBRARY.solar}
                alt="Solar energy infrastructure Iberia"
                className="h-56 w-full object-cover grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-[9px] uppercase tracking-[0.28em] text-white/40">Infraestructura Solar — Corredor Atlántico</div>
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.02] p-8">
            <div className="mb-8 flex items-center gap-4 border-b border-white/10 pb-6">
              <FileText size={16} className="text-[#D4A853]" />
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Nota de inteligencia — Edición Mayo 2026</div>
            </div>
            <div className="space-y-8">
              {visibleSections.map((section, i) => (
                <motion.div
                  key={section.heading}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#D4A853]">{section.heading}</div>
                  <p className="leading-8 text-white/65">{section.body}</p>
                </motion.div>
              ))}
            </div>
            {!expanded && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="h-12 bg-gradient-to-t from-black to-transparent -mt-20 mb-4 pointer-events-none" />
                <button
                  onClick={() => setExpanded(true)}
                  className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-white/45 transition hover:text-white"
                >
                  Leer análisis completo <ChevronRight size={14} className="transition group-hover:translate-x-1" />
                </button>
              </div>
            )}
            {expanded && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[11px] uppercase tracking-[0.28em] text-white/35 transition hover:text-white/60"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventBoardSection() {
  return (
    <section id="eventos" className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionLabel
          eyebrow="Agenda de Miembros"
          title="Eventos privados. Acceso restringido."
          text="Roundtables, sesiones de inteligencia y foros de capital reservados a miembros Inner Circle y Council. El formato es reducido por diseño."
        />
        <div className="space-y-4">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="group grid gap-4 border border-white/10 bg-white/[0.018] p-6 transition hover:border-[#D4A853]/40 hover:bg-white/[0.035] md:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex flex-col justify-between md:w-32">
                <div className="text-[9px] uppercase tracking-[0.28em] text-[#D4A853]">{event.type}</div>
                <div className="mt-3 font-serif text-2xl text-white">{event.date}</div>
              </div>

              <div className="border-l border-white/10 pl-6">
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 mb-2">{event.id}</div>
                <h3 className="font-serif text-2xl text-white leading-tight">{event.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{event.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-white/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between text-right md:w-44">
                <div className="flex items-center justify-end gap-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
                  <MapPin size={11} /> {event.location}
                </div>
                <div className="mt-3">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">{event.format}</div>
                  <div className={`text-[10px] uppercase tracking-[0.2em] ${event.upcoming ? "text-[#D4A853]" : "text-white/45"}`}>
                    {event.seats}
                  </div>
                </div>
                <a
                  href="#access"
                  className="mt-4 inline-flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35 transition group-hover:text-white/80"
                >
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
    <section id="oportunidades" className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionLabel
          eyebrow="Opportunity Radar — España & Internacional"
          title="Oportunidades de inversión curadas."
          text="Tesis con señal confirmada, geografía clara y ángulo de inversión para capital institucional. No son recomendaciones de inversión. Son inteligencia de posicionamiento."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {opportunities.map((opp, i) => {
            const Icon = opp.icon;
            return (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative border border-white/10 bg-white/[0.022] p-7 transition hover:border-[#D4A853]/50 hover:bg-white/[0.038]"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.28em] text-[#D4A853] mb-1">{opp.id}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/40">{opp.geography}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/40">{opp.sector}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${opp.status === "Live" ? "bg-[#D4A853]" : opp.status === "Active" ? "bg-green-400" : "bg-white/30"}`} />
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">{opp.status}</span>
                  </div>
                </div>

                <div className="mb-1 flex items-center gap-3">
                  <Icon size={18} className="shrink-0 text-[#D4A853] transition group-hover:scale-110" />
                  <h3 className="font-serif text-2xl leading-tight text-white">{opp.title}</h3>
                </div>

                <p className="mt-5 leading-7 text-sm text-white/55">{opp.thesis}</p>

                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[#D4A853]">Señal</div>
                  <p className="text-sm leading-6 text-white/45 italic">{opp.signal}</p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Tipo</div>
                    <div className="text-xs text-white/65">{opp.type}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Retorno Est.</div>
                    <div className="text-xs text-[#D4A853]">{opp.return}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Horizonte</div>
                    <div className="text-xs text-white/65">{opp.horizon}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 border border-white/10 bg-white/[0.015] p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/30">
            Las oportunidades presentadas tienen carácter exclusivamente informativo. No constituyen asesoramiento de inversión ni oferta de valores. Acceso reservado a miembros cualificados.
          </p>
        </div>
      </div>
    </section>
  );
}

function MembershipSection() {
  return (
    <section id="membership" className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionLabel eyebrow="Membership" title="Access is limited by design." text="The Inner Circle should remain selective. Scarcity is part of the value architecture: members are admitted only when their profile fits the intelligence environment." />
        <div className="grid gap-5 lg:grid-cols-3">
          {membership.map((plan) => (
            <div key={plan.name} className={classNames("relative border p-7", plan.featured ? "border-[#D4A853]/70 bg-[#D4A853]/[0.055]" : "border-white/10 bg-white/[0.025]") }>
              {plan.featured && <div className="absolute right-5 top-5 text-[9px] uppercase tracking-[0.25em] text-[#D4A853]">Core</div>}
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{plan.label}</div>
              <h3 className="mt-5 font-serif text-4xl text-white">{plan.name}</h3>
              <p className="mt-5 min-h-[86px] leading-7 text-white/55">{plan.description}</p>
              <div className="mt-8 space-y-4">
                {plan.items.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-white/58">
                    <Shield size={15} className="mt-0.5 shrink-0 text-[#D4A853]" /> {item}
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
    <section id="access" className="relative overflow-hidden border-t border-white/10 bg-black px-5 py-28 md:px-8">
      <div className="absolute inset-0 opacity-18">
        <img src={IMAGE_LIBRARY.boardroom} alt="Private capital boardroom" className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-black/90" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <SectionLabel eyebrow="Request Access" title="Private intelligence for capital, not a public feed." text="Access requests should be reviewed manually. The goal is to preserve quality, confidentiality and strategic relevance across the membership base." />
          <div className="grid gap-4 sm:grid-cols-3">
            {[{ icon: Eye, text: "Reviewed profile" }, { icon: BriefcaseBusiness, text: "Strategic relevance" }, { icon: Layers, text: "Controlled access" }].map(({ icon: Icon, text }) => (
              <div key={text} className="border border-white/10 bg-white/[0.025] p-5">
                <Icon size={19} className="mb-8 text-[#D4A853]" />
                <div className="text-xs uppercase tracking-[0.22em] text-white/55">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <form className="border border-white/10 bg-black/75 p-7 backdrop-blur-md" onSubmit={(e) => e.preventDefault()}>
          <div className="mb-8 text-[10px] uppercase tracking-[0.3em] text-[#D4A853]">Access Form</div>
          <div className="space-y-4">
            {["Full name", "Email", "Organization", "Investor / Operator profile"].map((label) => (
              <label key={label} className="block">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-white/35">{label}</span>
                <input className="w-full border border-white/10 bg-white/[0.025] px-4 py-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#D4A853]/60" placeholder={label} />
              </label>
            ))}
            <label className="block">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-white/35">Reason for access</span>
              <textarea rows={4} className="w-full resize-none border border-white/10 bg-white/[0.025] px-4 py-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#D4A853]/60" placeholder="Briefly explain your strategic interest" />
            </label>
          </div>
          <button className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-xs font-medium uppercase tracking-[0.22em] text-black transition hover:bg-[#D4A853]">
            Submit Access Request <ArrowRight size={15} />
          </button>
          <p className="mt-5 text-center text-[11px] leading-5 text-white/35">Manual approval only. Submission does not guarantee membership.</p>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="font-serif text-xl tracking-[0.14em] text-white">ZRC Inner Circle</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/35">Investor Intelligence · Strategic Signals · Private Capital</div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/30">© Zenith Rise Capital</div>
      </div>
    </footer>
  );
}

export default function InnerCircle() {
  return (
    <main className="min-h-screen cursor-crosshair bg-black text-white selection:bg-[#D4A853] selection:text-black">
      <EntryGate />
      <NoiseOverlay />
      <TopNav />
      <Hero />
      <LayersSection />
      <FeaturedNoteSection />
      <EventBoardSection />
      <OpportunitiesSection />
      <BlackBrief />
      <RadarSection />
      <DeliverablesSection />
      <MembershipSection />
      <AccessSection />
      <Footer />
    </main>
  );
}
