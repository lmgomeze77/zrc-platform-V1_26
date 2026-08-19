// src/pages/labs/RealEstateVisor.jsx
// ZRC Labs · Visor Inmobiliario Georreferenciado
// Diseñado para integrarse con la plataforma v3.2 — sistema oscuro, gold #D4A853
// Sin dependencias adicionales más allá de leaflet + react-leaflet (ya instaladas)
// + mapbox-gl para vista 3D opcional (lazy-loaded)

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, Circle, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSubscription } from "../../hooks/useSubscription";
import { useVisorLang, t } from "./visorI18n";
// @react-pdf/renderer (~700kb) solo se carga bajo demanda al generar un
// informe pagado, para no engordar el bundle principal del sitio.

// Lazy load: Mapbox GL (~800kb) solo se carga cuando el usuario activa modo 3D.
const Visor3D = lazy(() => import("./Visor3D"));

const { BaseLayer, Overlay } = LayersControl;

// Tokens locales — espejo del sistema de App.jsx (importables si se externalizan en futuro)
const C = {
  bg: "#FAF6ED", surface: "#F3ECDC", surface2: "#EDE3CE", surface3: "#E6D9BC",
  border: "#DBC9A0", borderHover: "#C7B182",
  text: "#2B2418", textSec: "#5C513C", textMuted: "#8A7B5C",
  gold: "#93712F", goldDim: "rgba(147,113,47,0.10)", goldBorder: "rgba(147,113,47,0.32)",
  red: "#C0362C", green: "#15803D", amber: "#B45309",
};
const F = {
  display: "'JetBrains Mono', monospace",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
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
  // Suscripciones (recurrentes) — igual que Intelligence/Institutional en
  // PricingPage.jsx, sin redirect especial: el webhook actualiza el tier en
  // Supabase y el Visor lo recoge solo con /api/subscription?email=.
  standard: "https://buy.stripe.com/00w3cwe9uf7e8wE0Ii2Nq0a",
  earlybird: "https://buy.stripe.com/6oU7sM4yU1go008cr02Nq0b",
};

function FlyTo({ position, zoom = 18 }) {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo(position, zoom, { duration: 1.2 }); }, [position, zoom, map]);
  return null;
}

