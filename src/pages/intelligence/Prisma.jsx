// Prisma.jsx — Cobertura comparada de noticias (Observatorio, pestaña PRISMA)
// Lee /data/prisma.json, generado por scripts/generate-prisma.js
// (.github/workflows/prisma-feed.yml). Público: primeras `public_count`
// historias con barra de cobertura y hechos comunes. Suscriptores
// (Intelligence, Institutional o prueba activa): todas, con ficha completa.

import { useEffect, useMemo, useState } from "react";
import { C, alpha } from "../../theme/palette";

const F = {
  display: "var(--zrc-font-display)",
  body: "'Outfit','Helvetica Neue',sans-serif",
  mono: "'IBM Plex Mono','Fira Code',monospace",
};
const NUM = { fontVariantNumeric: "lining-nums tabular-nums" };

// Colores contrastados (legibles en tema claro y oscuro), uno por valor.
const DIMS = {
  region: {
    label: { es: "Región", en: "Region" },
    keys: ["norteamerica", "europa", "eurasia", "mena", "asia_pacifico", "latam", "africa"],
    names: {
      norteamerica: { es: "Norteamérica", en: "North America" }, europa: { es: "Europa", en: "Europe" },
      eurasia: { es: "Eurasia", en: "Eurasia" }, mena: { es: "MENA", en: "MENA" },
      asia_pacifico: { es: "Asia-Pacífico", en: "Asia-Pacific" }, latam: { es: "LATAM", en: "LATAM" }, africa: { es: "África", en: "Africa" },
    },
    colors: { norteamerica: "#2563EB", europa: "#7C3AED", eurasia: "#B45309", mena: "#059669", asia_pacifico: "#DC2626", latam: "#F59E0B", africa: "#0891B2" },
  },
  line: {
    label: { es: "Línea editorial", en: "Editorial line" },
    keys: ["centro_izquierda", "centro", "centro_derecha", "oficialista"],
    names: {
      centro_izquierda: { es: "Centro-izquierda", en: "Centre-left" }, centro: { es: "Centro", en: "Centre" },
      centro_derecha: { es: "Centro-derecha", en: "Centre-right" }, oficialista: { es: "Oficialista", en: "State-aligned" },
    },
    colors: { centro_izquierda: "#E76F51", centro: "#64748B", centro_derecha: "#1D4ED8", oficialista: "#9333EA" },
  },
  type: {
    label: { es: "Tipo de fuente", en: "Source type" },
    keys: ["agencia", "prensa_financiera", "generalista", "research_datos", "institucional"],
    names: {
      agencia: { es: "Agencia", en: "Wire" }, prensa_financiera: { es: "Prensa financiera", en: "Financial press" },
      generalista: { es: "Generalista", en: "General news" }, research_datos: { es: "Research y datos", en: "Research & data" },
      institucional: { es: "Institucional", en: "Institutional" },
    },
    colors: { agencia: "#0F766E", prensa_financiera: "#CA8A04", generalista: "#16A34A", research_datos: "#EA580C", institucional: "#6366F1" },
  },
};

const TOPIC_NAMES = {
  geopolitica: { es: "Geopolítica", en: "Geopolitics" }, macro: { es: "Macro", en: "Macro" },
  energia: { es: "Energía", en: "Energy" }, mercados: { es: "Mercados", en: "Markets" },
  empresa: { es: "Empresa", en: "Business" }, latam: { es: "LATAM", en: "LATAM" },
  mena: { es: "MENA", en: "MENA" }, iberia: { es: "Iberia", en: "Iberia" },
};

const DIVERSITY = {
  alta: { es: "Diversidad alta", en: "High diversity", c: C.green },
  media: { es: "Diversidad media", en: "Medium diversity", c: C.amber },
  baja: { es: "Cobertura concentrada", en: "Concentrated coverage", c: C.red },
};

function usePrisma() {
  const [state, setState] = useState({ doc: null, loaded: false });
  useEffect(() => {
    let alive = true;
    fetch("/data/prisma.json?v=" + Date.now())
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => alive && setState({ doc: doc && Array.isArray(doc.stories) ? doc : null, loaded: true }))
      .catch(() => alive && setState({ doc: null, loaded: true }));
    return () => { alive = false; };
  }, []);
  return state;
}

