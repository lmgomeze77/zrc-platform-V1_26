// src/pages/labs/visorReports.jsx
// PDF de Teaser (9€) e Informe Investigado (30€) del Visor Inmobiliario.
// Generados 100% en el navegador con @react-pdf/renderer a partir de los
// mismos datos (parcela/residual/risk/boeAlerts/matches) ya calculados en
// RealEstateVisor — no hay lógica de negocio duplicada en el servidor.

import { Document, Page, View, Text, StyleSheet, pdf, Svg, Rect, Circle, Image } from "@react-pdf/renderer";
import { t } from "./visorI18n";

const GOLD = "#B8863E"; // versión oscurecida del gold de marca para que se lea bien en fondo blanco/impreso
const INK = "#18181B";
const MUTED = "#71717A";
const BORDER = "#E4E4E7";
const SOFT = "#FAFAF9";

const fmtCurrency = (lang) => (n) => new Intl.NumberFormat(lang === "en" ? "en-GB" : "es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const RISK_LABEL_KEY = { low: "riskLow", mid: "riskMid", high: "riskHigh" };
const RISK_COLOR = { low: "#16A34A", mid: "#D97706", high: "#DC2626" };

// Copias locales de los mismos resolutores de RealEstateVisor.jsx — se
// duplican (en vez de importarlas) para no acoplar este chunk lazy-loaded
// al de leaflet/mapa 2D, igual que ya se hace con formatLocalizacionInterior.
function boeTitle(lang, a) {
  return a.id === 1 ? t(lang, "boe_1_title", { municipio: a.municipio }) : t(lang, `boe_${a.id}_title`);
}
function boeSource(lang, a) {
  return a.id === 1 ? t(lang, a.isMadrid ? "boe_1_source_madrid" : "boe_1_source_default") : t(lang, `boe_${a.id}_source`);
}
function investabilityLabel(lang, tier) {
  const key = { high: "investLabelHigh", mid: "investLabelMid", low: "investLabelLow", reject: "investLabelReject" }[tier] || "investLabelReject";
  return t(lang, key);
}

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

function Header({ parcela, tag, lang }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.title}>{parcela.direccion}</Text>
        <Text style={s.subtitle}>{parcela.municipio}{parcela.provincia ? `, ${parcela.provincia}` : ""} · {t(lang, "fieldRC")} {parcela.rc}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.brand}>ZRC LABS</Text>
        <Text style={s.docTag}>{tag} · {new Date().toLocaleDateString(lang === "en" ? "en-GB" : "es-ES")}</Text>
      </View>
    </View>
  );
}

function Footer({ lang }) {
  return (
    <Text style={s.footer} fixed>
      {t(lang, "pdfFooter")}
    </Text>
  );
}

// Bloque/escalera/planta/puerta — solo presentes cuando el RC identifica una
// unidad dentro de un edificio (piso), no un inmueble completo o suelo.
// Copia local de la misma función en RealEstateVisor.jsx: se duplica (en vez
// de importarla) para no acoplar este chunk lazy-loaded al de leaflet/mapa 2D.
function formatLocalizacionInterior(parcela, lang) {
  const parts = [];
  if (parcela?.bloque) parts.push(`${t(lang, "bloque")} ${parcela.bloque}`);
  if (parcela?.escalera) parts.push(`${t(lang, "escalera")} ${parcela.escalera}`);
  if (parcela?.planta) parts.push(`${t(lang, "planta")} ${parcela.planta}`);
  if (parcela?.puerta) parts.push(`${t(lang, "puerta")} ${parcela.puerta}`);
  return parts.length ? parts.join(" · ") : null;
}

