import { ensureGeoRiskMarketSchema } from "./georisk-market-schema.js";
// Free official macro series: ECB, Eurostat and BLS CPI distributed by FRED.
// Keep raw observations separate from GeoRisk scenario assumptions.
export const MACRO_SERIES = [
  { id: "ECB_DEPOSIT_RATE", label: "Tipo de depósito del BCE", region: "eu", provider: "ECB", unit: "% anual", frequency: "daily", source_url: "https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV", endpoint: "ecb", dataset: "FM", key: "D.U2.EUR.4F.KR.DFR.LEV" },
  { id: "ECB_10Y_YIELD", label: "Deuda pública a 10 años · zona euro", region: "eu", provider: "ECB", unit: "% anual", frequency: "daily", source_url: "https://data.ecb.europa.eu/data/datasets/YC/YC.B.U2.EUR.4F.G_N_C.SV_C_YM.PY_10Y", endpoint: "ecb", dataset: "YC", key: "B.U2.EUR.4F.G_N_C.SV_C_YM.PY_10Y" },
  { id: "EU_HICP", label: "Inflación armonizada · eurozona", region: "eu", provider: "Eurostat", unit: "% interanual", frequency: "monthly", source_url: "https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table?lang=en", endpoint: "eurostat" },
  { id: "US_CPI", label: "Inflación de precios al consumo · EE. UU.", region: "usa", provider: "FRED", original_provider: "BLS", unit: "% interanual", frequency: "monthly", source_url: "https://fred.stlouisfed.org/series/CPIAUCNS", endpoint: "fred", derived: true, key: "CPIAUCNS", seasonal_adjustment: "none" },
];

const ECB_BASE = "https://data-api.ecb.europa.eu/service/data";
const FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr";
const YEARS = 10;

function rowsFromCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(value => value.replace(/^"|"$/g, ""));
  const dateIndex = headers.indexOf("TIME_PERIOD"), valueIndex = headers.indexOf("OBS_VALUE");
  if (dateIndex < 0 || valueIndex < 0) throw new Error("Formato CSV inesperado del BCE");
  return lines.flatMap(line => {
    const cells = line.split(",").map(value => value.replace(/^"|"$/g, ""));
    if (!cells[valueIndex]?.trim()) return [];
    const value = Number(cells[valueIndex]);
    return /^\d{4}-\d{2}-\d{2}$/.test(cells[dateIndex]) && Number.isFinite(value)
      ? [{ date: cells[dateIndex], value }] : [];
  });
}