function CoverageBar({ counts, dim, lang = "es", height = 12 }) {
  const d = DIMS[dim];
  const total = d.keys.reduce((a, k) => a + (counts?.[k] || 0), 0) || 1;
  return (
    <div role="img" aria-label={d.keys.filter((k) => counts?.[k]).map((k) => `${d.names[k][lang]} ${counts[k]}`).join(", ")}
      style={{ display: "flex", height, borderRadius: height / 2, overflow: "hidden", background: C.surface3 }}>
      {d.keys.filter((k) => counts?.[k] > 0).map((k) => (
        <span key={k} title={`${d.names[k][lang]}: ${counts[k]}`} style={{ width: `${(counts[k] / total) * 100}%`, background: d.colors[k] }} />
      ))}
    </div>
  );
}

function topShares(counts, dim, lang) {
  const d = DIMS[dim];
  const total = d.keys.reduce((a, k) => a + (counts?.[k] || 0), 0);
  if (!total) return "";
  return d.keys.filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a]).slice(0, 3)
    .map((k) => `${d.names[k][lang]} ${Math.round((counts[k] / total) * 100)} %`).join(" · ");
}

function Pill({ dim, value, lang }) {
  const d = DIMS[dim];
  return (
    <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: "#fff", background: d.colors[value], padding: "2px 8px", borderRadius: 999 }}>
      {d.names[value]?.[lang] || value}
    </span>
  );
}

const fmtDate = (iso, lang) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString(lang === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
};

