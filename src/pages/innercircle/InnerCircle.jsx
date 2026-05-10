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
  const nav = ["Layers", "Black Brief", "Radar", "Membership", "Access"];
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
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="text-[11px] uppercase tracking-[0.24em] text-white/45 transition hover:text-white">
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
    <section id="layers" className="border-t border-white/10 bg-black px-5 py-28 md:px-8">
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
      <BlackBrief />
      <RadarSection />
      <DeliverablesSection />
      <MembershipSection />
      <AccessSection />
      <Footer />
    </main>
  );
}
