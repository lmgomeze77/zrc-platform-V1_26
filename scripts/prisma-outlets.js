/**
 * Prisma — catálogo de medios.
 *
 * Fase A: 50 medios con cuotas por región (Europa 13, Norteamérica 7,
 * LATAM 8, MENA 7, Asia-Pacífico 8, Eurasia 3, África 4) más las agencias
 * que se detectan dentro de los artículos de otros medios.
 *
 * Región = país de la sede editorial. Línea editorial = clasificación
 * preliminar, pendiente de calibrar con AllSides, Ad Fontes Media y
 * Media Bias/Fact Check. «oficialista» = titularidad estatal o
 * alineamiento declarado con su gobierno.
 *
 * Los feeds se verifican en cada ejecución: el informe `feeds` de
 * public/data/prisma.json lista los que fallan para corregir la URL aquí.
 */

export const REGIONS = ["norteamerica", "europa", "eurasia", "mena", "asia_pacifico", "latam", "africa"];
export const LINES = ["centro_izquierda", "centro", "centro_derecha", "oficialista"];
export const TYPES = ["agencia", "prensa_financiera", "generalista", "research_datos", "institucional"];

const o = (id, name, country, region, line, type, lang, feeds, extra = {}) =>
  ({ id, name, country, region, line, type, lang, feeds, phase: "A", ...extra });