export default function Prisma({ lang = "es", user, tier, status, openRegister, openPricing }) {
  const { doc, loaded } = usePrisma();
  const [lens, setLens] = useState("region");
  const [topic, setTopic] = useState("all");
  const [open, setOpen] = useState(null);
  const L = (o) => (o ? o[lang] ?? o.es : "");

  const fullAccess = !!user && (tier === "intelligence" || tier === "institutional") && status !== "expired";
  const stories = doc?.stories || [];
  const publicCount = doc?.public_count ?? 3;
  const visible = useMemo(
    () => stories.map((s, i) => ({ s, i })).filter(({ s }) => topic === "all" || s.topics.includes(topic)),
    [stories, topic],
  );
  const topics = useMemo(() => [...new Set(stories.flatMap((s) => s.topics))], [stories]);
  const outlets = new Set(stories.flatMap((s) => s.sources.map((x) => x.outletId))).size;
  const regions = new Set(stories.flatMap((s) => s.sources.map((x) => x.region))).size;
  const concentrated = stories.filter((s) => s.coverage.concentrated).length;

  const btn = (active) => ({
    fontFamily: F.body, fontSize: 14, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
    background: active ? C.gold : C.surface2, color: active ? C.onGold : C.textSec,
    border: `1px solid ${active ? C.gold : C.border}`,
  });

  if (!loaded) return <p style={{ fontFamily: F.body, fontSize: 15, color: C.textMuted }}>{lang === "es" ? "Cargando Prisma…" : "Loading Prisma…"}</p>;
  if (!doc || !stories.length) {
    return (
      <div style={{ padding: 24, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: F.body, fontSize: 15, color: C.textSec, lineHeight: 1.6 }}>
        {lang === "es"
          ? "Prisma publica su primera edición en la próxima ejecución programada (06:15, 12:15 y 18:15 UTC)."
          : "Prisma publishes its first edition at the next scheduled run (06:15, 12:15 and 18:15 UTC)."}
      </div>
    );
  }

  const stale = Date.now() - Date.parse(doc.generated_at) > 36 * 3600e3;

  return (
    <div style={{ display: "grid", gap: 18, marginBottom: 32, ...NUM }}>
      {/* Cabecera */}
      <div style={{ display: "grid", gap: 10 }}>
        <p style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.12em", color: C.gold, margin: 0 }}>
          PRISMA · {lang === "es" ? "COBERTURA COMPARADA" : "COVERAGE COMPARED"}
        </p>
        <p style={{ fontFamily: F.body, fontSize: 16, color: C.textSec, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          {lang === "es"
            ? "Cada historia agrupa lo que publican medios de distintas regiones y líneas editoriales. La barra muestra quién la cuenta; la ficha, en qué coinciden y en qué difieren."
            : "Each story groups what outlets from different regions and editorial lines publish. The bar shows who is covering it; the card, where they agree and where they differ."}
        </p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline" }}>
          {[[stories.length, lang === "es" ? "historias" : "stories"], [outlets, lang === "es" ? "medios" : "outlets"], [regions, lang === "es" ? "regiones" : "regions"], [concentrated, lang === "es" ? "con cobertura concentrada" : "with concentrated coverage"]].map(([n, l]) => (
            <span key={l} style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted }}>
              <b style={{ fontSize: 26, fontWeight: 600, color: C.text, marginRight: 6 }}>{n}</b>{l}
            </span>
          ))}
          <span style={{ fontFamily: F.mono, fontSize: 12, color: stale ? C.red : C.textMuted }}>
            {lang === "es" ? "Edición" : "Edition"} {fmtDate(doc.generated_at, lang)}{stale ? (lang === "es" ? " · sin actualizar" : " · not updated") : ""}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: "grid", gap: 10, padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div role="group" aria-label={lang === "es" ? "Ver cobertura por" : "View coverage by"} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.keys(DIMS).map((k) => (
            <button key={k} type="button" aria-pressed={lens === k} onClick={() => setLens(k)} style={btn(lens === k)}>{L(DIMS[k].label)}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" aria-pressed={topic === "all"} onClick={() => setTopic("all")} style={btn(topic === "all")}>{lang === "es" ? "Todas" : "All"}</button>
          {topics.map((t) => (
            <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)} style={btn(topic === t)}>{L(TOPIC_NAMES[t])}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
          {DIMS[lens].keys.map((k) => (
            <span key={k} style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i style={{ width: 12, height: 12, borderRadius: 3, background: DIMS[lens].colors[k], display: "inline-block" }} />{L(DIMS[lens].names[k])}
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.text }}>{lang === "es" ? "Balance de esta edición" : "Balance of this edition"}</span>
          <CoverageBar counts={doc.balance?.[lens]} dim={lens} lang={lang} height={14} />
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted }}>{topShares(doc.balance?.[lens], lens, lang)}</span>
        </div>
      </div>

      {/* Historias */}
      {visible.map(({ s, i }) => {
        const locked = !fullAccess && i >= publicCount;
        const isOpen = open === s.id && !locked;
        const div = DIVERSITY[s.coverage.diversity];
        return (
          <article key={s.id} style={{ background: C.surface, border: `1px solid ${isOpen ? C.gold : C.border}`, borderRadius: 10, padding: 18, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {s.topics.map((t) => (
                <span key={t} style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.gold, background: alpha(C.gold, 0.12), padding: "2px 8px", borderRadius: 4 }}>{L(TOPIC_NAMES[t])}</span>
              ))}
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted }}>{fmtDate(s.updated_at, lang)}</span>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: div.c, border: `1px solid ${alpha(div.c, 0.5)}`, padding: "1px 8px", borderRadius: 999 }}>{div[lang]}</span>
            </div>
            <h3 style={{ fontFamily: F.display, fontSize: 22, lineHeight: 1.25, fontWeight: 600, color: C.text, margin: 0, ...NUM }}>{L(s.title)}</h3>
            {!locked && <p style={{ fontFamily: F.body, fontSize: 16, color: C.textSec, margin: 0, lineHeight: 1.55 }}>{L(s.dek)}</p>}
            <CoverageBar counts={s.coverage[lens]} dim={lens} lang={lang} />
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontFamily: F.body, fontSize: 13, color: C.textMuted }}>
              <span>{s.coverage.outlets} {lang === "es" ? "medios" : "outlets"} · {s.coverage.regions} {lang === "es" ? "regiones" : "regions"}</span>
              <span>{topShares(s.coverage[lens], lens, lang)}</span>
            </div>

            {locked ? (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", paddingTop: 4 }}>
                <span style={{ fontFamily: F.body, fontSize: 14, color: C.textSec }}>
                  {lang === "es" ? "Ficha completa para suscriptores de ZRC Intelligence." : "Full card for ZRC Intelligence subscribers."}
                </span>
                <button type="button" onClick={user ? openPricing : openRegister} style={{ ...btn(true), borderRadius: 6 }}>
                  {user ? (lang === "es" ? "Ver planes" : "See plans") : (lang === "es" ? "Empezar prueba gratuita" : "Start free trial")}
                </button>
              </div>
            ) : (
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}
                style={{ justifySelf: "start", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.gold }}>
                {isOpen ? (lang === "es" ? "Cerrar ficha" : "Close card") : (lang === "es" ? "Cómo lo cuenta cada medio →" : "How each outlet tells it →")}
              </button>
            )}

            {isOpen && (
              <StoryCard s={s} lang={lang} L={L} fullAccess={fullAccess} user={user} openRegister={openRegister} openPricing={openPricing} />
            )}
          </article>
        );
      })}

      <p style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
        {lang === "es"
          ? "Metodología: región = sede del medio; las piezas de agencia republicadas se atribuyen a la agencia. La línea editorial es una clasificación preliminar que se calibra con AllSides, Ad Fontes Media y Media Bias/Fact Check; «Oficialista» identifica medios de titularidad estatal o alineados con su gobierno. Los hechos comunes exigen al menos dos medios distintos y cada cifra se contrasta con el texto de origen."
          : "Methodology: region = the outlet's headquarters; republished wire stories are credited to the wire. Editorial line is a preliminary rating being calibrated against AllSides, Ad Fontes Media and Media Bias/Fact Check; “State-aligned” marks state-owned or government-aligned outlets. Shared facts require at least two different outlets and every figure is checked against the source text."}
      </p>
    </div>
  );
}