function FichaBox({ parcela, lang }) {
  const loint = formatLocalizacionInterior(parcela, lang);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{t(lang, "pdfDatosCatastrales")}</Text>
      <View style={s.row}>
        <View style={s.col}><Text style={s.label}>{t(lang, "pdfSuperficie")}</Text><Text style={s.value}>{parcela.superficie ? `${parcela.superficie.toLocaleString(lang === "en" ? "en-GB" : "es-ES")} m²` : "—"}</Text></View>
        <View style={s.col}><Text style={s.label}>{t(lang, "pdfUso")}</Text><Text style={s.value}>{parcela.uso || "—"}</Text></View>
      </View>
      <View style={s.row}>
        <View style={s.col}><Text style={s.label}>{t(lang, "pdfAntiguedad")}</Text><Text style={s.value}>{parcela.antiguedad || "—"}</Text></View>
        <View style={s.col}><Text style={s.label}>{t(lang, "pdfRefCatastral")}</Text><Text style={{ ...s.value, fontSize: 9 }}>{parcela.rc}</Text></View>
      </View>
      {(loint || parcela.coefParticipacion) && (
        <View style={s.row}>
          <View style={s.col}><Text style={s.label}>{t(lang, "pdfLocInterior")}</Text><Text style={s.value}>{loint || "—"}</Text></View>
          <View style={s.col}><Text style={s.label}>{t(lang, "pdfCoefPart")}</Text><Text style={s.value}>{parcela.coefParticipacion || "—"}</Text></View>
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

function ValorBox({ residual, marketRef, lang }) {
  const fmt = fmtCurrency(lang);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{t(lang, "pdfValoracionResidual")}</Text>
      <View style={s.box}>
        <Text style={s.label}>{t(lang, "pdfValorResidualSueloEstimado")}</Text>
        <Text style={s.bigValue}>{fmt(residual.valorResidualSuelo)}</Text>
        <Text style={{ ...s.value, color: MUTED, marginTop: 2 }}>{fmt(residual.valorResidualPorM2)}/m²</Text>
        <Text style={{ fontSize: 8, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>
          {t(lang, "pdfMetodoResidualNote")}
        </Text>
        {marketRef && (
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 8 }}>
            {t(lang, "pdfRefMercadoZona", { precioM2: fmt(marketRef.precioM2), fuente: marketRef.fuente, periodo: marketRef.periodo })}
          </Text>
        )}
      </View>
    </View>
  );
}

// Sustituye a ValorBox+InvestabilityBox cuando la parcela no tiene
// superficie edificable registrada (suelo en fase de urbanización) — el
// mismo guard que RealEstateVisor.jsx usa para no calcular el residual
// (`parcela?.superficie && params.precioVenta`). Antes esta sección
// simplemente desaparecía del teaser sin explicación.
function ValuationUnavailableBox({ marketRef, lang }) {
  const fmt = fmtCurrency(lang);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{t(lang, "pdfSinValoracionTitulo")}</Text>
      <View style={s.box}>
        <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{t(lang, "pdfSinValoracionNota")}</Text>
        {marketRef && (
          <Text style={{ fontSize: 9, color: INK, marginTop: 8 }}>
            {t(lang, "pdfRefMercadoZona", { precioM2: fmt(marketRef.precioM2), fuente: marketRef.fuente, periodo: marketRef.periodo })}
          </Text>
        )}
      </View>
    </View>
  );
}

// Grid compacto de las 6 capas de riesgo — solo etiqueta + nivel (sin el
// texto de detalle, que se queda exclusivo del Informe Investigado). Antes
// el teaser solo mostraba un semáforo agregado de 3 puntos sin desglosar
// qué factores lo componen.
function RiskFactorsGrid({ factors, lang }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
      {factors.map((f) => (
        <View key={f.key} style={{ width: "33.33%", flexDirection: "row", alignItems: "center", marginBottom: 6, paddingRight: 4 }}>
          <Svg width={8} height={8} style={{ marginRight: 5 }}>
            <Circle cx={4} cy={4} r={4} fill={RISK_COLOR[f.level]} />
          </Svg>
          <Text style={{ fontSize: 8, color: INK }}>{t(lang, `risk_${f.key}_label`)}</Text>
        </View>
      ))}
    </View>
  );
}

