import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { COUNTRY_PROFILES, COUNTRY_PROFILE_UPDATED_AT, PILLAR_META, riskBand, trendMeta } from "../src/data/countryRiskProfiles.js";

const root = process.cwd();
const dist = path.join(root, "dist");
const shell = await readFile(path.join(dist, "index.html"), "utf8");
const origin = "https://www.zenithrisecapital.com";
const basePath = "/inteligencia/paises";

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const esc = escapeHtml;

const staticCss = `<style id="country-profile-prerender">body{margin:0;background:#080b0d;color:#f1f3f2;font-family:Arial,sans-serif}.ss{max-width:1120px;margin:auto;padding:48px 24px 80px}.ss a{color:#75d5aa}.ss-brand{font:700 12px monospace;letter-spacing:.16em;color:#9fb0ac}.ss h1{font:400 clamp(42px,7vw,74px) Georgia,serif;line-height:1;margin:70px 0 18px}.ss-intro{max-width:780px;color:#aab6b3;font-size:18px;line-height:1.6}.ss-grid,.ss-pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:42px}.ss-card,.ss-pillar,.ss-panel{padding:22px;border:1px solid #2a3935;border-radius:14px;background:#101617}.ss-card{text-decoration:none;color:#f1f3f2!important}.ss-card h2{font:400 31px Georgia,serif;margin:10px 0}.ss-card p,.ss-pillar p,.ss-panel li{color:#95a19e;line-height:1.55}.ss-score{font:700 26px monospace}.ss-meta{font:10px monospace;letter-spacing:.12em;color:#5bd29d}.ss-pillars{grid-template-columns:repeat(5,1fr)}.ss-pillar strong{display:block;font:700 26px monospace;margin:12px 0}.ss-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}.ss-panel h2{font:400 32px Georgia,serif}.ss-note{margin-top:28px;padding:18px;border-left:3px solid #56cc99;background:#101817;color:#95a19e;line-height:1.55}@media(max-width:800px){.ss-grid,.ss-pillars{grid-template-columns:1fr 1fr}.ss-two{grid-template-columns:1fr}}@media(max-width:520px){.ss-grid,.ss-pillars{grid-template-columns:1fr}.ss{padding:32px 18px 60px}.ss h1{margin-top:50px}}</style>`;

function documentFor({ title, description, canonical, body, schema }) {
  let html = shell
    .replace(/<html\s+lang="[^"]*"/, '<html lang="es"')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${esc(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${esc(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${esc(description)}" />`)
    .replace("</head>", `  <link rel="canonical" href="${canonical}" />\n    ${staticCss}\n    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return html;
}

function indexBody() {
  const cards = COUNTRY_PROFILES.map(country => {
    const band = riskBand(country.score), trend = trendMeta[country.trend];
    return `<a class="ss-card" href="${basePath}/${country.slug}/"><span class="ss-meta">${esc(country.region)} · ${country.iso}</span><h2>${esc(country.flag)} ${esc(country.name)}</h2><span class="ss-score" style="color:${band.color}">${country.score}/100 · ${esc(band.label)}</span><p>${esc(country.summary)}</p><span class="ss-meta" style="color:${trend.color}">${trend.symbol} ${esc(trend.label)}</span></a>`;
  }).join("");
  return `<main class="ss"><div class="ss-brand">ZENITH RISE CAPITAL · GEORISK</div><h1>Riesgo país para inversores</h1><p class="ss-intro">Fichas comparables de Iberia, LATAM y MENA con puntuación compuesta 0–100, cinco subpilares, qué vigilar en 30 días e implicaciones para la inversión.</p><div class="ss-note"><strong>Transparencia sin revelar la metodología propietaria.</strong> Publicamos resultados, fuentes, cobertura y fechas de corte. Mayor puntuación significa mayor riesgo relativo.</div><section class="ss-grid">${cards}</section></main>`;
}

