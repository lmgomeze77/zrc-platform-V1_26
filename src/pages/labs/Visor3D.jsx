// src/pages/labs/Visor3D.jsx
// ZRC Labs · Visor 3D — capa de visualización Mapbox GL JS
// Versión 2 — usa Standard Style v3 (edificios 3D nativos, sin necesidad de composite source)

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

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

const DEFAULT_VIEW = {
  center: [-3.7038, 40.4168],
  zoom: 15.5,
  pitch: 60,
  bearing: -25,
};

export default function Visor3D({ parcela, risk, residual, boeAlerts, marketRef, onClose }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const parcelaMarker = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/standard",
        ...DEFAULT_VIEW,
        antialias: true,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.current.addControl(
        new mapboxgl.AttributionControl({ compact: true, customAttribution: "ZRC Labs · Catastro" }),
        "bottom-right"
      );

      map.current.on("style.load", () => {
        try {
          map.current.setConfigProperty("basemap", "lightPreset", "dusk");
          map.current.setConfigProperty("basemap", "showPointOfInterestLabels", false);
          map.current.setConfigProperty("basemap", "showTransitLabels", false);
        } catch (e) {
          console.warn("Standard config not available:", e);
        }
        setMapReady(true);
      });

      map.current.on("error", (e) => {
        // Solo loguear, no mostrar overlay — los 403 secundarios de fuentes/sprites
        // no impiden que el mapa principal renderice
        console.warn("Mapbox warning:", e?.error?.status, e?.error?.url);
      });

    } catch (err) {
      console.error("Error creando mapa:", err);
      setErrorMsg(err.message);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !parcela?.coords) return;

    const [lat, lng] = parcela.coords;
    if (isNaN(lat) || isNaN(lng)) return;

    map.current.flyTo({
      center: [lng, lat], zoom: 17.5, pitch: 65, bearing: -20,
      speed: 0.8, curve: 1.6, essential: true,
    });

    if (parcelaMarker.current) parcelaMarker.current.remove();

    const el = document.createElement("div");
    el.style.cssText = `
      width: 14px; height: 14px; border-radius: 50%;
      background: ${C.gold}; border: 2px solid #FFF;
      box-shadow: 0 0 0 0 ${C.gold}; animation: zrcPulse 2.2s infinite;
    `;
    parcelaMarker.current = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current);
  }, [parcela, mapReady]);

  useEffect(() => {
    if (!mapReady || !map.current) return;

    try {
      if (!activeLayer) {
        map.current.setConfigProperty("basemap", "colorBuildingHighlight", "#36363F");
        map.current.setConfigProperty("basemap", "colorBuildingSelect", "#36363F");
      } else if (activeLayer === "risk") {
        map.current.setConfigProperty("basemap", "colorBuildingHighlight", C.red);
        map.current.setConfigProperty("basemap", "colorBuildingSelect", C.amber);
      } else if (activeLayer === "value") {
        map.current.setConfigProperty("basemap", "colorBuildingHighlight", C.gold);
        map.current.setConfigProperty("basemap", "colorBuildingSelect", "#7C3AED");
      } else if (activeLayer === "regulation") {
        map.current.setConfigProperty("basemap", "colorBuildingHighlight", C.amber);
        map.current.setConfigProperty("basemap", "colorBuildingSelect", C.green);
      }
    } catch (e) {
      // Silent fail
    }
  }, [activeLayer, mapReady]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: C.bg }}>
      <style>{`
        @keyframes zrcPulse {
          0% { box-shadow: 0 0 0 0 rgba(212,168,83,0.7); }
          70% { box-shadow: 0 0 0 18px rgba(212,168,83,0); }
          100% { box-shadow: 0 0 0 0 rgba(212,168,83,0); }
        }
        .mapboxgl-ctrl-attrib { background: rgba(9,9,11,0.7) !important; color: ${C.textMuted} !important; }
        .mapboxgl-ctrl-attrib a { color: ${C.gold} !important; }
        .mapboxgl-ctrl-group { background: ${C.surface} !important; border: 1px solid ${C.border} !important; }
        .mapboxgl-ctrl-group button { background-color: ${C.surface} !important; }
        .mapboxgl-ctrl-group button span { filter: invert(0.85); }

        .zrc-v3d-topbar {
          position: absolute; top: 16px; left: 16px; right: 80px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; row-gap: 10px; flex-wrap: wrap; pointer-events: none;
        }
        .zrc-v3d-topbar-left { pointer-events: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; row-gap: 8px; }
        .zrc-v3d-layers { pointer-events: auto; display: flex; gap: 4px; background: ${C.surface}; padding: 4px; border: 1px solid ${C.border}; }
        .zrc-v3d-layers button { flex: 1 1 auto; }

        .zrc-parcela-card {
          position: absolute; left: 28px; right: auto; bottom: 28px;
          width: 360px; max-width: calc(100vw - 56px);
        }
        .zrc-legend { position: absolute; bottom: 28px; right: 28px; }

        @media (max-width: 680px) {
          .zrc-v3d-topbar { right: 16px; }
          .zrc-v3d-badge { display: none; }
          .zrc-parcela-card {
            left: 12px; right: 12px; width: auto; max-width: none;
            bottom: max(12px, env(safe-area-inset-bottom));
            max-height: 46vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
          }
          .zrc-legend { display: none; }
        }
      `}</style>

      <div ref={mapContainer} style={{ position: "absolute", inset: 0 }} />

      {errorMsg && (
        <div style={{
          position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
          background: C.surface, border: `1px solid ${C.red}`, padding: "16px 24px",
          color: C.red, fontFamily: F.mono, fontSize: 12, letterSpacing: "0.04em",
          maxWidth: "80%", textAlign: "center", zIndex: 10,
        }}>{errorMsg}</div>
      )}

      <div className="zrc-v3d-topbar">
        <div className="zrc-v3d-topbar-left">
          <button onClick={onClose} style={{
            fontFamily: F.mono, fontSize: 10, letterSpacing: "0.16em",
            padding: "10px 14px", background: C.surface, color: C.gold,
            border: `1px solid ${C.goldBorder}`, cursor: "pointer",
            textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap",
          }}>← 2D View</button>

          <div className="zrc-v3d-badge" style={{
            padding: "8px 12px", background: C.surface, border: `1px solid ${C.border}`,
            fontFamily: F.mono, fontSize: 10, letterSpacing: "0.14em",
            color: C.textSec, textTransform: "uppercase", whiteSpace: "nowrap",
          }}>
            ZRC LABS · 3D VISOR <span style={{ color: C.gold, marginLeft: 8 }}>● LIVE</span>
          </div>
        </div>

        <div className="zrc-v3d-layers">
          <LayerToggle label="Riesgo" active={activeLayer === "risk"} onClick={() => setActiveLayer(activeLayer === "risk" ? null : "risk")} />
          <LayerToggle label="Valor" active={activeLayer === "value"} onClick={() => setActiveLayer(activeLayer === "value" ? null : "value")} />
          <LayerToggle label="Regulación" active={activeLayer === "regulation"} onClick={() => setActiveLayer(activeLayer === "regulation" ? null : "regulation")} />
        </div>
      </div>

      {parcela && (
        <ParcelaCard parcela={parcela} residual={residual} risk={risk} boeAlerts={boeAlerts} marketRef={marketRef} activeLayer={activeLayer} />
      )}

      {activeLayer && <Legend layer={activeLayer} />}
    </div>
  );
}

function LayerToggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em",
      padding: "8px 10px", textAlign: "center",
      background: active ? C.goldDim : "transparent",
      color: active ? C.gold : C.textSec,
      border: active ? `1px solid ${C.goldBorder}` : "1px solid transparent",
      cursor: "pointer", textTransform: "uppercase", fontWeight: 500,
      whiteSpace: "nowrap", transition: "all 0.15s ease",
    }}>{label}</button>
  );
}

function ParcelaCard({ parcela, residual, risk, boeAlerts, marketRef, activeLayer }) {
  const fmt = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="zrc-parcela-card" style={{
      background: `linear-gradient(180deg, rgba(17,17,19,0.95) 0%, rgba(9,9,11,0.97) 100%)`,
      border: `1px solid ${C.border}`,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 6 }}>
          PARCELA ACTIVA · RC {parcela.rc?.substring(0, 14)}
        </div>
        <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 400, color: C.text, lineHeight: 1.2 }}>
          {parcela.direccion}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, marginTop: 4 }}>
          {parcela.municipio}{parcela.provincia ? `, ${parcela.provincia}` : ""}
        </div>
      </div>

      <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Metric label="Superficie" value={parcela.superficie ? `${parcela.superficie.toLocaleString("es-ES")} m²` : "—"} />
        <Metric label="Uso" value={parcela.uso || "—"} />
        <Metric label="Antigüedad" value={parcela.antiguedad ? `${parcela.antiguedad}` : "—"} />
        <Metric label="Plantas" value="—" hint="Catastro pendiente" />
      </div>

      {activeLayer === "value" && residual && (
        <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${C.border}`, background: C.goldDim }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 4 }}>
            VALOR RESIDUAL
          </div>
          <div style={{ fontFamily: F.display, fontSize: 24, color: C.gold, fontWeight: 500 }}>
            {fmt(residual.valor || residual.valorResidualSuelo)}
          </div>
          {residual.valorResidualPorM2 && (
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textSec, marginTop: 2 }}>
              {fmt(residual.valorResidualPorM2)}/m²
            </div>
          )}
          {marketRef && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.goldBorder}` }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textSec }}>
                Ref. mercado zona: <strong style={{ color: C.text }}>{fmt(marketRef.precioM2)}/m²</strong>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted, marginTop: 2 }}>
                {marketRef.fuente} · {marketRef.periodo}
              </div>
            </div>
          )}
        </div>
      )}

      {activeLayer === "risk" && risk && (
        <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.18em", color: C.amber, textTransform: "uppercase", marginBottom: 6 }}>
            CAPA DE RIESGO
          </div>
          {risk.factors ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {risk.factors.slice(0, 4).map((f, i) => (
                <div key={i} style={{
                  fontSize: 10, fontFamily: F.mono, letterSpacing: "0.08em",
                  padding: "4px 8px", background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${f.level === "high" ? C.red : f.level === "mid" ? C.amber : C.green}33`,
                  color: f.level === "high" ? C.red : f.level === "mid" ? C.amber : C.green,
                  textTransform: "uppercase",
                }}>{f.label}: {f.level}</div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>
              Cargando capas de riesgo…
            </div>
          )}
        </div>
      )}

      {activeLayer === "regulation" && (
        <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.18em", color: C.gold, textTransform: "uppercase", marginBottom: 6 }}>
            ALERTAS BOE
          </div>
          {boeAlerts && boeAlerts.length > 0 ? (
            boeAlerts.slice(0, 3).map((a, i) => (
              <div key={i} style={{ fontSize: 11, color: C.textSec, padding: "4px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                {a.title || a.summary?.substring(0, 80)}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>
              Sin alertas regulatorias activas en el municipio.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: "0.16em", color: C.textMuted, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: F.body, fontSize: 13, color: C.text, marginTop: 2 }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textMuted, marginTop: 1, fontStyle: "italic" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Legend({ layer }) {
  const configs = {
    risk: { title: "Riesgo (mock)", stops: [
      { color: "#22C55E", label: "Bajo" }, { color: "#F59E0B", label: "Medio" }, { color: "#EF4444", label: "Alto" },
    ]},
    value: { title: "Valor €/m² (ref. mercado)", stops: [
      { color: "#312E81", label: "1500" }, { color: "#7C3AED", label: "3000" }, { color: "#D4A853", label: "5000+" },
    ]},
    regulation: { title: "Regulación (mock)", stops: [
      { color: "#22C55E", label: "Sin alertas" }, { color: "#D4A853", label: "Vigentes" }, { color: "#EF4444", label: "Restrictivas" },
    ]},
  };
  const cfg = configs[layer];
  if (!cfg) return null;

  return (
    <div className="zrc-legend" style={{
      background: C.surface, border: `1px solid ${C.border}`,
      padding: "12px 16px",
      fontFamily: F.mono, fontSize: 9, letterSpacing: "0.14em",
      textTransform: "uppercase",
    }}>
      <div style={{ color: C.gold, marginBottom: 8, fontWeight: 600 }}>{cfg.title}</div>
      <div style={{ display: "flex", gap: 12 }}>
        {cfg.stops.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
            <span style={{ color: C.textSec }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
