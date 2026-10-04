import { useEffect, useId, useMemo, useState } from "react";

const number = value => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 4 }).format(value);
const dateLabel = value => new Date(`${value}T12:00:00Z`).toLocaleDateString("es-ES");
const source = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";
const controlStyle = { background: "#101f30", color: "#E2E8F0", border: "1px solid #475569", borderRadius: 6, padding: "8px 12px", cursor: "pointer" };

export default function GeoRiskMarketData({ region }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState(region === "asia" ? "USDCNY" : "EURUSD");
  const [months, setMonths] = useState(12);
  const chartId = useId();
  useEffect(() => setSelected(region === "asia" ? "USDCNY" : "EURUSD"), [region]);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let active = true;
    setLoading(true);
    setError(null);
    fetch("https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-market-data", { signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "La fuente no está disponible.");
        if (!Array.isArray(result.series) || !result.series.length) throw new Error("La fuente no devolvió series válidas.");
        if (active) setData(result);
      })
      .catch(err => { if (active) { setData(null); setError(err.name === "AbortError" ? "La consulta tardó demasiado. Puedes reintentarlo." : err.message); } })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  const series = data?.series.find(item => item.id === selected);
  const points = useMemo(() => {
    if (!series?.latest) return [];
    const cutoff = new Date(`${series.latest.date}T00:00:00Z`);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    return series.points.filter(point => point.date >= cutoff.toISOString().slice(0, 10));
  }, [series, months]);
  const values = points.map(point => point.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const firstTime = points.length ? Date.parse(points[0].date) : 0;
  const lastTime = points.length ? Date.parse(points.at(-1).date) : 0;
  const path = points.map(point => `${50 + (Date.parse(point.date) - firstTime) / (lastTime - firstTime || 1) * 800},${190 - (point.value - min) / (max - min || 1) * 160}`).join(" ");
  const change = points.length > 1 ? (points.at(-1).value / points[0].value - 1) * 100 : null;
  const download = () => {
    const rows = ["date,value,pair,unit,source,derived", ...points.map(point => `${point.date},${point.value},${series.id},${series.unit},ECB,${series.derived}`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `georisk-${selected}-${months}m.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section style={{ background: "#0d1826", border: "1px solid #334155", borderRadius: 12, padding: 20, color: "#CBD5E1" }} aria-label="Datos reales de divisas">
      <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>Datos reales · Divisas</h2>
      <p style={{ fontSize: 13, lineHeight: 1.7 }}>Consulta cuánto vale una moneda frente a otra y cómo ha cambiado. Son referencias diarias publicadas por el Banco Central Europeo, habitualmente hacia las 16:00 CET en días hábiles. No son precios de ejecución en tiempo real.</p>
      <p style={{ fontSize: 12, lineHeight: 1.7 }}>Estos datos se pueden obtener gratuitamente en la <a href={source} target="_blank" rel="noopener noreferrer" style={{ color: "#93C5FD" }}>web del BCE</a>. Las simulaciones de las otras secciones siguen usando supuestos: el histórico todavía no recalibra el factor sectorial ni las estimaciones.</p>
      {loading && <p role="status">Consultando la fuente oficial…</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" style={controlStyle} onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>}
      {!loading && data && <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "16px 0" }}>
          <label>Par de monedas <select value={selected} onChange={event => setSelected(event.target.value)} style={controlStyle}>{data.series.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>Periodo <select value={months} onChange={event => setMonths(Number(event.target.value))} style={controlStyle}><option value={1}>1 mes</option><option value={3}>3 meses</option><option value={12}>1 año</option><option value={60}>5 años</option></select></label>
          <button type="button" style={controlStyle} onClick={download} disabled={!points.length}>Descargar datos CSV</button>
          <button type="button" style={controlStyle} onClick={() => setAttempt(value => value + 1)}>Consultar de nuevo</button>
        </div>
        {series?.latest ? <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, margin: "20px 0" }}>
            <div><div style={{ fontSize: 12 }}>Último dato publicado</div><strong style={{ fontSize: 28 }}>{number(series.latest.value)}</strong> <span>{series.unit}</span><div style={{ fontSize: 12 }}>Fecha del dato: {dateLabel(series.latest.date)}</div></div>
            <div><div style={{ fontSize: 12 }}>Cambio en el periodo</div><strong style={{ fontSize: 24 }}>{change == null ? "—" : `${change >= 0 ? "+" : ""}${number(change)}%`}</strong><div style={{ fontSize: 12 }}>{points.length} observaciones diarias</div></div>
          </div>
          {series.stale && <p role="status" style={{ color: "#FBBF24" }}>El último dato tiene más de 7 días. La fuente puede estar retrasada; revisa su fecha antes de usarlo.</p>}
          {series.derived && <p style={{ fontSize: 12 }}>USD/CNY es un cruce calculado: EUR/CNY dividido por EUR/USD de la misma fecha. No es el fixing oficial del banco central chino.</p>}
          {region === "usa" && <p style={{ fontSize: 12 }}>EUR/USD aporta contexto sobre el dólar. Esta serie no equivale al índice DXY del simulador.</p>}
          {points.length > 1 && <figure style={{ margin: 0 }}>
            <svg viewBox="0 0 900 235" role="img" aria-labelledby={chartId} style={{ width: "100%", maxHeight: 320 }}>
              <title id={chartId}>{series.label}: {points.length} observaciones entre {points[0].date} y {points.at(-1).date}. Mínimo {number(min)}, máximo {number(max)}.</title>
              <line x1="50" y1="190" x2="850" y2="190" stroke="#475569" />
              <polyline points={path} fill="none" stroke="#60A5FA" strokeWidth="2" />
              <text x="50" y="18" fill="#CBD5E1" fontSize="13">Máx. {number(max)}</text>
              <text x="50" y="210" fill="#CBD5E1" fontSize="13">Mín. {number(min)}</text>
              <text x="50" y="232" fill="#94A3B8" fontSize="12">{dateLabel(points[0].date)}</text>
              <text x="850" y="232" textAnchor="end" fill="#94A3B8" fontSize="12">{dateLabel(points.at(-1).date)}</text>
            </svg>
            <figcaption style={{ fontSize: 12 }}>Histórico observado. La línea une las publicaciones disponibles; no se inventan valores para festivos o días sin publicación. El eje vertical se ajusta al mínimo y máximo del periodo.</figcaption>
          </figure>}
          <details style={{ marginTop: 18 }}><summary style={{ cursor: "pointer" }}>Ver las últimas 10 observaciones</summary><table style={{ width: "100%", marginTop: 10 }}><thead><tr><th scope="col" style={{ textAlign: "left" }}>Fecha</th><th scope="col" style={{ textAlign: "right" }}>{series.unit}</th></tr></thead><tbody>{points.slice(-10).reverse().map(point => <tr key={point.date}><td>{dateLabel(point.date)}</td><td style={{ textAlign: "right" }}>{number(point.value)}</td></tr>)}</tbody></table></details>
        </> : <p>Esta serie no tiene observaciones disponibles. No se usa una cifra de ejemplo.</p>}
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 20 }}>Fuente: BCE · Consulta realizada: {new Date(data.fetched_at).toLocaleString("es-ES")} · La consulta se guarda hasta una hora para reducir peticiones. La fecha del dato es independiente de la fecha de consulta.</p>
      </>}
    </section>
  );
}