export function calculateYearOverYearCpi(monthlyRows) {
  const byPeriod = new Map(monthlyRows.map(row => [row.year + "-" + row.period, Number(row.value)]));
  return monthlyRows.flatMap(row => {
    if (!/^M(0[1-9]|1[0-2])$/.test(row.period)) return [];
    const month = row.period.slice(1);
    const previous = byPeriod.get((Number(row.year) - 1) + "-" + row.period);
    const current = Number(row.value);
    if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) return [];
    return [{ date: row.year + "-" + month + "-01", value: Math.round((current / previous - 1) * 100 * 1e6) / 1e6 }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchEcb(item, fetchImpl, start) {
  const url = `${ECB_BASE}/${item.dataset}/${item.key}?startPeriod=${start}&format=csvdata`;
  const response = await fetchImpl(url, { headers: { Accept: "text/csv" }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`ECB HTTP ${response.status} (${item.id})`);
  return rowsFromCsv(await response.text());
}

async function fetchEurostatHicp(fetchImpl) {
  const params = new URLSearchParams({ lang: "en", format: "JSON", freq: "M", unit: "RCH_A",
    coicop18: "TOTAL", geo: "EA", lastTimePeriod: "120" });
  const response = await fetchImpl(EUROSTAT_BASE + "?" + params.toString(), { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Eurostat HTTP ${response.status}`);
  const body = await response.json();
  const timeIndex = body.dimension?.time?.category?.index;
  if (!timeIndex || !body.value) throw new Error("Formato JSON-stat inesperado de Eurostat");
  return Object.entries(timeIndex).flatMap(([period, position]) => {
    const raw = Array.isArray(body.value) ? body.value[position] : body.value[position];
    if (raw === null || raw === undefined || raw === "") return [];
    const value = Number(raw);
    return /^\d{4}-\d{2}$/.test(period) && Number.isFinite(value)
      ? [{ date: period + "-01", value }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function parseFredCpiCsv(csv, seriesKey = "CPIAUCNS", now = new Date()) {
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const cells = line => line.split(",").map(value => value.trim().replace(/^"|"$/g, ""));
  const headers = cells(lines.shift());
  const dateIndex = headers.findIndex(header => ["observation_date", "DATE"].includes(header));
  const valueIndex = headers.indexOf(seriesKey);
  if (dateIndex < 0 || valueIndex < 0) throw new Error("Formato CSV inesperado de FRED");
  const seen = new Set(), lastDate = now.toISOString().slice(0, 10);
  const rows = lines.flatMap(line => {
    if (!line.trim()) return [];
    const fields = cells(line), date = fields[dateIndex], raw = fields[valueIndex];
    if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(date) || date > lastDate) throw new Error("Fecha CPI inválida en FRED");
    if (seen.has(date)) throw new Error("Periodo CPI duplicado en FRED");
    seen.add(date);
    if (raw === "" || raw === ".") return [];
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) throw new Error("Valor CPI inválido en FRED");
    return [{ year: date.slice(0, 4), period: "M" + date.slice(5, 7), value }];
  });
  const start = `${now.getUTCFullYear() - YEARS}-01-01`;
  return calculateYearOverYearCpi(rows).filter(point => point.date >= start);
}

async function fetchFredCpi(item, fetchImpl, now) {
  // Download an extra year to calculate ten years of year-over-year rates.
  const params = new URLSearchParams({ id: item.key, cosd: `${now.getUTCFullYear() - YEARS - 1}-01-01` });
  const response = await fetchImpl(FRED_CSV + "?" + params, { headers: { Accept: "text/csv" }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`FRED HTTP ${response.status}`);
  return parseFredCpiCsv(await response.text(), item.key, now);
}

export async function fetchGeoRiskMacroSeries(fetchImpl = fetch, now = new Date()) {
  const start = `${now.getUTCFullYear() - YEARS}-01-01`;
  const results = await Promise.all(MACRO_SERIES.map(async item => {
    try {
      const points = item.endpoint === "fred" ? await fetchFredCpi(item, fetchImpl, now) : item.endpoint === "eurostat" ? await fetchEurostatHicp(fetchImpl) : await fetchEcb(item, fetchImpl, start);
      points.sort((a, b) => a.date.localeCompare(b.date));
      const latest = points.at(-1) || null;
      return { ...item, points, latest, status: latest ? "available" : "unavailable" };
    } catch (error) {
      return { ...item, points: [], latest: null, status: "unavailable", error: String(error.message || error) };
    }
  }));
  return { provider: "BCE, Eurostat y FRED (IPC original de BLS)", fetched_at: now.toISOString(), history_years: YEARS, series: results };
}

export async function storeGeoRiskMacroSeries(db, result, now = new Date()) {
  if (!db) throw new Error("D1 archive binding unavailable");
  await ensureGeoRiskMarketSchema(db);
  const collectedAt = now.toISOString();
  let newObservations = 0, revisions = 0;
  for (const item of result.series) {
    if (item.status !== "available") continue;
    const existing = await db.prepare("SELECT observation_date,value FROM georisk_market_observations WHERE provider=? AND series_id=?")
      .bind(item.provider, item.id).all();
    const byDate = new Map((existing.results || []).map(row => [row.observation_date, Number(row.value)]));
    const inserts = [], updates = [];
    for (const point of item.points) {
      const old = byDate.get(point.date);
      if (old === undefined) newObservations++;
      else if (old !== point.value) updates.push({ provider: item.provider, series_id: item.id, observation_date: point.date,
        previous_value: old, revised_value: point.value, detected_at: collectedAt, source_url: item.source_url });
      inserts.push({ provider: item.provider, series_id: item.id, observation_date: point.date, value: point.value,
        unit: item.unit, source_url: item.source_url, is_derived: item.derived ? 1 : 0, first_collected_at: collectedAt });
    }
    revisions += updates.length;
    for (let offset = 0; offset < inserts.length; offset += 500) {
      const obs = inserts.slice(offset, offset + 500);
      const rev = updates.slice(offset, offset + 500);
      const statements = [];
      if (rev.length) statements.push(db.prepare(
        "INSERT INTO georisk_market_revisions (provider,series_id,observation_date,previous_value,revised_value,detected_at,source_url) " +
        "SELECT json_extract(incoming.value,'$.provider'),json_extract(incoming.value,'$.series_id'),json_extract(incoming.value,'$.observation_date'),json_extract(incoming.value,'$.previous_value'),json_extract(incoming.value,'$.revised_value'),json_extract(incoming.value,'$.detected_at'),json_extract(incoming.value,'$.source_url') FROM json_each(?) AS incoming " +
        "WHERE EXISTS (SELECT 1 FROM georisk_market_observations current WHERE current.provider=json_extract(incoming.value,'$.provider') AND current.series_id=json_extract(incoming.value,'$.series_id') AND current.observation_date=json_extract(incoming.value,'$.observation_date') AND current.value=json_extract(incoming.value,'$.previous_value'))"
      ).bind(JSON.stringify(rev)));
      statements.push(db.prepare(
        "INSERT INTO georisk_market_observations (provider,series_id,observation_date,value,unit,source_url,is_derived,first_collected_at) " +
        "SELECT json_extract(incoming.value,'$.provider'),json_extract(incoming.value,'$.series_id'),json_extract(incoming.value,'$.observation_date'),json_extract(incoming.value,'$.value'),json_extract(incoming.value,'$.unit'),json_extract(incoming.value,'$.source_url'),json_extract(incoming.value,'$.is_derived'),json_extract(incoming.value,'$.first_collected_at') FROM json_each(?) AS incoming WHERE true " +
        "ON CONFLICT(provider,series_id,observation_date) DO UPDATE SET value=excluded.value,unit=excluded.unit,is_derived=excluded.is_derived,last_revised_at=CASE WHEN georisk_market_observations.value<>excluded.value THEN excluded.first_collected_at ELSE georisk_market_observations.last_revised_at END WHERE georisk_market_observations.value<>excluded.value OR georisk_market_observations.unit<>excluded.unit OR georisk_market_observations.is_derived<>excluded.is_derived"
      ).bind(JSON.stringify(obs)));
      await db.batch(statements);
    }
  }
  const detail = { observations_processed: result.series.reduce((sum, item) => sum + item.points.length, 0), new_observations: newObservations, revisions_detected: revisions };
  await db.prepare("INSERT INTO georisk_market_collection_runs (provider,started_at,completed_at,status,new_observations,revisions_detected,detail_json) VALUES ('BCE+Eurostat+FRED',?,?,'success',?,?,?)")
    .bind(collectedAt, collectedAt, newObservations, revisions, JSON.stringify(detail)).run();
  return { status: "success", ...detail };
}

export async function handleGeoRiskMacroData(request, env, fetchImpl = fetch) {
  try {
    const result = await fetchGeoRiskMacroSeries(fetchImpl);
    let archive;
    try { archive = await storeGeoRiskMacroSeries(env.DB, result); }
    catch (error) { archive = { status: "unavailable", message: "No se pudo guardar esta consulta en el histórico." }; }
    return new Response(JSON.stringify({ ...result, archive }), { headers: {
      "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=1800" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "No se pudieron consultar las fuentes macroeconómicas.", detail: String(error.message || error) }), { status: 502, headers: {
      "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
  }
}
