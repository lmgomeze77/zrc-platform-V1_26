import { COUNTRY_PROFILES, PILLAR_META, COUNTRY_PROFILE_UPDATED_AT } from "./countryRiskProfiles.js";
// Standalone, offline printable investment brief. Never interpolates raw HTML.
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
const safeNumber = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "N/D";
export function buildGeoRiskInvestmentReport(brief) {
  const b = brief && typeof brief === "object" ? brief : {};
  const e = escapeHtml;
  const drivers = Array.isArray(b.drivers) ? b.drivers.slice(0,6) : [];
  const rows = drivers.map(d => `<tr><td>${e(d.label)}</td><td>${safeNumber(d.impact)} (simulado)</td></tr>`).join("");
  const primary = COUNTRY_PROFILES.find(p => p.name.toLocaleLowerCase("es") === String(b.country || "").trim().toLocaleLowerCase("es"));
  const comparison = COUNTRY_PROFILES.find(p => p.name.toLocaleLowerCase("es") === String(b.comparison || "").trim().toLocaleLowerCase("es"));
  const pillarKeys = ["structural","conflict","macro","market","qualitative"];
  const countryRows = primary && comparison ? pillarKeys.map(key => {
    const left = primary.pillars?.[key]?.score, right = comparison.pillars?.[key]?.score;
    return `<tr><th>${e(PILLAR_META[key].label)}</th><td>${safeNumber(left)}</td><td>${safeNumber(right)}</td><td>${Number.isFinite(left) && Number.isFinite(right) ? (left-right>0?"+":"")+safeNumber(left-right) : "N/D"}</td></tr>`;
  }).join("") : "";
  const countryComparison = primary && comparison ? `<p>Mayor puntuación editorial = mayor riesgo estimado. Diferencia = ${e(primary.name)} menos ${e(comparison.name)}. Referencia editorial: ${e(COUNTRY_PROFILE_UPDATED_AT)}; consulta las fechas propias de cada pilar en las fichas originales.</p><table><thead><tr><th>Pilar</th><th>${e(primary.name)}</th><th>${e(comparison.name)}</th><th>Diferencia</th></tr></thead><tbody>${countryRows}</tbody></table><p><strong>Qué vigilar en ${e(primary.name)}:</strong> ${e(primary.watch?.[0] || "Sin información")} <strong>Qué vigilar en ${e(comparison.name)}:</strong> ${e(comparison.watch?.[0] || "Sin información")}</p><p><a href="${e(primary.source?.href || "#")}">Fuente de ${e(primary.name)}</a> · <a href="${e(comparison.source?.href || "#")}">Fuente de ${e(comparison.name)}</a></p>` : `<p>No hay dos fichas editoriales comparables para estos países. Selecciona países con ficha ZRC disponible para ver diferencias por pilar. No se infiere una ventaja numérica.</p>`;
  const date = /^\d{4}-\d{2}-\d{2}/.test(b.savedAt || "") ? b.savedAt.slice(0,10) : "Sin fecha";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GeoRisk | ${e(b.name)}</title>
  <style>body{font:15px/1.65 system-ui,-apple-system,sans-serif;max-width:850px;margin:45px auto;padding:0 25px;color:#1e293b}h1{color:#0f2745;font-size:29px}h2{font-size:18px;margin-top:32px;border-bottom:1px solid #cbd5e1;padding-bottom:8px}header{border-bottom:4px solid #b58d4a;padding-bottom:16px}.eyebrow{color:#866c3c;font-size:12px;letter-spacing:.14em;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{padding:15px;background:#f1f5f9;border-radius:8px}table{border-collapse:collapse;width:100%}td,th{text-align:left;border-bottom:1px solid #cbd5e1;padding:10px}.caution{border-left:4px solid #b58d4a;padding:12px 16px;background:#fffbeb}footer{margin-top:35px;font-size:12px;color:#64748b}@media print{body{margin:0;max-width:none}.box,.caution{print-color-adjust:exact}}@media(max-width:580px){.grid{grid-template-columns:1fr}}</style></head><body>
  <header><div class="eyebrow">ZENITH RISE CAPITAL · GEORISK INTELLIGENCE</div><h1>Ficha de análisis de inversión</h1><div>${e(b.name || "Operación sin nombre")} · Guardada: ${e(date)}</div></header>
  <h2>1. Alcance del análisis</h2><div class="grid"><div class="box"><strong>País principal</strong><div>${e(b.country || "No seleccionado")}</div></div><div class="box"><strong>País de contraste</strong><div>${e(b.comparison || "No seleccionado")}</div></div><div class="box"><strong>Región del simulador</strong><div>${e(({eu:"Zona Euro",latam:"Latinoamérica",mena:"Oriente Medio y Norte de África",global:"Global"})[b.region] || b.region || "No definida")}</div></div><div class="box"><strong>Sector del simulador</strong><div>${e(({global:"Multisectorial",energy:"Energía",agriculture:"Agricultura",real_estate:"Inmobiliario",hospitality:"Hostelería",industry:"Industria"})[b.sector] || b.sector || "No definido")}</div></div></div>
  <h2>2. Contraste entre países</h2>${countryComparison}<h2>3. Escenario ZRC (hipótesis)</h2><p><strong>Score ilustrativo:</strong> ${safeNumber(b.score)}/100 · <strong>Escenario dominante:</strong> ${e(b.dominantScenario || "No disponible")}</p>
  <h2>4. Principales canales de sensibilidad</h2><table><thead><tr><th>Variable</th><th>Impacto según supuestos del modelo</th></tr></thead><tbody>${rows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
  <h2>5. Próximas comprobaciones</h2><p>Contrastar ingresos y costes por país, exposición a divisas y coberturas, coste de financiación, concentración de proveedores, riesgos regulatorios, repatriación de capital y necesidades de circulante. Validar cada hipótesis con información de la empresa y fuentes oficiales.</p>
  <h2>6. Fuentes, metodología y limitaciones</h2><div class="caution"><strong>Documento de trabajo, no recomendación de inversión.</strong> Los scores y sensibilidades son simulaciones ilustrativas, no probabilidades calibradas, predicciones de precios ni valoraciones. Las puntuaciones de las fichas país son estimaciones editoriales sin calibración de la operación; sus diferencias describen los pilares, no un pronóstico. Los precios de mercado observados no forman parte del cálculo de este documento. Verificar vigencia y fuentes antes de su utilización.</div>
  <p><strong>Versión de metodología:</strong> ${e(b.methodology || "No registrada")}. <strong>Fecha de guardado:</strong> ${e(date)}. El documento no incorpora datos empresariales verificados.</p>
  <footer>Zenith Rise Capital · GeoRisk Intelligence · Exportación local del navegador · Uso interno de análisis</footer></body></html>`;
}
export function downloadGeoRiskInvestmentReport(brief) {
  const html = buildGeoRiskInvestmentReport(brief);
  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ZRC_GeoRisk_Investment_Brief_" + String(brief?.name || "operacion").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"_").slice(0,50) + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