function InvestabilityBox({ residual, lang }) {
  const color = { high: "#16A34A", mid: GOLD, low: "#D97706", reject: "#DC2626" }[residual.investabilityTier] || GOLD;
  return (
    <View style={{ ...s.box, borderLeft: `4 solid ${color}` }}>
      <Text style={s.label}>{t(lang, "pdfInvestabilityScore")}</Text>
      <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color }}>{residual.investabilityScore}/100</Text>
      <ScoreGauge score={residual.investabilityScore} color={color} />
      <Text style={{ fontSize: 9, color: INK, marginTop: 2 }}>{investabilityLabel(lang, residual.investabilityTier)}</Text>
    </View>
  );
}

// ============================================================
// TEASER · 1 página
// ============================================================
export function TeaserDocument({ parcela, residual, risk, boeAlerts, marketRef, mapDataUrl, lang }) {
  const topAlert = boeAlerts?.[0];
  const additionalAlerts = boeAlerts && boeAlerts.length > 1 ? boeAlerts.length - 1 : 0;
  return (
    <Document title={t(lang, "pdfTeaserTitle", { direccion: parcela.direccion })}>
      <Page size="A4" style={s.page}>
        <Header parcela={parcela} tag={t(lang, "pdfTagTeaser")} lang={lang} />
        <LocationMap mapDataUrl={mapDataUrl} />
        <FichaBox parcela={parcela} lang={lang} />
        {residual ? (
          <>
            <ValorBox residual={residual} marketRef={marketRef} lang={lang} />
            <InvestabilityBox residual={residual} lang={lang} />
          </>
        ) : (
          <ValuationUnavailableBox marketRef={marketRef} lang={lang} />
        )}
        {topAlert && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t(lang, "pdfAlertaDestacada")}</Text>
            <View style={s.box}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>{boeTitle(lang, topAlert)}</Text>
              <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{t(lang, `boe_${topAlert.id}_summary`)}</Text>
            </View>
            {additionalAlerts > 0 && (
              <Text style={{ fontSize: 8, color: GOLD, fontFamily: "Helvetica-Bold", marginTop: 6 }}>
                {t(lang, "pdfAlertasAdicionales", { count: additionalAlerts })}
              </Text>
            )}
          </View>
        )}
        {risk?.overall && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t(lang, "pdfCapaRiesgo")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <RiskDots level={risk.overall} />
              <Text style={{ fontSize: 10 }}>
                {t(lang, "pdfNivelRiesgoGlobalPrefix")}<Text style={{ color: RISK_COLOR[risk.overall], fontFamily: "Helvetica-Bold" }}>{t(lang, RISK_LABEL_KEY[risk.overall])}</Text>{t(lang, "pdfNivelRiesgoGlobalSuffix")}
              </Text>
            </View>
            {risk.factors && <RiskFactorsGrid factors={risk.factors} lang={lang} />}
          </View>
        )}
        <View style={s.cta}>
          <Text style={s.ctaTitle}>{t(lang, "pdfCtaTitle")}</Text>
          <Text style={s.ctaBody}>
            {t(lang, "pdfCtaBody")}
          </Text>
        </View>
        <Footer lang={lang} />
      </Page>
    </Document>
  );
}