function StoryCard({ s, lang, L, fullAccess, user, openRegister, openPricing }) {
  const h4 = { fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, margin: "0 0 8px" };
  const p = { fontFamily: F.body, fontSize: 15, color: C.textSec, lineHeight: 1.6, margin: 0 };
  return (
    <div style={{ display: "grid", gap: 18, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
      <div>
        <h4 style={h4}>{lang === "es" ? "Lo que coinciden las fuentes" : "What sources agree on"}</h4>
        <ul style={{ ...p, paddingLeft: 20, display: "grid", gap: 6 }}>
          {s.facts.map((f, k) => (
            <li key={k}>{L(f)} <span style={{ fontSize: 12, color: C.textMuted }}>({f.sources.map((i) => s.sources[i]?.outlet).filter(Boolean).join(", ")})</span></li>
          ))}
        </ul>
      </div>

      {fullAccess ? (
        <>
          <div style={{ background: alpha(C.amber, 0.08), border: `1px solid ${alpha(C.amber, 0.35)}`, borderRadius: 8, padding: 14 }}>
            <h4 style={h4}>{lang === "es" ? "Dónde difiere el enfoque" : "Where framing differs"}</h4>
            <p style={p}>{L(s.perspectives)}</p>
            {s.discrepancies.length > 0 && (
              <ul style={{ ...p, paddingLeft: 20, marginTop: 8 }}>
                {s.discrepancies.map((d, k) => <li key={k}>{L(d)}</li>)}
              </ul>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <h4 style={{ ...h4, margin: 0 }}>{lang === "es" ? "Distribución de la cobertura" : "Coverage breakdown"}</h4>
            {Object.keys(DIMS).map((k) => (
              <div key={k} style={{ display: "grid", gap: 4 }}>
                <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>{L(DIMS[k].label)}: <span style={{ fontWeight: 400, color: C.textMuted }}>{topShares(s.coverage[k], k, lang)}</span></span>
                <CoverageBar counts={s.coverage[k]} dim={k} lang={lang} />
              </div>
            ))}
          </div>

          {s.zrc && (
            <div style={{ background: C.surface2, borderLeft: `4px solid ${C.gold}`, borderRadius: 8, padding: 14 }}>
              <h4 style={{ ...h4, color: C.gold }}>{lang === "es" ? "Lectura ZRC" : "ZRC reading"}</h4>
              <ul style={{ ...p, paddingLeft: 20, display: "grid", gap: 6 }}>
                {(s.zrc[lang] || s.zrc.es).map((z, k) => <li key={k}>{z}</li>)}
              </ul>
            </div>
          )}

          <div>
            <h4 style={h4}>{lang === "es" ? `Fuentes (${s.sources.length})` : `Sources (${s.sources.length})`}</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {s.sources.map((src, k) => (
                <div key={k} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, display: "grid", gap: 6 }}>
                  <span style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.text }}>
                    {src.outlet}{src.via ? <span style={{ fontWeight: 400, color: C.textMuted }}> · {lang === "es" ? "vía" : "via"} {src.via}</span> : null}
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Pill dim="region" value={src.region} lang={lang} />
                    <Pill dim="line" value={src.line} lang={lang} />
                    <Pill dim="type" value={src.type} lang={lang} />
                  </div>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: F.body, fontSize: 14, color: C.gold }}>{src.title} ↗</a>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 14, background: C.surface2, borderRadius: 8 }}>
          <span style={{ ...p, flex: "1 1 260px" }}>
            {lang === "es"
              ? "Las diferencias de enfoque, la Lectura ZRC y todas las fuentes están disponibles con ZRC Intelligence."
              : "Framing differences, the ZRC reading and every source are available with ZRC Intelligence."}
          </span>
          <button type="button" onClick={user ? openPricing : openRegister}
            style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 6, border: "none", background: C.gold, color: C.onGold, cursor: "pointer" }}>
            {user ? (lang === "es" ? "Ver planes" : "See plans") : (lang === "es" ? "Empezar prueba gratuita" : "Start free trial")}
          </button>
        </div>
      )}
    </div>
  );
}
