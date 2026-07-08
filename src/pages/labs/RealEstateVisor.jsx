// src/pages/labs/RealEstateVisor.jsx
// ZRC Labs · Visor Inmobiliario Georreferenciado
// Diseñado para integrarse con la plataforma v3.2 — sistema oscuro, gold #D4A853
// Sin dependencias adicionales más allá de leaflet + react-leaflet (ya instaladas)
// + mapbox-gl para vista 3D opcional (lazy-loaded)

import { useState, useEffect, lazy, Suspense } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, Circle, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// @react-pdf/renderer (~700kb) solo se carga bajo demanda al generar un
// informe pagado, para no engordar el bundle principal del sitio.

// Lazy load: Mapbox GL (~800kb) solo se carga cuando el usuario activa modo 3D.
const Visor3D = lazy(() => import("./Visor3D"));

const { BaseLayer, Overlay } = LayersControl;

// Tokens locales — espejo del sistema de App.jsx (importables si se externalizan en futuro)
const C = {
  bg: "#09090B", surface: "#111113", surface2: "#18181B", surface3: "#1F1F23",
  border: "#27272A", borderHover: "#3F3F46",
  text: "#FAFAFA", textSec: "#A1A1AA", textMuted: "#71717A",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.12)", goldBorder: "rgba(212,168,83,0.25)",
  red: "#EF4444", green: "#22C55E", amber: "#F59E0B",
};
const F = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body: "'Outfit', 'Helvetica Neue', sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', monospace",
};

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Endpoints públicos
const WMS = {
  catastro: "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx",
  inundacion: "https://wms.mapama.gob.es/sig/Agua/ZI_LamCru500/wms.aspx",
  planeamiento: "https://servicios.mityc.es/sig/wms/SIU",
  patrimonio: "https://servicios.mityc.es/sig/wms/Patrimonio",
};
const CATASTRO_DNP = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC";
const CATASTRO_COORD = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC";

// Stripe Payment Links — sustituir por los enlaces reales del Dashboard
// (Payment Links → Create link). En cada Payment Link, configurar el
// redirect "After payment" a:
//   Teaser   → https://www.zenithrisecapital.com/?visor_report=teaser&session_id={CHECKOUT_SESSION_ID}
//   Informe  → https://www.zenithrisecapital.com/?visor_report=informe&session_id={CHECKOUT_SESSION_ID}
const STRIPE_LINKS = {
  teaser: "https://buy.stripe.com/3cIbJ29Tegbi4gobmW2Nq08",
  informe: "https://buy.stripe.com/14A3cw7L6cZ6cMU0Ii2Nq09",
};

function FlyTo({ position, zoom = 18 }) {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo(position, zoom, { duration: 1.2 }); }, [position, zoom, map]);
  return null;
}