// ============================================================
// INFORME INVESTIGADO · multi-página
// ============================================================
export function InformeDocument({ parcela, residual, risk, boeAlerts, matches, params, marketRef, mapDataUrl, lang }) {
  const escenarios = residual ? buildScenarios(parcela, params) : [];
  const fmt = fmtCurrency(lang);
  return (
    <Document title={t(lang, "pdfInformeTitle", { direccion: parcela.direccion })}>
      <Page size="A4" style={s.page}>
        <Header parcela={parcela} tag={t(lang, "pdfTagInforme")} lang={lang} />
        <LocationMap mapDataUrl={mapDataUrl} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t(lang, "pdfResumenEjecutivo")}</Text>
          <View style={s.box}>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              {residual ? (
                <>
                  {t(lang, "pdfResumenConResidual", {
                    valor: fmt(residual.valorResidualSuelo),
                    valorM2: fmt(residual.valorResidualPorM2),
                    tir: residual.tirEstimada.toFixed(1),
                    label: investabilityLabel(lang, residual.investabilityTier),
                    score: residual.investabilityScore,
                  })}
                  {risk?.overall && t(lang, "pdfResumenRiesgoGlobal", { label: t(lang, RISK_LABEL_KEY[risk.overall]) })}
                  {boeAlerts?.length > 0 && t(lang, "pdfResumenAlertas", { count: boeAlerts.length })}
                </>
              ) : t(lang, "pdfResumenSinDatos")}
            </Text>
            {risk?.overall && <View style={{ marginTop: 8 }}><RiskDots level={risk.overall} /></View>}
          </View>
        </View>

        <FichaBox parcela={parcela} lang={lang} />
        {residual && <ValorBox residual={residual} marketRef={marketRef} lang={lang} />}
        {residual && <InvestabilityBox residual={residual} lang={lang} />}
        <Footer lang={lang} />
      </Page>

      {residual && (
        <Page size="A4" style={s.page}>
          <Header parcela={parcela} tag={t(lang, "pdfTagInforme")} lang={lang} />
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t(lang, "pdfCalculoResidualSensibilidad")}</Text>
            <View style={s.tableRow}>
              <Text style={s.tableCellLabel}>{t(lang, "pdfEscenario")}</Text>
              <Text style={s.tableCellValue}>{t(lang, "pdfPrecioVentaM2")}</Text>
              <Text style={s.tableCellValue}>{t(lang, "pdfCosteObraM2")}</Text>
              <Text style={s.tableCellValue}>{t(lang, "pdfValorResidual")}</Text>
            </View>
            {escenarios.map((e) => (
              <View key={e.nombreKey} style={s.tableRow}>
                <Text style={{ ...s.tableCellLabel, fontFamily: e.nombreKey === "pdfEscenarioBase" ? "Helvetica-Bold" : "Helvetica" }}>{t(lang, e.nombreKey)}</Text>
                <Text style={s.tableCellValue}>{fmt(e.precioVenta)}</Text>
                <Text style={s.tableCellValue}>{fmt(e.costeConstruccion)}</Text>
                <Text style={{ ...s.tableCellValue, fontFamily: "Helvetica-Bold" }}>{fmt(e.valorResidualSuelo)}</Text>
              </View>
            ))}
          </View>

          {risk?.factors && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t(lang, "pdfCapasRiesgoDetalle")}</Text>
              {risk.factors.map((f) => (
                <View key={f.key} style={{ ...s.tableRow, alignItems: "flex-start" }}>
                  <Text style={{ ...s.tableCellLabel, flex: 2, fontFamily: "Helvetica-Bold" }}>{t(lang, `risk_${f.key}_label`)}</Text>
                  <Text style={{ ...s.tableCellValue, flex: 1, textAlign: "left", color: RISK_COLOR[f.level], fontFamily: "Helvetica-Bold" }}>{t(lang, RISK_LABEL_KEY[f.level])}</Text>
                  <Text style={{ ...s.tableCellValue, flex: 4, textAlign: "left" }}>{t(lang, `risk_${f.key}_detail`)}</Text>
                </View>
              ))}
            </View>
          )}
          <Footer lang={lang} />
        </Page>
      )}

      <Page size="A4" style={s.page}>
        <Header parcela={parcela} tag={t(lang, "pdfTagInforme")} lang={lang} />
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t(lang, "pdfAlertasRegulatorias1km")}</Text>
          {boeAlerts && boeAlerts.length > 0 ? boeAlerts.map((a) => (
            <View key={a.id} style={s.box}>
              <View style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: MUTED, marginRight: 8 }}>{a.date}</Text>
                <Text style={{ fontSize: 8, color: MUTED }}>{boeSource(lang, a)} · {t(lang, `boe_${a.id}_impactLabel`)}</Text>
              </View>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>{boeTitle(lang, a)}</Text>
              <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{t(lang, `boe_${a.id}_summary`)}</Text>
            </View>
          )) : (
            <Text style={{ fontSize: 9, color: MUTED, fontStyle: "italic" }}>{t(lang, "pdfSinAlertasMunicipio")}</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t(lang, "pdfMatchingMandatosZRC")}</Text>
          <Text style={{ fontSize: 8, color: MUTED, fontStyle: "italic", marginBottom: 8 }}>{t(lang, "pdfMatchingMandatosNota")}</Text>
          {matches && matches.length > 0 ? matches.map((m) => (
            <View key={m.id} style={{ ...s.tableRow, alignItems: "flex-start" }}>
              <Text style={{ ...s.tableCellValue, flex: 1, textAlign: "left", fontFamily: "Helvetica-Bold", color: GOLD }}>{m.fit}%</Text>
              <View style={{ flex: 5 }}>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{t(lang, `mandate_${m.id}_label`)}</Text>
                <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{t(lang, `mandate_${m.id}_tipologia`)} · {t(lang, "pdfTicket")} {m.ticket}</Text>
                <Text style={{ fontSize: 9, color: INK, marginTop: 3, lineHeight: 1.4 }}>{t(lang, `mandate_${m.id}_thesis`)}</Text>
              </View>
            </View>
          )) : (
            <Text style={{ fontSize: 9, color: MUTED, fontStyle: "italic" }}>{t(lang, "pdfSinCoincidencias")}</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t(lang, "pdfMetodologiaFuentes")}</Text>
          <Text style={{ fontSize: 8, color: MUTED, lineHeight: 1.6 }}>
            {t(lang, "pdfMetodologiaBody", {
              fuente: marketRef?.fuente || "Ministerio de Vivienda y Agenda Urbana / Idealista Data",
              periodo: marketRef?.periodo || "T1 2026",
            })}
          </Text>
        </View>
        <Footer lang={lang} />
      </Page>
    </Document>
  );
}

