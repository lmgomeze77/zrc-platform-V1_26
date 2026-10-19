// Shared canonical identity and provenance registry for ZRC Country Intelligence.
// This is an integration layer, NOT a new dataset or a combined risk index.
import { COUNTRY_PROFILES, COUNTRY_PROFILE_UPDATED_AT, PILLAR_META } from "./countryRiskProfiles.js";
import { WB_COUNTRY_ISO3 } from "../pages/intelligence/worldBankCountryMacro.js";

// Identity exceptions absent from the existing 42-country World Map / WDI list.
// Countries with no map marker may still have full editorial profiles.
export const COUNTRY_MAP_ID_TO_ISO3 = Object.freeze({
  ...WB_COUNTRY_ISO3, pt: "PRT", pe: "PER", uy: "URY", pa: "PAN", ma: "MAR",
});
export const COUNTRY_INTELLIGENCE_BY_ISO3 = Object.freeze(
  Object.fromEntries(COUNTRY_PROFILES.map(profile => [profile.iso, profile]))
);

export const COUNTRY_INTELLIGENCE_METHODOLOGIES = Object.freeze({
  editorialProfile: {
    id: "zrc-country-five-pillars",
    kind: "editorial_estimate",
    name: "ZRC Country Intelligence · five-pillar composite",
    scale: "0–100",
    asOf: COUNTRY_PROFILE_UPDATED_AT,
    source: "ZRC Research",
    sourceUrl: null,
    layers: PILLAR_META,
  },
  mapGeopolitics: {
    id: "zrc-world-map-geopolitical",
    kind: "editorial_estimate",
    name: "ZRC GeoRisk World Map · geopolitical risk",
    scale: "0–100",
    asOf: null,
    source: "ZRC Research",
    sourceUrl: null,
    note: "Map score is not a five-pillar country composite and has no verified observation date.",
  },
});

export function countryIntelligenceByIso3(iso3) {
  if (typeof iso3 !== "string") return null;
  const profile = COUNTRY_INTELLIGENCE_BY_ISO3[iso3.toUpperCase()];
  if (!profile) return null;
  return {
    iso3: profile.iso,
    slug: profile.slug,
    href: "/inteligencia/paises/" + profile.slug + "/",
    profile,
    provenance: COUNTRY_INTELLIGENCE_METHODOLOGIES.editorialProfile,
    // The editorial country profile is currently published only in Spanish.
    language: "es",
  };
}

// The map owns its data; do not duplicate or overwrite its editorial readings.
export function resolveMapCountryIntelligence(mapCountry) {
  if (!mapCountry?.id) return null;
  const iso3 = COUNTRY_MAP_ID_TO_ISO3[mapCountry.id];
  const editorial = countryIntelligenceByIso3(iso3);
  return {
    mapCountryId: mapCountry.id,
    iso3: iso3 ?? null,
    geopoliticalRisk: {
      value: Number.isFinite(mapCountry.riskScore) ? mapCountry.riskScore : null,
      provenance: COUNTRY_INTELLIGENCE_METHODOLOGIES.mapGeopolitics,
    },
    editorial,
  };
}
