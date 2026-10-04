import { ensureGeoRiskMarketSchema } from "./georisk-market-schema.js";

export const WGI_SOURCE_URL = "https://www.worldbank.org/en/publication/worldwide-governance-indicators";
export const WGI_DIMENSIONS = [
  { code:"GOV_WGI_VA_SC", id:"voice", label:"Voz y rendición de cuentas", simple:"Libertades y posibilidad de exigir cuentas" },
  { code:"GOV_WGI_PV_SC", id:"stability", label:"Estabilidad política", simple:"Estabilidad de las instituciones y ausencia de violencia" },
  { code:"GOV_WGI_GE_SC", id:"effectiveness", label:"Eficacia del gobierno", simple:"Capacidad para prestar servicios y aplicar políticas" },
  { code:"GOV_WGI_RQ_SC", id:"regulatory", label:"Calidad regulatoria", simple:"Calidad de las normas que afectan a la actividad" },
  { code:"GOV_WGI_RL_SC", id:"rule_of_law", label:"Estado de derecho", simple:"Aplicación de normas, contratos y derechos" },
  { code:"GOV_WGI_CC_SC", id:"corruption", label:"Control de la corrupción", simple:"Percepción sobre el uso del poder público" },
];
export const WGI_COUNTRIES = {
  ESP:"España", PRT:"Portugal", MEX:"México", COL:"Colombia", BRA:"Brasil", CHL:"Chile",
  ARG:"Argentina", PER:"Perú", URY:"Uruguay", PAN:"Panamá", MAR:"Marruecos",
  SAU:"Arabia Saudí", ARE:"Emiratos Árabes Unidos", TUR:"Türkiye", ISR:"Israel",
};

export function parseWgiResponse(payload, dimension) {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) throw new Error("Respuesta JSON inesperada del Banco Mundial");
  return payload[1].flatMap(row => {
    const score=Number(row.value), year=String(row.date || "");
    if (!/^\d{4}$/.test(year) || row.value===null || !Number.isFinite(score) || score<0 || score>100) return [];
    return [{year,date:year+"-01-01",value:score,dimension:dimension.id,country_code:row.countryiso3code,country:row.country?.value}];
  }).sort((a,b)=>a.year.localeCompare(b.year));
}

export async function fetchWgiCountry(country, fetchImpl=fetch, now=new Date()) {
  const iso=String(country||"").trim().toUpperCase();
  if (!Object.hasOwn(WGI_COUNTRIES,iso)) throw new Error("País no disponible en este primer grupo.");
  const dimensions=await Promise.all(WGI_DIMENSIONS.map(async dimension=>{
    const url="https://api.worldbank.org/v2/country/"+iso+"/indicator/"+dimension.code+"?date=1996:"+now.getUTCFullYear()+"&format=json&per_page=1000";
    const response=await fetchImpl(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error("World Bank HTTP "+response.status+" ("+dimension.code+")");
    const points=parseWgiResponse(await response.json(),dimension);
    return {...dimension,provider:"World Bank WGI",unit:"puntos sobre 100",points,latest:points.at(-1)||null};
  }));
  return {country:iso,country_name:WGI_COUNTRIES[iso],provider:"World Bank · Worldwide Governance Indicators",
    source_url:WGI_SOURCE_URL,license:"CC BY 4.0",fetched_at:now.toISOString(),dimensions};
}

export async function archiveWgiCountry(db,data,now=new Date()) {
  if (!db) throw new Error("D1 archive binding unavailable");
  await ensureGeoRiskMarketSchema(db);
  const capturedAt=now.toISOString();
  const result=await db.prepare("SELECT series_id,observation_date,value FROM georisk_market_observations WHERE provider='World Bank WGI' AND series_id LIKE ?")
    .bind(data.country+"_%").all();
  const old=new Map((result.results||[]).map(row=>[row.series_id+"|"+row.observation_date,Number(row.value)]));
  const statements=[]; let revisions=0, added=0;
  for (const dimension of data.dimensions) {
    const seriesId=data.country+"_"+dimension.id.toUpperCase();
    for (const point of dimension.points) {
      const prior=old.get(seriesId+"|"+point.date);
      if (prior===undefined) added++;
      if (prior!==undefined && prior!==point.value) {
        revisions++;
        statements.push(db.prepare("INSERT INTO georisk_market_revisions (provider,series_id,observation_date,previous_value,revised_value,detected_at,source_url) SELECT 'World Bank WGI',?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM georisk_market_observations WHERE provider='World Bank WGI' AND series_id=? AND observation_date=? AND value=?)")
          .bind(seriesId,point.date,prior,point.value,capturedAt,WGI_SOURCE_URL,seriesId,point.date,prior));
      }
      statements.push(db.prepare("INSERT INTO georisk_market_observations (provider,series_id,observation_date,value,unit,source_url,is_derived,first_collected_at) VALUES ('World Bank WGI',?,?,?,?,?,0,?) ON CONFLICT(provider,series_id,observation_date) DO UPDATE SET value=excluded.value,last_revised_at=CASE WHEN georisk_market_observations.value<>excluded.value THEN excluded.first_collected_at ELSE georisk_market_observations.last_revised_at END")
        .bind(seriesId,point.date,point.value,dimension.unit,WGI_SOURCE_URL,capturedAt));
    }
  }
  for(let start=0;start<statements.length;start+=50) await db.batch(statements.slice(start,start+50));
  return {new_observations:added,revisions_detected:revisions};
}

export async function handleGeoRiskWgi(request,env) {
  const country=String(new URL(request.url).searchParams.get("country")||"").toUpperCase();
  if (!Object.hasOwn(WGI_COUNTRIES,country)) return json({error:"Elige un país disponible: "+Object.keys(WGI_COUNTRIES).join(", ")},400);
  try {
    const data=await fetchWgiCountry(country);
    let archive;
    try { archive=await archiveWgiCountry(env.DB,data); }
    catch(error) { archive={status:"unavailable",message:"No se pudo guardar esta consulta en el histórico."}; console.error("WGI archive failed:",error.message); }
    return json({...data,archive,caveat:"Son estimaciones basadas en percepciones y pueden revisarse. No son una calificación de crédito ni una decisión de inversión; no cambian el índice ZRC."},200,{"Cache-Control":"public, max-age=21600"});
  } catch(error) {
    console.error("WGI fetch failed:",error.message);
    return json({error:"No se pudieron consultar los indicadores del Banco Mundial. Reintenta más tarde; no se han sustituido por datos simulados."},502,{"Cache-Control":"no-store"});
  }
}
function json(body,status=200,extra={}) {
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*",...extra}});
}