function buildScenarios(parcela, params) {
  const variants = [
    { nombreKey: "pdfEscenarioConservador", precioVenta: params.precioVenta * 0.9, costeConstruccion: params.costeConstruccion * 1.1 },
    { nombreKey: "pdfEscenarioBase", precioVenta: params.precioVenta, costeConstruccion: params.costeConstruccion },
    { nombreKey: "pdfEscenarioOptimista", precioVenta: params.precioVenta * 1.1, costeConstruccion: params.costeConstruccion * 0.95 },
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
  try {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !coords) return null;
    const [lat, lng] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // Sin overlay de pin: "pin-s+COLOR(lon,lat)" lleva paréntesis/"+" sin
    // codificar en el path, que Safari/WebKit rechaza en fetch() con
    // "The string did not match the expected pattern".
    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng},${lat},15,0/1100x260@2x?access_token=${encodeURIComponent(token)}`;

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
    // Cualquier fallo (token, red, URL) nunca debe bloquear la generación
    // del PDF que el cliente ya ha pagado — se sirve sin mapa.
    return null;
  }
}

// ============================================================
// Helpers de generación/descarga
// ============================================================
export async function generateReportBlob(type, data) {
  let mapDataUrl = null;
  try {
    mapDataUrl = await fetchStaticMapDataUrl(data.parcela?.coords);
  } catch {
    mapDataUrl = null;
  }
  const Doc = type === "informe" ? InformeDocument : TeaserDocument;
  const instance = pdf(<Doc {...data} mapDataUrl={mapDataUrl} lang={data.lang || "es"} />);
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
