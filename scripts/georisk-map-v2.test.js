import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/intelligence/GeoRiskWorldMap.jsx", import.meta.url), "utf8");
const geo = JSON.parse(readFileSync(new URL("../public/georisk-world-42.geojson", import.meta.url), "utf8"));

test("GeoRisk choropleth geometry is valid and unique", () => {
  assert.equal(geo.type, "FeatureCollection");
  assert.equal(geo.features.length, 41);
  const ids = geo.features.map(feature => feature.properties.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const feature of geo.features) {
    assert.ok(["Polygon", "MultiPolygon"].includes(feature.geometry.type));
    assert.ok(Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length);
    assert.match(feature.properties.id, /^[a-z]{2}$/);
  }
  assert.ok(!ids.includes("sg"), "Singapore remains selectable as a marker");
});

test("Map retains accessible territory/marker switch and search behavior", () => {
  assert.match(source, /GeoJSON/);
  assert.match(source, /mapMode === "territories"/);
  assert.match(source, /mapMode === "markers"/);
  assert.match(source, /normalizeCountrySearch/);
  assert.match(source, /if \(search\.trim\(\)\) return searchResults/);
  assert.match(source, /COUNTRY_NAMES_EN\[c\.id\]/);
  assert.match(source, /CountryComparison/);
  assert.match(source, /comparisonIds\.length===3/);
});

test("Country risk figures are presented as editorial estimates", () => {
  assert.match(source, /Estimaciones editoriales de ZRC Research/);
  assert.match(source, /not live official data/);
});

test("Country profiles provide all four bilingual intelligence sections", () => {
  for (const section of ['"overview"', '"geopolitics"', '"trade"', '"investment"']) {
    assert.ok(source.includes(section), "Missing section: "+section);
  }
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /<CountryPanel key=\{selected\.id\}/);
  assert.match(source, /pendientes de integración de fuentes/);
});

test("Closing a country profile preserves the selected country and provides reopen action", () => {
  assert.match(source, /const \[countryPanelOpen, setCountryPanelOpen\] = useState\(false\)/);
  assert.match(source, /const openCountry = \(id\) => \{ setSelectedId\(id\); setCountryPanelOpen\(true\); \}/);
  assert.match(source, /onClose=\{\(\) => setCountryPanelOpen\(false\)\}/);
  assert.match(source, /selected && !countryPanelOpen/);
  assert.match(source, /Reabrir ficha/);
  assert.doesNotMatch(source, /onClose=\{\(\) => setSelectedId\(null\)\}/);
});

test("Corporate decision lens is explicit about editorial data, uncalibrated risks, and three diligence domains", () => {
  assert.match(source,/function CorporateDecisionLens/);
  assert.match(source,/activeTab==="decisions"/);
  assert.match(source,/Investment and M&A/);
  assert.match(source,/Financing and financial risk/);
  assert.match(source,/Trade and supply chain/);
  assert.match(source,/Not investment advice or a calibrated rating/);
});
