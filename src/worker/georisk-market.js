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

export async function handleGeoRiskMarket(request, ctx) {
  // Canonical cache key avoids cache fragmentation from arbitrary query strings.
  const cacheKey = new Request(new URL("/api/georisk-market-data", request.url), { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const response = await fetch(ECB_HISTORY_URL, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`ECB HTTP ${response.status}`);
    const fetchedAt = new Date();
    const series = parseECBHistory(await response.text(), fetchedAt);
    const result = new Response(JSON.stringify({
      provider: "Banco Central Europeo", source_url: ECB_SOURCE_URL,
      frequency: "daily_business_days", fetched_at: fetchedAt.toISOString(),
      history_years: 5, series,
    }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    ctx.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  } catch (error) {
    console.error("GeoRisk ECB data unavailable:", error.message);
    return new Response(JSON.stringify({ error: "No se pudo consultar el BCE. Reintenta más tarde; no se han sustituido los datos por cifras de ejemplo." }), {
      status: 502, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
