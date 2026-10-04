import { ensureGeoRiskMarketSchema } from "./georisk-market-schema.js";

export const GPR_PROVIDER = "Caldara-Iacoviello GPR";
export const GPR_ASSET_PATH = "/data/georisk-gpr.json";
const json = (body, status = 200, ttl = 3600) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*",
    "Cache-Control": status === 200 ? "public, max-age=" + ttl : "no-store" },
});

export function validateGprDataset(data, now = new Date()) {
  if (data?.schema_version !== 1 || data.provider !== GPR_PROVIDER || !Array.isArray(data.series) || !data.series.length)
    throw new Error("Unexpected GPR data asset");
  const captured = Date.parse(data.source_captured_at);
  if (!Number.isFinite(captured) || captured > now.getTime() + 300000) throw new Error("Invalid GPR capture date");
  const today = now.toISOString().slice(0, 10), ids = new Set();
  const series = data.series.map(item => {
    if (!/^(GPR|GPRT|GPRA|GPRD|GPRD_THREAT|GPRD_ACT|GPRC_[A-Z]{3})$/.test(item.id) || ids.has(item.id))
      throw new Error("Invalid or duplicate GPR series");
    ids.add(item.id);
    if (!["daily", "monthly"].includes(item.frequency) || !Array.isArray(item.points) || !item.points.length)
      throw new Error("GPR series has no valid history");
    let previous = "";
    for (const point of item.points) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date) || !Number.isFinite(Date.parse(point.date)) || new Date(point.date).toISOString().slice(0, 10) !== point.date || point.date <= previous || point.date > today ||
          typeof point.value !== "number" || !Number.isFinite(point.value) || point.value < 0)
        throw new Error("Invalid GPR observation");
      previous = point.date;
    }
    const latest = item.points.at(-1), age = now.getTime() - Date.parse(latest.date);
    const stale = age > (item.frequency === "daily" ? 14 : 75) * 86400000;
    return { ...item, latest, status: stale ? "stale" : "available" };
  });
  if (!["GPR", "GPRT", "GPRA", "GPRD"].every(id => ids.has(id))) throw new Error("Missing GPR reference series");
  return { ...data, series, collection_stale: now.getTime() - captured > 10 * 86400000 };
}

async function readGprDataset(env, requestUrl, now = new Date()) {
  const response = await env.ASSETS.fetch(new Request(new URL(GPR_ASSET_PATH, requestUrl)));
  if (!response.ok) throw new Error("GPR source asset unavailable");
  return validateGprDataset(await response.json(), now);
}