export const OUTLETS = [
  // ── Agencias (sin feed propio: se detectan en el texto de otros medios) ──
  o("reuters", "Reuters", "GB", "europa", "centro", "agencia", "en", [], { agency: true }),
  o("ap", "AP", "US", "norteamerica", "centro", "agencia", "en", [], { agency: true }),
  o("afp", "AFP", "FR", "europa", "centro", "agencia", "en", [], { agency: true }),
  o("efe", "EFE", "ES", "europa", "centro", "agencia", "es", [], { agency: true }),
  o("bloomberg", "Bloomberg", "US", "norteamerica", "centro", "prensa_financiera", "en", [], { agency: true }),

  // ── Europa (13) ──
  o("bbc", "BBC News", "GB", "europa", "centro", "generalista", "en", [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.bbci.co.uk/news/business/rss.xml",
  ]),
  o("guardian", "The Guardian", "GB", "europa", "centro_izquierda", "generalista", "en", [
    "https://www.theguardian.com/world/rss",
    "https://www.theguardian.com/business/rss",
  ]),
  o("dw", "Deutsche Welle", "DE", "europa", "centro", "generalista", "en", ["https://rss.dw.com/rdf/rss-en-all"]),
  o("france24", "France 24", "FR", "europa", "centro", "generalista", "en", ["https://www.france24.com/en/rss"]),
  o("lemonde", "Le Monde", "FR", "europa", "centro_izquierda", "generalista", "fr", ["https://www.lemonde.fr/rss/une.xml"]),
  o("lefigaro", "Le Figaro", "FR", "europa", "centro_derecha", "generalista", "fr", ["https://www.lefigaro.fr/rss/figaro_actualites.xml"]),
  o("lesechos", "Les Echos", "FR", "europa", "centro", "prensa_financiera", "fr", ["https://syndication.lesechos.fr/rss/rss_une.xml"]),
  o("elpais", "El País", "ES", "europa", "centro_izquierda", "generalista", "es", ["https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada"]),
  o("elmundo", "El Mundo", "ES", "europa", "centro_derecha", "generalista", "es", ["https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml"]),
  o("expansion", "Expansión", "ES", "europa", "centro", "prensa_financiera", "es", ["https://e00-expansion.uecdn.es/rss/portada.xml"]),
  o("elconfidencial", "El Confidencial", "ES", "europa", "centro", "generalista", "es", ["https://rss.elconfidencial.com/economia/"]),
  o("politicoeu", "Politico Europe", "BE", "europa", "centro", "generalista", "en", ["https://www.politico.eu/feed/"]),
  o("kyivindependent", "Kyiv Independent", "UA", "europa", "centro", "generalista", "en", ["https://kyivindependent.com/news-archive/rss/"]),

  // ── Norteamérica (7) ──
  o("nyt", "The New York Times", "US", "norteamerica", "centro_izquierda", "generalista", "en", [
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
  ]),
  o("cnbc", "CNBC", "US", "norteamerica", "centro", "prensa_financiera", "en", ["https://www.cnbc.com/id/100727362/device/rss/rss.html"]),
  o("npr", "NPR", "US", "norteamerica", "centro_izquierda", "generalista", "en", ["https://feeds.npr.org/1004/rss.xml"]),
  o("politico", "Politico", "US", "norteamerica", "centro", "generalista", "en", ["https://rss.politico.com/politics-news.xml"]),
  o("marketwatch", "MarketWatch", "US", "norteamerica", "centro", "prensa_financiera", "en", ["https://feeds.content.dowjones.io/public/rss/mw_topstories"]),
  o("foxbusiness", "Fox Business", "US", "norteamerica", "centro_derecha", "prensa_financiera", "en", ["https://moxie.foxbusiness.com/google-publisher/latest.xml"]),
  o("globeandmail", "The Globe and Mail", "CA", "norteamerica", "centro", "generalista", "en", ["https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/business/"]),

  // ── LATAM (8) ──
  o("folha", "Folha de S.Paulo", "BR", "latam", "centro", "generalista", "pt", ["https://feeds.folha.uol.com.br/mercado/rss091.xml"]),
  o("agenciabrasil", "Agência Brasil", "BR", "latam", "oficialista", "agencia", "pt", ["https://agenciabrasil.ebc.com.br/rss/economia/feed.xml"]),
  o("riotimes", "The Rio Times", "BR", "latam", "centro", "prensa_financiera", "en", ["https://www.riotimesonline.com/feed/"]),
  o("clarin", "Clarín", "AR", "latam", "centro", "generalista", "es", ["https://www.clarin.com/rss/economia/"]),
  o("lanacion", "La Nación", "AR", "latam", "centro_derecha", "generalista", "es", ["https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml"]),
  o("ambito", "Ámbito", "AR", "latam", "centro", "prensa_financiera", "es", ["https://www.ambito.com/rss/pages/economia.xml"]),
  o("elfinanciero", "El Financiero", "MX", "latam", "centro", "prensa_financiera", "es", ["https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml"]),
  o("eltiempo", "El Tiempo", "CO", "latam", "centro", "generalista", "es", ["https://www.eltiempo.com/rss/economia.xml"]),

  // ── MENA (7) ──
  o("aljazeera", "Al Jazeera", "QA", "mena", "centro_izquierda", "generalista", "en", ["https://www.aljazeera.com/xml/rss/all.xml"]),
  o("alarabiya", "Al Arabiya", "SA", "mena", "oficialista", "generalista", "en", ["https://english.alarabiya.net/feed/rss2/en.xml"]),
  o("arabnews", "Arab News", "SA", "mena", "oficialista", "generalista", "en", ["https://www.arabnews.com/rss.xml"]),
  o("thenational", "The National", "AE", "mena", "oficialista", "generalista", "en", ["https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml"]),
  o("timesofisrael", "The Times of Israel", "IL", "mena", "centro", "generalista", "en", ["https://www.timesofisrael.com/feed/"]),
  o("tehrantimes", "Tehran Times", "IR", "mena", "oficialista", "generalista", "en", ["https://www.tehrantimes.com/rss"]),
  o("moroccoworldnews", "Morocco World News", "MA", "mena", "centro", "generalista", "en", ["https://www.moroccoworldnews.com/feed/"]),

  // ── Asia-Pacífico (8) ──
  o("scmp", "South China Morning Post", "HK", "asia_pacifico", "centro", "generalista", "en", ["https://www.scmp.com/rss/91/feed"]),
  o("globaltimes", "Global Times", "CN", "asia_pacifico", "oficialista", "generalista", "en", ["https://www.globaltimes.cn/rss/outbrain.xml"]),
  o("chinadaily", "China Daily", "CN", "asia_pacifico", "oficialista", "generalista", "en", ["http://www.chinadaily.com.cn/rss/world_rss.xml"]),
  o("nikkeiasia", "Nikkei Asia", "JP", "asia_pacifico", "centro", "prensa_financiera", "en", ["https://asia.nikkei.com/rss/feed/nar"]),
  o("japantimes", "The Japan Times", "JP", "asia_pacifico", "centro", "generalista", "en", ["https://www.japantimes.co.jp/feed/"]),
  o("cna", "Channel NewsAsia", "SG", "asia_pacifico", "centro", "generalista", "en", ["https://www.channelnewsasia.com/rssfeeds/8395986"]),
  o("economictimes", "The Economic Times", "IN", "asia_pacifico", "centro", "prensa_financiera", "en", ["https://economictimes.indiatimes.com/rssfeedstopstories.cms"]),
  o("thehindu", "The Hindu", "IN", "asia_pacifico", "centro_izquierda", "generalista", "en", ["https://www.thehindu.com/news/international/feeder/default.rss"]),

  // ── Eurasia (3) ──
  o("tass", "TASS", "RU", "eurasia", "oficialista", "agencia", "en", ["https://tass.com/rss/v2.xml"]),
  o("jamnews", "JAMnews", "GE", "eurasia", "centro", "generalista", "en", ["https://jam-news.net/feed/"]),
  o("trend", "Trend", "AZ", "eurasia", "oficialista", "agencia", "en", ["https://en.trend.az/feeds/index.rss"]),

  // ── África (4) ──
  o("news24", "News24", "ZA", "africa", "centro", "generalista", "en", ["https://feeds.news24.com/articles/news24/TopStories/rss"]),
  o("mailguardian", "Mail & Guardian", "ZA", "africa", "centro_izquierda", "generalista", "en", ["https://mg.co.za/feed/"]),
  o("premiumtimes", "Premium Times", "NG", "africa", "centro", "generalista", "en", ["https://www.premiumtimesng.com/feed"]),
  o("businessdayng", "BusinessDay", "NG", "africa", "centro", "prensa_financiera", "en", ["https://businessday.ng/feed/"]),
];

export const OUTLETS_BY_ID = Object.fromEntries(OUTLETS.map((x) => [x.id, x]));

// Patrones conservadores para atribuir a la agencia una pieza republicada:
// firma al inicio de la entradilla ("LONDON (Reuters) -", "(AP) —",
// "Madrid, 3 nov (EFE).-") o crédito explícito al final.
export const AGENCY_PATTERNS = [
  { id: "reuters", re: /\(Reuters\)|^Reuters\b|[-–—]\s*Reuters\s*$/i },
  { id: "ap", re: /\(AP\)\s*[-–—]|^AP\s*[-–—]/ },
  { id: "afp", re: /\(AFP\)|^AFP\b|[-–—]\s*AFP\s*$/ },
  { id: "efe", re: /\(EFE\)|^EFE\b|[-–—]\s*EFE\s*$/ },
  { id: "bloomberg", re: /\(Bloomberg\)|^Bloomberg\s*[-–—]/ },
];