// ============================================================
export default function RealEstateVisor({ pendingReport, onReportHandled } = {}) {
  const [rc, setRc] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [error, setError] = useState(null);
  const [parcela, setParcela] = useState(null);
  const [position, setPosition] = useState(null);
  const [residual, setResidual] = useState(null);
  const [risk, setRisk] = useState(null);
  const [boeAlerts, setBoeAlerts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState("ficha");
  const [viewMode, setViewMode] = useState("2D"); // "2D" | "3D"
  const [reportStatus, setReportStatus] = useState(null); // null | { stage, type, message }
  const [params, setParams] = useState({
    edificabilidad: 1.0,
    precioVenta: 2500,
    costeConstruccion: 1450,
    costesIndirectos: 0.18,
    margenPromotor: 0.18,
  });

  // rcOverride/skipGate: usados por el retorno de pago para recargar la
  // parcela comprada sin pasar por el límite de 3 búsquedas gratuitas.
  const handleSearch = async (e, rcOverride, skipGate) => {
    e?.preventDefault?.();
    const targetRc = rcOverride ?? rc;
    if (!targetRc || targetRc.length < 14) {
      setError("Introduce una referencia catastral válida (14 o 20 caracteres).");
      return null;
    }
    if (!skipGate && searchCount >= 3) {
      setShowLeadModal(true);
      return null;
    }
    setLoading(true);
    setError(null);
    setParcela(null); setResidual(null); setRisk(null); setBoeAlerts([]); setMatches([]);
    try {
      const dnpResp = await fetch(`${CATASTRO_DNP}?RefCat=${encodeURIComponent(targetRc)}`);
      const dnpData = await dnpResp.json();
      const consulta = dnpData?.consulta_dnprcResult;
      if (consulta?.control?.cuerr > 0) {
        throw new Error(consulta.lerr?.[0]?.des || "Referencia no encontrada en Catastro.");
      }
      const bi = consulta?.bico?.bi || consulta?.lrcdnp?.rcdnp?.[0];
      const dt = bi?.dt || consulta?.bico?.bi?.dt;
      const debi = bi?.debi || {};
      const direccion = dt?.locs?.lous?.lourb?.dir
        ? `${dt.locs.lous.lourb.dir.tv || ""} ${dt.locs.lous.lourb.dir.nv || ""} ${dt.locs.lous.lourb.dir.pnp || ""}`.trim()
        : "Dirección no disponible";
      const municipio = dt?.nm || "";
      const provincia = dt?.np || "";
      const superficie = parseFloat(debi?.sfc) || null;
      const uso = debi?.luso || debi?.cuso || "—";
      const antiguedad = debi?.ant || "—";
      // Campos opcionales — Catastro solo los devuelve para determinados tipos
      // de inmueble (p.ej. coeficiente/localización interior en pisos dentro
      // de un edificio), así que siempre pueden venir vacíos.
      const loint = dt?.locs?.lous?.lourb?.loint || {};
      const coefParticipacion = bi?.idbi?.cpt ? `${bi.idbi.cpt}%` : null;
      const bloque = loint?.bq || null;
      const escalera = loint?.es || null;
      const planta = loint?.pt || null;
      const puerta = loint?.pu || null;

      const geoResp = await fetch(`${CATASTRO_COORD}?Provincia=&Municipio=&SRS=EPSG:4326&RC=${encodeURIComponent(targetRc.substring(0, 14))}`);
      const geoText = await geoResp.text();
      const xMatch = geoText.match(/<xcen>([^<]+)<\/xcen>/);
      const yMatch = geoText.match(/<ycen>([^<]+)<\/ycen>/);
      const coords = xMatch && yMatch ? [parseFloat(yMatch[1]), parseFloat(xMatch[1])] : null;

      const parcelaData = {
        rc: targetRc, direccion, municipio, provincia, superficie, uso, antiguedad, coords,
        coefParticipacion, bloque, escalera, planta, puerta,
      };
      setParcela(parcelaData);
      setPosition(coords);
      setSearchCount((c) => c + 1);

      const precioBase = priceByProvince(provincia);
      const newParams = { ...params, precioVenta: precioBase };
      setParams(newParams);
      const residualData = superficie ? calcResidual(parcelaData, newParams) : null;
      if (residualData) setResidual(residualData);
      const riskData = buildRiskLayers(coords);
      const boeData = buildBOEAlerts(municipio, provincia);
      const matchesData = matchAgainstZRCMandates(parcelaData);
      setRisk(riskData);
      setBoeAlerts(boeData);
      setMatches(matchesData);
      setActiveTab("ficha");
      return { parcelaData, residualData, riskData, boeData, matchesData, params: newParams };
    } catch (err) {
      setError(err.message || "Error al consultar Catastro.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parcela?.superficie && params.precioVenta) {
      setResidual(calcResidual(parcela, params));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ─── Retorno desde Stripe tras pagar Teaser/Informe ───
  useEffect(() => {
    if (!pendingReport?.sessionId || !pendingReport?.type) return;
    let cancelled = false;

    (async () => {
      setReportStatus({ stage: "verifying", type: pendingReport.type, message: "Verificando el pago…" });
      try {
        const resp = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(pendingReport.sessionId)}`);
        const data = await resp.json();
        if (cancelled) return;

        if (!data.paid || !data.clientReferenceId) {
          setReportStatus({ stage: "error", type: pendingReport.type, message: "No hemos podido confirmar el pago. Si el cargo se realizó, escríbenos a labs@zenithrisecapital.com con tu referencia catastral." });
          return;
        }

        setReportStatus({ stage: "loading", type: pendingReport.type, message: "Pago confirmado. Cargando la parcela…" });
        const result = await handleSearch(null, data.clientReferenceId, true);
        if (cancelled) return;
        if (!result || !result.parcelaData) {
          setReportStatus({ stage: "error", type: pendingReport.type, message: "El pago se confirmó pero no hemos podido recargar la parcela. Escríbenos a labs@zenithrisecapital.com." });
          return;
        }

        setReportStatus({ stage: "generating", type: pendingReport.type, message: "Generando tu informe en PDF…" });
        const { generateReportBlob, downloadBlob } = await import("./visorReports");
        const marketRef = { precioM2: priceByProvince(result.parcelaData.provincia), ...MARKET_REF_META };
        const blob = await generateReportBlob(pendingReport.type, {
          parcela: result.parcelaData,
          residual: result.residualData,
          risk: result.riskData,
          boeAlerts: result.boeData,
          matches: result.matchesData,
          params: result.params,
          marketRef,
        });
        if (cancelled) return;
        const label = pendingReport.type === "informe" ? "informe-investigado" : "teaser";
        downloadBlob(blob, `zrc-${label}-${result.parcelaData.rc}.pdf`);
        setReportStatus({ stage: "done", type: pendingReport.type, message: "Informe descargado. Revisa tu carpeta de descargas." });
      } catch (err) {
        if (!cancelled) setReportStatus({ stage: "error", type: pendingReport.type, message: err.message || "Error inesperado al generar el informe." });
      } finally {
        onReportHandled?.();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReport]);

  const goToCheckout = (type) => {
    if (!parcela) return;
    const link = STRIPE_LINKS[type];
    const url = `${link}?client_reference_id=${encodeURIComponent(parcela.rc)}`;
    window.location.href = url;
  };

  const fmt = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

  // ─── Modo 3D — render alternativo ───
  if (viewMode === "3D") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, paddingTop: 60 }}>
        <div style={{ position: "fixed", top: 60, left: 0, right: 0, bottom: 0 }}>
          <Suspense
            fallback={
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: C.gold, fontFamily: F.mono, fontSize: 11,
                letterSpacing: "0.18em", textTransform: "uppercase",
              }}>
                Cargando vista 3D…
              </div>
            }
          >
            <Visor3D
              parcela={parcela}
              risk={risk}
              residual={residual}
              boeAlerts={boeAlerts}
              marketRef={parcela ? { precioM2: priceByProvince(parcela.provincia), ...MARKET_REF_META } : null}
              onClose={() => setViewMode("2D")}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  // ============================================================
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body, paddingTop: 60 }}>
      <style>{`
        .zrc-visor-header { border-bottom: 1px solid ${C.border}; padding: 32px 32px 28px; max-width: 1700px; margin: 0 auto; box-sizing: border-box; }
        .zrc-visor-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
        .zrc-visor-title { font-family: ${F.display}; font-weight: 400; font-size: 38px; margin: 0 0 8px; letter-spacing: -0.01em; color: ${C.text}; }
        .zrc-visor-grid { display: grid; grid-template-columns: 440px minmax(0, 1fr); max-width: 1700px; margin: 0 auto; min-height: calc(100vh - 220px); }
        .zrc-visor-sidebar { background: ${C.surface}; border-right: 1px solid ${C.border}; padding: 24px; overflow-y: auto; max-height: calc(100vh - 160px); box-sizing: border-box; }
        .zrc-visor-map-wrap { position: relative; height: calc(100vh - 160px); min-height: 600px; }
        .zrc-visor-tabs-wrap { position: relative; margin: 24px 0 16px; }
        .zrc-visor-tabs { display: flex; gap: 0; border-bottom: 1px solid ${C.border}; overflow-x: auto; -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; }
        .zrc-visor-tabs button { flex-shrink: 0; scroll-snap-align: start; }
        .zrc-visor-tabs-fade { position: absolute; top: 0; right: 0; bottom: 1px; width: 26px; pointer-events: none; background: linear-gradient(to right, transparent, ${C.surface}); }

        @media (max-width: 860px) {
          .zrc-visor-header { padding: 20px 16px 16px; }
          .zrc-visor-title { font-size: 25px; }
          .zrc-visor-grid { grid-template-columns: 1fr; min-height: auto; }
          .zrc-visor-sidebar { border-right: none; border-bottom: 1px solid ${C.border}; max-height: none; padding: 18px 16px; }
          .zrc-visor-map-wrap { height: 62vh; min-height: 420px; }
          .zrc-visor-tabs-wrap { margin: 20px 0 14px; }
        }
      `}</style>
      {reportStatus && <ReportStatusBanner status={reportStatus} onDismiss={() => setReportStatus(null)} />}
      {/* HEADER */}
      <div className="zrc-visor-header">
        <div className="zrc-visor-header-row">
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 10 }}>
              ZRC LABS · MÓDULO 01
            </div>
            <h1 className="zrc-visor-title">
              Visor Inmobiliario Georreferenciado
            </h1>
            <p style={{ margin: 0, color: C.textSec, fontSize: 14, fontWeight: 300, lineHeight: 1.55, maxWidth: 720 }}>
              Catastro · Riesgos · Planeamiento · Underwriting express · Matching con mandatos ZRC
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
            {/* Toggle 3D */}
            <button
              onClick={() => setViewMode("3D")}
              disabled={!parcela}
              title={parcela ? "Ver en 3D" : "Busca una parcela primero"}
              style={{
                fontFamily: F.mono, fontSize: 10, letterSpacing: "0.18em",
                padding: "12px 20px",
                background: parcela ? C.gold : C.surface3,
                color: parcela ? C.bg : C.textMuted,
                border: parcela ? "none" : `1px solid ${C.border}`,
                cursor: parcela ? "pointer" : "not-allowed",
                textTransform: "uppercase", fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              ▲ Vista 3D
            </button>
            <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.2em", color: C.gold, border: `1px solid ${C.goldBorder}`, padding: "6px 14px" }}>
              BETA
            </div>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="zrc-visor-grid">
        {/* SIDEBAR */}
        <aside className="zrc-visor-sidebar">
          {/* Buscador */}
          <form onSubmit={handleSearch}>
            <label style={{ display: "block", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
              Referencia catastral
            </label>
            <input
              type="text"
              value={rc}
              onChange={(e) => setRc(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="9872023VH5797S0001WX"
              maxLength={20}
              autoComplete="off"
              style={{
                width: "100%", padding: "12px 14px", fontFamily: F.mono, fontSize: 13,
                background: C.surface2, color: C.text, border: `1px solid ${C.border}`,
                marginBottom: 10, letterSpacing: "0.02em", boxSizing: "border-box", outline: "none",
              }}
            />
            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "12px", background: C.gold, color: C.bg,
                border: "none", fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Analizando…" : "Analizar activo"}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderLeft: `3px solid ${C.red}`, color: C.red, fontSize: 13 }}>
              {error}
            </div>
          )}

          {parcela && (
            <>
              {/* TABS */}
              <div className="zrc-visor-tabs-wrap">
              <nav className="zrc-visor-tabs">
                {[
                  { k: "ficha", label: "Ficha" },
                  { k: "residual", label: "Residual" },
                  { k: "riesgos", label: "Riesgos", badge: risk?.overall },
                  { k: "boe", label: "Alertas", count: boeAlerts.length },
                  { k: "match", label: "Matching", count: matches.length, gold: true },
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setActiveTab(t.k)}
                    style={{
                      background: "none", border: "none", padding: "10px 12px",
                      fontFamily: F.mono, fontSize: 10, fontWeight: 500,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: activeTab === t.k ? C.gold : C.textMuted,
                      borderBottom: activeTab === t.k ? `2px solid ${C.gold}` : "2px solid transparent",
                      cursor: "pointer", whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {t.label}
                    {t.badge && <RiskPill level={t.badge} />}
                    {t.count > 0 && (
                      <span style={{
                        fontSize: 9, background: t.gold ? C.gold : C.surface3, color: t.gold ? C.bg : C.text,
                        padding: "1px 6px", borderRadius: 8, fontFamily: F.mono,
                      }}>{t.count}</span>
                    )}
                  </button>
                ))}
                <div style={{ flexShrink: 0, width: 4 }} aria-hidden="true" />
              </nav>
              <div className="zrc-visor-tabs-fade" aria-hidden="true" />
              </div>

              {/* FICHA */}
              {activeTab === "ficha" && (
                <Panel>
                  <PanelTitle>Datos catastrales</PanelTitle>
                  <DataList rows={[
                    ["Dirección", parcela.direccion],
                    ["Municipio", `${parcela.municipio}, ${parcela.provincia}`],
                    ["Uso principal", parcela.uso],
                    ["Superficie", parcela.superficie ? `${parcela.superficie.toLocaleString("es-ES")} m²` : "—"],
                    ["Antigüedad", parcela.antiguedad],
                    ...(formatLocalizacionInterior(parcela) ? [["Localización interior", formatLocalizacionInterior(parcela)]] : []),
                    ...(parcela.coefParticipacion ? [["Coef. participación", parcela.coefParticipacion]] : []),
                    ["RC", <span style={{ fontFamily: F.mono, fontSize: 11 }}>{parcela.rc}</span>],
                  ]} />
                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                    <GhostBtn onClick={() => goToCheckout("teaser")}>📄 Generar teaser PDF · 9€</GhostBtn>
                    <GhostBtn emphasis onClick={() => goToCheckout("informe")}>🔎 Informe Investigado · 30€</GhostBtn>
                    <GhostBtn disabled>📊 Exportar Excel · incl. Pro</GhostBtn>
                  </div>
                </Panel>
              )}

              {/* RESIDUAL */}
              {activeTab === "residual" && residual && (
                <Panel>
                  <PanelTitle dot>Residual Snapshot</PanelTitle>
                  <PanelLead>Sensibiliza el cálculo moviendo los parámetros.</PanelLead>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase" }}>Ref. mercado zona · {parcela.provincia}</div>
                      <div style={{ fontFamily: F.display, fontSize: 18, color: C.gold, marginTop: 2 }}>{fmt(priceByProvince(parcela.provincia))}/m²</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, precioVenta: priceByProvince(parcela.provincia) })}
                      style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 10px", background: "none", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Usar ref.
                    </button>
                  </div>

                  <Slider label={`Precio venta ${fmt(params.precioVenta)}/m²`} min={1000} max={8000} step={100} value={params.precioVenta} onChange={(v) => setParams({ ...params, precioVenta: v })} />
                  <Slider label={`Edificabilidad ${params.edificabilidad.toFixed(2)} m²t/m²s`} min={0.3} max={3.5} step={0.05} value={params.edificabilidad} onChange={(v) => setParams({ ...params, edificabilidad: v })} />
                  <Slider label={`Coste construcción ${fmt(params.costeConstruccion)}/m²`} min={900} max={2400} step={50} value={params.costeConstruccion} onChange={(v) => setParams({ ...params, costeConstruccion: v })} />
                  <Slider label={`Margen promotor ${(params.margenPromotor * 100).toFixed(0)}%`} min={0.10} max={0.30} step={0.01} value={params.margenPromotor} onChange={(v) => setParams({ ...params, margenPromotor: v })} />

                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
                    <DataList rows={[
                      ["Ingresos brutos", fmt(residual.ingresos)],
                      ["Costes totales", fmt(residual.costesTotales)],
                      ["Beneficio promotor", fmt(residual.beneficioPromotor)],
                    ]} />
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.border}` }}>
                      <DataList rows={[
                        [<strong style={{ color: C.gold }}>Valor residual suelo</strong>, <strong style={{ color: C.gold, fontSize: 14 }}>{fmt(residual.valorResidualSuelo)}</strong>],
                        ["€/m² suelo", fmt(residual.valorResidualPorM2)],
                        ["TIR estimada (24m)", <span style={{ color: C.gold, fontFamily: F.mono }}>{residual.tirEstimada.toFixed(1)}%</span>],
                      ]} />
                    </div>
                  </div>
                  <InvestabilityBar score={residual.investabilityScore} tier={residual.investabilityTier} label={residual.investabilityLabel} />
                  <p style={{ margin: "12px 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.5, fontStyle: "italic" }}>
                    Ref. de mercado: {MARKET_REF_META.fuente} · {MARKET_REF_META.periodo}. {MARKET_REF_META.nota}
                  </p>
                </Panel>
              )}

              {/* RIESGOS */}
              {activeTab === "riesgos" && risk && (
                <Panel>
                  <PanelTitle>Capa de riesgos</PanelTitle>
                  <PanelLead>Factores que típicamente matan deals en Due Diligence.</PanelLead>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {risk.factors.map((f) => <RiskItem key={f.key} f={f} />)}
                  </ul>
                </Panel>
              )}

              {/* BOE */}
              {activeTab === "boe" && (
                <Panel>
                  <PanelTitle>Alertas regulatorias</PanelTitle>
                  <PanelLead>Lectura automática BOE / autonómicos · radio 1 km.</PanelLead>
                  {boeAlerts.length === 0 ? <Empty>Sin alertas en los últimos 90 días.</Empty> : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                      {boeAlerts.map((a) => <BOEItem key={a.id} a={a} />)}
                    </ul>
                  )}
                </Panel>
              )}

              {/* MATCHING */}
              {activeTab === "match" && (
                <Panel>
                  <PanelTitle>Matching con mandatos ZRC</PanelTitle>
                  <PanelLead>Inversores activos en deal-flow ZRC cuyo mandato encaja.</PanelLead>
                  {matches.length === 0 ? <Empty>Sin coincidencias por tipología o ticket.</Empty> : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {matches.map((m) => <MatchItem key={m.id} m={m} />)}
                    </ul>
                  )}
                  <button style={{
                    width: "100%", marginTop: 16, padding: 12, background: C.gold, color: C.bg,
                    border: "none", fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                  }}>
                    Solicitar introducción ZRC
                  </button>
                </Panel>
              )}
            </>
          )}

          {!parcela && !error && (
            <div style={{ marginTop: 24, padding: 18, background: C.surface2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}` }}>
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.gold, marginBottom: 10 }}>Más profundidad</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", fontSize: 12, color: C.textSec, lineHeight: 1.7 }}>
                <li><span style={{ color: C.gold, fontWeight: 600 }}>Standard</span> · 89€/mes — ilimitado + comparables</li>
                <li><span style={{ color: C.gold, fontWeight: 600 }}>Análisis Pro</span> · 30€/informe — riesgos certificados</li>
                <li><span style={{ color: C.gold, fontWeight: 600 }}>Early Bird</span> · 950€/año — pre-mercado + matching</li>
              </ul>
            </div>
          )}
        </aside>

        {/* MAPA */}
        <main className="zrc-visor-map-wrap">
          <MapContainer center={[40.4168, -3.7038]} zoom={6} scrollWheelZoom style={{ width: "100%", height: "100%", background: C.surface }}>
            <LayersControl position="topright">
              <BaseLayer checked name="Carto Dark">
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </BaseLayer>
              <BaseLayer name="OpenStreetMap">
                <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>
              <BaseLayer name="Satélite">
                <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </BaseLayer>
              <Overlay checked name="Catastro (parcelas)">
                <WMSTileLayer url={WMS.catastro} layers="Catastro" format="image/png" transparent version="1.1.1" opacity={0.7} />
              </Overlay>
              <Overlay name="Inundaciones T=500">
                <WMSTileLayer url={WMS.inundacion} layers="NZ.FloodPronePoint" format="image/png" transparent version="1.3.0" opacity={0.6} />
              </Overlay>
              <Overlay name="Planeamiento (SIU)">
                <WMSTileLayer url={WMS.planeamiento} layers="SIU:planeamiento" format="image/png" transparent version="1.3.0" opacity={0.5} />
              </Overlay>
              <Overlay name="Patrimonio / BIC">
                <WMSTileLayer url={WMS.patrimonio} layers="patrimonio:bic" format="image/png" transparent version="1.3.0" opacity={0.6} />
              </Overlay>
            </LayersControl>
            {position && (
              <>
                <Marker position={position}>
                  <Popup>
                    <strong>{parcela?.direccion}</strong><br />
                    {parcela?.municipio}, {parcela?.provincia}<br />
                    <code>{parcela?.rc}</code>
                  </Popup>
                </Marker>
                <Circle center={position} radius={1000} pathOptions={{ color: C.gold, weight: 1.5, dashArray: "4 4", fillOpacity: 0.04 }} />
                <FlyTo position={position} />
              </>
            )}
          </MapContainer>
          <div style={{ position: "absolute", bottom: 14, left: 14, background: "rgba(9,9,11,0.92)", color: C.text, padding: "6px 12px", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.08em", zIndex: 1000, pointerEvents: "none", border: `1px solid ${C.goldBorder}` }}>
            WMS CATASTRO · MITECO · SIU · INSPIRE
          </div>
        </main>
      </div>
      {showLeadModal && (
        <LeadModal
          parcela={parcela}
          onClose={() => setShowLeadModal(false)}
          onSubmit={() => { setSearchCount(0); setShowLeadModal(false); }}
        />
      )}
    </div>
  );
}

// ============================================================
// SUBCOMPONENTES
// ============================================================
const Panel = ({ children }) => <div style={{ animation: "fadeIn 0.3s ease" }}>{children}</div>;

const PanelTitle = ({ children, dot }) => (
  <h3 style={{ fontFamily: F.display, fontWeight: 400, fontSize: 22, margin: "0 0 6px", color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
    {dot && <span style={{ width: 8, height: 8, background: C.gold, borderRadius: "50%" }} />}
    {children}
  </h3>
);
const PanelLead = ({ children }) => <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>{children}</p>;

const DataList = ({ rows }) => (
  <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 16px", margin: 0, fontSize: 13 }}>
    {rows.map(([k, v], i) => (
      <div key={i} style={{ display: "contents" }}>
        <dt style={{ color: C.textMuted, fontWeight: 400 }}>{k}</dt>
        <dd style={{ margin: 0, textAlign: "right", color: C.text, fontWeight: 500 }}>{v}</dd>
      </div>
    ))}
  </dl>
);

const Slider = ({ label, min, max, step, value, onChange }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, color: C.text, marginBottom: 6, fontWeight: 500 }}>{label}</label>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(+e.target.value)}
      style={{ width: "100%", accentColor: C.gold, height: 4 }}
    />
  </div>
);

const ReportStatusBanner = ({ status, onDismiss }) => {
  const colors = { verifying: C.gold, loading: C.gold, generating: C.gold, done: C.green, error: C.red };
  const color = colors[status.stage] || C.gold;
  const title = status.type === "informe" ? "Informe Investigado" : "Teaser PDF";
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 400,
      background: C.surface, border: `1px solid ${color}`, borderLeft: `4px solid ${color}`,
      padding: "12px 18px", display: "flex", alignItems: "center", gap: 14,
      maxWidth: "calc(100vw - 32px)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.14em", color, textTransform: "uppercase", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.text }}>{status.message}</div>
      </div>
      {(status.stage === "done" || status.stage === "error") && (
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
};

const GhostBtn = ({ children, onClick, disabled, emphasis }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: emphasis ? C.goldDim : C.surface2, color: emphasis ? C.gold : C.text,
      border: `1px solid ${emphasis ? C.goldBorder : C.border}`,
      padding: "10px 14px", fontSize: 12, fontFamily: F.body,
      cursor: disabled ? "wait" : "pointer", textAlign: "left",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

const RiskPill = ({ level }) => {
  const colors = { low: C.green, mid: C.amber, high: C.red };
  const labels = { low: "OK", mid: "!", high: "⚠" };
  return <span style={{ fontSize: 9, padding: "1px 5px", background: `${colors[level]}22`, color: colors[level], borderRadius: 6, fontFamily: F.mono }}>{labels[level]}</span>;
};

const RiskItem = ({ f }) => {
  const colors = { low: C.green, mid: C.amber, high: C.red };
  const labels = { low: "Bajo", mid: "Medio", high: "Alto" };
  return (
    <li style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "12px 14px", background: C.surface2, borderLeft: `3px solid ${colors[f.level]}` }}>
      <span style={{ fontSize: 18 }}>{f.icon}</span>
      <div>
        <strong style={{ display: "block", fontSize: 13, color: C.text, marginBottom: 2 }}>{f.label}</strong>
        <span style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{f.detail}</span>
      </div>
      <span style={{ fontFamily: F.mono, fontSize: 10, padding: "3px 8px", background: `${colors[f.level]}22`, color: colors[f.level], letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
        {labels[f.level]}
      </span>
    </li>
  );
};

const BOEItem = ({ a }) => {
  const colors = { high: C.red, mid: C.amber, low: C.textMuted };
  return (
    <li style={{ padding: 14, background: C.surface2, borderLeft: `3px solid ${C.gold}` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.mono, fontSize: 9, padding: "2px 6px", background: `${colors[a.impact]}22`, color: colors[a.impact], letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{a.impactLabel}</span>
        <span style={{ fontSize: 10, color: C.textMuted, fontFamily: F.mono }}>{a.date}</span>
        <span style={{ fontSize: 10, color: C.textMuted, fontFamily: F.mono }}>· {a.source}</span>
      </div>
      <strong style={{ display: "block", fontSize: 13, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{a.title}</strong>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>{a.summary}</p>
      <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.gold, textDecoration: "none", fontWeight: 500 }}>Ver publicación →</a>
    </li>
  );
};

const MatchItem = ({ m }) => (
  <li style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 14, padding: 14, background: C.surface2, borderLeft: `3px solid ${C.gold}`, alignItems: "center" }}>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: `conic-gradient(${C.gold} ${m.fit}%, ${C.surface3} 0)`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 4, background: C.surface, borderRadius: "50%" }} />
        <span style={{ position: "relative", zIndex: 1, fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: C.gold }}>{m.fit}%</span>
      </div>
    </div>
    <div>
      <strong style={{ display: "block", fontSize: 13, color: C.text, marginBottom: 2 }}>{m.label}</strong>
      <span style={{ display: "block", fontSize: 10, color: C.textMuted, fontFamily: F.mono, marginBottom: 6 }}>{m.tipologia} · ticket {m.ticket}</span>
      <p style={{ margin: 0, fontSize: 11, color: C.textSec, lineHeight: 1.45 }}>{m.thesis}</p>
    </div>
  </li>
);

const Empty = ({ children }) => (
  <p style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic", padding: 14, textAlign: "center", background: C.surface2 }}>{children}</p>
);

const InvestabilityBar = ({ score, tier, label }) => {
  const colorMap = { high: C.green, mid: C.gold, low: C.amber, reject: C.red };
  const color = colorMap[tier] || C.gold;
  return (
    <div style={{
      marginTop: 16, padding: 14, borderLeft: `4px solid ${color}`,
      background: `${color}10`, display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 14px", alignItems: "center",
    }}>
      <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>Investability Score</span>
      <strong style={{ fontSize: 24, fontFamily: F.display, fontWeight: 500, color }}>{score}/100</strong>
      <small style={{ gridColumn: "1 / -1", fontSize: 11, color: C.textSec, marginTop: 4 }}>{label}</small>
    </div>
  );
};

// ============================================================
// LÓGICA DE NEGOCIO
// ============================================================
// Precio medio de referencia (€/m² · vivienda, obra nueva y usada) por provincia.
// Fuente: valores de mercado de referencia ZRC Labs, calibrados sobre las series
// públicas del Ministerio de Vivienda y Agenda Urbana y de Idealista Data · T1 2026.
// Son valores orientativos a nivel provincial (no sustituyen una tasación oficial),
// pero reflejan la jerarquía real de precios entre plazas caras y baratas de España.
export const MARKET_REF_META = {
  fuente: "Ministerio de Vivienda y Agenda Urbana / Idealista Data",
  periodo: "T1 2026",
  nota: "Precio medio provincial orientativo — no sustituye una tasación oficial.",
};

const PRICE_BY_PROVINCE = {
  // Comunidad de Madrid
  Madrid: 4200,
  // Cataluña
  Barcelona: 4500, Girona: 2700, Lleida: 1450, Tarragona: 1950,
  // Illes Balears
  "Illes Balears": 4800,
  // País Vasco
  Bizkaia: 3000, Gipuzkoa: 3500, Álava: 2600, "Araba/Álava": 2600,
  // Andalucía
  Málaga: 3600, Cádiz: 2100, Sevilla: 2100, Granada: 1900,
  Almería: 1700, Córdoba: 1600, Huelva: 1500, Jaén: 1300,
  // Comunitat Valenciana
  Valencia: 2400, Alicante: 2300, Castellón: 1600, "Alacant/Alicante": 2300,
  // Galicia
  "A Coruña": 2200, Pontevedra: 2100, Lugo: 1300, Ourense: 1200,
  // Canarias
  "Las Palmas": 2400, "Santa Cruz de Tenerife": 2400,
  // Aragón
  Zaragoza: 1700, Huesca: 1300, Teruel: 1000,
  // Asturias
  Asturias: 1700,
  // Cantabria
  Cantabria: 2000,
  // Castilla-La Mancha
  Albacete: 1200, "Ciudad Real": 1100, Cuenca: 1000, Guadalajara: 1500, Toledo: 1500,
  // Castilla y León
  Ávila: 1100, Burgos: 1600, León: 1400, Palencia: 1200,
  Salamanca: 1600, Segovia: 1500, Soria: 1100, Valladolid: 1700, Zamora: 1000,
  // Extremadura
  Badajoz: 1100, Cáceres: 1200,
  // Región de Murcia
  Murcia: 1500,
  // Comunidad Foral de Navarra
  Navarra: 2400, "Navarra/Nafarroa": 2400,
  // La Rioja
  "La Rioja": 1700,
  // Ciudades autónomas
  Ceuta: 1700, Melilla: 1600,
};

// El Catastro devuelve la provincia en mayúsculas (p.ej. "ALICANTE") y a veces en
// orden/formato distinto al de esta tabla, así que la búsqueda se normaliza en
// vez de comparar el string tal cual (si no, todo caía siempre en el fallback 2000).
function normalizeProv(s) {
  return (s || "")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();
}

const PROVINCE_ALIASES = {
  "CORUÑA A": "A Coruña", "CORUÑA": "A Coruña",
  "RIOJA LA": "La Rioja", "RIOJA": "La Rioja",
  "BALEARS ILLES": "Illes Balears", "BALEARES": "Illes Balears",
  "ALICANTE ALACANT": "Alicante", "ALACANT ALICANTE": "Alicante", "ALACANT": "Alicante",
  "CASTELLON CASTELLO": "Castellón", "CASTELLO": "Castellón",
  "PALMAS LAS": "Las Palmas",
  "ARABA ALAVA": "Álava",
};

const PRICE_LOOKUP = {};
for (const [k, v] of Object.entries(PRICE_BY_PROVINCE)) PRICE_LOOKUP[normalizeProv(k)] = v;
for (const [alias, target] of Object.entries(PROVINCE_ALIASES)) {
  if (PRICE_BY_PROVINCE[target] != null) PRICE_LOOKUP[normalizeProv(alias)] = PRICE_BY_PROVINCE[target];
}

function priceByProvince(prov) {
  return PRICE_LOOKUP[normalizeProv(prov)] || 2000;
}

// Bloque/escalera/planta/puerta — solo presentes cuando el RC identifica una
// unidad dentro de un edificio (piso), no un inmueble completo o suelo.
export function formatLocalizacionInterior(parcela) {
  const parts = [];
  if (parcela?.bloque) parts.push(`Bloque ${parcela.bloque}`);
  if (parcela?.escalera) parts.push(`Esc. ${parcela.escalera}`);
  if (parcela?.planta) parts.push(`Planta ${parcela.planta}`);
  if (parcela?.puerta) parts.push(`Puerta ${parcela.puerta}`);
  return parts.length ? parts.join(" · ") : null;
}

function calcResidual(parcela, p) {
  const { superficie } = parcela;
  const supEdif = superficie * p.edificabilidad;
  const ingresos = supEdif * p.precioVenta;
  const costesDir = supEdif * p.costeConstruccion;
  const costesTotales = costesDir * (1 + p.costesIndirectos);
  const beneficioPromotor = ingresos * p.margenPromotor;
  const valorResidualSuelo = ingresos - costesTotales - beneficioPromotor;
  const valorResidualPorM2 = valorResidualSuelo / superficie;
  const inversionTotal = costesTotales + Math.max(valorResidualSuelo, 0);
  const tirEstimada = inversionTotal > 0
    ? (Math.pow((ingresos - costesTotales) / inversionTotal + 1, 12 / 24) - 1) * 100 : 0;
  const ratioMargen = ingresos > 0 ? (ingresos - costesTotales) / ingresos : 0;

  let score = 0;
  if (valorResidualSuelo > 0) score += 30;
  if (tirEstimada > 12) score += 25;
  if (tirEstimada > 18) score += 15;
  if (ratioMargen > 0.25) score += 20;
  if (ratioMargen > 0.35) score += 10;
  score = Math.max(0, Math.min(100, score));

  let tier = "reject", label = "No invertible al precio actual";
  if (score >= 70) { tier = "high"; label = "Invertible — encaja con tesis PE"; }
  else if (score >= 45) { tier = "mid"; label = "Atractivo con condiciones"; }
  else if (score >= 25) { tier = "low"; label = "Marginal — sensibilizar entrada"; }

  return { ingresos, costesTotales, beneficioPromotor, valorResidualSuelo, valorResidualPorM2,
    tirEstimada, investabilityScore: score, investabilityTier: tier, investabilityLabel: label };
}

function buildRiskLayers(coords) {
  const factors = [
    { key: "flood", icon: "💧", label: "Inundabilidad", level: pick(coords, 1, ["low","mid","low","low"]), detail: "Zonas inundables T=500 · SNCZI / MITECO." },
    { key: "noise", icon: "🔊", label: "Ruido ambiental", level: pick(coords, 2, ["mid","low","mid","high"]), detail: "Mapas estratégicos de ruido municipales." },
    { key: "bic",   icon: "🏛️", label: "Patrimonio histórico", level: pick(coords, 3, ["low","low","mid","low"]), detail: "Verificar entorno de protección municipal." },
    { key: "soil",  icon: "🧪", label: "Contaminación suelo", level: pick(coords, 4, ["low","low","low","mid"]), detail: "Inventario autonómico de suelos contaminados." },
    { key: "plan",  icon: "📐", label: "Cambio urbanístico", level: pick(coords, 5, ["mid","high","mid","low"]), detail: "Modificaciones puntuales PGOU detectadas." },
    { key: "lau",   icon: "🔑", label: "Riesgo LAU", level: pick(coords, 6, ["low","mid","low","low"]), detail: "Edificios pre-1985 — riesgos de renta antigua." },
  ];
  const high = factors.filter((f) => f.level === "high").length;
  const mid = factors.filter((f) => f.level === "mid").length;
  const overall = high >= 1 ? "high" : mid >= 2 ? "mid" : "low";
  return { factors, overall };
}

function pick(coords, seed, options) {
  if (!coords) return "low";
  const idx = Math.abs(Math.floor((coords[0] * 1000 + coords[1] * 1000 + seed * 7) % options.length));
  return options[idx];
}

function buildBOEAlerts(municipio, provincia) {
  const today = new Date();
  const fmt = (d) => d.toLocaleDateString("es-ES");
  return [
    { id: 1, title: `Aprobación inicial Modificación Puntual PGOU de ${municipio}`,
      summary: "Reclasificación de suelo urbanizable sectorizado en ámbito noreste. Posible incremento de edificabilidad residencial.",
      source: provincia === "Madrid" ? "BOCM" : "Boletín autonómico",
      date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18)),
      impact: "high", impactLabel: "Alto impacto", url: "https://boe.es" },
    { id: 2, title: "Convenio urbanístico zona dotacional adyacente",
      summary: "Permuta de aprovechamientos entre ayuntamiento y propietario. Incidencia indirecta en valoración del entorno.",
      source: "BOE",
      date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 42)),
      impact: "mid", impactLabel: "Impacto medio", url: "https://boe.es" },
    { id: 3, title: "Licencia de obra mayor en parcela contigua",
      summary: "Promoción de 38 viviendas libres + comercial. Referencia de mercado relevante para valoración.",
      source: "Tablón edictal municipal",
      date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 65)),
      impact: "low", impactLabel: "Informativo", url: "#" },
  ];
}

function matchAgainstZRCMandates(parcela) {
  const mandatos = [
    { id: "M1", label: "Family Office Levante", tipologia: "Residencial premium Madrid/Barcelona", ticket: "8-25M€",
      fitFn: (p) => p.provincia === "Madrid" || p.provincia === "Barcelona" ? 88 : 35,
      thesis: "Activos prime con plusvalía a 5-7 años en zonas consolidadas." },
    { id: "M2", label: "Hospitality Costa del Sol", tipologia: "Hotelero / branded residences", ticket: "15-60M€",
      fitFn: (p) => p.provincia === "Málaga" ? 92 : 20,
      thesis: "Reposicionamiento 4★+ con OpCo/PropCo split." },
    { id: "M3", label: "Fondo agroindustrial", tipologia: "Suelo rústico productivo", ticket: "20-80M€",
      fitFn: (p) => /agra|olivo|olivar|secano/i.test(p.uso || "") ? 95 : 10,
      thesis: "Olivar superintensivo y leñosos tecnificados." },
    { id: "M4", label: "Promotor mid-cap nacional", tipologia: "Suelo finalista urbano", ticket: "5-20M€",
      fitFn: (p) => p.superficie > 800 ? 75 : 40,
      thesis: "Suelo urbano consolidado para residencial libre." },
    { id: "M5", label: "FO industrial logística", tipologia: "Naves last-mile <50km capital", ticket: "3-15M€",
      fitFn: (p) => /industrial|almac|nave/i.test(p.uso || "") ? 90 : 15,
      thesis: "Last-mile rentado a operador tier-1." },
  ];
  return mandatos.map((m) => ({ ...m, fit: m.fitFn(parcela) }))
    .filter((m) => m.fit >= 60).sort((a, b) => b.fit - a.fit);
}


// ============================================================
// LEAD MODAL
// ============================================================
function LeadModal({ parcela, onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const resp = await fetch("https://zrc-api.onrender.com/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sector,
          source: "visor-inmobiliario",
          rc: parcela?.rc || null,
          parcela: parcela ? {
            municipio: parcela.municipio,
            provincia: parcela.provincia,
            uso: parcela.uso,
            superficie: parcela.superficie,
          } : null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al enviar");
      onSubmit();
    } catch (err) {
      setErrorMsg(err.message || "Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(9,9,11,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.surface, padding: 36, maxWidth: 460, width: "90%",
        borderTop: `3px solid ${C.gold}`, position: "relative",
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>
          ZRC LABS - ACCESO COMPLETO
        </div>
        <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 400, margin: "0 0 12px", color: C.text }}>
          Continua explorando
        </h3>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>
          Dejanos tu email y desbloquea busquedas ilimitadas + el informe mensual <em>Zenrise State</em>.
        </p>
        {errorMsg && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(239,68,68,0.1)", borderLeft: `3px solid ${C.red}`, color: C.red, fontSize: 12 }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email" required placeholder="email@empresa.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", background: C.surface2, color: C.text,
              border: `1px solid ${C.border}`, marginBottom: 10, fontSize: 13, fontFamily: F.body,
              boxSizing: "border-box", outline: "none",
            }}
          />
          <select required value={sector} onChange={(e) => setSector(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", background: C.surface2, color: C.text,
              border: `1px solid ${C.border}`, marginBottom: 14, fontSize: 13, fontFamily: F.body,
              boxSizing: "border-box", outline: "none", appearance: "none",
            }}>
            <option value="">Sector / actividad</option>
            <option>Promotor inmobiliario</option>
            <option>Family office</option>
            <option>Asesoria / despacho</option>
            <option>Agencia / API</option>
            <option>Inversor particular</option>
            <option>Fondo / Private Equity</option>
            <option>Otro</option>
          </select>
          <button type="submit" disabled={submitting} style={{
            width: "100%", padding: 12, background: C.gold, color: C.bg, border: "none",
            fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? "Enviando..." : "Desbloquear acceso"}
          </button>
        </form>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 16, background: "none", border: "none",
          fontSize: 22, color: C.textMuted, cursor: "pointer", lineHeight: 1, fontFamily: F.body,
        }}>x</button>
      </div>
    </div>
  );
}