function countryBody(country) {
  const band = riskBand(country.score), trend = trendMeta[country.trend];
  const pillars = Object.entries(country.pillars).map(([id, value]) => {
    const meta = PILLAR_META[id], pillarBand = riskBand(value.score);
    return `<article class="ss-pillar"><span class="ss-meta">${esc(meta.label)}</span><strong style="color:${pillarBand.color}">${value.score}/100</strong><p>${esc(meta.short)}</p><a href="${esc(meta.href)}">${esc(meta.source)} · ${esc(meta.sourceDate)}</a></article>`;
  }).join("");
  const watch = country.watch.map(item => `<li>${esc(item)}</li>`).join("");
  const implications = country.implications.map(item => `<li>${esc(item)}</li>`).join("");
  return `<main class="ss"><div class="ss-brand"><a href="${basePath}/">FICHAS PAÍS</a> · ${esc(country.region)} · ${country.iso}</div><h1>${esc(country.flag)} Riesgo país de ${esc(country.name)}</h1><p class="ss-intro">${esc(country.summary)}</p><p class="ss-score" style="color:${band.color}">${country.score}/100 · ${esc(band.label)} <small style="color:${trend.color}">${trend.symbol} ${esc(trend.label)}</small></p><div class="ss-note"><strong>Lectura ZRC actualizada ${esc(COUNTRY_PROFILE_UPDATED_AT)}.</strong> La puntuación no es una probabilidad ni una calificación crediticia. Los pesos y reglas internas no se publican.</div><section class="ss-pillars">${pillars}</section><section class="ss-two"><article class="ss-panel"><span class="ss-meta">HORIZONTE 30 DÍAS</span><h2>Qué vigilar</h2><ol>${watch}</ol></article><article class="ss-panel"><span class="ss-meta">LECTURA DE CARTERA</span><h2>Implicaciones para la inversión</h2><ul>${implications}</ul></article></section><div class="ss-note"><strong>Señal cualitativa: ${esc(trend.label)}.</strong> ${esc(country.summary)} <a href="${esc(country.source.href)}">Contrastar con ${esc(country.source.label)}</a>.</div></main>`;
}

async function writePage(relativePath, html) {
  const directory = path.join(dist, relativePath);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
}

const indexTitle = "Riesgo país para inversores: Iberia, LATAM y MENA | ZRC";
const indexDescription = "Fichas de riesgo país con puntuación 0–100, cinco subpilares, señales a 30 días y lectura de inversión para Iberia, LATAM y MENA.";
await writePage("inteligencia/paises", documentFor({
  title: indexTitle, description: indexDescription, canonical: `${origin}${basePath}/`, body: indexBody(),
  schema: { "@context": "https://schema.org", "@type": "CollectionPage", name: indexTitle, description: indexDescription, dateModified: COUNTRY_PROFILE_UPDATED_AT,
    hasPart: COUNTRY_PROFILES.map(country => ({ "@type": "WebPage", name: `Riesgo país de ${country.name}`, url: `${origin}${basePath}/${country.slug}/` })) },
}));

for (const country of COUNTRY_PROFILES) {
  const title = `Riesgo país de ${country.name}: puntuación y señales | ZRC`;
  const description = `Ficha de riesgo país de ${country.name}: puntuación ZRC ${country.score}/100, cinco subpilares, señales a 30 días e implicaciones para la inversión.`;
  await writePage(`inteligencia/paises/${country.slug}`, documentFor({
    title, description, canonical: `${origin}${basePath}/${country.slug}/`, body: countryBody(country),
    schema: { "@context": "https://schema.org", "@type": "AnalysisNewsArticle", headline: title, description, datePublished: COUNTRY_PROFILE_UPDATED_AT, dateModified: COUNTRY_PROFILE_UPDATED_AT,
      author: { "@type": "Organization", name: "Zenith Rise Capital" }, publisher: { "@type": "Organization", name: "Zenith Rise Capital", url: origin }, mainEntityOfPage: `${origin}${basePath}/${country.slug}/`, about: { "@type": "Country", name: country.name } },
  }));
}

const sitemapUrls = ["/", `${basePath}/`, "/inteligencia/deuda-paises/", ...COUNTRY_PROFILES.map(country => `${basePath}/${country.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(url => `  <url><loc>${origin}${url}</loc><lastmod>${COUNTRY_PROFILE_UPDATED_AT}</lastmod></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(dist, "sitemap.xml"), sitemap);
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);

console.log(`Prerendered ${COUNTRY_PROFILES.length + 1} country intelligence pages.`);
