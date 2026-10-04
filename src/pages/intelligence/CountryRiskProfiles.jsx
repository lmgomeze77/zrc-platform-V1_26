import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Database, Eye, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { COUNTRY_BY_SLUG, COUNTRY_PROFILES, COUNTRY_PROFILE_UPDATED_AT, PILLAR_META, riskBand, trendMeta } from "../../data/countryRiskProfiles.js";
import "./countryRiskProfiles.css";

const BASE_URL = "https://www.zenithrisecapital.com/inteligencia/paises";
const REGIONS = ["Todos", "Iberia", "LATAM", "MENA"];

function formatDate(value) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value + "T12:00:00Z"));
}

function setMeta(name, content, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function useSeo(country) {
  useEffect(() => {
    const title = country ? `Riesgo país de ${country.name}: puntuación y señales | ZRC` : "Riesgo país para inversores: Iberia, LATAM y MENA | ZRC";
    const description = country
      ? `Ficha de riesgo país de ${country.name}: puntuación ZRC 0–100, cinco subpilares, señales a 30 días e implicaciones para la inversión.`
      : "Fichas de riesgo país para inversores con puntuación 0–100, cinco subpilares, señales a 30 días y lectura de inversión para Iberia, LATAM y MENA.";
    const canonical = country ? `${BASE_URL}/${country.slug}/` : `${BASE_URL}/`;
    document.documentElement.lang = "es";
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonical, true);
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical;
  }, [country]);
}

function BrandHeader() {
  return (
    <header className="crp-header">
      <a className="crp-brand" href="/" aria-label="Zenith Rise Capital, inicio">
        <span className="crp-brand-mark">ZR</span>
        <span><strong>ZENITH RISE CAPITAL</strong><small>GEORISK COUNTRY INTELLIGENCE</small></span>
      </a>
      <a className="crp-home-link" href="/">Plataforma <ArrowRight size={15} /></a>
    </header>
  );
}

function ScoreDial({ score, compact = false }) {
  const band = riskBand(score);
  return (
    <div className={`crp-score ${compact ? "crp-score--compact" : ""}`} style={{ "--score": score, "--risk-color": band.color }} aria-label={`Riesgo ${score} sobre 100, ${band.label}`}>
      <div className="crp-score-inner"><strong>{score}</strong><span>/100</span></div>
    </div>
  );
}

function PillarCard({ id, value }) {
  const meta = PILLAR_META[id];
  const band = riskBand(value.score);
  return (
    <article className="crp-pillar">
      <div className="crp-pillar-top">
        <span className="crp-kicker">{meta.label}</span>
        <strong style={{ color: band.color }}>{value.score}</strong>
      </div>
      <div className="crp-bar" aria-hidden="true"><span style={{ width: `${value.score}%`, background: band.color }} /></div>
      <p>{meta.short}</p>
      <a href={meta.href} target="_blank" rel="noreferrer">{meta.source} · {meta.sourceDate} <ExternalLink size={12} /></a>
    </article>
  );
}

function CountryCard({ country }) {
  const band = riskBand(country.score);
  const trend = trendMeta[country.trend];
  return (
    <a className="crp-country-card" href={`/inteligencia/paises/${country.slug}/`}>
      <div className="crp-country-card-head"><span className="crp-flag">{country.flag}</span><ScoreDial score={country.score} compact /></div>
      <span className="crp-kicker">{country.region} · {country.iso}</span>
      <h2>{country.name}</h2>
      <p>{country.summary}</p>
      <div className="crp-country-card-foot"><span style={{ color: band.color }}>{band.label}</span><span style={{ color: trend.color }}>{trend.symbol} {trend.label}</span></div>
    </a>
  );
}