export async function archiveGprDataset(db, data, now = new Date()) {
  await ensureGeoRiskMarketSchema(db);
  const capturedAt = now.toISOString();
  const old = await db.prepare("SELECT series_id,observation_date,value FROM georisk_market_observations WHERE provider=?")
    .bind(GPR_PROVIDER).all();
  const existing = new Map((old.results || []).map(row => [row.series_id + "|" + row.observation_date, Number(row.value)]));
  const changes = [], revisions = [];
  for (const item of data.series) for (const point of item.points) {
    const previous = existing.get(item.id + "|" + point.date);
    if (previous === point.value) continue;
    changes.push({ provider: GPR_PROVIDER, series_id: item.id, observation_date: point.date, value: point.value,
      unit: item.unit, source_url: data.source_url, is_derived: 0, first_collected_at: capturedAt });
    if (previous !== undefined) revisions.push({ provider: GPR_PROVIDER, series_id: item.id, observation_date: point.date,
      previous_value: previous, revised_value: point.value, detected_at: capturedAt, source_url: data.source_url });
  }
  // One bound JSON array per statement; keep initial backfill within D1 query limits.
  const revisedByKey = new Map(revisions.map(row => [row.series_id + "|" + row.observation_date, row]));
  for (let offset = 0; offset < changes.length; offset += 500) {
    const chunk = changes.slice(offset, offset + 500), batch = [];
    const revised = chunk.map(row => revisedByKey.get(row.series_id + "|" + row.observation_date)).filter(Boolean);
    if (revised.length) batch.push(db.prepare("INSERT INTO georisk_market_revisions (provider,series_id,observation_date,previous_value,revised_value,detected_at,source_url) " +
      "SELECT json_extract(incoming.value,'$.provider'),json_extract(incoming.value,'$.series_id'),json_extract(incoming.value,'$.observation_date'),json_extract(incoming.value,'$.previous_value'),json_extract(incoming.value,'$.revised_value'),json_extract(incoming.value,'$.detected_at'),json_extract(incoming.value,'$.source_url') FROM json_each(?) AS incoming WHERE EXISTS (SELECT 1 FROM georisk_market_observations current WHERE current.provider=json_extract(incoming.value,'$.provider') AND current.series_id=json_extract(incoming.value,'$.series_id') AND current.observation_date=json_extract(incoming.value,'$.observation_date') AND current.value=json_extract(incoming.value,'$.previous_value'))")
      .bind(JSON.stringify(revised)));
    batch.push(db.prepare("INSERT INTO georisk_market_observations (provider,series_id,observation_date,value,unit,source_url,is_derived,first_collected_at) " +
      "SELECT json_extract(value,'$.provider'),json_extract(value,'$.series_id'),json_extract(value,'$.observation_date'),json_extract(value,'$.value'),json_extract(value,'$.unit'),json_extract(value,'$.source_url'),json_extract(value,'$.is_derived'),json_extract(value,'$.first_collected_at') FROM json_each(?) WHERE true " +
      "ON CONFLICT(provider,series_id,observation_date) DO UPDATE SET value=excluded.value,last_revised_at=excluded.first_collected_at WHERE georisk_market_observations.value<>excluded.value")
      .bind(JSON.stringify(chunk)));
    // Revision and replacement are atomic; retries cannot duplicate revisions.
    await db.batch(batch);
  }
  const detail = { source_captured_at: data.source_captured_at, source_files: data.source_files,
    new_observations: changes.length - revisions.length, revisions_detected: revisions.length };
  await db.prepare("INSERT INTO georisk_market_collection_runs (provider,started_at,completed_at,status,new_observations,revisions_detected,detail_json) VALUES (?,?,?,'success',?,?,?)")
    .bind(GPR_PROVIDER, capturedAt, capturedAt, detail.new_observations, detail.revisions_detected, JSON.stringify(detail)).run();
  return { status: "success", ...detail };
}

export async function collectGprHistory(env) {
  const data = await readGprDataset(env, "https://zenithrisecapital.com");
  return archiveGprDataset(env.DB, data);
}

export async function handleGeoRiskGpr(request, env, ctx) {
  const cache = globalThis.caches?.default;
  const cacheKey = new Request(new URL("/api/georisk-gpr-data?v=1", request.url));
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;
  try {
    const data = await readGprDataset(env, request.url);
    let archive;
    try { archive = await archiveGprDataset(env.DB, data); }
    catch (error) { console.error("GPR archive failed:", error.message); archive = { status: "unavailable" }; }
    const response = json({ ...data, archive });
    // Only cache a successful archive so a temporary D1 failure is retried.
    if (cache && archive.status === "success") ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("GPR data failed:", error.message);
    return json({ error: "La referencia GPR no está disponible. No se muestran valores simulados." }, 503);
  }
}

export async function handleGprHistory(request, env) {
  const id = new URL(request.url).searchParams.get("series");
  if (!/^(GPR|GPRT|GPRA|GPRD|GPRD_THREAT|GPRD_ACT|GPRC_[A-Z]{3})$/.test(id || "")) return json({ error: "Elige una serie GPR válida." }, 400);
  try {
    await ensureGeoRiskMarketSchema(env.DB);
    const result = await env.DB.prepare("SELECT observation_date AS date,value,unit,source_url,first_collected_at,last_revised_at FROM georisk_market_observations WHERE provider=? AND series_id=? ORDER BY observation_date")
      .bind(GPR_PROVIDER, id).all();
    return json({ provider: GPR_PROVIDER, series: id, points: result.results || [] }, 200, 300);
  } catch { return json({ error: "El archivo GPR aún no está disponible." }, 503); }
}
