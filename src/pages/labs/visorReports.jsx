// src/pages/labs/visorReports.jsx
// PDF de Teaser (9€) e Informe Investigado (30€) del Visor Inmobiliario.
// Generados 100% en el navegador con @react-pdf/renderer a partir de los
// mismos datos (parcela/residual/risk/boeAlerts/matches) ya calculados en
// RealEstateVisor — no hay lógica de negocio duplicada en el servidor.

import { Document, Page, View, Text, StyleSheet, pdf, Svg, Rect, Circle, Image } from "@react-pdf/renderer";

const GOLD = "#B8863E"; // versión oscurecida del gold de marca para que se lea bien en fondo blanco/impreso
const INK = "#18181B";
const MUTED = "#71717A";
const BORDER = "#E4E4E7";
const SOFT = "#FAFAF9";

const fmt = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const RISK_LABEL = { low: "Bajo", mid: "Medio", high: "Alto" };
const RISK_COLOR = { low: "#16A34A", mid: "#D97706", high: "#DC2626" };

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2 solid ${GOLD}`, paddingBottom: 12, marginBottom: 18 },
  brand: { fontSize: 9, letterSpacing: 2, color: GOLD, fontFamily: "Helvetica-Bold" },
  docTag: { fontSize: 8, letterSpacing: 1.5, color: MUTED, marginTop: 4 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: MUTED },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 8, borderBottom: `1 solid ${BORDER}`, paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 6 },
  col: { flex: 1 },
  label: { fontSize: 8, color: MUTED, letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 11, color: INK },
  bigValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD },
  box: { backgroundColor: SOFT, border: `1 solid ${BORDER}`, padding: 12, marginBottom: 12 },
  pill: { fontSize: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3 },
  tableRow: { flexDirection: "row", borderBottom: `1 solid ${BORDER}`, paddingVertical: 6 },
  tableCellLabel: { flex: 2, fontSize: 9, color: MUTED },
  tableCellValue: { flex: 3, fontSize: 9, color: INK, textAlign: "right" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: MUTED, borderTop: `1 solid ${BORDER}`, paddingTop: 8 },
  cta: { marginTop: 8, padding: 12, backgroundColor: "#1C1917", color: "#F5F0E6" },
  ctaTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 4 },
  ctaBody: { fontSize: 9, color: "#D6D3D1", lineHeight: 1.4 },
});

function Header({ parcela, tag }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.title}>{parcela.direccion}</Text>
        <Text style={s.subtitle}>{parcela.municipio}{parcela.provincia ? `, ${parcela.provincia}` : ""} · RC {parcela.rc}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.brand}>ZRC LABS</Text>
        <Text style={s.docTag}>{tag} · {new Date().toLocaleDateString("es-ES")}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <Text style={s.footer} fixed>
      Generado automáticamente por el Visor Inmobiliario Georreferenciado de ZRC Labs (Zenith Rise Capital). Estimación
      orientativa a partir de datos catastrales públicos y precios de referencia provinciales — no sustituye una tasación
      oficial ni constituye asesoramiento de inversión.
    </Text>
  );
}

// Bloque/escalera/planta/puerta — solo presentes cuando el RC identifica una
// unidad dentro de un edificio (piso), no un inmueble completo o suelo.
// Copia local de la misma función en RealEstateVisor.jsx: se duplica (en vez
// de importarla) para no acoplar este chunk lazy-loaded al de leaflet/mapa 2D.
function formatLocalizacionInterior(parcela) {
  const parts = [];
  if (parcela?.bloque) parts.push(`Bloque ${parcela.bloque}`);
  if (parcela?.escalera) parts.push(`Esc. ${parcela.escalera}`);
  if (parcela?.planta) parts.push(`Planta ${parcela.planta}`);
  if (parcela?.puerta) parts.push(`Puerta ${parcela.puerta}`);
  return parts.length ? parts.join(" · ") : null;
}

function FichaBox({ parcela }) {
  const loint = formatLocalizacionInterior(parcela);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Datos catastrales</Text>
      <View style={s.row}>
        <View style={s.col}><Text style={s.label}>SUPERFICIE</Text><Text style={s.value}>{parcela.superficie ? `${parcela.superficie.toLocaleString("es-ES")} m²` : "—"}</Text></View>
        <View style={s.col}><Text style={s.label}>USO</Text><Text style={s.value}>{parcela.uso || "—"}</Text></View>
      </View>
      <View style={s.row}>
        <View style={s.col}><Text style={s.label}>ANTIGÜEDAD</Text><Text style={s.value}>{parcela.antiguedad || "—"}</Text></View>
        <View style={s.col}><Text style={s.label}>REFERENCIA CATASTRAL</Text><Text style={{ ...s.value, fontSize: 9 }}>{parcela.rc}</Text></View>
      </View>
      {(loint || parcela.coefParticipacion) && (
        <View style={s.row}>
          <View style={s.col}><Text style={s.label}>LOCALIZACIÓN INTERIOR</Text><Text style={s.value}>{loint || "—"}</Text></View>
          <View style={s.col}><Text style={s.label}>COEF. PARTICIPACIÓN</Text><Text style={s.value}>{parcela.coefParticipacion || "—"}</Text></View>
        </View>
      )}
    </View>
  );
}

function LocationMap({ mapDataUrl }) {
  if (!mapDataUrl) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Image src={mapDataUrl} style={{ width: "100%", height: 130, objectFit: "cover" }} />
    </View>
  );
}

// Barra horizontal 0-100 para el Investability Score.
function ScoreGauge({ score, color }) {
  const width = 240, height = 10, filled = Math.max(0, Math.min(100, score)) / 100 * width;
  return (
    <Svg width={width} height={height} style={{ marginTop: 6, marginBottom: 6 }}>
      <Rect x={0} y={0} width={width} height={height} rx={5} fill={BORDER} />
      <Rect x={0} y={0} width={filled} height={height} rx={5} fill={color} />
    </Svg>
  );
}

// Semáforo de 3 puntos para el nivel de riesgo global (bajo/medio/alto).
function RiskDots({ level }) {
  const levels = ["low", "mid", "high"];
  const active = levels.indexOf(level);
  return (
    <Svg width={70} height={16}>
      {levels.map((lv, i) => (
        <Circle key={lv} cx={10 + i * 26} cy={8} r={i === active ? 7 : 5} fill={i === active ? RISK_COLOR[lv] : BORDER} />
      ))}
    </Svg>
  );
}

function ValorBox({ residual, marketRef }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Valoración residual</Text>
      <View style={s.box}>
        <Text style={s.label}>VALOR RESIDUAL DEL SUELO (ESTIMADO)</Text>
        <Text style={s.bigValue}>{fmt(residual.valorResidualSuelo)}</Text>
        <Text style={{ ...s.value, color: MUTED, marginTop: 2 }}>{fmt(residual.valorResidualPorM2)}/m²</Text>
        {marketRef && (
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 8 }}>
            Ref. mercado zona: {fmt(marketRef.precioM2)}/m² · {marketRef.fuente} · {marketRef.periodo}
          </Text>
        )}
      </View>
    </View>
  );
}

function InvestabilityBox({ residual }) {
  const color = { high: "#16A34A", mid: GOLD, low: "#D97706", reject: "#DC2626" }[residual.investabilityTier] || GOLD;
  return (
    <View style={{ ...s.box, borderLeft: `4 solid ${color}` }}>
      <Text style={s.label}>INVESTABILITY SCORE</Text>
      <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color }}>{residual.investabilityScore}/100</Text>
      <ScoreGauge score={residual.investabilityScore} color={color} />
      <Text style={{ fontSize: 9, color: INK, marginTop: 2 }}>{residual.investabilityLabel}</Text>
    </View>
  );
}

// ============================================================
// TEASER · 1 página
// ============================================================
export function TeaserDocument({ parcela, residual, risk, boeAlerts, marketRef, mapDataUrl }) {
  const topAlert = boeAlerts?.[0];
  return (
    <Document title={`Teaser · ${parcela.direccion}`}>
      <Page size="A4" style={s.page}>
        <Header parcela={parcela} tag="TEASER" />
        <LocationMap mapDataUrl={mapDataUrl} />
        <FichaBox parcela={parcela} />
        {residual && <ValorBox residual={residual} marketRef={marketRef} />}
        {residual && <InvestabilityBox residual={residual} />}
        {topAlert && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Alerta regulatoria destacada</Text>
            <View style={s.box}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>{topAlert.title}</Text>
              <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{topAlert.summary}</Text>
            </View>
          </View>
        )}
        {risk?.overall && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Capa de riesgo</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <RiskDots level={risk.overall} />
              <Text style={{ fontSize: 10 }}>
                Nivel de riesgo global: <Text style={{ color: RISK_COLOR[risk.overall], fontFamily: "Helvetica-Bold" }}>{RISK_LABEL[risk.overall]}</Text> — desglose completo de los 6 factores en el Informe Investigado.
              </Text>
            </View>
          </View>
        )}
        <View style={s.cta}>
          <Text style={s.ctaTitle}>¿Quieres el análisis completo?</Text>
          <Text style={s.ctaBody}>
            El Informe Investigado (30€) incluye el desglose completo de las 6 capas de riesgo, todas las alertas
            regulatorias del radio de 1km, el cálculo residual con 3 escenarios de sensibilidad y el matching completo
            con mandatos activos de inversión ZRC.
          </Text>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

// ============================================================
// INFORME INVESTIGADO · multi-página
// ============================================================
export function InformeDocument({ parcela, residual, risk, boeAlerts, matches, params, marketRef, mapDataUrl }) {
  const escenarios = residual ? buildScenarios(parcela, params) : [];
  return (
    <Document title={`Informe Investigado · ${parcela.direccion}`}>
      <Page size="A4" style={s.page}>
        <Header parcela={parcela} tag="INFORME INVESTIGADO" />
        <LocationMap mapDataUrl={mapDataUrl} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumen ejecutivo</Text>
          <View style={s.box}>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              {residual ? (
                <>
                  Valor residual estimado de <Text style={{ fontFamily: "Helvetica-Bold" }}>{fmt(residual.valorResidualSuelo)}</Text> ({fmt(residual.valorResidualPorM2)}/m²)
                  con una TIR estimada a 24 meses del {residual.tirEstimada.toFixed(1)}%. Veredicto: <Text style={{ fontFamily: "Helvetica-Bold", color: GOLD }}>{residual.investabilityLabel}</Text> (score {residual.investabilityScore}/100).
                  {risk?.overall && <> Riesgo global: <Text style={{ fontFamily: "Helvetica-Bold" }}>{RISK_LABEL[risk.overall]}</Text>.</>}
                  {boeAlerts?.length > 0 && <> Se han detectado {boeAlerts.length} alertas regulatorias en el radio de 1km.</>}
                </>
              ) : "Sin datos de superficie suficientes para calcular el valor residual."}
            </Text>
            {risk?.overall && <View style={{ marginTop: 8 }}><RiskDots level={risk.overall} /></View>}
          </View>
        </View>

        <FichaBox parcela={parcela} />
        {residual && <ValorBox residual={residual} marketRef={marketRef} />}
        {residual && <InvestabilityBox residual={residual} />}
        <Footer />
      </Page>

      {residual && (
        <Page size="A4" style={s.page}>
          <Header parcela={parcela} tag="INFORME INVESTIGADO" />
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cálculo residual — parámetros y sensibilidad</Text>
            <View style={s.tableRow}>
              <Text style={s.tableCellLabel}>Escenario</Text>
              <Text style={s.tableCellValue}>Precio venta/m²</Text>
              <Text style={s.tableCellValue}>Coste obra/m²</Text>
              <Text style={s.tableCellValue}>Valor residual</Text>
            </View>
            {escenarios.map((e) => (
              <View key={e.nombre} style={s.tableRow}>
                <Text style={{ ...s.tableCellLabel, fontFamily: e.nombre === "Base" ? "Helvetica-Bold" : "Helvetica" }}>{e.nombre}</Text>
                <Text style={s.tableCellValue}>{fmt(e.precioVenta)}</Text>
                <Text style={s.tableCellValue}>{fmt(e.costeConstruccion)}</Text>
                <Text style={{ ...s.tableCellValue, fontFamily: "Helvetica-Bold" }}>{fmt(e.valorResidualSuelo)}</Text>
              </View>
            ))}
          </View>

          {risk?.factors && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Capas de riesgo — detalle completo</Text>
              {risk.factors.map((f) => (
                <View key={f.key} style={{ ...s.tableRow, alignItems: "flex-start" }}>
                  <Text style={{ ...s.tableCellLabel, flex: 2, fontFamily: "Helvetica-Bold" }}>{f.label}</Text>
                  <Text style={{ ...s.tableCellValue, flex: 1, textAlign: "left", color: RISK_COLOR[f.level], fontFamily: "Helvetica-Bold" }}>{RISK_LABEL[f.level]}</Text>
                  <Text style={{ ...s.tableCellValue, flex: 4, textAlign: "left" }}>{f.detail}</Text>
                </View>
              ))}
            </View>
          )}
          <Footer />
        </Page>
      )}

      <Page size="A4" style={s.page}>
        <Header parcela={parcela} tag="INFORME INVESTIGADO" />
        <View style={s.section}>
          <Text style={s.sectionTitle}>Alertas regulatorias (radio 1km)</Text>
          {boeAlerts && boeAlerts.length > 0 ? boeAlerts.map((a) => (
            <View key={a.id} style={s.box}>
              <View style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: MUTED, marginRight: 8 }}>{a.date}</Text>
                <Text style={{ fontSize: 8, color: MUTED }}>{a.source} · {a.impactLabel}</Text>
              </View>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>{a.title}</Text>
              <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{a.summary}</Text>
            </View>
          )) : (
            <Text style={{ fontSize: 9, color: MUTED, fontStyle: "italic" }}>Sin alertas regulatorias activas en el municipio.</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Matching con mandatos ZRC</Text>
          {matches && matches.length > 0 ? matches.map((m) => (
            <View key={m.id} style={{ ...s.tableRow, alignItems: "flex-start" }}>
              <Text style={{ ...s.tableCellValue, flex: 1, textAlign: "left", fontFamily: "Helvetica-Bold", color: GOLD }}>{m.fit}%</Text>
              <View style={{ flex: 5 }}>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{m.label}</Text>
                <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{m.tipologia} · ticket {m.ticket}</Text>
                <Text style={{ fontSize: 9, color: INK, marginTop: 3, lineHeight: 1.4 }}>{m.thesis}</Text>
              </View>
            </View>
          )) : (
            <Text style={{ fontSize: 9, color: MUTED, fontStyle: "italic" }}>Sin coincidencias por tipología o ticket con los mandatos activos.</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Metodología y fuentes</Text>
          <Text style={{ fontSize: 8, color: MUTED, lineHeight: 1.6 }}>
            Datos catastrales: Dirección General del Catastro (Sede Electrónica). Precio de referencia de zona:{" "}
            {marketRef?.fuente || "Ministerio de Vivienda y Agenda Urbana / Idealista Data"} · {marketRef?.periodo || "T1 2026"}.
            Valor residual calculado mediante el método residual estático (ingresos por venta menos costes de
            construcción e indirectos menos beneficio exigido al promotor) sobre la edificabilidad y parámetros
            indicados; no incorpora el planeamiento urbanístico específico de la parcela ni cargas registrales.
            Capas de riesgo y alertas regulatorias son una primera lectura automatizada orientada a due diligence
            preliminar. Este informe no sustituye una tasación oficial, un informe de arquitecto/aparejador ni
            asesoramiento legal o de inversión.
          </Text>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

function buildScenarios(parcela, params) {
  const variants = [
    { nombre: "Conservador", precioVenta: params.precioVenta * 0.9, costeConstruccion: params.costeConstruccion * 1.1 },
    { nombre: "Base", precioVenta: params.precioVenta, costeConstruccion: params.costeConstruccion },
    { nombre: "Optimista", precioVenta: params.precioVenta * 1.1, costeConstruccion: params.costeConstruccion * 0.95 },
  ];
  return variants.map((v) => {
    const p = { ...params, precioVenta: v.precioVenta, costeConstruccion: v.costeConstruccion };
    const supEdif = parcela.superficie * p.edificabilidad;
    const ingresos = supEdif * p.precioVenta;
    const costesTotales = supEdif * p.costeConstruccion * (1 + p.costesIndirectos);
    const beneficioPromotor = ingresos * p.margenPromotor;
    const valorResidualSuelo = ingresos - costesTotales - beneficioPromotor;
    return { ...v, valorResidualSuelo };
  });
}

// ============================================================
// Mapa de ubicación (Mapbox Static Images API)
// ============================================================
// Requiere VITE_MAPBOX_TOKEN en build time (mismo token que usa Visor3D).
// Se degrada a "sin mapa" en cualquier fallo — nunca bloquea la generación
// del PDF por un problema de red o de token.
async function fetchStaticMapDataUrl(coords) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token || !coords) return null;
  const [lat, lng] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const marker = `pin-s+D4A853(${lng},${lat})`;
  const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${marker}/${lng},${lat},15,0/1100x260@2x?access_token=${encodeURIComponent(token)}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============================================================
// Helpers de generación/descarga
// ============================================================
export async function generateReportBlob(type, data) {
  const mapDataUrl = await fetchStaticMapDataUrl(data.parcela?.coords);
  const Doc = type === "informe" ? InformeDocument : TeaserDocument;
  const instance = pdf(<Doc {...data} mapDataUrl={mapDataUrl} />);
  return instance.toBlob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