// ============================================================
export default function RealEstateVisor({ pendingReport, onReportHandled, useAuth } = {}) {
  const [lang, setLang] = useVisorLang();
  const auth = useAuth?.();
  const { tier } = useSubscription(auth?.user?.email);
  // "intelligence" y "institutional" son los tiers de la plataforma principal
  // (PricingPage.jsx) — Intelligence anuncia "Real Estate Visor · referencias
  // ilimitadas" como feature propia, así que debe desbloquear lo mismo que
  // visor_standard. Institutional anuncia además "Matching con mandatos ZRC",
  // equivalente al pre-mercado de Early Bird.
  const hasUnlimitedSearch = tier === "visor_standard" || tier === "visor_earlybird" || tier === "intelligence" || tier === "institutional";
  const hasComparables = tier === "visor_standard" || tier === "visor_earlybird" || tier === "intelligence" || tier === "institutional";
  const hasPreMercado = tier === "visor_earlybird" || tier === "institutional";
  const rcInputRef = useRef(null);
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
      setError(t(lang, "errorInvalidRC"));
      return null;
    }
    if (!skipGate && !hasUnlimitedSearch && searchCount >= 3) {
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
        throw new Error(consulta.lerr?.[0]?.des || t(lang, "errorNotFound"));
      }
      const bi = consulta?.bico?.bi || consulta?.lrcdnp?.rcdnp?.[0];
      const dt = bi?.dt || consulta?.bico?.bi?.dt;
      const debi = bi?.debi || {};
      const direccion = dt?.locs?.lous?.lourb?.dir
        ? `${dt.locs.lous.lourb.dir.tv || ""} ${dt.locs.lous.lourb.dir.nv || ""} ${dt.locs.lous.lourb.dir.pnp || ""}`.trim()
        : t(lang, "addressUnavailable");
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
      const boeData = buildBOEAlerts(municipio, provincia, lang);
      const matchesData = matchAgainstZRCMandates(parcelaData);
      setRisk(riskData);
      setBoeAlerts(boeData);
      setMatches(matchesData);
      setActiveTab("ficha");
      return { parcelaData, residualData, riskData, boeData, matchesData, params: newParams };
    } catch (err) {
      setError(err.message || t(lang, "errorGeneric"));
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
  // pendingReportCacheRef guarda el último { type, sessionId } visto para
  // poder reintentar manualmente (botón "Reintentar" en el banner) incluso
  // después de que el padre limpie pendingReport vía onReportHandled().
  const pendingReportCacheRef = useRef(null);
  const pendingCancelRef = useRef(false);

  const runPendingReportFlow = async (pending) => {
    pendingCancelRef.current = false;
    const isCancelled = () => pendingCancelRef.current;
    const CONTACT = t(lang, "reportContact");

    // Guarda contra el placeholder {CHECKOUT_SESSION_ID} sin sustituir —
    // pasaría si el redirect "After payment" del Payment Link no está bien
    // configurado en Stripe, y evita lanzar un fetch a una URL rota.
    if (!/^cs_/.test(pending.sessionId)) {
      setReportStatus({ stage: "error", type: pending.type, retryable: false, message: t(lang, "reportBadSessionId", { contact: CONTACT }) });
      return;
    }

    setReportStatus({ stage: "verifying", type: pending.type, message: t(lang, "reportVerifying") });

    // Reintenta una vez la verificación: justo tras volver de un checkout
    // externo (Stripe), la primera petición fetch() en Safari/iOS puede
    // fallar por red si la conexión aún no se ha restablecido del todo.
    let sessionData = null;
    let fetchErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(pending.sessionId)}`);
        sessionData = await resp.json();
        fetchErr = null;
        break;
      } catch (err) {
        fetchErr = err;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 900));
      }
    }
    if (isCancelled()) return;
    if (fetchErr) {
      setReportStatus({ stage: "error", type: pending.type, retryable: true, message: t(lang, "reportNetworkError", { contact: CONTACT, detail: fetchErr.message || t(lang, "unknown") }) });
      return;
    }

    if (!sessionData.paid || !sessionData.clientReferenceId) {
      setReportStatus({ stage: "error", type: pending.type, retryable: true, message: t(lang, "reportNotPaid", { contactLower: t(lang, "reportContactLower") }) });
      return;
    }

    setReportStatus({ stage: "loading", type: pending.type, message: t(lang, "reportLoadingParcela") });
    let result;
    try {
      result = await handleSearch(null, sessionData.clientReferenceId, true);
    } catch {
      result = null;
    }
    if (isCancelled()) return;
    if (!result || !result.parcelaData) {
      setReportStatus({ stage: "error", type: pending.type, retryable: true, message: t(lang, "reportReloadFailed", { rc: sessionData.clientReferenceId, contact: CONTACT }) });
      return;
    }

    setReportStatus({ stage: "generating", type: pending.type, message: t(lang, "reportGenerating") });
    try {
      const { generateReportBlob, downloadBlob } = await import("./visorReports");
      const marketRef = { precioM2: priceByProvince(result.parcelaData.provincia), ...MARKET_REF_META };
      const blob = await generateReportBlob(pending.type, {
        parcela: result.parcelaData,
        residual: result.residualData,
        risk: result.riskData,
        boeAlerts: result.boeData,
        matches: result.matchesData,
        params: result.params,
        marketRef,
        lang,
      });
      if (isCancelled()) return;
      const label = pending.type === "informe" ? "informe-investigado" : "teaser";
      downloadBlob(blob, `zrc-${label}-${result.parcelaData.rc}.pdf`);
      setReportStatus({ stage: "done", type: pending.type, message: t(lang, "reportDone") });
    } catch (err) {
      if (!isCancelled()) {
        setReportStatus({
          stage: "error", type: pending.type, retryable: true,
          message: t(lang, "reportPdfFailed", { rc: result.parcelaData.rc, contact: CONTACT, detail: err.message || t(lang, "unknown") }),
        });
      }
    }
  };

  const retryPendingReport = () => {
    if (!pendingReportCacheRef.current) return;
    runPendingReportFlow(pendingReportCacheRef.current);
  };

  useEffect(() => {
    if (!pendingReport?.sessionId || !pendingReport?.type) return;
    pendingReportCacheRef.current = pendingReport;
    runPendingReportFlow(pendingReport).finally(() => onReportHandled?.());
    return () => { pendingCancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReport]);

  const goToCheckout = (type) => {
    if (!parcela) return;
    const link = STRIPE_LINKS[type];
    const url = `${link}?client_reference_id=${encodeURIComponent(parcela.rc)}`;
    window.location.href = url;
  };

  // Standard/Early Bird son suscripciones de cuenta, no ligadas a una
  // parcela — necesitan email para poder comprobar el tier luego, así que
  // exigen login (requireAuth) igual que Intelligence/Institutional.
  const goToSubscription = (type) => {
    const link = STRIPE_LINKS[type];
    const open = () => {
      const email = auth?.user?.email;
      const url = email ? `${link}?prefilled_email=${encodeURIComponent(email)}` : link;
      window.location.href = url;
    };
    if (auth?.requireAuth) auth.requireAuth(open);
    else open();
  };

  const fmt = (n) => new Intl.NumberFormat(lang === "en" ? "en-GB" : "es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

  // ─── Modo 3D — render alternativo ───
  if (viewMode === "3D") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, paddingTop: 60 }}>
        <div style={{ position: "fixed", top: 60, left: 0, right: 0, bottom: 0 }}>
          <Suspense
            fallback={
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: C.gold, fontFamily: F.mono, fontSize: 12,
                letterSpacing: "0.18em", textTransform: "uppercase",
              }}>
                {t(lang, "loading3D")}
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
              lang={lang}
              onToggleLang={() => setLang(lang === "en" ? "es" : "en")}
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
      {reportStatus && <ReportStatusBanner status={reportStatus} lang={lang} onDismiss={() => setReportStatus(null)} onRetry={retryPendingReport} />}
      {/* HEADER */}
      <div className="zrc-visor-header">
        <div className="zrc-visor-header-row">
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 10 }}>
              {t(lang, "modulo")}
            </div>
            <h1 className="zrc-visor-title">
              {t(lang, "title")}
            </h1>
            <p style={{ margin: 0, color: C.textSec, fontSize: 15, fontWeight: 300, lineHeight: 1.55, maxWidth: 720 }}>
              {t(lang, "subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
            {/* Toggle idioma */}
            <button
              onClick={() => setLang(lang === "en" ? "es" : "en")}
              title="Español / English"
              style={{
                fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em",
                padding: "12px 16px", background: "none", color: C.textSec,
                border: `1px solid ${C.border}`, cursor: "pointer",
                textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              {t(lang, "langToggle")}
            </button>
            {/* Toggle 3D */}
            <button
              onClick={() => setViewMode("3D")}
              disabled={!parcela}
              title={parcela ? t(lang, "view3dTitleReady") : t(lang, "view3dTitleDisabled")}
              style={{
                fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em",
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
              {t(lang, "view3d")}
            </button>
            <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.2em", color: C.gold, border: `1px solid ${C.goldBorder}`, padding: "6px 14px" }}>
              {t(lang, "beta")}
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
            <label style={{ display: "block", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
              {t(lang, "rcLabel")}
            </label>
            <input
              ref={rcInputRef}
              type="text"
              value={rc}
              onChange={(e) => setRc(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder={t(lang, "rcPlaceholder")}
              maxLength={20}
              autoComplete="off"
              style={{
                width: "100%", padding: "12px 14px", fontFamily: F.mono, fontSize: 14,
                background: C.surface2, color: C.text, border: `1px solid ${C.border}`,
                marginBottom: 10, letterSpacing: "0.02em", boxSizing: "border-box", outline: "none",
              }}
            />
            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "12px", background: C.gold, color: C.bg,
                border: "none", fontFamily: F.mono, fontSize: 12, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? t(lang, "analyzing") : t(lang, "analyze")}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderLeft: `3px solid ${C.red}`, color: C.red, fontSize: 14 }}>
              {error}
            </div>
          )}

          {parcela && (
            <>
              {/* TABS */}
              <div className="zrc-visor-tabs-wrap">
              <nav className="zrc-visor-tabs">
                {[
                  { k: "ficha", label: t(lang, "tabFicha") },
                  { k: "residual", label: t(lang, "tabResidual") },
                  { k: "comparables", label: t(lang, "tabComparables"), locked: !hasComparables },
                  { k: "riesgos", label: t(lang, "tabRiesgos"), badge: risk?.overall },
                  { k: "boe", label: t(lang, "tabAlertas"), count: boeAlerts.length },
                  { k: "match", label: t(lang, "tabMatching"), count: matches.length, gold: true },
                  { k: "premercado", label: t(lang, "tabPremercado"), locked: !hasPreMercado },
                ].map((tab) => (
                  <button
                    key={tab.k}
                    onClick={() => setActiveTab(tab.k)}
                    style={{
                      background: "none", border: "none", padding: "10px 12px",
                      fontFamily: F.mono, fontSize: 11, fontWeight: 500,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: activeTab === tab.k ? C.gold : C.textMuted,
                      borderBottom: activeTab === tab.k ? `2px solid ${C.gold}` : "2px solid transparent",
                      cursor: "pointer", whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {tab.label}
                    {tab.locked && <span style={{ fontSize: 11 }}>🔒</span>}
                    {tab.badge && <RiskPill level={tab.badge} lang={lang} />}
                    {tab.count > 0 && (
                      <span style={{
                        fontSize: 10, background: tab.gold ? C.gold : C.surface3, color: tab.gold ? C.bg : C.text,
                        padding: "1px 6px", borderRadius: 8, fontFamily: F.mono,
                      }}>{tab.count}</span>
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
                  <PanelTitle>{t(lang, "panelFicha")}</PanelTitle>
                  <DataList rows={[
                    [t(lang, "fieldDireccion"), parcela.direccion],
                    [t(lang, "fieldMunicipio"), `${parcela.municipio}, ${parcela.provincia}`],
                    [t(lang, "fieldUso"), parcela.uso],
                    [t(lang, "fieldSuperficie"), parcela.superficie ? `${parcela.superficie.toLocaleString(lang === "en" ? "en-GB" : "es-ES")} m²` : "—"],
                    [t(lang, "fieldAntiguedad"), parcela.antiguedad],
                    ...(formatLocalizacionInterior(parcela, lang) ? [[t(lang, "fieldLocInterior"), formatLocalizacionInterior(parcela, lang)]] : []),
                    ...(parcela.coefParticipacion ? [[t(lang, "fieldCoefPart"), parcela.coefParticipacion]] : []),
                    [t(lang, "fieldRC"), <span style={{ fontFamily: F.mono, fontSize: 12 }}>{parcela.rc}</span>],
                  ]} />
                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                    <GhostBtn onClick={() => goToCheckout("teaser")}>{t(lang, "btnTeaser")}</GhostBtn>
                    <GhostBtn emphasis onClick={() => goToCheckout("informe")}>{t(lang, "btnInforme")}</GhostBtn>
                    <GhostBtn disabled>{t(lang, "btnExcel")}</GhostBtn>
                  </div>
                </Panel>
              )}

              {/* RESIDUAL */}
              {activeTab === "residual" && residual && (
                <Panel>
                  <PanelTitle dot>{t(lang, "panelResidualTitle")}</PanelTitle>
                  <PanelLead>{t(lang, "panelResidualLead")}</PanelLead>

                  <details style={{ marginBottom: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                    <summary style={{
                      cursor: "pointer", padding: "10px 12px", fontFamily: F.mono, fontSize: 11,
                      letterSpacing: "0.08em", textTransform: "uppercase", color: C.gold,
                    }}>
                      {t(lang, "residualHowTitle")}
                    </summary>
                    <div style={{ padding: "0 12px 12px" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>
                        {t(lang, "residualHowP1")}
                      </p>
                      <div style={{ fontFamily: F.mono, fontSize: 12, color: C.textMuted, lineHeight: 1.9, padding: "8px 10px", background: "rgba(43,36,24,0.06)", whiteSpace: "pre-line" }}>
                        {t(lang, "residualFormula")}<br />
                        <strong style={{ color: C.gold }}>{t(lang, "residualFormulaResult")}</strong>
                      </div>
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textMuted, lineHeight: 1.6, fontStyle: "italic" }}>
                        {t(lang, "residualHowP2")}
                      </p>
                    </div>
                  </details>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase" }}>{t(lang, "marketRefZone", { provincia: parcela.provincia })}</div>
                      <div style={{ fontFamily: F.display, fontSize: 19, color: C.gold, marginTop: 2 }}>{fmt(priceByProvince(parcela.provincia))}/m²</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, precioVenta: priceByProvince(parcela.provincia) })}
                      style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 10px", background: "none", color: C.gold, border: `1px solid ${C.goldBorder}`, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {t(lang, "useRef")}
                    </button>
                  </div>

                  <Slider label={t(lang, "sliderPrecioVenta", { value: fmt(params.precioVenta) })} min={1000} max={8000} step={100} value={params.precioVenta} onChange={(v) => setParams({ ...params, precioVenta: v })} />
                  <Slider label={t(lang, "sliderEdificabilidad", { value: params.edificabilidad.toFixed(2) })} min={0.3} max={3.5} step={0.05} value={params.edificabilidad} onChange={(v) => setParams({ ...params, edificabilidad: v })} />
                  <Slider label={t(lang, "sliderCosteConstruccion", { value: fmt(params.costeConstruccion) })} min={900} max={2400} step={50} value={params.costeConstruccion} onChange={(v) => setParams({ ...params, costeConstruccion: v })} />
                  <Slider label={t(lang, "sliderMargenPromotor", { value: (params.margenPromotor * 100).toFixed(0) })} min={0.10} max={0.30} step={0.01} value={params.margenPromotor} onChange={(v) => setParams({ ...params, margenPromotor: v })} />

                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
                    <DataList rows={[
                      [t(lang, "ingresosBrutos"), fmt(residual.ingresos)],
                      [t(lang, "costesTotales"), fmt(residual.costesTotales)],
                      [t(lang, "beneficioPromotor"), fmt(residual.beneficioPromotor)],
                    ]} />
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.border}` }}>
                      <DataList rows={[
                        [<strong style={{ color: C.gold }}>{t(lang, "valorResidualSuelo")}</strong>, <strong style={{ color: C.gold, fontSize: 15 }}>{fmt(residual.valorResidualSuelo)}</strong>],
                        [t(lang, "m2Suelo"), fmt(residual.valorResidualPorM2)],
                        [t(lang, "tirEstimada"), <span style={{ color: C.gold, fontFamily: F.mono }}>{residual.tirEstimada.toFixed(1)}%</span>],
                      ]} />
                    </div>
                  </div>
                  <InvestabilityBar score={residual.investabilityScore} tier={residual.investabilityTier} label={investabilityLabel(lang, residual.investabilityTier)} lang={lang} />
                  <p style={{ margin: "12px 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, fontStyle: "italic" }}>
                    {t(lang, "marketRefFooter", { fuente: MARKET_REF_META.fuente, periodo: MARKET_REF_META.periodo })}
                  </p>
                </Panel>
              )}

              {/* COMPARABLES */}
              {activeTab === "comparables" && (
                <Panel>
                  {hasComparables ? (
                    residual ? (
                      <ComparablesPanel
                        provincia={parcela.provincia}
                        precioRefM2={priceByProvince(parcela.provincia)}
                        precioVenta={params.precioVenta}
                        fmt={fmt}
                        lang={lang}
                      />
                    ) : (
                      <Empty>{t(lang, "comparablesEmpty")}</Empty>
                    )
                  ) : (
                    <PaywallCard
                      title={t(lang, "comparablesLocked")}
                      body={t(lang, "comparablesLockedBody")}
                      cta={t(lang, "comparablesLockedCta")}
                      onClick={() => goToSubscription("standard")}
                    />
                  )}
                </Panel>
              )}

              {/* RIESGOS */}
              {activeTab === "riesgos" && risk && (
                <Panel>
                  <PanelTitle>{t(lang, "panelRiesgosTitle")}</PanelTitle>
                  <PanelLead>{t(lang, "panelRiesgosLead")}</PanelLead>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {risk.factors.map((f) => <RiskItem key={f.key} f={f} lang={lang} />)}
                  </ul>
                </Panel>
              )}

              {/* BOE */}
              {activeTab === "boe" && (
                <Panel>
                  <PanelTitle>{t(lang, "panelAlertasTitle")}</PanelTitle>
                  <PanelLead>{t(lang, "panelAlertasLead")}</PanelLead>
                  {boeAlerts.length === 0 ? <Empty>{t(lang, "alertasEmpty")}</Empty> : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                      {boeAlerts.map((a) => <BOEItem key={a.id} a={a} lang={lang} />)}
                    </ul>
                  )}
                </Panel>
              )}

              {/* MATCHING */}
              {activeTab === "match" && (
                <Panel>
                  <PanelTitle>{t(lang, "panelMatchingTitle")}</PanelTitle>
                  <PanelLead>{t(lang, "panelMatchingLead")}</PanelLead>
                  {matches.length === 0 ? <Empty>{t(lang, "matchingEmpty")}</Empty> : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {matches.map((m) => <MatchItem key={m.id} m={m} lang={lang} />)}
                    </ul>
                  )}
                  <button style={{
                    width: "100%", marginTop: 16, padding: 12, background: C.gold, color: C.bg,
                    border: "none", fontFamily: F.mono, fontSize: 12, fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                  }}>
                    {t(lang, "solicitarIntroduccion")}
                  </button>
                </Panel>
              )}

              {/* PRE-MERCADO */}
              {activeTab === "premercado" && (
                <Panel>
                  {hasPreMercado ? (
                    <PreMercadoPanel parcela={parcela} lang={lang} />
                  ) : (
                    <PaywallCard
                      title={t(lang, "premercadoLockedTitle")}
                      body={t(lang, "premercadoLockedBody")}
                      cta={t(lang, "premercadoLockedCta")}
                      onClick={() => goToSubscription("earlybird")}
                    />
                  )}
                </Panel>
              )}
            </>
          )}

          {!parcela && !error && (
            <div style={{ marginTop: 24, padding: 18, background: C.surface2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}` }}>
              <div style={{ fontFamily: F.display, fontSize: 19, color: C.gold, marginBottom: 12 }}>{t(lang, "masInfoTitle")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <PlanRow
                  name={t(lang, "planStandardName")} price={t(lang, "planStandardPrice")} desc={t(lang, "planStandardDesc")}
                  active={tier === "visor_standard"} lang={lang}
                  onClick={() => goToSubscription("standard")}
                />
                <PlanRow
                  name={t(lang, "planProName")} price={t(lang, "planProPrice")} desc={t(lang, "planProDesc")}
                  lang={lang}
                  onClick={() => rcInputRef.current?.focus()}
                />
                <PlanRow
                  name={t(lang, "planEarlyName")} price={t(lang, "planEarlyPrice")} desc={t(lang, "planEarlyDesc")}
                  active={tier === "visor_earlybird"} lang={lang}
                  onClick={() => goToSubscription("earlybird")}
                />
              </div>
            </div>
          )}
        </aside>

        {/* MAPA */}
        <main className="zrc-visor-map-wrap">
          <MapContainer center={[40.4168, -3.7038]} zoom={6} scrollWheelZoom style={{ width: "100%", height: "100%", background: C.surface }}>
            <LayersControl position="topright">
              <BaseLayer checked name={t(lang, "mapCartoDark")}>
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </BaseLayer>
              <BaseLayer name={t(lang, "mapOSM")}>
                <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>
              <BaseLayer name={t(lang, "mapSatelite")}>
                <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </BaseLayer>
              <Overlay checked name={t(lang, "mapCatastro")}>
                <WMSTileLayer url={WMS.catastro} layers="Catastro" format="image/png" transparent version="1.1.1" opacity={0.7} />
              </Overlay>
              <Overlay name={t(lang, "mapInundaciones")}>
                <WMSTileLayer url={WMS.inundacion} layers="NZ.FloodPronePoint" format="image/png" transparent version="1.3.0" opacity={0.6} />
              </Overlay>
              <Overlay name={t(lang, "mapPlaneamiento")}>
                <WMSTileLayer url={WMS.planeamiento} layers="SIU:planeamiento" format="image/png" transparent version="1.3.0" opacity={0.5} />
              </Overlay>
              <Overlay name={t(lang, "mapPatrimonio")}>
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
          <div style={{ position: "absolute", bottom: 14, left: 14, background: "rgba(9,9,11,0.92)", color: C.text, padding: "6px 12px", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.08em", zIndex: 1000, pointerEvents: "none", border: `1px solid ${C.goldBorder}` }}>
            {t(lang, "mapWmsBadge")}
          </div>
        </main>
      </div>
      {showLeadModal && (
        <LeadModal
          parcela={parcela}
          lang={lang}
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
  <h3 style={{ fontFamily: F.display, fontWeight: 400, fontSize: 23, margin: "0 0 6px", color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
    {dot && <span style={{ width: 8, height: 8, background: C.gold, borderRadius: "50%" }} />}
    {children}
  </h3>
);
const PanelLead = ({ children }) => <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>{children}</p>;

const DataList = ({ rows }) => (
  <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 16px", margin: 0, fontSize: 14 }}>
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
    <label style={{ display: "block", fontSize: 13, color: C.text, marginBottom: 6, fontWeight: 500 }}>{label}</label>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(+e.target.value)}
      style={{ width: "100%", accentColor: C.gold, height: 4 }}
    />
  </div>
);

const ReportStatusBanner = ({ status, onDismiss, onRetry, lang }) => {
  const colors = { verifying: C.gold, loading: C.gold, generating: C.gold, done: C.green, error: C.red };
  const color = colors[status.stage] || C.gold;
  const title = status.type === "informe" ? t(lang, "reportInforme") : t(lang, "reportTeaser");
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 400,
      background: C.surface, border: `1px solid ${color}`, borderLeft: `4px solid ${color}`,
      padding: "12px 18px", display: "flex", alignItems: "center", gap: 14,
      maxWidth: "calc(100vw - 32px)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.14em", color, textTransform: "uppercase", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.text }}>{status.message}</div>
      </div>
      {status.stage === "error" && status.retryable && (
        <button
          onClick={onRetry}
          style={{
            padding: "6px 12px", background: "none", border: `1px solid ${color}`, color,
            fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
            textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {t(lang, "retry")}
        </button>
      )}
      {(status.stage === "done" || status.stage === "error") && (
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
};

const PaywallCard = ({ title, body, cta, onClick }) => (
  <div style={{ padding: 20, background: C.surface2, border: `1px dashed ${C.goldBorder}`, textAlign: "center" }}>
    <div style={{ fontSize: 23, marginBottom: 10 }}>🔒</div>
    <div style={{ fontFamily: F.display, fontSize: 19, color: C.text, marginBottom: 8 }}>{title}</div>
    <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: "0 0 16px" }}>{body}</p>
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px", background: C.gold, color: C.bg, border: "none",
        fontFamily: F.mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", cursor: "pointer",
      }}
    >
      {cta}
    </button>
  </div>
);

// Banda de mercado: min ── P25 ── mediana ── P75 ── max, con marcador de
// posición del precio de venta asumido en el cálculo residual.
const ComparablesPanel = ({ provincia, precioRefM2, precioVenta, fmt, lang }) => {
  const { band, percentile, posicionKey, comps } = buildComparables(precioRefM2, precioVenta);
  const markerPct = Math.max(2, Math.min(98, percentile));
  return (
    <>
      <PanelTitle dot>{t(lang, "comparablesTitle")}</PanelTitle>
      <PanelLead>{t(lang, "comparablesLead", { provincia })}</PanelLead>

      <div style={{ marginBottom: 18 }}>
        <div style={{ position: "relative", height: 8, background: C.surface3, borderRadius: 4, marginTop: 28 }}>
          <div style={{
            position: "absolute", left: `${markerPct}%`, top: -22, transform: "translateX(-50%)",
            fontFamily: F.mono, fontSize: 11, color: C.gold, whiteSpace: "nowrap", fontWeight: 600,
          }}>
            {fmt(precioVenta)}
          </div>
          <div style={{
            position: "absolute", left: `${markerPct}%`, top: -6, transform: "translateX(-50%)",
            width: 2, height: 20, background: C.gold,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, fontFamily: F.mono, color: C.textMuted }}>{fmt(band.min)}</span>
          <span style={{ fontSize: 10, fontFamily: F.mono, color: C.textMuted }}>P25</span>
          <span style={{ fontSize: 10, fontFamily: F.mono, color: C.textMuted }}>{lang === "en" ? "Median" : "Mediana"}</span>
          <span style={{ fontSize: 10, fontFamily: F.mono, color: C.textMuted }}>P75</span>
          <span style={{ fontSize: 10, fontFamily: F.mono, color: C.textMuted }}>{fmt(band.max)}</span>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 16, fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
        {t(lang, "comparablesPercentilePrefix")} <strong style={{ color: C.gold }}>{percentile}</strong>{t(lang, "comparablesPercentileSuffix", { posicion: t(lang, posicionKey) })}
      </div>

      <PanelTitle>{t(lang, "perfilesComparables")}</PanelTitle>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {comps.map((c) => (
          <li key={c.labelKey} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: C.surface2, borderLeft: `3px solid ${C.goldBorder}`, fontSize: 13 }}>
            <span style={{ color: C.textSec }}>{t(lang, c.labelKey)}</span>
            <strong style={{ color: C.text }}>{fmt(c.pricePerM2)}/m²</strong>
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5, fontStyle: "italic" }}>
        {t(lang, "comparablesFooter", { fuente: MARKET_REF_META.fuente, periodo: MARKET_REF_META.periodo })}
      </p>
    </>
  );
};

// Lista completa de mandatos activos ZRC (no solo los que superan el fit
// mínimo) — el valor de "pre-mercado" es ver toda la demanda institucional
// activa, no solo la que ya encaja con la parcela buscada.
const PreMercadoPanel = ({ parcela, lang }) => {
  const withFit = ZRC_MANDATOS.map((m) => ({ ...m, fit: m.fitFn(parcela) })).sort((a, b) => b.fit - a.fit);
  return (
    <>
      <PanelTitle dot>{t(lang, "panelPremercadoTitle")}</PanelTitle>
      <PanelLead>{t(lang, "panelPremercadoLead")}</PanelLead>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {withFit.map((m) => <MatchItem key={m.id} m={m} lang={lang} />)}
      </ul>
    </>
  );
};

const PlanRow = ({ name, price, desc, active, onClick, lang }) => (
  <button
    onClick={active ? undefined : onClick}
    style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
      width: "100%", textAlign: "left", background: "none",
      border: `1px solid ${active ? C.goldBorder : C.border}`,
      padding: "10px 12px", cursor: active ? "default" : "pointer",
    }}
  >
    <div>
      <div style={{ fontSize: 13, color: C.textSec }}>
        <span style={{ color: C.gold, fontWeight: 600 }}>{name}</span> · {price}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>
    </div>
    <span style={{
      flexShrink: 0, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "4px 8px", color: active ? C.green : C.gold, border: `1px solid ${active ? C.green : C.goldBorder}`,
    }}>
      {active ? t(lang, "planActive") : t(lang, "planElegir")}
    </span>
  </button>
);

const GhostBtn = ({ children, onClick, disabled, emphasis }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: emphasis ? C.goldDim : C.surface2, color: emphasis ? C.gold : C.text,
      border: `1px solid ${emphasis ? C.goldBorder : C.border}`,
      padding: "10px 14px", fontSize: 13, fontFamily: F.body,
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
  return <span style={{ fontSize: 10, padding: "1px 5px", background: `${colors[level]}22`, color: colors[level], borderRadius: 6, fontFamily: F.mono }}>{labels[level]}</span>;
};

const RiskItem = ({ f, lang }) => {
  const colors = { low: C.green, mid: C.amber, high: C.red };
  const labelKeys = { low: "riskLow", mid: "riskMid", high: "riskHigh" };
  return (
    <li style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "12px 14px", background: C.surface2, borderLeft: `3px solid ${colors[f.level]}` }}>
      <span style={{ fontSize: 19 }}>{f.icon}</span>
      <div>
        <strong style={{ display: "block", fontSize: 14, color: C.text, marginBottom: 2 }}>{t(lang, `risk_${f.key}_label`)}</strong>
        <span style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{t(lang, `risk_${f.key}_detail`)}</span>
      </div>
      <span style={{ fontFamily: F.mono, fontSize: 11, padding: "3px 8px", background: `${colors[f.level]}22`, color: colors[f.level], letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
        {t(lang, labelKeys[f.level])}
      </span>
    </li>
  );
};

const BOEItem = ({ a, lang }) => {
  const colors = { high: C.red, mid: C.amber, low: C.textMuted };
  return (
    <li style={{ padding: 14, background: C.surface2, borderLeft: `3px solid ${C.gold}` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.mono, fontSize: 10, padding: "2px 6px", background: `${colors[a.impact]}22`, color: colors[a.impact], letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{t(lang, `boe_${a.id}_impactLabel`)}</span>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: F.mono }}>{a.date}</span>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: F.mono }}>· {boeSource(lang, a)}</span>
      </div>
      <strong style={{ display: "block", fontSize: 14, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{boeTitle(lang, a)}</strong>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>{t(lang, `boe_${a.id}_summary`)}</p>
      <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.gold, textDecoration: "none", fontWeight: 500 }}>{t(lang, "verPublicacion")}</a>
    </li>
  );
};

const MatchItem = ({ m, lang }) => (
  <li style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 14, padding: 14, background: C.surface2, borderLeft: `3px solid ${C.gold}`, alignItems: "center" }}>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: `conic-gradient(${C.gold} ${m.fit}%, ${C.surface3} 0)`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 4, background: C.surface, borderRadius: "50%" }} />
        <span style={{ position: "relative", zIndex: 1, fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.gold }}>{m.fit}%</span>
      </div>
    </div>
    <div>
      <strong style={{ display: "block", fontSize: 14, color: C.text, marginBottom: 2 }}>{t(lang, `mandate_${m.id}_label`)}</strong>
      <span style={{ display: "block", fontSize: 11, color: C.textMuted, fontFamily: F.mono, marginBottom: 6 }}>{t(lang, `mandate_${m.id}_tipologia`)} · {t(lang, "ticketLabel")} {m.ticket}</span>
      <p style={{ margin: 0, fontSize: 12, color: C.textSec, lineHeight: 1.45 }}>{t(lang, `mandate_${m.id}_thesis`)}</p>
    </div>
  </li>
);

const Empty = ({ children }) => (
  <p style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic", padding: 14, textAlign: "center", background: C.surface2 }}>{children}</p>
);

const InvestabilityBar = ({ score, tier, label, lang }) => {
  const colorMap = { high: C.green, mid: C.gold, low: C.amber, reject: C.red };
  const color = colorMap[tier] || C.gold;
  return (
    <div style={{
      marginTop: 16, padding: 14, borderLeft: `4px solid ${color}`,
      background: `${color}10`, display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 14px", alignItems: "center",
    }}>
      <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>{t(lang, "investabilityScore")}</span>
      <strong style={{ fontSize: 25, fontFamily: F.display, fontWeight: 500, color }}>{score}/100</strong>
      <small style={{ gridColumn: "1 / -1", fontSize: 12, color: C.textSec, marginTop: 4 }}>{label}</small>
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
export function formatLocalizacionInterior(parcela, lang = "es") {
  const parts = [];
  if (parcela?.bloque) parts.push(`${t(lang, "bloque")} ${parcela.bloque}`);
  if (parcela?.escalera) parts.push(`${t(lang, "escalera")} ${parcela.escalera}`);
  if (parcela?.planta) parts.push(`${t(lang, "planta")} ${parcela.planta}`);
  if (parcela?.puerta) parts.push(`${t(lang, "puerta")} ${parcela.puerta}`);
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

  let tier = "reject";
  if (score >= 70) tier = "high";
  else if (score >= 45) tier = "mid";
  else if (score >= 25) tier = "low";

  return { ingresos, costesTotales, beneficioPromotor, valorResidualSuelo, valorResidualPorM2,
    tirEstimada, investabilityScore: score, investabilityTier: tier };
}

// investabilityTier se resuelve a texto en el idioma activo en el momento de
// renderizar (en vez de guardar el label ya traducido en el estado), para que
// cambiar de idioma no requiera repetir la búsqueda.
function investabilityLabel(lang, tier) {
  const key = { high: "investLabelHigh", mid: "investLabelMid", low: "investLabelLow", reject: "investLabelReject" }[tier] || "investLabelReject";
  return t(lang, key);
}

// label/detail se resuelven en el idioma activo en el momento de renderizar
// (t(lang, `risk_${key}_label|detail`)) en vez de guardarse ya traducidos aquí,
// para que cambiar de idioma no requiera repetir la búsqueda.
function buildRiskLayers(coords) {
  const factors = [
    { key: "flood", icon: "💧", level: pick(coords, 1, ["low","mid","low","low"]) },
    { key: "noise", icon: "🔊", level: pick(coords, 2, ["mid","low","mid","high"]) },
    { key: "bic",   icon: "🏛️", level: pick(coords, 3, ["low","low","mid","low"]) },
    { key: "soil",  icon: "🧪", level: pick(coords, 4, ["low","low","low","mid"]) },
    { key: "plan",  icon: "📐", level: pick(coords, 5, ["mid","high","mid","low"]) },
    { key: "lau",   icon: "🔑", level: pick(coords, 6, ["low","mid","low","low"]) },
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

// title/summary/source/impactLabel se resuelven vía boeTitle()/boeSource()/t()
// en el idioma activo — solo se guardan aquí los datos no traducibles.
function buildBOEAlerts(municipio, provincia, lang) {
  const today = new Date();
  const fmt = (d) => d.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES");
  return [
    { id: 1, municipio, isMadrid: provincia === "Madrid",
      date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18)),
      impact: "high", url: "https://boe.es" },
    { id: 2,
      date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 42)),
      impact: "mid", url: "https://boe.es" },
    { id: 3,
      date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 65)),
      impact: "low", url: "#" },
  ];
}

function boeTitle(lang, a) {
  return a.id === 1 ? t(lang, "boe_1_title", { municipio: a.municipio }) : t(lang, `boe_${a.id}_title`);
}
function boeSource(lang, a) {
  return a.id === 1 ? t(lang, a.isMadrid ? "boe_1_source_madrid" : "boe_1_source_default") : t(lang, `boe_${a.id}_source`);
}

// Mandatos activos de inversión ZRC — módulo compartido entre el matching
// reactivo (por parcela buscada) y el panel "Pre-mercado" de Early Bird,
// que muestra la lista completa independientemente del fit.
// label/tipologia/thesis se resuelven vía t(lang, `mandate_${id}_...`) al
// renderizar, no se guardan ya traducidos aquí.
const ZRC_MANDATOS = [
  { id: "M1", ticket: "8-25M€", fitFn: (p) => p.provincia === "Madrid" || p.provincia === "Barcelona" ? 88 : 35 },
  { id: "M2", ticket: "15-60M€", fitFn: (p) => p.provincia === "Málaga" ? 92 : 20 },
  { id: "M3", ticket: "20-80M€", fitFn: (p) => /agra|olivo|olivar|secano/i.test(p.uso || "") ? 95 : 10 },
  { id: "M4", ticket: "5-20M€", fitFn: (p) => p.superficie > 800 ? 75 : 40 },
  { id: "M5", ticket: "3-15M€", fitFn: (p) => /industrial|almac|nave/i.test(p.uso || "") ? 90 : 15 },
];

function matchAgainstZRCMandates(parcela) {
  return ZRC_MANDATOS.map((m) => ({ ...m, fit: m.fitFn(parcela) }))
    .filter((m) => m.fit >= 60).sort((a, b) => b.fit - a.fit);
}

// ============================================================
// COMPARABLES — banda de mercado modelada a partir del precio de
// referencia provincial (Ministerio de Vivienda/Idealista Data), NO de
// transacciones individuales reales (no tenemos acceso a un proveedor de
// comparables/MLS licenciado). Se etiqueta siempre como banda estimada.
// ============================================================
function buildComparables(precioRefM2, precioVentaAsumido) {
  const band = {
    min: precioRefM2 * 0.65,
    p25: precioRefM2 * 0.85,
    median: precioRefM2 * 1.00,
    p75: precioRefM2 * 1.18,
    max: precioRefM2 * 1.45,
  };
  const clamped = Math.max(band.min, Math.min(band.max, precioVentaAsumido));
  const percentile = Math.round(((clamped - band.min) / (band.max - band.min)) * 100);
  const posicionKey = precioVentaAsumido < band.p25 ? "posBelowP25"
    : precioVentaAsumido < band.median ? "posBetweenMinMedian"
    : precioVentaAsumido < band.p75 ? "posBetweenMedianP75"
    : "posAboveP75";
  const comps = [
    { labelKey: "compConservador", pricePerM2: band.p25 },
    { labelKey: "compMediana", pricePerM2: band.median },
    { labelKey: "compPrime", pricePerM2: band.p75 },
  ];
  return { band, percentile, posicionKey, comps };
}


// ============================================================
// LEAD MODAL
// ============================================================
function LeadModal({ parcela, onClose, onSubmit, lang }) {
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
      if (!resp.ok) throw new Error(data.error || t(lang, "leadErrorSend"));
      onSubmit();
    } catch (err) {
      setErrorMsg(err.message || t(lang, "leadErrorNetwork"));
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
        <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>
          {t(lang, "leadBadge")}
        </div>
        <h3 style={{ fontFamily: F.display, fontSize: 25, fontWeight: 400, margin: "0 0 12px", color: C.text }}>
          {t(lang, "leadTitle")}
        </h3>
        <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          {t(lang, "leadBody")}
        </p>
        {errorMsg && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(239,68,68,0.1)", borderLeft: `3px solid ${C.red}`, color: C.red, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email" required placeholder={t(lang, "leadEmailPlaceholder")}
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", background: C.surface2, color: C.text,
              border: `1px solid ${C.border}`, marginBottom: 10, fontSize: 14, fontFamily: F.body,
              boxSizing: "border-box", outline: "none",
            }}
          />
          <select required value={sector} onChange={(e) => setSector(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", background: C.surface2, color: C.text,
              border: `1px solid ${C.border}`, marginBottom: 14, fontSize: 14, fontFamily: F.body,
              boxSizing: "border-box", outline: "none", appearance: "none",
            }}>
            <option value="">{t(lang, "leadSectorPlaceholder")}</option>
            <option>{t(lang, "leadSectorPromotor")}</option>
            <option>{t(lang, "leadSectorFamilyOffice")}</option>
            <option>{t(lang, "leadSectorAsesoria")}</option>
            <option>{t(lang, "leadSectorAgencia")}</option>
            <option>{t(lang, "leadSectorInversor")}</option>
            <option>{t(lang, "leadSectorFondo")}</option>
            <option>{t(lang, "leadSectorOtro")}</option>
          </select>
          <button type="submit" disabled={submitting} style={{
            width: "100%", padding: 12, background: C.gold, color: C.bg, border: "none",
            fontFamily: F.mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? t(lang, "leadSubmitting") : t(lang, "leadSubmit")}
          </button>
        </form>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 16, background: "none", border: "none",
          fontSize: 23, color: C.textMuted, cursor: "pointer", lineHeight: 1, fontFamily: F.body,
        }}>x</button>
      </div>
    </div>
  );
}
