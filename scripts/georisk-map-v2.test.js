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
