import { useEffect, useState } from "react";

const endpoint = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-macro-data";
const historyEndpoint = "https://zenith-risecapital.lmgomeze77.workers.dev/api/georisk-macro-data/history";
const fmt = value => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);
const date = value => value ? new Date(value + "T12:00:00Z").toLocaleDateString("es-ES") : "—";
const control = { background: "#101f30", color: "#E2E8F0", border: "1px solid #475569", borderRadius: 6, padding: "8px 12px", cursor: "pointer" };

export default function GeoRiskMacroData() {
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0), [downloading, setDownloading] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(endpoint, { signal: controller.signal }).then(async response => {
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudieron cargar los datos.");
      setData(json);
    }).catch(err => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [attempt]);
  async function download(item) {
    setDownloading(item.id);
    try {
      const response = await fetch(historyEndpoint + "?series=" + encodeURIComponent(item.id) + "&limit=20000");
      const archived = await response.json();
      if (!response.ok) throw new Error(archived.error || "El histórico aún no está disponible.");
      if (!archived.points?.length) throw new Error("La captura diaria está preparando el histórico.");
      const csv = ["date,value,unit,provider,source_url,is_derived,first_collected_at,last_revised_at",
        ...archived.points.map(p => [p.date,p.value,p.unit,item.provider,item.source_url,p.is_derived ?? 0,p.first_collected_at || "",p.last_revised_at || ""].join(","))].join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      link.download = "georisk-" + item.id.toLowerCase() + "-historico.csv"; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (err) { setError(err.message); }
    finally { setDownloading(""); }
  }
  return <section style={{ marginTop: 18, padding: 20, color: "#CBD5E1", background: "#0d1826", border: "1px solid #334155", borderRadius: 12 }}>
    <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>Datos económicos observados</h2>
    <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 900 }}>Aquí ves cifras publicadas por fuentes oficiales. Sirven para dar contexto y construir un histórico propio; todavía no modifican automáticamente las puntuaciones ni las previsiones del modelo.</p>
    {loading && <p role="status">Consultando BCE y estadísticas de EE. UU.…</p>}
    {error && <div role="alert" style={{ color: "#FBBF24", fontSize: 13 }}>{error} <button style={control} onClick={() => setAttempt(x => x + 1)}>Reintentar</button></div>}
    {data && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, marginTop: 14 }}>
      {data.series.map(item => <article key={item.id} style={{ background: "#101f30", border: "1px solid #334155", borderRadius: 9, padding: 14 }}>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{item.region === "eu" ? "Zona Euro" : "Estados Unidos"} · {item.frequency === "monthly" ? "mensual" : "diario"}</div>
        <h3 style={{ fontSize: 15, margin: "6px 0 12px" }}>{item.label}</h3>
        {item.latest ? <><strong style={{ fontSize: 27 }}>{fmt(item.latest.value)}</strong> <span>{item.unit}</span><div style={{ fontSize: 12, marginTop: 5 }}>Fecha del dato: {date(item.latest.date)}</div></> : <p role="status">Fuente temporalmente no disponible. No se muestran cifras de ejemplo.</p>}
        {item.latest && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <button style={control} onClick={() => download(item)} disabled={downloading === item.id}>{downloading === item.id ? "Preparando…" : "Descargar histórico"}</button>
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "#93C5FD", fontSize: 12 }}>Ver fuente oficial</a>
        </div>}
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10 }}>Publicación más reciente · {item.provider}</div>
      </article>)}
    </div>}
    <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 14 }}>Inflación de EE. UU.: variación interanual calculada con el IPC oficial mensual. BCE: tipo de depósito y rendimiento de deuda a 10 años. La frecuencia de publicación y posibles revisiones dependen de cada fuente.</p>
  </section>;
}
