// World Bank Indicators API v2, source 2 (World Development Indicators).
// Only observational macroeconomic series are fetched here; ZRC editorial risk
// estimates remain independent and should not be mixed with these figures.
export const WB_COUNTRY_ISO3 = {
  "us": "USA",
  "cn": "CHN",
  "ru": "RUS",
  "de": "DEU",
  "fr": "FRA",
  "gb": "GBR",
  "it": "ITA",
  "es": "ESP",
  "pl": "POL",
  "nl": "NLD",
  "se": "SWE",
  "ch": "CHE",
  "tr": "TUR",
  "ua": "UKR",
  "jp": "JPN",
  "kr": "KOR",
  "in": "IND",
  "id": "IDN",
  "vn": "VNM",
  "tw": "TWN",
  "sg": "SGP",
  "au": "AUS",
  "sa": "SAU",
  "ae": "ARE",
  "qa": "QAT",
  "il": "ISR",
  "ir": "IRN",
  "eg": "EGY",
  "ng": "NGA",
  "za": "ZAF",
  "ke": "KEN",
  "cd": "COD",
  "br": "BRA",
  "mx": "MEX",
  "ar": "ARG",
  "cl": "CHL",
  "co": "COL",
  "ca": "CAN",
  "kz": "KAZ",
  "no": "NOR",
  "ie": "IRL",
  "ph": "PHL"
};
export const WB_INDICATORS = [
  {code:"NY.GDP.MKTP.CD", es:"PIB nominal", en:"Nominal GDP", unit:"usd"},
  {code:"NY.GDP.MKTP.KD.ZG", es:"Crecimiento real del PIB", en:"Real GDP growth", unit:"pct"},
  {code:"FP.CPI.TOTL.ZG", es:"Inflación IPC anual", en:"Annual CPI inflation", unit:"pct"},
];
export const worldBankIndicatorUrl = (iso3, code) =>
  "https://api.worldbank.org/v2/country/" + encodeURIComponent(iso3) +
  "/indicator/" + encodeURIComponent(code) + "?format=json&source=2&mrnev=1";

export function latestWorldBankObservation(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) return null;
  const item = payload[1].find(row => row && Number.isFinite(row.value) && /^[0-9]{4}$/.test(String(row.date)));
  return item ? {value:item.value, year:String(item.date)} : null;
}
