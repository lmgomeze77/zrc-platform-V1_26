// Countries prioritized for next editorial review. This is coverage discovery,
// NOT a country-risk score or an assertion that research has been completed.
export const COUNTRY_EXPANSION_CANDIDATES = Object.freeze([
  ["EST","Estonia","Europa","🇪🇪"],["POL","Polonia","Europa","🇵🇱"],["ROU","Rumanía","Europa","🇷🇴"],
  ["UKR","Ucrania","Europa","🇺🇦"],["GEO","Georgia","Europa","🇬🇪"],["SRB","Serbia","Europa","🇷🇸"],
  ["GBR","Reino Unido","Europa","🇬🇧"],["DEU","Alemania","Europa","🇩🇪"],["FRA","Francia","Europa","🇫🇷"],
  ["USA","Estados Unidos","Norteamérica","🇺🇸"],["CAN","Canadá","Norteamérica","🇨🇦"],
  ["CRI","Costa Rica","LATAM","🇨🇷"],["DOM","República Dominicana","LATAM","🇩🇴"],
  ["ECU","Ecuador","LATAM","🇪🇨"],["GTM","Guatemala","LATAM","🇬🇹"],
  ["EGY","Egipto","MENA","🇪🇬"],["JOR","Jordania","MENA","🇯🇴"],["QAT","Catar","MENA","🇶🇦"],
  ["OMN","Omán","MENA","🇴🇲"],["TUN","Túnez","MENA","🇹🇳"],["DZA","Argelia","MENA","🇩🇿"],
  ["NGA","Nigeria","África subsahariana","🇳🇬"],["ZAF","Sudáfrica","África subsahariana","🇿🇦"],
  ["KEN","Kenia","África subsahariana","🇰🇪"],["GHA","Ghana","África subsahariana","🇬🇭"],
  ["IND","India","Asia-Pacífico","🇮🇳"],["CHN","China","Asia-Pacífico","🇨🇳"],
  ["VNM","Vietnam","Asia-Pacífico","🇻🇳"],["IDN","Indonesia","Asia-Pacífico","🇮🇩"],
  ["SGP","Singapur","Asia-Pacífico","🇸🇬"],["JPN","Japón","Asia-Pacífico","🇯🇵"]
].map(([iso,name,region,flag])=>Object.freeze({iso,name,region,flag,status:"pending_editorial"})));
