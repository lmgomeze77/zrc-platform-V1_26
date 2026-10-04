import { useEffect, useId, useMemo, useState } from "react";

const endpoint = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-gpr-data";
const control = { background: "#101f30", color: "#E2E8F0", border: "1px solid #475569", borderRadius: 6, padding: "8px 12px" };
const style = { marginTop: 18, padding: 20, color: "#CBD5E1", background: "#0d1826", border: "1px solid #334155", borderRadius: 12 };
const englishLabels = { GPR: "Global geopolitical risk", GPRT: "Threats", GPRA: "Acts", GPRD: "Daily geopolitical risk", GPRD_THREAT: "Daily threats", GPRD_ACT: "Daily acts" };
const csvCell = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';

export default function GeoRiskGprData({ lang = "es" }) {
  const es = lang === "es", chartId = useId();
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("GPR"), [months, setMonths] = useState(12), [attempt, setAttempt] = useState(0);
  const [archiveBusy, setArchiveBusy] = useState(false), [downloadError, setDownloadError] = useState("");
  const fmt = value => new Intl.NumberFormat(es ? "es-ES" : "en-GB", { maximumFractionDigits: 2 }).format(value);
  const date = value => new Date(value + "T12:00:00Z").toLocaleDateString(es ? "es-ES" : "en-GB");
  const label = item => es ? item.label : englishLabels[item.id] || item.country;
  const unit = item => item.country ? (es ? "% de artículos" : "% of articles") : (es ? "índice · media histórica = 100" : "index · historical average = 100");
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setLoading(true); setError("");
    fetch(endpoint, { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "GPR unavailable");
      if (active) setData(result);
    }).catch(err => { if (active) { setData(null); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);
  const series = data?.series.find(item => item.id === selected);
  const points = useMemo(() => {
    if (!series) return [];
    const cutoff = new Date(series.latest.date + "T00:00:00Z"); cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    return series.points.filter(point => point.date >= cutoff.toISOString().slice(0, 10));
  }, [series, months]);
  const max = Math.max(1, ...points.map(point => point.value));
  const first = points[0]?.date, last = points.at(-1)?.date;
  const span = Date.parse(last) - Date.parse(first) || 1;
  const segments = [];
  for (const point of points) {
    const current = segments.at(-1), previous = current?.at(-1);
    if (!previous || Date.parse(point.date) - Date.parse(previous.date) > (series.frequency === "daily" ? 1 : 32) * 86400000) segments.push([point]);
    else current.push(point);
  }
  const paths = segments.map(segment => segment.map(point => (50 + (Date.parse(point.date) - Date.parse(first)) / span * 800) + "," + (185 - point.value / max * 155)).join(" "));
  function download(rows, archived = false) {
    const csv = ["date,value,series,unit,provider,source_url,latest_source_snapshot_captured_at,first_collected_at,last_revised_at",
      ...rows.map(point => [point.date, point.value, series.id, series.unit, data.provider, data.source_url, data.source_captured_at,
        point.first_collected_at || "", point.last_revised_at || ""].map(csvCell).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "georisk-" + series.id + (archived ? "-archivo-zrc" : "-fuente") + ".csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function downloadArchive() {
    setArchiveBusy(true); setDownloadError("");
    try {
      const response = await fetch(endpoint + "/history?series=" + encodeURIComponent(selected));
      const result = await response.json();
      if (!response.ok || !result.points?.length) throw new Error(result.error || (es ? "El archivo aún no tiene observaciones." : "The archive has no observations yet."));
      download(result.points, true);
    } catch (err) { setDownloadError(err.message); }
    finally { setArchiveBusy(false); }
  }
  return <section style={style} aria-labelledby={chartId + "-heading"}>
    <h2 id={chartId + "-heading"} style={{ fontSize: 20, margin: "0 0 8px" }}>{es ? "Riesgo geopolítico en la prensa · GPR" : "Geopolitical risk in the press · GPR"}</h2>
    <p style={{ fontSize: 13, lineHeight: 1.7 }}>{es
      ? "El GPR de Caldara e Iacoviello cuenta la cobertura de amenazas y acontecimientos geopolíticos en diez periódicos. Nos da una referencia externa para contextualizar los escenarios ZRC y preparar su validación."
      : "The Caldara–Iacoviello GPR tracks press coverage of geopolitical threats and events in ten newspapers. It provides an external reference for ZRC scenarios and future model validation."}</p>
    <p style={{ fontSize: 12, lineHeight: 1.7 }}>{es
      ? "En el índice global, 100 es la media de 1985–2019; 150 equivale a 1,5 veces ese nivel de referencia. No es una probabilidad del 150 %. Las series país usan otra unidad: el porcentaje de artículos que mencionan riesgo asociado a ese país."
      : "For the global index, 100 is the 1985–2019 average; 150 is 1.5 times that reference level. It is not a 150% probability. Country series use a different unit: the percentage of articles mentioning risk associated with that country."}</p>
    {loading && <p role="status">{es ? "Cargando la referencia GPR…" : "Loading GPR…"}</p>}
    {error && <div role="alert"><p>{error}</p><button style={control} onClick={() => setAttempt(x => x + 1)}>{es ? "Reintentar" : "Retry"}</button></div>}
    {data && <>
      {(data.collection_stale || series?.status === "stale") && <p role="status" style={{ color: "#FBBF24" }}>{es ? "La referencia o su captura tienen retraso. Comprueba la fecha antes de interpretarla como actual." : "The reference or its capture is delayed. Check the date before treating it as current."}</p>}
      {data.archive?.status === "unavailable" && <p style={{ color: "#FBBF24", fontSize: 12 }}>{es ? "Los datos de la fuente están disponibles; su copia en el archivo ZRC está temporalmente pendiente." : "Source data is available; the ZRC archive copy is temporarily pending."}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 10 }}>
        {data.series.filter(item => ["GPR", "GPRT", "GPRA", "GPRD"].includes(item.id)).map(item => <article key={item.id} style={{ ...control, padding: 14 }}>
          <div style={{ fontSize: 12 }}>{label(item)}</div><strong style={{ fontSize: 25 }}>{fmt(item.latest.value)}</strong>
          <div style={{ fontSize: 11 }}>{item.frequency === "monthly" ? (es ? "Mes: " : "Month: ") + item.latest.date.slice(0, 7) : date(item.latest.date)}</div>
        </article>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 16 }}>
        <label>{es ? "Serie " : "Series "}<select style={control} value={selected} onChange={event => { setSelected(event.target.value); setDownloadError(""); }}>{data.series.map(item => <option key={item.id} value={item.id}>{label(item)} · {item.frequency === "daily" ? (es ? "diaria" : "daily") : (es ? "mensual" : "monthly")}</option>)}</select></label>
        <label>{es ? "Periodo " : "Period "}<select style={control} value={months} onChange={event => setMonths(Number(event.target.value))}><option value={12}>{es ? "1 año" : "1 year"}</option><option value={60}>{es ? "5 años" : "5 years"}</option><option value={120}>{es ? "10 años (mensual)" : "10 years (monthly)"}</option></select></label>
        <button style={control} disabled={!series} onClick={() => download(series.points)}>{es ? "Descargar serie CSV" : "Download CSV series"}</button>
        <button style={control} disabled={archiveBusy || data.archive?.status !== "success"} onClick={downloadArchive}>{archiveBusy ? "…" : (es ? "Descargar archivo ZRC" : "Download ZRC archive")}</button>
      </div>
      {downloadError && <p role="alert" style={{ color: "#FBBF24" }}>{downloadError}</p>}
      {series && <>
        <p style={{ fontSize: 12 }}>{label(series)} · {unit(series)} · {es ? "último dato: " : "latest observation: "}{series.frequency === "monthly" ? series.latest.date.slice(0, 7) : date(series.latest.date)}</p>
        {points.length > 1 && <figure style={{ margin: 0 }}>
          <svg viewBox="0 0 900 225" role="img" aria-labelledby={chartId + "-title " + chartId + "-desc"} style={{ width: "100%", display: "block" }}>
            <title id={chartId + "-title"}>{label(series)}</title><desc id={chartId + "-desc"}>{unit(series)}. {first} — {last}. {es ? "Tabla alternativa debajo." : "Alternative table below."}</desc>
            {[0, 0.5, 1].map(fraction => <g key={fraction}><line x1="50" x2="850" y1={185 - fraction * 155} y2={185 - fraction * 155} stroke="#334155" /><text x="44" y={189 - fraction * 155} textAnchor="end" fill="#94A3B8" fontSize="11">{fmt(max * fraction)}</text></g>)}
            {paths.map((path, index) => <polyline key={index} points={path} fill="none" stroke="#60A5FA" strokeWidth="2" />)}
            <text x="50" y="215" fill="#94A3B8" fontSize="12">{first}</text><text x="850" y="215" textAnchor="end" fill="#94A3B8" fontSize="12">{last}</text>
          </svg>
          <figcaption style={{ fontSize: 11, color: "#94A3B8" }}>{es ? "Observaciones publicadas por los autores; sin datos simulados ni interpolación de huecos." : "Published source observations; no simulated data or gap interpolation."}</figcaption>
        </figure>}
        <details style={{ marginTop: 12 }}><summary>{es ? "Ver las últimas 12 observaciones" : "View the last 12 observations"}</summary><table style={{ width: "100%", marginTop: 10 }}><thead><tr><th scope="col" style={{ textAlign: "left" }}>{es ? "Fecha" : "Date"}</th><th scope="col" style={{ textAlign: "right" }}>{unit(series)}</th></tr></thead><tbody>{series.points.slice(-12).reverse().map(point => <tr key={point.date}><td>{series.frequency === "monthly" ? point.date.slice(0, 7) : date(point.date)}</td><td style={{ textAlign: "right" }}>{fmt(point.value)}</td></tr>)}</tbody></table></details>
      </>}
      <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7, marginTop: 16 }}>{es
        ? "Frecuencia: datos mensuales y datos diarios publicados normalmente cada lunes; pueden revisarse. La cobertura en prensa tiene sesgos y no mide por sí sola la probabilidad de un conflicto. Las puntuaciones ZRC aún no están calibradas frente al GPR. Amenazas y actos son índices separados y no se suman."
        : "Frequency: monthly data and daily observations normally released on Mondays; revisions are possible. Press coverage has biases and does not directly measure conflict probabilities. ZRC scores are not yet calibrated against GPR. Threats and acts are separate indices and must not be added."}</p>
      <p style={{ fontSize: 11, color: "#94A3B8" }}>Caldara &amp; Iacoviello (2022), <i>Measuring Geopolitical Risk</i>, AER 112(4):1194–1225. <a href={data.source_url} style={{ color: "#93C5FD" }} target="_blank" rel="noopener noreferrer">{es ? "Fuente y metodología" : "Source and methodology"}</a> · CC BY 4.0 · {es ? "Captura de la fuente: " : "Source captured: "}{new Date(data.source_captured_at).toLocaleString(es ? "es-ES" : "en-GB")}</p>
    </>}
  </section>;
}
