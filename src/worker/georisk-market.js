// Official ECB daily reference rates. No API key or paid subscription.
export const ECB_HISTORY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml";
export const ECB_SOURCE_URL = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";

export function parseECBHistory(xml, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
  const start = cutoff.toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const definitions = [
    ["EURUSD", "EUR/USD", "USD por 1 EUR", false],
    ["EURGBP", "EUR/GBP", "GBP por 1 EUR", false],
    ["EURCNY", "EUR/CNY", "CNY por 1 EUR", false],
    ["USDCNY", "USD/CNY", "CNY por 1 USD", true],
  ];
  const series = definitions.map(([id, label, unit, derived]) => ({ id, label, unit, derived, points: [] }));
  const seen = new Set();
  for (const match of xml.matchAll(/<(?:\w+:)?Cube\b[^>]*\btime\s*=\s*['"](\d{4}-\d{2}-\d{2})['"][^>]*>([\s\S]*?)<\/(?:\w+:)?Cube>/g)) {
    const [, date, body] = match;
    if (date < start || date > end || seen.has(date)) continue;
    seen.add(date);
    const rates = {};
    for (const tag of body.matchAll(/<(?:\w+:)?Cube\b([^>]*?)\/?\s*>/g)) {
      const currency = tag[1].match(/\bcurrency\s*=\s*['"]([A-Z]{3})['"]/)?.[1];
      const raw = tag[1].match(/\brate\s*=\s*['"]([0-9.]+)['"]/)?.[1];
      const value = Number(raw);
      if (currency && raw && Number.isFinite(value) && value > 0) rates[currency] = value;
    }
    const values = [rates.USD, rates.GBP, rates.CNY, rates.USD && rates.CNY ? rates.CNY / rates.USD : undefined];
    values.forEach((value, i) => {
      if (Number.isFinite(value) && value > 0) series[i].points.push({ date, value });
    });
  }
  for (const item of series) {
    item.points.sort((a, b) => a.date.localeCompare(b.date));
    item.latest = item.points.at(-1) || null;
    item.stale = !item.latest || now.getTime() - Date.parse(item.latest.date) > 7 * 86400000;
    item.status = !item.latest ? "unavailable" : item.stale ? "stale" : "available";
  }
  if (!series.some(item => item.latest)) throw new Error("ECB response contains no valid observations");
  return series;
}


export function compareECBArchive(series, currentBySeries) {
  const observations = [], revisions = [];
  for (const item of series) {
    const current = currentBySeries.get(item.id) || new Map();
    for (const point of item.points) {
      const oldValue = current.get(point.date);
      if (oldValue === undefined) observations.push({ series: item, point });
      else if (oldValue !== point.value) revisions.push({ series: item, point, oldValue });
    }
  }
  return { observations, revisions };
}

export async function storeECBHistory(db, series, fetchedAt = new Date()) {
  if (!db) throw new Error("D1 archive binding is unavailable");
  const collectedAt = fetchedAt.toISOString();
  const currentBySeries = new Map();
  for (const item of series) {
    const result = await db.prepare("SELECT observation_date, value FROM georisk_market_observations WHERE provider = 'ECB' AND series_id = ? AND observation_date >= ?")
      .bind(item.id, item.points[0]?.date || "9999-12-31").all();
    currentBySeries.set(item.id, new Map((result.results || []).map(row => [row.observation_date, Number(row.value)])));
  }
  const { observations, revisions } = compareECBArchive(series, currentBySeries);
  const changes = [...observations, ...revisions];
  // D1 limits bound parameters per statement. JSON1 lets each bulk insert use
  // one parameter while keeping the backfill to a small number of queries.
  for (let offset = 0; offset < changes.length; offset += 100) {
    const chunk = changes.slice(offset, offset + 100);
    const revised = chunk.filter(record => Object.hasOwn(record, "oldValue")).map(({ series: item, point, oldValue }) => ({
      provider: "ECB", series_id: item.id, observation_date: point.date, previous_value: oldValue,
      revised_value: point.value, detected_at: collectedAt, source_url: ECB_SOURCE_URL,
    }));
    const observations = chunk.map(({ series: item, point }) => ({
      provider: "ECB", series_id: item.id, observation_date: point.date, value: point.value,
      unit: item.unit, source_url: ECB_SOURCE_URL, is_derived: item.derived ? 1 : 0,
      first_collected_at: collectedAt,
    }));
    const statements = [];
    if (revised.length) statements.push(db.prepare(
      "INSERT INTO georisk_market_revisions (provider,series_id,observation_date,previous_value,revised_value,detected_at,source_url) " +
      "SELECT json_extract(value,'$.provider'),json_extract(value,'$.series_id'),json_extract(value,'$.observation_date'),json_extract(value,'$.previous_value'),json_extract(value,'$.revised_value'),json_extract(value,'$.detected_at'),json_extract(value,'$.source_url') FROM json_each(?)"
    ).bind(JSON.stringify(revised)));
    statements.push(db.prepare(
      "INSERT INTO georisk_market_observations (provider,series_id,observation_date,value,unit,source_url,is_derived,first_collected_at) " +
      "SELECT json_extract(value,'$.provider'),json_extract(value,'$.series_id'),json_extract(value,'$.observation_date'),json_extract(value,'$.value'),json_extract(value,'$.unit'),json_extract(value,'$.source_url'),json_extract(value,'$.is_derived'),json_extract(value,'$.first_collected_at') FROM json_each(?) " +
      "WHERE true ON CONFLICT(provider,series_id,observation_date) DO UPDATE SET value=excluded.value,unit=excluded.unit,is_derived=excluded.is_derived,last_revised_at=excluded.first_collected_at WHERE georisk_market_observations.value<>excluded.value"
    ).bind(JSON.stringify(observations)));
    await db.batch(statements);
  }
  const rows = await db.prepare("SELECT series_id,COUNT(*) AS count,MIN(observation_date) AS first_date,MAX(observation_date) AS latest_date FROM georisk_market_observations WHERE provider='ECB' GROUP BY series_id").all();
  const archive = { provider: "ECB", collected_at: collectedAt, new_observations: observations.length,
    revisions_detected: revisions.length, series: rows.results || [] };
  await db.prepare("INSERT INTO georisk_market_collection_runs (provider,started_at,completed_at,status,new_observations,revisions_detected,detail_json) VALUES ('ECB',?,?,'success',?,?,?)")
    .bind(collectedAt, collectedAt, observations.length, revisions.length, JSON.stringify(archive)).run();
  return archive;
}

export async function getECBArchiveHistory(db, request) {
  const url = new URL(request.url), seriesId = url.searchParams.get("series");
  if (!["EURUSD","EURGBP","EURCNY","USDCNY"].includes(seriesId))
    return archiveJson({ error: "Selecciona una serie válida: EURUSD, EURGBP, EURCNY o USDCNY." }, 400);
  if (!db) return archiveJson({ error: "El archivo histórico aún no está disponible." }, 503);
  const limit = Math.min(20000, Math.max(1, Number(url.searchParams.get("limit")) || 10000));
  const query = await db.prepare("SELECT observation_date AS date,value,unit,is_derived,first_collected_at FROM georisk_market_observations WHERE provider='ECB' AND series_id=? ORDER BY observation_date ASC LIMIT ?")
    .bind(seriesId, limit).all();
  const points = query.results || [];
  return archiveJson({ provider: "Banco Central Europeo", source_url: ECB_SOURCE_URL, series: seriesId,
    frequency: "daily_business_days", points, oldest: points[0]?.date || null, latest: points.at(-1)?.date || null },
  200, { "Cache-Control": "public, max-age=300" });
}

export async function collectECBMarketHistory(db, fetchImpl = fetch, now = new Date()) {
  try {
    const response = await fetchImpl(ECB_HISTORY_URL, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("ECB HTTP " + response.status);
    const series = parseECBHistory(await response.text(), now);
    return await storeECBHistory(db, series, now);
  } catch (error) {
    console.error("Daily GeoRisk history collection failed:", error.message);
    try {
      if (db) await db.prepare("INSERT INTO georisk_market_collection_runs (provider,started_at,completed_at,status,error_message) VALUES ('ECB',?,?,'failed',?)")
        .bind(now.toISOString(), now.toISOString(), String(error.message || error).slice(0, 500)).run();
    } catch (recordError) { console.error("Could not record collection failure:", recordError.message); }
    return { status: "failed", error: String(error.message || error) };
  }
}

function archiveJson(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", ...extraHeaders,
  } });
}

export async function handleGeoRiskMarket(request, env, ctx) {
  // Canonical cache key avoids cache fragmentation from arbitrary query strings.
  const cacheKey = new Request(new URL("/api/georisk-market-data?archive-v=1", request.url), { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    // Older cached entries may predate CORS support; deployments do not clear Cache API.
    const result = new Response(cached.body, cached);
    result.headers.set("Access-Control-Allow-Origin", "*");
    return result;
  }
  try {
    const response = await fetch(ECB_HISTORY_URL, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`ECB HTTP ${response.status}`);
    const fetchedAt = new Date();
    const series = parseECBHistory(await response.text(), fetchedAt);
    let archive;
    try { archive = await storeECBHistory(env.DB, series, fetchedAt); }
    catch (error) { console.error("GeoRisk ECB archive write failed:", error.message); archive = { status: "unavailable", message: "No se pudo guardar esta consulta en el histórico." }; }
    const result = new Response(JSON.stringify({
      provider: "Banco Central Europeo", source_url: ECB_SOURCE_URL,
      frequency: "daily_business_days", fetched_at: fetchedAt.toISOString(),
      history_years: 5, series, archive,
    }), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } });
    ctx.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  } catch (error) {
    console.error("GeoRisk ECB data unavailable:", error.message);
    return archiveJson({ error: "No se pudo consultar el BCE. Reintenta más tarde; no se han sustituido los datos por cifras de ejemplo." }, 502, { "Cache-Control": "no-store" });
  }
}