function IndexPage() {
  useSeo(null);
  const [region, setRegion] = useState("Todos");
  const [query, setQuery] = useState("");
  const countries = useMemo(() => COUNTRY_PROFILES.filter(country =>
    (region === "Todos" || country.region === region) && country.name.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"))), [region, query]);
  return (
    <div className="crp-page">
      <BrandHeader />
      <main>
        <section className="crp-index-hero">
          <div>
            <span className="crp-eyebrow">INTELIGENCIA PAÍS · PARA INVERSORES</span>
            <h1>Riesgo país, convertido en decisiones.</h1>
            <p>Una lectura comparable de Iberia, LATAM y MENA: puntuación compuesta, cinco subpilares, señales para los próximos 30 días e implicaciones concretas para la inversión.</p>
          </div>
          <aside className="crp-method-note"><ShieldCheck size={22} /><div><strong>Metodología protegida</strong><p>Publicamos resultados, cobertura, fuentes y fechas. Los pesos, transformaciones y reglas internas permanecen en el sistema ZRC.</p></div></aside>
        </section>

        <section className="crp-source-strip" aria-label="Transparencia de datos">
          <span><Database size={16} /> WGI · GPR · GDELT · FMI WEO · mercado</span>
          <span><CalendarDays size={16} /> Revisión ZRC: {formatDate(COUNTRY_PROFILE_UPDATED_AT)}</span>
          <span><Eye size={16} /> Mayor puntuación = mayor riesgo</span>
        </section>

        <section className="crp-toolbar">
          <div className="crp-tabs" aria-label="Filtrar por región">
            {REGIONS.map(item => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{item}</button>)}
          </div>
          <label className="crp-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar país" aria-label="Buscar país" /></label>
        </section>

        <section className="crp-country-grid" aria-live="polite">
          {countries.map(country => <CountryCard key={country.iso} country={country} />)}
        </section>

        <section className="crp-disclosure">
          <span className="crp-eyebrow">CÓMO LEER LAS FICHAS</span>
          <h2>Comparables, fechadas y honestas sobre sus límites.</h2>
          <div className="crp-disclosure-grid">
            <p><strong>La puntuación no es una probabilidad.</strong> Es una síntesis ordinal ZRC para comparar riesgos, no una calificación crediticia ni una recomendación de cartera.</p>
            <p><strong>Las frecuencias son distintas.</strong> WGI es anual; WEO, periódico; mercado y atención informativa se mueven con mayor rapidez. Cada tarjeta indica su corte.</p>
            <p><strong>La flecha es editorial.</strong> Resume el cambio mensual observado por ZRC y se acompaña de una fuente externa para contraste.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function DetailPage({ country }) {
  useSeo(country);
  const band = riskBand(country.score);
  const trend = trendMeta[country.trend];
  const peers = COUNTRY_PROFILES.filter(item => item.region === country.region && item.iso !== country.iso).slice(0, 3);
  return (
    <div className="crp-page">
      <BrandHeader />
      <main>
        <nav className="crp-breadcrumb" aria-label="Migas de pan"><a href="/inteligencia/paises/">Fichas país</a><span>/</span><span>{country.region}</span><span>/</span><span>{country.name}</span></nav>
        <section className="crp-country-hero">
          <div className="crp-country-identity">
            <span className="crp-flag crp-flag--large">{country.flag}</span>
            <div><span className="crp-eyebrow">{country.region} · {country.iso} · ACTUALIZADO {formatDate(COUNTRY_PROFILE_UPDATED_AT).toUpperCase()}</span><h1>Riesgo país de {country.name}</h1><p>{country.summary}</p></div>
          </div>
          <div className="crp-hero-score"><ScoreDial score={country.score} /><div><span className="crp-kicker">RIESGO COMPUESTO</span><strong style={{ color: band.color }}>{band.label}</strong><span style={{ color: trend.color }}>{trend.symbol} {trend.label} este mes</span></div></div>
        </section>

        <section className="crp-confidence"><ShieldCheck size={18} /><p><strong>Lectura ZRC.</strong> La puntuación integra cinco capas heterogéneas. Mostramos su resultado, fecha y fuente; no publicamos pesos, coeficientes ni reglas propietarias.</p></section>

        <section className="crp-section">
          <div className="crp-section-title"><span className="crp-eyebrow">DESCOMPOSICIÓN</span><h2>Cinco lentes sobre el riesgo</h2><p>Escala homogénea 0–100. Una cifra mayor indica mayor riesgo relativo dentro del universo seguido por ZRC.</p></div>
          <div className="crp-pillar-grid">{Object.entries(country.pillars).map(([id, value]) => <PillarCard key={id} id={id} value={value} />)}</div>
        </section>

        <section className="crp-two-column">
          <article className="crp-panel crp-panel--watch"><span className="crp-eyebrow">HORIZONTE 30 DÍAS</span><h2>Qué vigilar</h2><ol>{country.watch.map((item, index) => <li key={item}><span>0{index + 1}</span><p>{item}</p></li>)}</ol></article>
          <article className="crp-panel"><span className="crp-eyebrow">LECTURA DE CARTERA</span><h2>Implicaciones para la inversión</h2><ul>{country.implications.map(item => <li key={item}>{item}</li>)}</ul></article>
        </section>

        <section className="crp-editorial">
          <div><span className="crp-eyebrow">SEÑAL CUALITATIVA · OCTUBRE 2026</span><h2><span style={{ color: trend.color }}>{trend.symbol}</span> {trend.label}</h2><p>{country.summary}</p></div>
          <a href={country.source.href} target="_blank" rel="noreferrer">Contrastar con {country.source.label} <ExternalLink size={15} /></a>
        </section>

        {peers.length > 0 && <section className="crp-section"><div className="crp-section-title"><span className="crp-eyebrow">MISMA REGIÓN</span><h2>Comparar con otros mercados</h2></div><div className="crp-peer-grid">{peers.map(peer => <CountryCard key={peer.iso} country={peer} />)}</div></section>}

        <a className="crp-back" href="/inteligencia/paises/"><ArrowLeft size={16} /> Ver todas las fichas país</a>
      </main>
      <Footer />
    </div>
  );
}

function NotFoundPage() {
  useSeo(null);
  return <div className="crp-page"><BrandHeader /><main className="crp-not-found"><span className="crp-eyebrow">404 · FICHA NO DISPONIBLE</span><h1>Este país aún no forma parte de la cobertura.</h1><a className="crp-back" href="/inteligencia/paises/"><ArrowLeft size={16} /> Ver cobertura disponible</a></main><Footer /></div>;
}

function Footer() {
  return <footer className="crp-footer"><div><strong>ZENITH RISE CAPITAL</strong><span>GeoRisk Country Intelligence</span></div><p>Información para análisis. No constituye asesoramiento financiero, recomendación ni calificación crediticia.</p></footer>;
}

export default function CountryRiskProfilesRouter() {
  const segments = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const slug = segments[2];
  if (!slug) return <IndexPage />;
  const country = COUNTRY_BY_SLUG[slug];
  return country ? <DetailPage country={country} /> : <NotFoundPage />;
}
