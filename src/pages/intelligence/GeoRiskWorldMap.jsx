// GeoRiskWorldMap.jsx — ZRC GeoRisk World Map
// Mapa geopolítico interactivo público — sin login, sin muro de pago.
// Agrupa ~38 economías clave por alineamiento geopolítico (EE.UU. / China /
// Rusia), con datos de comercio, inversión, voto en NU, salud diplomática,
// dependencias energéticas y tecnológicas, turismo y estrategia de país.
// Es el imán de tráfico/SEO de la familia GeoRisk — desde aquí se empuja a
// GeoRisk Dashboard / Predictive ML para la capa cuantitativa (precios,
// escenarios, forecast IA).

import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Globe2, TrendingUp, TrendingDown, Minus, X, ArrowRight, Info } from "lucide-react";

// ── Design tokens — grafito oscuro + acento bronce cartográfico ──────────
// Tono distinto del resto de la familia GeoRisk (azul/verde/gris azulado/
// crema/violeta ya usados en Dashboard, ML, FIS, Visor y Macro Pulse):
// aquí buscamos un aire de "atlas de gabinete" — serio, cartográfico,
// atemporal — coherente con el objetivo de ser el "referente mundial".
const C = {
  bg: "#0B0C0E", surface: "#141618", surface2: "#1A1D20", surface3: "#22262A",
  border: "#2C3136", borderHover: "#454C53",
  text: "#F2EFE9", textSec: "#A8A69F", textMuted: "#6B6E72",
  gold: "#B8834A", goldDim: "rgba(184,131,74,0.12)", goldBorder: "rgba(184,131,74,0.32)",
  red: "#D6544A", green: "#3FAE72", amber: "#D6A23C",
};
const F = {
  display: "'JetBrains Mono', monospace",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ── Bloques geopolíticos — paleta categórica distinta y separable ────────
const BLOC_META = {
  occidental: { label: "Bloque Occidental", short: "OCC", color: "#4C8FD9", desc: "Alineamiento fuerte con EE.UU./OTAN/UE; baja afinidad con Pekín o Moscú." },
  sino_euroasiatico: { label: "Eje Sino-Euroasiático", short: "S-E", color: "#D6544A", desc: "Alineamiento fuerte con China y/o Rusia; distancia estratégica de Washington." },
  multialineado: { label: "Multialineados pragmáticos", short: "MULTI", color: "#3FAE72", desc: "Cortejan simultáneamente a EE.UU., China y bloques regionales — hedging activo, sin bando fijo." },
  no_alineado: { label: "No alineados / swing states", short: "NA", color: "#D6A23C", desc: "Sin alineamiento dominante en ningún eje — posición oscilante, decisiva en votaciones internacionales." },
};

function computeBloc(c) {
  const { usAlign, cnAlign, ruAlign } = c;
  const rivalMax = Math.max(cnAlign, ruAlign);
  if (usAlign >= 40 && usAlign - rivalMax >= 30) return "occidental";
  if (rivalMax >= 40 && rivalMax - usAlign >= 30) return "sino_euroasiatico";
  if (usAlign >= 15 && cnAlign >= 15) return "multialineado";
  return "no_alineado";
}

const diploLabel = (v) => (v >= 2 ? "Socio estratégico" : v === 1 ? "Cordial" : v === 0 ? "Normal" : v === -1 ? "Tensa" : "Crisis");
const diploColor = (v) => (v >= 1 ? C.green : v === 0 ? C.textMuted : v === -1 ? C.amber : C.red);

// ── Dataset — ~38 economías clave (G20 + bloques estratégicos) ──────────
// Estimaciones compuestas de ZRC Research (metodología ilustrativa, misma
// naturaleza que el resto de la plataforma GeoRisk) — no son series
// oficiales en vivo de UN Comtrade / UNGA / IMF, sino una lectura editorial
// cuantificada para hacer comparables los países entre sí. Ver metodología.
const COUNTRIES = [
  { id: "us", name: "Estados Unidos", flag: "🇺🇸", lat: 38.9, lng: -77.0, region: "Norteamérica", gdp: 27.0,
    usAlign: 100, cnAlign: -60, ruAlign: -75, blocs: ["USMCA", "OTAN", "QUAD", "AUKUS"],
    tariffAvg: 13, tariffNote: "Aranceles reforzados a China (secc. 301) y acero/aluminio global desde 2025.",
    fdiIn: 310, fdiOut: 440, unAlignUS: 100,
    diploUS: 2, diploEU: 2, diploCN: -1, strategy: "Ancla del orden occidental", strategyNote: "Reindustrialización estratégica (semis, defensa) y presión arancelaria selectiva.",
    energyImportShare: 8, energySuppliers: "Autosuficiente (shale) — exportador neto",
    techDependency: "Exportador neto de tecnología frontera (IA, cloud, EDA); controla exportación de semis avanzados.",
    tourismInbound: 79, tourismOutbound: 93, tourismTopSource: "Canadá / México",
    sanctions: "Impone sanciones a Rusia, Irán, Corea del Norte, Venezuela.", riskScore: 42 },

  { id: "cn", name: "China", flag: "🇨🇳", lat: 39.9, lng: 116.4, region: "Asia Oriental", gdp: 18.0,
    usAlign: -60, cnAlign: 100, ruAlign: 55, blocs: ["RCEP", "OCS", "BRICS+"],
    tariffAvg: 7.5, tariffNote: "Objetivo de aranceles EE.UU./UE sobre EVs, acero y paneles solares.",
    fdiIn: 160, fdiOut: 180, unAlignUS: 12,
    diploUS: -1, diploEU: 0, diploCN: 2, strategy: "Multipolaridad centrada en China", strategyNote: "Expansión Belt & Road, sustitución de importaciones tecnológicas, moneda digital transfronteriza.",
    energyImportShare: 72, energySuppliers: "Rusia, Arabia Saudí, Angola",
    techDependency: "Dependiente de litografía EUV (Países Bajos/Taiwán) para semis de vanguardia; domina tierras raras global.",
    tourismInbound: 66, tourismOutbound: 155, tourismTopSource: "Corea del Sur / Rusia",
    sanctions: "Objeto de controles de exportación de EE.UU. en semis avanzados.", riskScore: 61 },

  { id: "ru", name: "Rusia", flag: "🇷🇺", lat: 55.75, lng: 37.6, region: "Euroasia", gdp: 2.0,
    usAlign: -85, cnAlign: 55, ruAlign: 100, blocs: ["OCS", "EAEU", "BRICS+"],
    tariffAvg: 9, tariffNote: "Excluida de SWIFT parcialmente; comercio reorientado a Asia.",
    fdiIn: 8, fdiOut: 5, unAlignUS: 4,
    diploUS: -2, diploEU: -2, diploCN: 1, strategy: "Autarquía euroasiática forzada", strategyNote: "Reorientación total del comercio hacia China/India tras sanciones occidentales.",
    energyImportShare: -18, energySuppliers: "Exportador neto — gasoductos a China en expansión",
    techDependency: "Fuerte dependencia de componentes electrónicos chinos tras el embargo occidental.",
    tourismInbound: 7, tourismOutbound: 23, tourismTopSource: "Turquía / China",
    sanctions: "Bajo sanciones extensas de EE.UU., UE, Reino Unido, G7.", riskScore: 88 },

  { id: "de", name: "Alemania", flag: "🇩🇪", lat: 52.5, lng: 13.4, region: "Europa", gdp: 4.5,
    usAlign: 72, cnAlign: -5, ruAlign: -55, blocs: ["UE", "OTAN", "G7"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE; fricción bilateral con China por EVs.",
    fdiIn: 55, fdiOut: 145, unAlignUS: 78,
    diploUS: 2, diploEU: 2, diploCN: 0, strategy: "Zeitenwende — rearme y diversificación", strategyNote: "Fin de la dependencia energética rusa; exposición comercial alta a China (autos, maquinaria).",
    energyImportShare: 65, energySuppliers: "Noruega, EE.UU. (GNL), Países Bajos",
    techDependency: "Fuerte exposición del sector auto a la cadena de suministro china (baterías, tierras raras).",
    tourismInbound: 39, tourismOutbound: 108, tourismTopSource: "Países Bajos / Suiza",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 38 },

  { id: "fr", name: "Francia", flag: "🇫🇷", lat: 48.85, lng: 2.35, region: "Europa", gdp: 3.0,
    usAlign: 65, cnAlign: -5, ruAlign: -50, blocs: ["UE", "OTAN", "G7"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE.", fdiIn: 42, fdiOut: 60, unAlignUS: 74,
    diploUS: 1, diploEU: 2, diploCN: 0, strategy: "Autonomía estratégica europea", strategyNote: "Impulsa capacidad de defensa e industrial propia de la UE, distancia táctica de Washington.",
    energyImportShare: 45, energySuppliers: "Nuclear doméstico + Noruega, Argelia",
    techDependency: "Base industrial de defensa propia; dependencia moderada de cloud EE.UU.",
    tourismInbound: 100, tourismOutbound: 32, tourismTopSource: "Alemania / Reino Unido",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 40 },

  { id: "gb", name: "Reino Unido", flag: "🇬🇧", lat: 51.5, lng: -0.12, region: "Europa", gdp: 3.3,
    usAlign: 88, cnAlign: -15, ruAlign: -60, blocs: ["OTAN", "G7", "AUKUS", "CPTPP"],
    tariffAvg: 4, tariffNote: "Política arancelaria propia post-Brexit; TLC con CPTPP.", fdiIn: 88, fdiOut: 70, unAlignUS: 86,
    diploUS: 2, diploEU: 1, diploCN: -1, strategy: "Relación especial + giro al Indo-Pacífico", strategyNote: "AUKUS como eje de seguridad; revisión de exposición a inversión china en infraestructura.",
    energyImportShare: 38, energySuppliers: "Noruega, mar del Norte propio",
    techDependency: "Excluyó a Huawei del 5G; alianza tecnológica estrecha con EE.UU.",
    tourismInbound: 41, tourismOutbound: 72, tourismTopSource: "Francia / EE.UU.",
    sanctions: "Aplica sanciones a Rusia junto a G7.", riskScore: 41 },

  { id: "it", name: "Italia", flag: "🇮🇹", lat: 41.9, lng: 12.5, region: "Europa", gdp: 2.2,
    usAlign: 60, cnAlign: -10, ruAlign: -45, blocs: ["UE", "OTAN", "G7"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE; salió de la Belt & Road en 2023.", fdiIn: 24, fdiOut: 35, unAlignUS: 72,
    diploUS: 1, diploEU: 1, diploCN: -1, strategy: "Realineamiento atlantista", strategyNote: "Rompió el memorando Belt & Road con China; foco en el Plan Mattei para energía africana.",
    energyImportShare: 74, energySuppliers: "Argelia, Azerbaiyán, GNL EE.UU.",
    techDependency: "Dependencia media de proveedores extranjeros en telecom.",
    tourismInbound: 58, tourismOutbound: 30, tourismTopSource: "Alemania / Francia",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 43 },

  { id: "es", name: "España", flag: "🇪🇸", lat: 40.4, lng: -3.7, region: "Europa", gdp: 1.6,
    usAlign: 58, cnAlign: 0, ruAlign: -45, blocs: ["UE", "OTAN"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE.", fdiIn: 33, fdiOut: 28, unAlignUS: 70,
    diploUS: 1, diploEU: 2, diploCN: 0, strategy: "Puente atlántico e iberoamericano", strategyNote: "Papel diferenciador como puerta de entrada de inversión latinoamericana en la UE.",
    energyImportShare: 68, energySuppliers: "Argelia, EE.UU. (GNL), Nigeria",
    techDependency: "Dependencia moderada de infraestructura cloud extranjera.",
    tourismInbound: 94, tourismOutbound: 18, tourismTopSource: "Reino Unido / Francia / Alemania",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 37 },

  { id: "pl", name: "Polonia", flag: "🇵🇱", lat: 52.2, lng: 21.0, region: "Europa", gdp: 0.85,
    usAlign: 82, cnAlign: -20, ruAlign: -90, blocs: ["UE", "OTAN"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE; hub logístico de ayuda a Ucrania.", fdiIn: 28, fdiOut: 6, unAlignUS: 84,
    diploUS: 2, diploEU: 2, diploCN: -1, strategy: "Frontera oriental de la OTAN", strategyNote: "Mayor gasto en defensa (% PIB) de la OTAN europea; hostilidad activa a Moscú.",
    energyImportShare: 40, energySuppliers: "Noruega, EE.UU. (GNL) — cortó gas ruso en 2022",
    techDependency: "Baja dependencia crítica; hub de nearshoring industrial europeo.",
    tourismInbound: 21, tourismOutbound: 14, tourismTopSource: "Alemania / Ucrania",
    sanctions: "Aplica sanciones UE a Rusia; frontera con Bielorrusia tensa.", riskScore: 54 },

  { id: "nl", name: "Países Bajos", flag: "🇳🇱", lat: 52.37, lng: 4.9, region: "Europa", gdp: 1.1,
    usAlign: 75, cnAlign: -20, ruAlign: -50, blocs: ["UE", "OTAN"],
    tariffAvg: 3, tariffNote: "Restringe exportación de litografía ASML a China (presión EE.UU.).", fdiIn: 180, fdiOut: 210, unAlignUS: 80,
    diploUS: 2, diploEU: 2, diploCN: -1, strategy: "Nodo crítico de la cadena de semis", strategyNote: "ASML como palanca geopolítica única — controles de exportación coordinados con Washington.",
    energyImportShare: 58, energySuppliers: "Noruega, EE.UU. (GNL)",
    techDependency: "Posición dominante en litografía EUV — activo estratégico global.",
    tourismInbound: 20, tourismOutbound: 20, tourismTopSource: "Alemania / Bélgica",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 36 },

  { id: "se", name: "Suecia", flag: "🇸🇪", lat: 59.3, lng: 18.07, region: "Europa", gdp: 0.6,
    usAlign: 78, cnAlign: -15, ruAlign: -70, blocs: ["UE", "OTAN"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE.", fdiIn: 18, fdiOut: 30, unAlignUS: 82,
    diploUS: 2, diploEU: 2, diploCN: -1, strategy: "Nueva integración OTAN báltica", strategyNote: "Ingreso a la OTAN en 2024 rompe dos siglos de no alineamiento.",
    energyImportShare: 30, energySuppliers: "Nuclear + hidroeléctrica doméstica",
    techDependency: "Base industrial de defensa propia (Saab); baja dependencia crítica.",
    tourismInbound: 8, tourismOutbound: 14, tourismTopSource: "Noruega / Alemania",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 35 },

  { id: "ch", name: "Suiza", flag: "🇨🇭", lat: 46.95, lng: 7.45, region: "Europa", gdp: 0.9,
    usAlign: 45, cnAlign: 10, ruAlign: -25, blocs: ["EFTA"],
    tariffAvg: 2, tariffNote: "Red de TLC bilaterales propia; neutralidad formal.", fdiIn: 40, fdiOut: 55, unAlignUS: 60,
    diploUS: 1, diploEU: 1, diploCN: 0, strategy: "Neutralidad armada pragmática", strategyNote: "Neutralidad diplomática con alineamiento económico occidental de facto.",
    energyImportShare: 48, energySuppliers: "Francia, Alemania (interconexión eléctrica)",
    techDependency: "Hub financiero y farmacéutico global; baja dependencia crítica.",
    tourismInbound: 12, tourismOutbound: 10, tourismTopSource: "Alemania / EE.UU.",
    sanctions: "Alinea parcialmente con sanciones UE a Rusia.", riskScore: 22 },

  { id: "tr", name: "Turquía", flag: "🇹🇷", lat: 39.93, lng: 32.85, region: "Euroasia", gdp: 1.1,
    usAlign: 15, cnAlign: 10, ruAlign: 20, blocs: ["OTAN", "OCS (diálogo)"],
    tariffAvg: 8, tariffNote: "Unión aduanera parcial con la UE; TLC bilaterales propios.", fdiIn: 14, fdiOut: 6, unAlignUS: 38,
    diploUS: 0, diploEU: 0, diploCN: 0, strategy: "Bisagra multialineada", strategyNote: "Miembro de la OTAN que compra defensa aérea rusa y media entre Kiev y Moscú — hedging de manual.",
    energyImportShare: 70, energySuppliers: "Rusia, Azerbaiyán, Irán",
    techDependency: "Industria de defensa (drones) propia y exportadora.",
    tourismInbound: 57, tourismOutbound: 10, tourismTopSource: "Rusia / Alemania",
    sanctions: "No aplica sanciones a Rusia; bajo escrutinio de EE.UU. por ello.", riskScore: 58 },

  { id: "ua", name: "Ucrania", flag: "🇺🇦", lat: 50.45, lng: 30.52, region: "Europa", gdp: 0.18,
    usAlign: 90, cnAlign: -30, ruAlign: -100, blocs: ["Candidata UE"],
    tariffAvg: 2, tariffNote: "Comercio liberalizado con la UE (ATFA) desde 2022.", fdiIn: 2, fdiOut: 0.2, unAlignUS: 88,
    diploUS: 2, diploEU: 2, diploCN: -1, strategy: "Supervivencia e integración occidental", strategyNote: "Candidatura UE acelerada; economía de guerra sostenida por ayuda occidental.",
    energyImportShare: 35, energySuppliers: "UE (interconexión eléctrica de emergencia)",
    techDependency: "Sector de defensa/drones en rápido desarrollo doméstico.",
    tourismInbound: 2, tourismOutbound: 4, tourismTopSource: "Polonia / Moldavia",
    sanctions: "Objetivo de la agresión rusa; aplica contra-sanciones a Rusia.", riskScore: 95 },

  { id: "jp", name: "Japón", flag: "🇯🇵", lat: 35.68, lng: 139.65, region: "Asia Oriental", gdp: 4.2,
    usAlign: 85, cnAlign: -25, ruAlign: -55, blocs: ["QUAD", "CPTPP", "G7"],
    tariffAvg: 4, tariffNote: "CPTPP + TLC bilateral con EE.UU.; controles de exportación de semis coordinados.", fdiIn: 25, fdiOut: 180, unAlignUS: 80,
    diploUS: 2, diploEU: 1, diploCN: -1, strategy: "Rearme silencioso + QUAD", strategyNote: "Duplicó gasto de defensa; ancla del contrapeso a China en el Indo-Pacífico.",
    energyImportShare: 88, energySuppliers: "Australia (GNL), Oriente Medio",
    techDependency: "Líder en materiales/equipos de semis; vulnerable a disrupción de estrecho de Taiwán.",
    tourismInbound: 34, tourismOutbound: 13, tourismTopSource: "Corea del Sur / China / Taiwán",
    sanctions: "Aplica sanciones a Rusia junto a G7.", riskScore: 44 },

  { id: "kr", name: "Corea del Sur", flag: "🇰🇷", lat: 37.57, lng: 126.98, region: "Asia Oriental", gdp: 1.8,
    usAlign: 82, cnAlign: -10, ruAlign: -40, blocs: ["OTAN (socio)", "CPTPP (en curso)"],
    tariffAvg: 5, tariffNote: "TLC con EE.UU. (KORUS); expuesta a aranceles EV/batería EE.UU.", fdiIn: 18, fdiOut: 45, unAlignUS: 76,
    diploUS: 2, diploEU: 1, diploCN: -1, strategy: "Alianza de seguridad + potencia tecnológica", strategyNote: "Fabricante crítico de memoria/semis; presión constante de Corea del Norte.",
    energyImportShare: 93, energySuppliers: "Oriente Medio, Australia (GNL)",
    techDependency: "Líder mundial en memoria (DRAM/NAND); expuesta a controles de exportación cruzados.",
    tourismInbound: 15, tourismOutbound: 27, tourismTopSource: "China / Japón",
    sanctions: "Aplica sanciones a Rusia y Corea del Norte.", riskScore: 47 },

  { id: "in", name: "India", flag: "🇮🇳", lat: 28.6, lng: 77.2, region: "Sur de Asia", gdp: 4.0,
    usAlign: 35, cnAlign: -35, ruAlign: 30, blocs: ["QUAD", "BRICS+", "OCS"],
    tariffAvg: 17, tariffNote: "Arancelario relativamente protegido; TLCs bilaterales selectivos en negociación.", fdiIn: 70, fdiOut: 15, unAlignUS: 42,
    diploUS: 1, diploEU: 1, diploCN: -1, strategy: "Multialineamiento estratégico", strategyNote: "Compra energía rusa con descuento mientras profundiza QUAD con EE.UU./Japón/Australia.",
    energyImportShare: 85, energySuppliers: "Rusia (crudo con descuento), Oriente Medio",
    techDependency: "Impulsa 'Make in India' en semis; fuerte sector de servicios IT exportador.",
    tourismInbound: 18, tourismOutbound: 30, tourismTopSource: "Bangladés / EE.UU.",
    sanctions: "No aplica sanciones a Rusia — mantiene relación de defensa histórica.", riskScore: 50 },

  { id: "id", name: "Indonesia", flag: "🇮🇩", lat: -6.2, lng: 106.8, region: "Sudeste Asiático", gdp: 1.4,
    usAlign: 20, cnAlign: 15, ruAlign: 0, blocs: ["ASEAN", "RCEP", "BRICS+ (2025)"],
    tariffAvg: 10, tariffNote: "Restringe exportación de níquel en bruto para forzar industrialización local.", fdiIn: 25, fdiOut: 8, unAlignUS: 40,
    diploUS: 0, diploEU: 0, diploCN: 0, strategy: "No alineamiento activo ASEAN", strategyNote: "Aprovecha rivalidad EE.UU.-China para atraer inversión en cadena de baterías EV.",
    energyImportShare: 15, energySuppliers: "Autosuficiente en carbón; importa crudo",
    techDependency: "Nodo crítico de níquel para baterías; inversión china dominante en refinación.",
    tourismInbound: 12, tourismOutbound: 10, tourismTopSource: "Malasia / Singapur",
    sanctions: "Ninguna relevante.", riskScore: 40 },

  { id: "vn", name: "Vietnam", flag: "🇻🇳", lat: 21.0, lng: 105.85, region: "Sudeste Asiático", gdp: 0.47,
    usAlign: 30, cnAlign: -5, ruAlign: 15, blocs: ["ASEAN", "RCEP", "CPTPP"],
    tariffAvg: 6, tariffNote: "Gran beneficiario del 'China+1'; bajo escrutinio EE.UU. por transbordo de mercancía china.", fdiIn: 22, fdiOut: 1, unAlignUS: 34,
    diploUS: 1, diploEU: 1, diploCN: -1, strategy: "China+1 manufacturero", strategyNote: "Principal receptor de deslocalización de fábricas fuera de China (electrónica, textil).",
    energyImportShare: 30, energySuppliers: "Carbón doméstico + importación regional",
    techDependency: "Ensamblaje electrónico creciente (Samsung, Apple); baja capacidad de diseño propio.",
    tourismInbound: 13, tourismOutbound: 5, tourismTopSource: "Corea del Sur / China",
    sanctions: "Ninguna relevante.", riskScore: 39 },

  { id: "tw", name: "Taiwán", flag: "🇹🇼", lat: 25.03, lng: 121.56, region: "Asia Oriental", gdp: 0.79,
    usAlign: 78, cnAlign: -70, ruAlign: -30, blocs: ["No-ONU · socio EE.UU./Japón"],
    tariffAvg: 5, tariffNote: "Sin TLC formal con EE.UU.; acuerdo marco de comercio e inversión en curso.", fdiIn: 10, fdiOut: 22, unAlignUS: 70,
    diploUS: 2, diploEU: 1, diploCN: -2, strategy: "Disuasión vía interdependencia de semis", strategyNote: "TSMC como 'escudo de silicio' — el activo geopolítico más concentrado del planeta.",
    energyImportShare: 97, energySuppliers: "Oriente Medio, Australia (GNL) — vulnerabilidad crítica",
    techDependency: "Fabrica ~90% de los semiconductores más avanzados del mundo (TSMC).",
    tourismInbound: 6, tourismOutbound: 9, tourismTopSource: "Japón / Corea del Sur",
    sanctions: "N/A — bajo amenaza de bloqueo/invasión, no sanciones.", riskScore: 76 },

  { id: "sg", name: "Singapur", flag: "🇸🇬", lat: 1.35, lng: 103.82, region: "Sudeste Asiático", gdp: 0.55,
    usAlign: 55, cnAlign: 20, ruAlign: -10, blocs: ["ASEAN", "RCEP", "CPTPP"],
    tariffAvg: 0, tariffNote: "Prácticamente libre de aranceles — hub de comercio y finanzas global.", fdiIn: 160, fdiOut: 95, unAlignUS: 58,
    diploUS: 1, diploEU: 1, diploCN: 1, strategy: "Neutralidad activa de plataforma", strategyNote: "Se posiciona como territorio neutral para capital y datos de ambos bloques.",
    energyImportShare: 98, energySuppliers: "GNL diversificado (Qatar, Australia, EE.UU.)",
    techDependency: "Hub regional de datacenters; alta exposición a controles de exportación cruzados.",
    tourismInbound: 14, tourismOutbound: 9, tourismTopSource: "Indonesia / China",
    sanctions: "Ninguna relevante.", riskScore: 30 },

  { id: "au", name: "Australia", flag: "🇦🇺", lat: -35.28, lng: 149.13, region: "Oceanía", gdp: 1.7,
    usAlign: 85, cnAlign: -30, ruAlign: -45, blocs: ["QUAD", "AUKUS", "CPTPP"],
    tariffAvg: 3, tariffNote: "Recuperándose de sanciones informales chinas al vino/carbón (2020-23).", fdiIn: 45, fdiOut: 20, unAlignUS: 78,
    diploUS: 2, diploEU: 1, diploCN: -1, strategy: "Ancla del Indo-Pacífico occidental", strategyNote: "Submarinos nucleares AUKUS como máxima apuesta estratégica de la década.",
    energyImportShare: -30, energySuppliers: "Exportador neto de GNL, carbón y litio",
    techDependency: "Exportador crítico de litio y tierras raras alternativo a China.",
    tourismInbound: 7, tourismOutbound: 11, tourismTopSource: "China / Nueva Zelanda",
    sanctions: "Aplica sanciones a Rusia junto a G7.", riskScore: 32 },

  { id: "sa", name: "Arabia Saudí", flag: "🇸🇦", lat: 24.7, lng: 46.7, region: "Golfo", gdp: 1.1,
    usAlign: 30, cnAlign: 25, ruAlign: 15, blocs: ["OPEP+", "BRICS+ (invitada)"],
    tariffAvg: 6, tariffNote: "Diversifica compradores de petróleo hacia Asia; TLC con Reino Unido en curso.", fdiIn: 26, fdiOut: 30, unAlignUS: 36,
    diploUS: 0, diploEU: 0, diploCN: 1, strategy: "Multialineamiento vía Visión 2030", strategyNote: "Coordina precios con Rusia en OPEP+ mientras busca pacto de defensa y civil nuclear con EE.UU.",
    energyImportShare: -95, energySuppliers: "Exportador neto — mayor reserva de crudo disponible",
    techDependency: "Importa infraestructura de datacenters/IA de EE.UU. a gran escala (Vision 2030).",
    tourismInbound: 22, tourismOutbound: 8, tourismTopSource: "Emiratos / Egipto",
    sanctions: "Ninguna relevante — bajo escrutinio por relación con Moscú en OPEP+.", riskScore: 46 },

  { id: "ae", name: "Emiratos Árabes Unidos", flag: "🇦🇪", lat: 24.45, lng: 54.4, region: "Golfo", gdp: 0.5,
    usAlign: 40, cnAlign: 30, ruAlign: 20, blocs: ["BRICS+", "OPEP+ (asociado)"],
    tariffAvg: 4, tariffNote: "Red de TLC bilaterales agresiva (India, Indonesia, Israel).", fdiIn: 45, fdiOut: 25, unAlignUS: 40,
    diploUS: 1, diploEU: 1, diploCN: 1, strategy: "Superconector multialineado", strategyNote: "Hub logístico/financiero para capital ruso, chino y occidental simultáneamente.",
    energyImportShare: -90, energySuppliers: "Exportador neto",
    techDependency: "Ambición de hub global de IA — bajo escrutinio EE.UU. por reexportación de chips a China.",
    tourismInbound: 18, tourismOutbound: 6, tourismTopSource: "India / Reino Unido",
    sanctions: "Bajo escrutinio EE.UU. por evasión de sanciones a Rusia vía Dubái.", riskScore: 41 },

  { id: "qa", name: "Catar", flag: "🇶🇦", lat: 25.3, lng: 51.53, region: "Golfo", gdp: 0.24,
    usAlign: 45, cnAlign: 15, ruAlign: 0, blocs: ["OPEP+ (observador)"],
    tariffAvg: 5, tariffNote: "Mayor exportador de GNL del mundo junto a EE.UU./Australia.", fdiIn: 4, fdiOut: 12, unAlignUS: 44,
    diploUS: 1, diploEU: 1, diploCN: 0, strategy: "Mediador energético neutral", strategyNote: "Base militar de EE.UU. (Al Udeid) + mediación activa en conflictos regionales.",
    energyImportShare: -98, energySuppliers: "Exportador neto de GNL",
    techDependency: "Baja dependencia crítica — economía basada en renta energética.",
    tourismInbound: 4, tourismOutbound: 2, tourismTopSource: "Arabia Saudí / India",
    sanctions: "Ninguna relevante.", riskScore: 34 },

  { id: "il", name: "Israel", flag: "🇮🇱", lat: 31.77, lng: 35.2, region: "Oriente Medio", gdp: 0.53,
    usAlign: 88, cnAlign: -20, ruAlign: -30, blocs: ["Acuerdos de Abraham"],
    tariffAvg: 4, tariffNote: "TLC con EE.UU., UE y (parcial) socios árabes vía Acuerdos de Abraham.", fdiIn: 25, fdiOut: 18, unAlignUS: 72,
    diploUS: 2, diploEU: 0, diploCN: -1, strategy: "Seguridad primero + normalización regional", strategyNote: "Normalización con el Golfo en pausa por el conflicto en Gaza; dependencia militar de EE.UU. crítica.",
    energyImportShare: -10, energySuppliers: "Autosuficiente (gas offshore) — exportador regional",
    techDependency: "Potencia de ciberseguridad y semis de diseño (Intel, Nvidia I+D); altamente integrado con EE.UU.",
    tourismInbound: 3, tourismOutbound: 9, tourismTopSource: "EE.UU. / Rusia",
    sanctions: "Ninguna relevante — objeto de escrutinio internacional por el conflicto en Gaza.", riskScore: 72 },

  { id: "ir", name: "Irán", flag: "🇮🇷", lat: 35.7, lng: 51.4, region: "Oriente Medio", gdp: 0.4,
    usAlign: -90, cnAlign: 45, ruAlign: 60, blocs: ["OCS", "BRICS+"],
    tariffAvg: 15, tariffNote: "Comercio exterior fuertemente restringido por sanciones; venta de crudo a China con descuento.", fdiIn: 3, fdiOut: 1, unAlignUS: 8,
    diploUS: -2, diploEU: -1, diploCN: 1, strategy: "Eje de resistencia", strategyNote: "Suministra drones a Rusia; economía de resiliencia bajo sanciones máximas desde 2018.",
    energyImportShare: -85, energySuppliers: "Exportador neto (mercado gris vía China)",
    techDependency: "Programa de drones/misiles doméstico avanzado pese al aislamiento tecnológico.",
    tourismInbound: 6, tourismOutbound: 8, tourismTopSource: "Irak / Azerbaiyán",
    sanctions: "Bajo sanciones máximas de EE.UU.; parcialmente UE.", riskScore: 84 },

  { id: "eg", name: "Egipto", flag: "🇪🇬", lat: 30.04, lng: 31.24, region: "Norte de África", gdp: 0.4,
    usAlign: 25, cnAlign: 15, ruAlign: 10, blocs: ["Liga Árabe", "BRICS+"],
    tariffAvg: 12, tariffNote: "Depende de peajes del Canal de Suez, afectados por ataques hutíes al tráfico marítimo.", fdiIn: 10, fdiOut: 1, unAlignUS: 38,
    diploUS: 0, diploEU: 0, diploCN: 0, strategy: "Renta geográfica + estabilidad militar", strategyNote: "Ayuda militar de EE.UU. clave; capital del Golfo sostiene el programa de reformas.",
    energyImportShare: 20, energySuppliers: "Argelia, Israel (gas por gasoducto)",
    techDependency: "Baja base tecnológica propia; hub de call-centers/outsourcing en expansión.",
    tourismInbound: 15, tourismOutbound: 4, tourismTopSource: "Rusia / Alemania",
    sanctions: "Ninguna relevante.", riskScore: 55 },

  { id: "ng", name: "Nigeria", flag: "🇳🇬", lat: 9.08, lng: 7.53, region: "África Occidental", gdp: 0.5,
    usAlign: 20, cnAlign: 10, ruAlign: 0, blocs: ["AfCFTA", "OPEP"],
    tariffAvg: 12, tariffNote: "Implementando el área de libre comercio continental africana (AfCFTA).", fdiIn: 3, fdiOut: 1, unAlignUS: 36,
    diploUS: 0, diploEU: 0, diploCN: 0, strategy: "Potencia demográfica en construcción", strategyNote: "Mayor población de África; infraestructura financiada mayoritariamente por China.",
    energyImportShare: -20, energySuppliers: "Exportador neto de crudo (con fugas por robo/sabotaje)",
    techDependency: "Hub tecnológico regional (fintech) creciente en Lagos.",
    tourismInbound: 1, tourismOutbound: 1, tourismTopSource: "Reino Unido / EE.UU.",
    sanctions: "Ninguna relevante.", riskScore: 62 },

  { id: "za", name: "Sudáfrica", flag: "🇿🇦", lat: -25.75, lng: 28.19, region: "África Austral", gdp: 0.4,
    usAlign: 10, cnAlign: 30, ruAlign: 20, blocs: ["BRICS+", "AfCFTA", "SADC"],
    tariffAvg: 8, tariffNote: "Beneficiaria de AGOA (acceso preferente a EE.UU.), bajo revisión por su alineamiento con Rusia.", fdiIn: 9, fdiOut: 4, unAlignUS: 32,
    diploUS: -1, diploEU: 0, diploCN: 1, strategy: "Anfitrión histórico de BRICS", strategyNote: "Postura de no alineamiento formal con simpatía práctica hacia Moscú y Pekín.",
    energyImportShare: 25, energySuppliers: "Crisis energética doméstica (carbón) — importa de la región",
    techDependency: "Mayor economía diversificada de África; dependencia de inversión china en minería.",
    tourismInbound: 9, tourismOutbound: 4, tourismTopSource: "Zimbabue / Reino Unido",
    sanctions: "Ninguna relevante — bajo escrutinio de EE.UU. por vínculos con Rusia.", riskScore: 57 },

  { id: "br", name: "Brasil", flag: "🇧🇷", lat: -15.79, lng: -47.88, region: "Sudamérica", gdp: 2.2,
    usAlign: 25, cnAlign: 20, ruAlign: 10, blocs: ["BRICS+", "Mercosur"],
    tariffAvg: 11, tariffNote: "Mercosur negocia TLC con la UE tras 20 años de estancamiento.", fdiIn: 65, fdiOut: 15, unAlignUS: 40,
    diploUS: 0, diploEU: 1, diploCN: 1, strategy: "No alineamiento activo BRICS", strategyNote: "China como mayor socio comercial; mantiene relación funcional con Washington en paralelo.",
    energyImportShare: -5, energySuppliers: "Cuasi-autosuficiente (biocombustible + petróleo pre-sal)",
    techDependency: "Potencia agroindustrial y de energía renovable; baja capacidad de semis propia.",
    tourismInbound: 6, tourismOutbound: 11, tourismTopSource: "Argentina / EE.UU.",
    sanctions: "Ninguna relevante.", riskScore: 45 },

  { id: "mx", name: "México", flag: "🇲🇽", lat: 19.43, lng: -99.13, region: "Norteamérica", gdp: 1.8,
    usAlign: 55, cnAlign: -5, ruAlign: -10, blocs: ["USMCA"],
    tariffAvg: 7, tariffNote: "Mayor socio comercial de EE.UU.; foco de la revisión USMCA 2026 por transbordo chino.", fdiIn: 36, fdiOut: 6, unAlignUS: 56,
    diploUS: 1, diploEU: 0, diploCN: 0, strategy: "Nearshoring como palanca nacional", strategyNote: "Principal beneficiario de la relocalización de manufactura fuera de China hacia Norteamérica.",
    energyImportShare: 20, energySuppliers: "EE.UU. (gas natural por gasoducto)",
    techDependency: "Ensamblaje electrónico/automotriz en expansión rápida (nearshoring).",
    tourismInbound: 42, tourismOutbound: 22, tourismTopSource: "EE.UU. / Canadá",
    sanctions: "Ninguna relevante.", riskScore: 48 },

  { id: "ar", name: "Argentina", flag: "🇦🇷", lat: -34.6, lng: -58.38, region: "Sudamérica", gdp: 0.6,
    usAlign: 45, cnAlign: 0, ruAlign: -10, blocs: ["Mercosur"],
    tariffAvg: 13, tariffNote: "Giro liberalizador arancelario desde 2024; renegociando términos con Mercosur.", fdiIn: 8, fdiOut: 1, unAlignUS: 52,
    diploUS: 1, diploEU: 0, diploCN: -1, strategy: "Realineamiento pro-occidental", strategyNote: "Giro hacia Washington/FMI; litio y gas de Vaca Muerta como nuevas palancas de inversión.",
    energyImportShare: -5, energySuppliers: "Cuasi-autosuficiente (Vaca Muerta)",
    techDependency: "Yacimientos de litio clave para baterías globales; baja industria de semis.",
    tourismInbound: 7, tourismOutbound: 5, tourismTopSource: "Brasil / Chile",
    sanctions: "Ninguna relevante.", riskScore: 50 },

  { id: "ca", name: "Canadá", flag: "🇨🇦", lat: 45.42, lng: -75.7, region: "Norteamérica", gdp: 2.2,
    usAlign: 90, cnAlign: -25, ruAlign: -55, blocs: ["USMCA", "OTAN", "G7"],
    tariffAvg: 2, tariffNote: "Integración casi total con EE.UU. vía USMCA; fricción puntual en madera/lácteos.", fdiIn: 55, fdiOut: 90, unAlignUS: 84,
    diploUS: 2, diploEU: 1, diploCN: -1, strategy: "Integración profunda con EE.UU.", strategyNote: "Exportador crítico de energía, potasa y minerales críticos a EE.UU.",
    energyImportShare: -60, energySuppliers: "Exportador neto (petróleo, gas, uranio, potasa)",
    techDependency: "Exportador clave de minerales críticos (potasa, uranio, níquel) para la transición energética.",
    tourismInbound: 22, tourismOutbound: 15, tourismTopSource: "EE.UU. / Reino Unido",
    sanctions: "Aplica sanciones a Rusia junto a G7.", riskScore: 30 },

  { id: "kz", name: "Kazajistán", flag: "🇰🇿", lat: 51.17, lng: 71.43, region: "Asia Central", gdp: 0.28,
    usAlign: 5, cnAlign: 20, ruAlign: 25, blocs: ["EAEU", "OCS"],
    tariffAvg: 6, tariffNote: "Miembro de la unión aduanera euroasiática liderada por Rusia.", fdiIn: 5, fdiOut: 1, unAlignUS: 30,
    diploUS: 0, diploEU: 0, diploCN: 0, strategy: "Equilibrista entre Moscú y Pekín", strategyNote: "Corredor clave de la nueva Ruta de la Seda; distancia diplomática creciente de Moscú tras 2022.",
    energyImportShare: -70, energySuppliers: "Exportador neto (crudo, uranio)",
    techDependency: "Mayor productor mundial de uranio — insumo crítico para energía nuclear global.",
    tourismInbound: 9, tourismOutbound: 6, tourismTopSource: "Rusia / Uzbekistán",
    sanctions: "Ninguna relevante — vigila exposición a sanciones secundarias por comercio con Rusia.", riskScore: 46 },

  { id: "no", name: "Noruega", flag: "🇳🇴", lat: 59.91, lng: 10.75, region: "Europa", gdp: 0.5,
    usAlign: 80, cnAlign: -15, ruAlign: -60, blocs: ["OTAN", "EEE"],
    tariffAvg: 3, tariffNote: "Fuera de la UE pero integrada en el mercado único vía el EEE.", fdiIn: 12, fdiOut: 35, unAlignUS: 80,
    diploUS: 2, diploEU: 1, diploCN: -1, strategy: "Proveedor energético de reemplazo de Europa", strategyNote: "Sustituyó a Rusia como principal proveedor de gas de la UE tras 2022.",
    energyImportShare: -85, energySuppliers: "Exportador neto (gas, petróleo, hidroeléctrica)",
    techDependency: "Fondo soberano más grande del mundo; baja dependencia tecnológica crítica.",
    tourismInbound: 6, tourismOutbound: 6, tourismTopSource: "Suecia / Dinamarca",
    sanctions: "Aplica sanciones UE/OTAN a Rusia.", riskScore: 24 },

  { id: "ie", name: "Irlanda", flag: "🇮🇪", lat: 53.35, lng: -6.26, region: "Europa", gdp: 0.55,
    usAlign: 70, cnAlign: -10, ruAlign: -45, blocs: ["UE"],
    tariffAvg: 3, tariffNote: "Arancel externo común UE; hub fiscal para multinacionales de EE.UU.", fdiIn: 140, fdiOut: 60, unAlignUS: 74,
    diploUS: 2, diploEU: 2, diploCN: 0, strategy: "Puente fiscal-tecnológico EE.UU.-UE", strategyNote: "Sede europea de facto de las grandes tecnológicas de EE.UU. (datos + fiscalidad).",
    energyImportShare: 70, energySuppliers: "Reino Unido (interconexión), GNL importado",
    techDependency: "Máxima concentración de datacenters/sedes tech de EE.UU. en la UE.",
    tourismInbound: 11, tourismOutbound: 7, tourismTopSource: "Reino Unido / EE.UU.",
    sanctions: "Aplica sanciones UE a Rusia.", riskScore: 26 },

  { id: "ph", name: "Filipinas", flag: "🇵🇭", lat: 14.6, lng: 120.98, region: "Sudeste Asiático", gdp: 0.47,
    usAlign: 62, cnAlign: -35, ruAlign: -10, blocs: ["ASEAN", "RCEP"],
    tariffAvg: 8, tariffNote: "TLC bilaterales limitados; alta exposición al comercio intra-ASEAN.", fdiIn: 9, fdiOut: 1, unAlignUS: 58,
    diploUS: 2, diploEU: 0, diploCN: -1, strategy: "Refuerzo de la alianza con EE.UU.", strategyNote: "Disputas territoriales activas con China en el mar de Filipinas; acceso militar ampliado a EE.UU.",
    energyImportShare: 45, energySuppliers: "Indonesia, Oriente Medio",
    techDependency: "Hub global de BPO/outsourcing de servicios; baja base industrial de semis.",
    tourismInbound: 6, tourismOutbound: 3, tourismTopSource: "Corea del Sur / EE.UU.",
    sanctions: "Ninguna relevante.", riskScore: 53 },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtSigned = (v, d = 0) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}`;

// ── Selectores de coloreado — la clave de "agrupar por alineamiento" ─────
const COLOR_MODES = [
  { id: "bloc", label: "Bloque geopolítico" },
  { id: "usAlign", label: "Alineamiento con EE.UU." },
  { id: "cnAlign", label: "Alineamiento con China" },
  { id: "riskScore", label: "Riesgo geopolítico ZRC" },
];

function scoreColor(mode, c) {
  if (mode === "riskScore") {
    const v = c.riskScore;
    return v < 40 ? C.green : v < 60 ? C.amber : v < 75 ? "#E08A3C" : C.red;
  }
  // usAlign / cnAlign: -100..100 → rojo (negativo) a verde-azulado (positivo)
  const v = mode === "usAlign" ? c.usAlign : c.cnAlign;
  if (v >= 40) return "#4C8FD9";
  if (v >= 10) return "#3FAE72";
  if (v > -10) return C.amber;
  if (v > -40) return "#E08A3C";
  return C.red;
}

function markerColor(mode, c) {
  if (mode === "bloc") return BLOC_META[computeBloc(c)].color;
  return scoreColor(mode, c);
}

function markerRadius(gdp) {
  return clamp(Math.sqrt(gdp) * 3.4 + 4, 6, 26);
}

// ── Componentes UI ────────────────────────────────────────────────────────

function Pill({ children, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 5,
      fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
      color, background: `${color}18`, border: `1px solid ${color}40`,
    }}>{children}</span>
  );
}

function StatRow({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontFamily: F.body, fontSize: 12, color: C.textSec }}>{label}</span>
      <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: valueColor || C.text, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function AlignBar({ label, value }) {
  // value: -100..100
  const pct = (value + 100) / 2; // 0..100
  const col = value >= 40 ? "#4C8FD9" : value >= 0 ? C.green : value >= -40 ? C.amber : C.red;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: col }}>{fmtSigned(value)}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: C.surface3, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.borderHover, zIndex: 1 }} />
        <div style={{
          position: "absolute", top: 0, bottom: 0, borderRadius: 3, background: col, transition: "all 0.4s",
          left: value >= 0 ? "50%" : `${pct}%`, right: value >= 0 ? `${100 - pct}%` : "50%",
        }} />
      </div>
    </div>
  );
}

function CountryPanel({ country, onClose, lang }) {
  if (!country) return null;
  const bloc = BLOC_META[computeBloc(country)];
  return (
    <div className="grwm-panel" style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      display: "flex", flexDirection: "column", maxHeight: "100%", overflow: "hidden",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 26, marginBottom: 4 }}>{country.flag}</div>
          <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, fontWeight: 600 }}>{country.name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 2 }}>{country.region} · PIB ${country.gdp.toFixed(1)}Bn</div>
        </div>
        <button onClick={onClose} className="grwm-icon-btn" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: "pointer", padding: 6, flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ marginBottom: 16 }}>
          <Pill color={bloc.color}>{bloc.label}</Pill>
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", marginBottom: 8 }}>ALINEAMIENTO ESTRATÉGICO</div>
        <AlignBar label="EE.UU." value={country.usAlign} />
        <AlignBar label="China" value={country.cnAlign} />
        <AlignBar label="Rusia" value={country.ruAlign} />

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 8px" }}>SALUD DIPLOMÁTICA</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <Pill color={diploColor(country.diploUS)}>EE.UU. · {diploLabel(country.diploUS)}</Pill>
          <Pill color={diploColor(country.diploEU)}>UE · {diploLabel(country.diploEU)}</Pill>
          <Pill color={diploColor(country.diploCN)}>China · {diploLabel(country.diploCN)}</Pill>
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 8px" }}>ESTRATEGIA DE PAÍS</div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3 }}>{country.strategy}</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{country.strategyNote}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>COMERCIO E INVERSIÓN</div>
        <StatRow label="Bloques / acuerdos" value={country.blocs.join(" · ")} />
        <StatRow label="Arancel medio aplicado" value={`${country.tariffAvg}%`} />
        <StatRow label="IED entrante (anual)" value={`$${country.fdiIn}Bn`} />
        <StatRow label="IED saliente (anual)" value={`$${country.fdiOut}Bn`} />
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.6 }}>{country.tariffNote}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>VOTO EN NACIONES UNIDAS</div>
        <StatRow label="Alineamiento con EE.UU. (votos clave)" value={`${country.unAlignUS}%`} valueColor={country.unAlignUS >= 60 ? C.green : country.unAlignUS <= 25 ? C.red : C.amber} />

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>DEPENDENCIA ENERGÉTICA</div>
        <StatRow
          label={country.energyImportShare >= 0 ? "Dependencia de importación" : "Exportador neto"}
          value={`${Math.abs(country.energyImportShare)}%`}
          valueColor={country.energyImportShare >= 60 ? C.red : country.energyImportShare < 0 ? C.green : C.amber}
        />
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>{country.energySuppliers}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>DEPENDENCIA TECNOLÓGICA</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{country.techDependency}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>FLUJOS DE TURISMO</div>
        <StatRow label="Llegadas internacionales" value={`${country.tourismInbound}M/año`} />
        <StatRow label="Salidas al exterior" value={`${country.tourismOutbound}M/año`} />
        <StatRow label="Principal origen/destino" value={country.tourismTopSource} />

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>SANCIONES</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6, marginBottom: 4 }}>{country.sanctions}</div>

        <div style={{
          marginTop: 18, padding: "12px 14px", borderRadius: 8,
          background: country.riskScore >= 70 ? "rgba(214,84,74,0.10)" : country.riskScore >= 50 ? "rgba(214,162,60,0.10)" : "rgba(63,174,114,0.10)",
          border: `1px solid ${country.riskScore >= 70 ? C.red : country.riskScore >= 50 ? C.amber : C.green}40`,
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", marginBottom: 4 }}>RIESGO GEOPOLÍTICO ZRC (0-100)</div>
          <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: country.riskScore >= 70 ? C.red : country.riskScore >= 50 ? C.amber : C.green }}>
            {country.riskScore}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ colorMode }) {
  if (colorMode !== "bloc") {
    const gradientStops = colorMode === "riskScore"
      ? [["Bajo", C.green], ["Moderado", C.amber], ["Elevado", "#E08A3C"], ["Crítico", C.red]]
      : [["Fuerte +", "#4C8FD9"], ["Leve +", "#3FAE72"], ["Neutral", C.amber], ["Leve −", "#E08A3C"], ["Fuerte −", C.red]];
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {gradientStops.map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textSec }}>{label}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
      {Object.values(BLOC_META).map((b) => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6 }} title={b.desc}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, display: "inline-block" }} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textSec }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function GeoRiskWorldMap({ onClose, onOpenIntelligence }) {
  const [selectedId, setSelectedId] = useState(null);
  const [colorMode, setColorMode] = useState("bloc");
  const [blocFilter, setBlocFilter] = useState(null);

  useEffect(() => {
    document.title = "ZRC GeoRisk World Map — Mapa Geopolítico Interactivo";
  }, []);

  const selected = useMemo(() => COUNTRIES.find((c) => c.id === selectedId) || null, [selectedId]);

  const visibleCountries = useMemo(() => {
    if (!blocFilter) return COUNTRIES;
    return COUNTRIES.filter((c) => computeBloc(c) === blocFilter);
  }, [blocFilter]);

  const blocCounts = useMemo(() => {
    const counts = {};
    COUNTRIES.forEach((c) => { const b = computeBloc(c); counts[b] = (counts[b] || 0) + 1; });
    return counts;
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      <style>{`
        * { box-sizing: border-box; }
        .grwm-icon-btn:hover { border-color: ${C.gold} !important; color: ${C.gold} !important; }
        .grwm-bloc-btn { transition: all 0.15s ease; cursor: pointer; }
        .grwm-bloc-btn:hover { border-color: ${C.borderHover} !important; }
        .grwm-color-btn { transition: all 0.15s ease; cursor: pointer; }
        .grwm-cta:hover { filter: brightness(1.08); }
        .leaflet-container { background: ${C.bg} !important; font-family: ${F.body} !important; }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: ${C.surface}; color: ${C.text}; }
        .leaflet-control-attribution { background: rgba(11,12,14,0.7) !important; color: ${C.textMuted} !important; }
        .leaflet-control-attribution a { color: ${C.textSec} !important; }
        .grwm-layout { display: grid; grid-template-columns: 1fr 360px; gap: 16px; }
        @media (max-width: 900px) {
          .grwm-layout { grid-template-columns: 1fr; }
          .grwm-panel { max-height: 70vh; }
        }
      `}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(11,12,14,0.92)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, padding: "0 clamp(16px,3vw,32px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.surface3}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Globe2 size={17} color={C.bg} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.2em" }}>ZRC · GEORISK WORLD MAP</div>
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.text, fontWeight: 600, marginTop: 1 }}>Mapa Geopolítico Interactivo</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onOpenIntelligence && (
              <button onClick={onOpenIntelligence} className="grwm-cta" style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 7,
                background: C.gold, color: C.bg, border: "none", fontFamily: F.mono, fontSize: 11,
                fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer",
              }}>
                GeoRisk Intelligence <ArrowRight size={13} />
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="grwm-icon-btn" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, color: C.textMuted, cursor: "pointer", padding: "9px 12px" }}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,3vw,32px) 48px" }}>

        {/* Intro */}
        <div style={{ marginBottom: 18, maxWidth: 820 }}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>
            {COUNTRIES.length} economías clave agrupadas por alineamiento geopolítico real: comercio y aranceles, flujos de inversión, voto en Naciones Unidas, salud diplomática, dependencias energéticas y tecnológicas, turismo y estrategia de país. Elige un país en el mapa para ver el desglose completo.
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 16, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>COLOREAR POR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COLOR_MODES.map((m) => (
                <button key={m.id} onClick={() => setColorMode(m.id)} className="grwm-color-btn" style={{
                  padding: "6px 12px", borderRadius: 6, border: `1px solid ${colorMode === m.id ? C.gold : C.border}`,
                  background: colorMode === m.id ? C.goldDim : "transparent", color: colorMode === m.id ? C.gold : C.textSec,
                  fontFamily: F.mono, fontSize: 11,
                }}>{m.label}</button>
              ))}
            </div>
          </div>
          {colorMode === "bloc" && (
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>FILTRAR BLOQUE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => setBlocFilter(null)} className="grwm-bloc-btn" style={{
                  padding: "6px 12px", borderRadius: 6, border: `1px solid ${!blocFilter ? C.borderHover : C.border}`,
                  background: !blocFilter ? C.surface3 : "transparent", color: !blocFilter ? C.text : C.textSec, fontFamily: F.mono, fontSize: 11,
                }}>Todos ({COUNTRIES.length})</button>
                {Object.entries(BLOC_META).map(([key, b]) => (
                  <button key={key} onClick={() => setBlocFilter(blocFilter === key ? null : key)} className="grwm-bloc-btn" style={{
                    padding: "6px 12px", borderRadius: 6, border: `1px solid ${blocFilter === key ? b.color : C.border}`,
                    background: blocFilter === key ? `${b.color}18` : "transparent", color: blocFilter === key ? b.color : C.textSec,
                    fontFamily: F.mono, fontSize: 11,
                  }}>{b.short} ({blocCounts[key] || 0})</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grwm-layout" style={{ marginBottom: 20 }}>
          {/* Map */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", height: 640 }}>
            <MapContainer center={[22, 20]} zoom={2} minZoom={2} maxZoom={7} style={{ width: "100%", height: "100%" }} worldCopyJump>
              <TileLayer attribution="&copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
              {visibleCountries.map((c) => (
                <CircleMarker
                  key={c.id}
                  center={[c.lat, c.lng]}
                  radius={markerRadius(c.gdp)}
                  pathOptions={{
                    color: selectedId === c.id ? "#FFFFFF" : markerColor(colorMode, c),
                    weight: selectedId === c.id ? 2.5 : 1,
                    fillColor: markerColor(colorMode, c),
                    fillOpacity: 0.72,
                  }}
                  eventHandlers={{ click: () => setSelectedId(c.id) }}
                >
                  <Tooltip direction="top" offset={[0, -4]}>
                    {c.flag} {c.name} · {BLOC_META[computeBloc(c)].label}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Detail panel */}
          {selected ? (
            <CountryPanel country={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10, minHeight: 300 }}>
              <Info size={22} color={C.textMuted} />
              <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, maxWidth: 240 }}>
                Selecciona un país en el mapa para ver comercio, alineamiento, dependencias y estrategia en detalle.
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 10 }}>LEYENDA · TAMAÑO = PIB NOMINAL</div>
          <Legend colorMode={colorMode} />
        </div>

        {/* Bloc breakdown cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 20 }}>
          {Object.entries(BLOC_META).map(([key, b]) => (
            <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${b.color}`, borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: b.color }}>{b.label}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{blocCounts[key] || 0} países</span>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA to Intelligence */}
        {onOpenIntelligence && (
          <div style={{
            background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 10,
            padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 20,
          }}>
            <div style={{ maxWidth: 480 }}>
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.text, marginBottom: 6, fontWeight: 600 }}>Esto es la capa cualitativa. GeoRisk Dashboard añade la cuantitativa.</div>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0 }}>
                Escenarios propios con sliders en tiempo real, impacto estimado en precios de activos por clase, y GeoRisk Predictive ML añade forecast IA a 12 meses y decision engine institucional.
              </p>
            </div>
            <button onClick={onOpenIntelligence} className="grwm-cta" style={{
              padding: "12px 26px", background: C.gold, color: C.bg, border: "none", borderRadius: 8,
              fontFamily: F.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              Ver GeoRisk Intelligence →
            </button>
          </div>
        )}

        {/* Methodology */}
        <div style={{ padding: "16px 20px", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 11, color: C.textMuted, lineHeight: 1.7, fontFamily: F.body }}>
          Metodología: el GeoRisk World Map presenta estimaciones compuestas de ZRC Research sobre {COUNTRIES.length} economías clave (G20 y bloques estratégicos relevantes), combinando lectura editorial de comercio, membresías en bloques/tratados, inversión, alineamiento diplomático y dependencias estructurales. No son series oficiales en vivo (UN Comtrade, UNGA, IMF, UNWTO) sino una síntesis cuantificada para hacer comparables los países entre sí — es un mapa de lectura geopolítica aplicada, no un feed de datos certificados. Se recalibra periódicamente por el equipo de research de Zenith Rise Capital. No constituye asesoramiento de inversión.
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>
          <span>© 2026 Zenith Rise Capital · Calesius Global SL · Madrid, España</span>
          <span>zenithrisecapital.com/mapa-geopolitico</span>
        </div>
      </div>
    </div>
  );
}
