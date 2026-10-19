// GeoRiskWorldMap.jsx — ZRC GeoRisk World Map
// Mapa geopolítico interactivo público — sin login, sin muro de pago.
// Agrupa ~42 economías clave por alineamiento geopolítico (EE.UU. / China /
// Rusia), con datos de comercio, inversión, voto en NU, salud diplomática,
// dependencias energéticas y tecnológicas, turismo y estrategia de país.
// Es el imán de tráfico/SEO de la familia GeoRisk — desde aquí se empuja a
// GeoRisk Dashboard / Predictive ML para la capa cuantitativa (precios,
// escenarios, forecast IA).

import { useState, useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { COUNTRY_PROFILES, COUNTRY_PROFILE_UPDATED_AT, riskBand, trendMeta } from "../../data/countryRiskProfiles.js";
import { WB_COUNTRY_ISO3, WB_INDICATORS, worldBankIndicatorUrl, latestWorldBankObservation, WB_GOVERNANCE_INDICATORS, worldBankGovernanceUrl, sameYearIndicatorGap } from "./worldBankCountryMacro";
import { Globe2, TrendingUp, TrendingDown, Minus, X, ArrowRight, Info } from "lucide-react";

// ── Design tokens — grafito oscuro + acento bronce cartográfico ──────────
// Tono distinto del resto de la familia GeoRisk (azul/verde/gris azulado/
// crema/violeta ya usados en Dashboard, ML, FIS, Visor y Macro Pulse):
// aquí buscamos un aire de "atlas de gabinete" — serio, cartográfico,
// atemporal — coherente con el objetivo de ser el "referente mundial".
const C = {
  bg: "#F7F9FC", surface: "#FFFFFF", surface2: "#EDF3FA", surface3: "#E1E9F3",
  border: "#D2DCE8", borderHover: "#94B7DB",
  text: "#15233B", textSec: "#5E6E86", textMuted: "#64748B",
  gold: "#2E6FB8", goldDim: "rgba(46,111,184,0.10)", goldBorder: "rgba(46,111,184,0.30)",
  red: "#C74B52", green: "#268B72", amber: "#C77B27",
};
const F = {
  display: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  body: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  mono: "'Inter', -apple-system, 'Segoe UI', sans-serif",
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

const COUNTRY_NARRATIVES_EN = {"us":{"strategy":"Anchor of the Western order","strategyNote":"Strategic semiconductor and defense reindustrialization; selective tariffs","tariffNote":"Higher tariffs on China and global steel/aluminum","energySuppliers":"Energy self-sufficient; net exporter","techDependency":"Frontier AI, cloud and chip-design exporter; controls advanced chip exports","sanctions":"Sanctions Russia, Iran, North Korea and Venezuela"},"cn":{"strategy":"China-centered multipolarity","strategyNote":"Belt and Road expansion; technology import substitution; cross-border digital currency","tariffNote":"US/EU tariffs target EVs, steel and solar panels","energySuppliers":"Russia, Saudi Arabia, Angola","techDependency":"Depends on foreign EUV lithography; dominates rare earths","sanctions":"US export controls on advanced chips"},"ru":{"strategy":"Forced Eurasian self-reliance","strategyNote":"Trade redirected toward China and India after Western sanctions","tariffNote":"Partly excluded from SWIFT; trade shifted to Asia","energySuppliers":"Net exporter; expanding China gas pipelines","techDependency":"Dependent on Chinese electronics after Western restrictions","sanctions":"Extensive US, EU, UK and G7 sanctions"},"de":{"strategy":"Rearmament and diversification","strategyNote":"Ended Russian energy reliance; exposed to China through autos and machinery","tariffNote":"EU external tariff; friction with China on EVs","energySuppliers":"Norway, US LNG, Netherlands","techDependency":"Auto sector exposed to Chinese batteries and rare earths","sanctions":"Implements EU Russia sanctions"},"fr":{"strategy":"European strategic autonomy","strategyNote":"Promotes EU defense and industrial capacity; tactical distance from Washington","tariffNote":"EU common external tariff","energySuppliers":"Domestic nuclear, Norway, Algeria","techDependency":"Domestic defense industry; moderate US cloud reliance","sanctions":"Implements EU Russia sanctions"},"gb":{"strategy":"Special relationship; Indo-Pacific pivot","strategyNote":"AUKUS security focus; reviews Chinese infrastructure investment exposure","tariffNote":"Independent post-Brexit tariffs; CPTPP trade agreement","energySuppliers":"Norway, domestic North Sea","techDependency":"Excluded Huawei from 5G; close US technology partnership","sanctions":"Sanctions Russia with G7"},"it":{"strategy":"Atlanticist realignment","strategyNote":"Exited China's Belt and Road; Mattei Plan focuses on African energy","tariffNote":"EU external tariff; exited Belt and Road in 2023","energySuppliers":"Algeria, Azerbaijan, US LNG","techDependency":"Moderate reliance on foreign telecom suppliers","sanctions":"Implements EU Russia sanctions"},"es":{"strategy":"Atlantic and Ibero-American bridge","strategyNote":"Gateway for Latin American investment into the EU","tariffNote":"EU common external tariff","energySuppliers":"Algeria, US LNG, Nigeria","techDependency":"Moderate foreign cloud infrastructure reliance","sanctions":"Implements EU Russia sanctions"},"pl":{"strategy":"NATO eastern frontier","strategyNote":"High defense spending relative to GDP; firm opposition to Moscow","tariffNote":"EU tariff; logistics hub for Ukraine assistance","energySuppliers":"Norway, US LNG; ended Russian gas in 2022","techDependency":"Limited critical dependence; European nearshoring hub","sanctions":"EU Russia sanctions; tense Belarus border"},"nl":{"strategy":"Critical semiconductor supply-chain node","strategyNote":"ASML provides strategic leverage through coordinated export controls","tariffNote":"Restricts ASML lithography exports to China","energySuppliers":"Norway, US LNG","techDependency":"Dominates EUV lithography, a global strategic asset","sanctions":"Implements EU Russia sanctions"},"se":{"strategy":"Baltic NATO integration","strategyNote":"Joined NATO in 2024 after longstanding non-alignment","tariffNote":"EU common external tariff","energySuppliers":"Domestic nuclear and hydropower","techDependency":"Domestic defense industry; limited critical reliance","sanctions":"Implements EU Russia sanctions"},"ch":{"strategy":"Pragmatic armed neutrality","strategyNote":"Diplomatically neutral; de facto Western economic alignment","tariffNote":"Bilateral trade agreements; formal neutrality","energySuppliers":"France and Germany electricity interconnections","techDependency":"Global finance and pharmaceutical hub; limited critical reliance","sanctions":"Partly aligns with EU Russia sanctions"},"tr":{"strategy":"Multi-aligned strategic hinge","strategyNote":"NATO member buying Russian air defenses; mediates between Kyiv and Moscow","tariffNote":"Partial EU customs union; bilateral trade deals","energySuppliers":"Russia, Azerbaijan, Iran","techDependency":"Domestic export-oriented defense-drone industry","sanctions":"Does not sanction Russia; faces US scrutiny"},"ua":{"strategy":"Survival and Western integration","strategyNote":"Accelerated EU candidacy; wartime economy backed by Western aid","tariffNote":"Liberalized EU trade since 2022","energySuppliers":"EU emergency electricity interconnection","techDependency":"Rapidly developing domestic drones and defense","sanctions":"Victim of Russian aggression; counter-sanctions on Russia"},"jp":{"strategy":"Rearmament and Quad cooperation","strategyNote":"Expanded defense spending; key Indo-Pacific counterweight to China","tariffNote":"CPTPP, US trade arrangements and chip export controls","energySuppliers":"Australian LNG, Middle East","techDependency":"Leading chip materials/equipment; Taiwan Strait exposure","sanctions":"Sanctions Russia with G7"},"kr":{"strategy":"Security alliance and technology powerhouse","strategyNote":"Critical memory-chip producer facing North Korean pressure","tariffNote":"KORUS FTA; US EV and battery tariff exposure","energySuppliers":"Middle East, Australian LNG","techDependency":"DRAM/NAND leader; exposed to competing export controls","sanctions":"Sanctions Russia and North Korea"},"in":{"strategy":"Strategic multi-alignment","strategyNote":"Buys discounted Russian oil while deepening Quad ties","tariffNote":"Protected tariff regime; selective bilateral trade talks","energySuppliers":"Russian crude, Middle East","techDependency":"Make in India chip ambitions; major IT services exporter","sanctions":"Does not sanction Russia; longstanding defense ties"},"id":{"strategy":"Active ASEAN non-alignment","strategyNote":"Uses US-China rivalry to attract EV battery investment","tariffNote":"Restricts raw nickel exports to encourage processing","energySuppliers":"Domestic coal; imported crude","techDependency":"Critical battery nickel; Chinese-led refining investment","sanctions":"No significant sanctions"},"vn":{"strategy":"China+1 manufacturing hub","strategyNote":"Attracts electronics and textiles relocated from China","tariffNote":"Benefits from China+1; US scrutiny of transshipment","energySuppliers":"Domestic coal and regional imports","techDependency":"Growing electronics assembly; limited chip design","sanctions":"No significant sanctions"},"tw":{"strategy":"Semiconductor interdependence as deterrent","strategyNote":"TSMC silicon shield concentrates strategic leverage","tariffNote":"No formal US FTA; trade framework under development","energySuppliers":"Middle East, Australian LNG; import vulnerability","techDependency":"TSMC leads production of advanced chips","sanctions":"No broad sanctions; blockade/invasion risk"},"sg":{"strategy":"Active platform neutrality","strategyNote":"Neutral hub for capital and data from both blocs","tariffNote":"Nearly tariff-free trade and financial hub","energySuppliers":"Diversified LNG from Qatar, Australia and US","techDependency":"Regional data centers exposed to export controls","sanctions":"No significant sanctions"},"au":{"strategy":"Western Indo-Pacific anchor","strategyNote":"AUKUS nuclear submarines underpin strategic commitment","tariffNote":"Recovering from Chinese wine/coal restrictions","energySuppliers":"Net LNG, coal and lithium exporter","techDependency":"Critical lithium and rare-earth alternative to China","sanctions":"Sanctions Russia with G7"},"sa":{"strategy":"Vision 2030 multi-alignment","strategyNote":"Coordinates oil with Russia in OPEC+; seeks US defense and nuclear ties","tariffNote":"Diversifies oil buyers toward Asia; UK trade talks","energySuppliers":"Net exporter; major crude reserves","techDependency":"Imports US AI and data-center infrastructure","sanctions":"No major sanctions; OPEC+ scrutiny"},"ae":{"strategy":"Multi-aligned superconnector","strategyNote":"Logistics and finance hub for Russian, Chinese and Western capital","tariffNote":"Expanding bilateral deals with India, Indonesia and Israel","energySuppliers":"Net energy exporter","techDependency":"AI hub ambitions; US scrutiny of chip re-exports","sanctions":"US scrutiny of Russia sanctions evasion via Dubai"},"qa":{"strategy":"Neutral energy mediator","strategyNote":"Hosts US Al Udeid airbase; mediates regional conflicts","tariffNote":"Major global LNG exporter","energySuppliers":"Net LNG exporter","techDependency":"Limited critical technology reliance; energy-based economy","sanctions":"No significant sanctions"},"il":{"strategy":"Security first; regional normalization","strategyNote":"Gulf normalization stalled amid Gaza conflict; relies on US military support","tariffNote":"US/EU and partial Arab trade agreements","energySuppliers":"Offshore gas self-sufficient; regional exporter","techDependency":"Cybersecurity and chip-design strength; US integration","sanctions":"International scrutiny over Gaza; no broad sanctions"},"ir":{"strategy":"Axis of resistance","strategyNote":"Supplies drones to Russia; resilience under severe sanctions","tariffNote":"Foreign trade constrained; discounted oil to China","energySuppliers":"Net exporter through indirect channels","techDependency":"Domestic drone and missile programs despite isolation","sanctions":"Extensive US and partial EU sanctions"},"eg":{"strategy":"Geographic rents and military stability","strategyNote":"US military aid and Gulf capital support reforms","tariffNote":"Suez tolls affected by Houthi shipping attacks","energySuppliers":"Algeria and Israeli pipeline gas","techDependency":"Limited domestic technology; expanding outsourcing","sanctions":"No significant sanctions"},"ng":{"strategy":"Emerging demographic powerhouse","strategyNote":"Africa's largest population; infrastructure heavily China-financed","tariffNote":"Implementing African continental free-trade area","energySuppliers":"Net crude exporter; theft and sabotage losses","techDependency":"Growing Lagos fintech ecosystem","sanctions":"No significant sanctions"},"za":{"strategy":"Historic BRICS host","strategyNote":"Formally non-aligned; practical sympathy toward Moscow and Beijing","tariffNote":"US AGOA access under review over Russia links","energySuppliers":"Domestic coal power crisis; regional imports","techDependency":"Diversified African economy; Chinese mining investment","sanctions":"No major sanctions; US scrutiny of Russia links"},"ke":{"strategy":"East African diplomatic and tech hub","strategyNote":"UN regional center, M-Pesa fintech and Chinese infrastructure debt","tariffNote":"AGOA beneficiary; US trade talks","energySuppliers":"Middle East crude; domestic geothermal growth","techDependency":"Silicon Savannah fintech; emerging data-center hub","sanctions":"No significant sanctions"},"cd":{"strategy":"Mining state under Chinese influence","strategyNote":"Renegotiates Sicomines for more domestic cobalt/coltan value","tariffNote":"Few FTAs; exports unprocessed minerals","energySuppliers":"Untapped Inga hydropower; refined-fuel imports","techDependency":"Major cobalt supplier; Chinese-owned mines","sanctions":"Targeted US/EU sanctions on eastern armed groups"},"br":{"strategy":"Active BRICS non-alignment","strategyNote":"China is largest trade partner; functional US relations","tariffNote":"Mercosur-EU trade negotiations","energySuppliers":"Nearly self-sufficient in biofuels and pre-salt oil","techDependency":"Agribusiness and renewables; limited chip industry","sanctions":"No significant sanctions"},"mx":{"strategy":"Nearshoring as national lever","strategyNote":"Manufacturing shifts from China to North America","tariffNote":"Major US trade partner; USMCA 2026 review","energySuppliers":"US pipeline natural gas","techDependency":"Fast-growing electronics and automotive assembly","sanctions":"No significant sanctions"},"ar":{"strategy":"Pro-Western realignment","strategyNote":"Washington/IMF pivot; lithium and Vaca Muerta investment","tariffNote":"Tariff liberalization since 2024; Mercosur talks","energySuppliers":"Nearly self-sufficient through Vaca Muerta","techDependency":"Lithium deposits; limited chip manufacturing","sanctions":"No significant sanctions"},"cl":{"strategy":"Andean institutional anchor","strategyNote":"Lithium reserves and stability attract transition investment","tariffNote":"Extensive FTAs with US, EU, China and CPTPP","energySuppliers":"Imports LNG/crude; domestic solar and wind","techDependency":"Leading copper and lithium supplier","sanctions":"No significant sanctions"},"co":{"strategy":"Longstanding ally in transition","strategyNote":"Government shift brought US friction without ending core ties","tariffNote":"US FTA since 2012; occasional tariff friction","energySuppliers":"Net oil/coal exporter; renewable transition","techDependency":"Growing software nearshoring and BPO hub","sanctions":"No significant sanctions"},"ca":{"strategy":"Deep US integration","strategyNote":"Critical US supplier of energy, potash and minerals","tariffNote":"USMCA integration; lumber/dairy disputes","energySuppliers":"Net oil, gas, uranium and potash exporter","techDependency":"Critical minerals for energy transition","sanctions":"Sanctions Russia with G7"},"kz":{"strategy":"Balancing Moscow and Beijing","strategyNote":"Belt and Road corridor; increasing distance from Moscow","tariffNote":"Member of Eurasian customs union","energySuppliers":"Net crude and uranium exporter","techDependency":"Major uranium producer for nuclear energy","sanctions":"Secondary sanctions exposure via Russia trade"},"no":{"strategy":"Europe's replacement energy supplier","strategyNote":"Replaced Russia as major EU gas supplier after 2022","tariffNote":"EEA single-market access outside EU","energySuppliers":"Net gas, oil and hydropower exporter","techDependency":"Large sovereign wealth fund; limited critical reliance","sanctions":"Aligns with European Russia sanctions"},"ie":{"strategy":"US-EU fiscal and technology bridge","strategyNote":"European base for major US tech groups and data centers","tariffNote":"EU tariff; multinational tax hub","energySuppliers":"UK electricity link; imported LNG","techDependency":"High concentration of US tech and data centers","sanctions":"Implements EU Russia sanctions"},"ph":{"strategy":"Strengthening US alliance","strategyNote":"Disputes with China at sea; expanded US military access","tariffNote":"Limited FTAs; intra-ASEAN trade exposure","energySuppliers":"Indonesia, Middle East","techDependency":"Global outsourcing hub; limited chip industry","sanctions":"No significant sanctions"}};

const TOURISM_NAMES_EN = {"Corea del Sur":"South Korea","Rusia":"Russia","Canadá":"Canada","México":"Mexico","Turquía":"Türkiye","China":"China","Países Bajos":"Netherlands","Suiza":"Switzerland","Alemania":"Germany","Reino Unido":"United Kingdom","Francia":"France","Ucrania":"Ukraine","Bélgica":"Belgium","Noruega":"Norway","Polonia":"Poland","Moldavia":"Moldova","Japón":"Japan","Taiwán":"Taiwan","Bangladés":"Bangladesh","Malasia":"Malaysia","Singapur":"Singapore","Indonesia":"Indonesia","Nueva Zelanda":"New Zealand","Emiratos":"UAE","Egipto":"Egypt","India":"India","Arabia Saudí":"Saudi Arabia","Irak":"Iraq","Azerbaiyán":"Azerbaijan","Nigeria":"Nigeria","Zimbabue":"Zimbabwe","Uganda":"Uganda","Tanzania":"Tanzania","Ruanda":"Rwanda","Argentina":"Argentina","Brasil":"Brazil","Chile":"Chile","Venezuela":"Venezuela","Uzbekistán":"Uzbekistan","Suecia":"Sweden","Dinamarca":"Denmark","EE.UU.":"United States"};
const translateTourism = (value) => value.split(" / ").map(part => TOURISM_NAMES_EN[part] || part).join(" / ");
const normalizeCountrySearch = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

const diploLabel = (v) => (v >= 2 ? "Socio estratégico" : v === 1 ? "Cordial" : v === 0 ? "Normal" : v === -1 ? "Tensa" : "Crisis");
const diploColor = (v) => (v >= 1 ? C.green : v === 0 ? C.textMuted : v === -1 ? C.amber : C.red);

// ── Dataset — ~42 economías clave (G20 + bloques estratégicos) ──────────
// Estimaciones compuestas de ZRC Research (metodología ilustrativa, misma
// naturaleza que el resto de la plataforma GeoRisk) — no son series
// oficiales en vivo de UN Comtrade / UNGA / IMF, sino una lectura editorial
// cuantificada para hacer comparables los países entre sí. Ver metodología.
const COUNTRY_NAMES_EN = {
  "us": "United States",
  "cn": "China",
  "ru": "Russia",
  "de": "Germany",
  "fr": "France",
  "gb": "United Kingdom",
  "it": "Italy",
  "es": "Spain",
  "pl": "Poland",
  "nl": "Netherlands",
  "se": "Sweden",
  "ch": "Switzerland",
  "tr": "Türkiye",
  "ua": "Ukraine",
  "jp": "Japan",
  "kr": "South Korea",
  "in": "India",
  "id": "Indonesia",
  "vn": "Vietnam",
  "tw": "Taiwan",
  "au": "Australia",
  "nz": "New Zealand",
  "sa": "Saudi Arabia",
  "ae": "United Arab Emirates",
  "ir": "Iran",
  "il": "Israel",
  "eg": "Egypt",
  "za": "South Africa",
  "ng": "Nigeria",
  "br": "Brazil",
  "mx": "Mexico",
  "ar": "Argentina",
  "cl": "Chile",
  "co": "Colombia",
  "ca": "Canada",
  "kz": "Kazakhstan",
  "no": "Norway",
  "ie": "Ireland",
  "ph": "Philippines"
};

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

  { id: "ke", name: "Kenia", flag: "🇰🇪", lat: -1.29, lng: 36.82, region: "África Oriental", gdp: 0.12,
    usAlign: 40, cnAlign: 25, ruAlign: -5, blocs: ["AfCFTA", "EAC"],
    tariffAvg: 10, tariffNote: "Beneficiaria de AGOA; negocia un TLC bilateral propio con EE.UU. tras el estancamiento UE-EAC.", fdiIn: 2, fdiOut: 0.3, unAlignUS: 42,
    diploUS: 1, diploEU: 1, diploCN: 0, strategy: "Hub diplomático y tecnológico de África Oriental", strategyNote: "Sede regional de la ONU y centro fintech continental (M-Pesa), con deuda china elevada por infraestructura (ferrocarril SGR).",
    energyImportShare: 25, energySuppliers: "Crudo de Oriente Medio; fuerte desarrollo geotérmico doméstico",
    techDependency: "'Silicon Savannah' — ecosistema fintech/startups líder de África y creciente hub de datacenters regionales.",
    tourismInbound: 2, tourismOutbound: 1, tourismTopSource: "Uganda / Tanzania",
    sanctions: "Ninguna relevante.", riskScore: 49 },

  { id: "cd", name: "R. D. Congo", flag: "🇨🇩", lat: -4.32, lng: 15.31, region: "África Central", gdp: 0.07,
    usAlign: 10, cnAlign: 55, ruAlign: 5, blocs: ["SADC", "AfCFTA"],
    tariffAvg: 11, tariffNote: "Sin TLC relevantes; economía extractiva orientada a exportación de minerales en bruto.", fdiIn: 2, fdiOut: 0.1, unAlignUS: 30,
    diploUS: 0, diploEU: 0, diploCN: 1, strategy: "Estado minero bajo influencia china", strategyNote: "Renegocia el acuerdo Sicomines con Pekín para capturar más valor local del boom del cobalto/coltán.",
    energyImportShare: 15, energySuppliers: "Enorme potencial hidroeléctrico (presa de Inga) sin explotar; importa combustibles refinados",
    techDependency: "Controla ~70% del cobalto mundial, insumo crítico para baterías EV — la mayoría de las minas están en manos de capital chino.",
    tourismInbound: 0.1, tourismOutbound: 0.1, tourismTopSource: "Ruanda / Uganda",
    sanctions: "Sanciones selectivas de EE.UU./UE a grupos armados en el este del país (M23).", riskScore: 79 },

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

  { id: "cl", name: "Chile", flag: "🇨🇱", lat: -33.45, lng: -70.65, region: "Sudamérica", gdp: 0.5,
    usAlign: 55, cnAlign: 15, ruAlign: -15, blocs: ["Alianza del Pacífico", "CPTPP"],
    tariffAvg: 5, tariffNote: "Red de TLC más extensa de Latinoamérica (incl. EE.UU., UE, China, CPTPP).", fdiIn: 20, fdiOut: 8, unAlignUS: 55,
    diploUS: 1, diploEU: 1, diploCN: 0, strategy: "Ancla institucional andina", strategyNote: "Mayor reserva de litio del mundo junto a Argentina/Bolivia; la estabilidad institucional atrae inversión occidental en la transición energética.",
    energyImportShare: 60, energySuppliers: "Importa GNL y crudo; fuerte desarrollo solar/eólico doméstico",
    techDependency: "Mayor exportador mundial de cobre y segundo productor de litio — insumos críticos duales para electrificación.",
    tourismInbound: 4, tourismOutbound: 3, tourismTopSource: "Argentina / Brasil",
    sanctions: "Ninguna relevante.", riskScore: 33 },

  { id: "co", name: "Colombia", flag: "🇨🇴", lat: 4.71, lng: -74.07, region: "Sudamérica", gdp: 0.4,
    usAlign: 45, cnAlign: 10, ruAlign: -10, blocs: ["Alianza del Pacífico"],
    tariffAvg: 7, tariffNote: "TLC vigente con EE.UU. desde 2012; fricción arancelaria puntual con Washington en 2025.", fdiIn: 17, fdiOut: 3, unAlignUS: 50,
    diploUS: 0, diploEU: 1, diploCN: 0, strategy: "Aliado histórico en reconfiguración", strategyNote: "El giro izquierdista del gobierno introdujo fricciones puntuales con Washington sin romper la alianza de seguridad y comercio de fondo.",
    energyImportShare: -15, energySuppliers: "Exportador neto de petróleo y carbón, en transición hacia renovables",
    techDependency: "Hub regional de servicios BPO/nearshoring de software en expansión.",
    tourismInbound: 5, tourismOutbound: 4, tourismTopSource: "EE.UU. / Venezuela",
    sanctions: "Ninguna relevante.", riskScore: 51 },

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

function CountryMacroPanel({ country, lang }) {
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const [state, setState] = useState({status:"loading",values:{},error:null});
  const iso3 = WB_COUNTRY_ISO3[country.id];
  useEffect(() => {
    const controller = new AbortController();
    if (!iso3) { setState({status:"missing",values:{},error:null}); return () => controller.abort(); }
    setState({status:"loading",values:{},error:null});
    Promise.all(WB_INDICATORS.map(async indicator => {
      try {
        const response = await fetch(worldBankIndicatorUrl(iso3, indicator.code), {signal:controller.signal});
        if (!response.ok) throw new Error("HTTP " + response.status);
        const payload = await response.json();
        return [indicator.code,latestWorldBankObservation(payload)];
      } catch(error) {
        if (controller.signal.aborted) return [indicator.code,null];
        return [indicator.code,null];
      }
    })).then(items => {
      if (controller.signal.aborted) return;
      const values = Object.fromEntries(items);
      const available = Object.values(values).some(Boolean);
      setState({status:available?"ready":"unavailable",values,error:null});
    });
    return () => controller.abort();
  }, [iso3]);
  const fmt = (observation,unit) => {
    if (!observation) return tr("Sin dato", "No data");
    if (unit==="usd") return new Intl.NumberFormat(lang==="en"?"en-US":"es-ES",{maximumFractionDigits:2}).format(observation.value/1e9) + " " + tr("miles de millones USD", "USD bn");
    return new Intl.NumberFormat(lang==="en"?"en-US":"es-ES",{maximumFractionDigits:2}).format(observation.value)+"%";
  };
  return (
    <section aria-label={tr("Indicadores del Banco Mundial","World Bank indicators")}>
      <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em",marginBottom:9}}>WORLD BANK · WDI</div>
      <p style={{fontSize:11,color:C.textSec,lineHeight:1.6}}>{tr("Últimas observaciones disponibles de World Development Indicators (WDI). Cada indicador puede corresponder a un año diferente.", "Latest available World Development Indicators (WDI) observations. Each indicator may have a different reference year.")}</p>
      {state.status==="loading" && <p role="status" style={{fontSize:12,color:C.textSec}}>{tr("Consultando fuente oficial…","Fetching official data…")}</p>}
      {(state.status==="unavailable" || state.status==="missing") && <p role="status" style={{fontSize:12,color:C.amber}}>{tr("No hay datos verificables disponibles en este momento. Las estimaciones ZRC no se utilizan como sustituto.", "Verified data is currently unavailable. ZRC estimates are not substituted.")}</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        {WB_INDICATORS.map(indicator => {
          const observation = state.values[indicator.code];
          return <div key={indicator.code} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:12,background:C.surface2,minWidth:0}}>
            <div style={{fontSize:11,color:C.textSec}}>{en?indicator.en:indicator.es}</div>
            <div style={{fontSize:17,fontWeight:700,color:C.text,marginTop:8,overflowWrap:"anywhere"}}>{state.status==="loading"?"—":fmt(observation,indicator.unit)}</div>
            <div style={{fontSize:10,color:C.textMuted,marginTop:5}}>{observation ? tr("Año: ","Year: ")+observation.year : tr("Año no disponible","Year unavailable")}</div>
          </div>;
        })}
      </div>
      <p style={{fontSize:11,color:C.textMuted,lineHeight:1.7,marginTop:16}}>
        {tr("Fuente: Banco Mundial, WDI. Cifras sujetas a revisiones; no se indican como datos en tiempo real.", "Source: World Bank WDI. Data may be revised and is not presented as real-time.")}
        {" "}<a href={"https://data.worldbank.org/country/"+iso3.toLowerCase()} target="_blank" rel="noopener noreferrer" style={{color:C.gold}}>{tr("Consultar fuente", "Open source")} ↗</a>
      </p>
    </section>
  );
}

function CountryInstitutionsPanel({ country, lang }) {
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const iso3 = WB_COUNTRY_ISO3[country.id];
  const [result, setResult] = useState({loading:true, observations:{}, failed:false});
  useEffect(() => {
    const controller = new AbortController();
    setResult({loading:true, observations:{}, failed:false});
    if (!iso3) { setResult({loading:false,observations:{},failed:true}); return () => controller.abort(); }
    Promise.all(WB_GOVERNANCE_INDICATORS.map(async indicator => {
      try {
        const response = await fetch(worldBankGovernanceUrl(iso3,indicator.code), {signal:controller.signal});
        if (!response.ok) throw new Error("World Bank " + response.status);
        const observation = latestWorldBankObservation(await response.json());
        return [indicator.code,observation];
      } catch(error) {
        return [indicator.code,null];
      }
    })).then(entries => {
      if (controller.signal.aborted) return;
      const observations = Object.fromEntries(entries);
      setResult({loading:false,observations,failed:!Object.values(observations).some(Boolean)});
    });
    return () => controller.abort();
  },[iso3]);
  const fmt = value => new Intl.NumberFormat(en?"en-US":"es-ES",{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:"exceptZero"}).format(value);
  return (
    <section aria-label={tr("Calidad institucional", "Institutional quality")}>
      <div style={{fontSize:11,color:C.gold,fontWeight:750,letterSpacing:".09em"}}>WORLD BANK · WORLDWIDE GOVERNANCE INDICATORS</div>
      <p style={{fontSize:12,color:C.textSec,lineHeight:1.6}}>{tr("Estimaciones estadísticas comparables de calidad institucional, sujetas a incertidumbre y revisiones. Valores más altos indican mejor gobernanza; no son probabilidades ni el índice ZRC.", "Comparable statistical estimates of institutional quality, subject to uncertainty and revisions. Higher values indicate stronger governance; these are neither probabilities nor the ZRC index.")}</p>
      {result.loading && <p role="status" style={{fontSize:12,color:C.textSec}}>{tr("Consultando datos institucionales…","Loading institutional data…")}</p>}
      {result.failed && <p role="status" style={{fontSize:12,color:C.amber}}>{tr("No se han podido recuperar observaciones verificadas. No se sustituyen por estimaciones.", "Verified observations are unavailable. No substitute values are shown.")}</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>
        {WB_GOVERNANCE_INDICATORS.map(indicator => {
          const observation = result.observations[indicator.code];
          return <div key={indicator.code} style={{padding:12,borderRadius:12,background:C.surface2,border:`1px solid ${C.border}`,minWidth:0}}>
            <div style={{fontSize:11,color:C.textSec,lineHeight:1.5}}>{en?indicator.en:indicator.es}</div>
            <div style={{fontWeight:750,fontSize:21,color:C.text,marginTop:7}}>{result.loading?"—":observation?fmt(observation.value):tr("N/D","N/A")}</div>
            <div style={{fontSize:10,color:C.textMuted,marginTop:5}}>{observation?tr("Año: ","Year: ")+observation.year:tr("Sin observación","No observation")}</div>
          </div>;
        })}
      </div>
      <p style={{fontSize:11,lineHeight:1.65,color:C.textMuted,marginTop:14}}>
        {tr("Fuente: Banco Mundial, Worldwide Governance Indicators. Escala de estimación estandarizada; consultar metodología y márgenes de error antes de comparar países.", "Source: World Bank Worldwide Governance Indicators. Standardized estimate scale; consult methodology and uncertainty intervals before making country comparisons.")}
        {" "}<a href="https://www.worldbank.org/en/publication/worldwide-governance-indicators" target="_blank" rel="noopener noreferrer" style={{color:C.gold}}>{tr("Fuente y metodología","Source and methodology")} ↗</a>
      </p>
    </section>
  );
}

function CorporateDecisionLens({ country, lang }) {
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const conditions = [
    {
      id:"investment", icon:"↗", title:tr("Inversión y M&A","Investment and M&A"),
      observation:tr("Riesgo geopolítico editorial ZRC: ","ZRC editorial geopolitical risk: ")+country.riskScore+"/100",
      questions:[
        tr("¿Cómo afecta la exposición regulatoria a la valoración y al horizonte de salida?","How does regulatory exposure affect valuation and exit horizon?"),
        tr("¿Hay restricciones a la inversión extranjera, autorizaciones o requisitos de screening?","Are there FDI restrictions, clearance requirements or screening obligations?")
      ]
    },
    {
      id:"financing", icon:"◈", title:tr("Financiación y riesgo financiero","Financing and financial risk"),
      observation:tr("Alineamiento estratégico con EE.UU.: ","Strategic alignment with the US: ")+(country.usAlign>0?"+":"")+country.usAlign,
      questions:[
        tr("¿El servicio de la deuda soporta escenarios adversos de tipos, divisa y liquidez?","Can debt service withstand adverse interest-rate, FX and liquidity scenarios?"),
        tr("¿Qué garantías, covenants y protección contractual exige la operación?","Which guarantees, covenants and contractual protections does the transaction require?")
      ]
    },
    {
      id:"supply", icon:"⇄", title:tr("Comercio y cadena de suministro","Trade and supply chain"),
      observation:tr("Arancel editorial: ","Editorial tariff estimate: ")+country.tariffAvg+"% · "+tr("exposición energética: ","energy exposure: ")+Math.abs(country.energyImportShare)+"%",
      questions:[
        tr("¿Qué proveedores, corredores logísticos y clientes concentran la exposición?","Which suppliers, logistics routes and customers concentrate exposure?"),
        tr("¿Hay riesgos de sanciones, reglas de origen o suministro energético?","Are sanctions, rules of origin or energy availability material risks?")
      ]
    }
  ];
  return <section aria-label={tr("Análisis corporativo ZRC","ZRC corporate decision lens")}>
    <p style={{fontSize:11,color:C.textMuted,lineHeight:1.6,margin:"0 0 12px"}}>{tr("Guía de due diligence orientativa basada en los indicadores editoriales existentes. No equivale a una recomendación de inversión ni a una calificación calibrada.", "Indicative due diligence guide based on existing editorial indicators. Not investment advice or a calibrated rating.")}</p>
    <div style={{display:"grid",gap:10}}>
      {conditions.map(section=><div key={section.id} style={{padding:14,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:14}}>
        <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:6}}><span aria-hidden="true" style={{fontSize:19,color:C.gold}}>{section.icon}</span><strong style={{fontSize:13,color:C.text}}>{section.title}</strong></div>
        <div style={{fontSize:11,color:C.gold,marginBottom:9,fontWeight:650}}>{section.observation}</div>
        <ul style={{paddingLeft:18,margin:0,color:C.textSec,fontSize:12,lineHeight:1.6}}>{section.questions.map(q=><li key={q} style={{marginBottom:7}}>{q}</li>)}</ul>
      </div>)}
    </div>
  </section>;
}

// The independent editorial country-risk profile is linked by ISO3.
// The map's 42-economy geopolitical scores and the profile's five-pillar
// scores are NOT interchangeable or merged into a synthetic score.
const EXTENDED_COUNTRY_PROFILES = Object.fromEntries(COUNTRY_PROFILES.map(profile=>[profile.iso,profile]));
const PROFILE_COUNTRY_ISO3 = { ...WB_COUNTRY_ISO3, pt:"PRT", pe:"PER", uy:"URY", pa:"PAN", ma:"MAR" };
function extendedCountryProfile(country) {
  return EXTENDED_COUNTRY_PROFILES[PROFILE_COUNTRY_ISO3[country.id]] || null;
}
function CountryEditorialPreview({ country, lang }) {
  const profile=extendedCountryProfile(country);
  if (!profile) return null;
  const en=lang==="en";
  const tr=(es,english)=>en?english:es;
  const band=riskBand(profile.score);
  const trend=trendMeta[profile.trend];
  const url="/inteligencia/paises/"+profile.slug+"/";
  return (
    <section aria-label={tr("Ficha editorial de riesgo país","Editorial country risk profile")} style={{padding:16,borderRadius:16,border:"1px solid "+C.borderHover,background:"linear-gradient(140deg,#edf4fc,#ffffff)",marginBottom:18}}>
      <div style={{fontSize:10,fontWeight:750,letterSpacing:".1em",color:C.gold,marginBottom:9}}>ZRC · COUNTRY INTELLIGENCE</div>
      <div style={{display:"flex",gap:14,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,color:C.textSec,marginBottom:4}}>{tr("Análisis editorial completo","Full editorial research")}</div>
          <div style={{fontSize:24,fontWeight:800,color:band.color,fontVariantNumeric:"tabular-nums"}}>{profile.score}<span style={{fontSize:12,color:C.textMuted}}>/100 · {en?({Bajo:"Low",Moderado:"Moderate",Elevado:"Elevated",Alto:"High",Crítico:"Critical"}[band.label]||band.label):band.label}</span></div>
        </div>
        <div style={{fontSize:12,fontWeight:700,color:trend.color}}>{trend.symbol} {en?({up:"Rising risk",down:"Declining risk",stable:"Stable"}[profile.trend]):trend.label}</div>
      </div>
      <p style={{fontSize:12,lineHeight:1.65,color:C.text,margin:"12px 0"}}>{profile.summary}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:13}}>
        <div style={{borderRadius:10,background:C.surface,padding:10,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:6}}>{tr("QUÉ VIGILAR","WHAT TO WATCH")}</div>
          <div style={{fontSize:11,lineHeight:1.5,color:C.textSec}}>{profile.watch?.[0]}</div>
        </div>
        <div style={{borderRadius:10,background:C.surface,padding:10,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:6}}>{tr("INVERSIÓN","INVESTMENT")}</div>
          <div style={{fontSize:11,lineHeight:1.5,color:C.textSec}}>{profile.implications?.[0]}</div>
        </div>
      </div>
      <a href={url} style={{display:"block",textAlign:"center",padding:"12px 10px",background:"#245a97",color:"#fff",fontWeight:750,fontSize:12,borderRadius:10,textDecoration:"none"}}>{tr("Ver ficha país completa","Open full country profile")} →</a>
      <p style={{fontSize:10,lineHeight:1.55,color:C.textMuted,margin:"10px 0 0"}}>{tr("Perfil ZRC de cinco pilares, actualizado","Five-pillar ZRC profile, updated")} {COUNTRY_PROFILE_UPDATED_AT}. {tr("Puntuación distinta del índice geopolítico editorial del mapa; no compararlas directamente.","Distinct from the map's editorial geopolitical score; do not compare the two directly.")}</p>
      {en&&<p style={{fontSize:10,lineHeight:1.5,color:C.textMuted,margin:"6px 0 0"}}>Full editorial profile and narrative are currently published in Spanish.</p>}
    </section>
  );
}

function CountryPanel({ country, onClose, lang }) {
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = [["overview", tr("Resumen", "Overview")], ["geopolitics", tr("Geopolítica", "Geopolitics")], ["trade", tr("Comercio y energía", "Trade & energy")], ["investment", tr("Inversión", "Investment")], ["decisions", tr("Decisiones", "Decisions")], ["macro", tr("Macro y finanzas", "Macro & finance")], ["institutions", tr("Instituciones", "Institutions")]];
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
          <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, fontWeight: 600 }}>{en ? COUNTRY_NAMES_EN[country.id] || country.name : country.name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 2 }}>{country.region} · {tr("PIB", "GDP")} ${country.gdp.toFixed(1)}Bn</div>
        </div>
        <button onClick={onClose} className="grwm-icon-btn" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: "pointer", padding: 6, flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ overflowY: "auto", padding: "16px 20px" }}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9,marginBottom:18}}>
          {[
            [tr("Riesgo ZRC","ZRC risk"),country.riskScore + "/100",country.riskScore >= 70 ? C.red : country.riskScore >= 50 ? C.amber : C.green],
            [tr("IED entrante","FDI inflows"),"$" + country.fdiIn + "bn",C.gold],
            [tr("Arancel medio","Avg. tariff"),country.tariffAvg + "%",C.text],
            [tr("Dependencia energética","Energy exposure"),Math.abs(country.energyImportShare) + "%",country.energyImportShare >= 60 ? C.red : C.text]
          ].map(([label,value,color])=><div key={label} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",background:C.surface2,minWidth:0}}>
            <div style={{fontSize:10,color:C.textSec,lineHeight:1.4}}>{label}</div>
            <div style={{fontSize:20,fontWeight:700,color,marginTop:5,fontVariantNumeric:"tabular-nums"}}>{value}</div>
          </div>)}
        </div>

        <CountryEditorialPreview country={country} lang={lang} />
        <div role="tablist" aria-label={tr("Secciones del país", "Country sections")} style={{display:"flex",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",padding:"2px 0 12px",marginBottom:12,borderBottom:`1px solid ${C.border}`}}>
          {tabs.map(([id,label])=><button type="button" key={id} role="tab" id={"grwm-tab-"+id} aria-selected={activeTab===id} aria-controls={"grwm-panel-"+id} onClick={()=>setActiveTab(id)} style={{flexShrink:0,padding:"10px 12px",borderRadius:8,border:`1px solid ${activeTab===id?C.gold:C.border}`,background:activeTab===id?C.surface2:C.surface,color:activeTab===id?C.gold:C.textSec,fontWeight:activeTab===id?700:500,cursor:"pointer",fontSize:12}}>{label}</button>)}
        </div>
        <div role="tabpanel" id={"grwm-panel-"+activeTab} aria-labelledby={"grwm-tab-"+activeTab}>
        <p style={{fontSize:11,color:C.textMuted,lineHeight:1.6,margin:"0 0 12px"}}>{tr("Indicadores editoriales ZRC, no verificados como series oficiales en tiempo real. La cobertura y las fechas deben validarse antes de una decisión de inversión.", "ZRC editorial indicators, not verified as live official series. Coverage and dates require validation before investment decisions.")}</p>{activeTab==="overview" && <>        <div style={{ marginBottom: 16 }}>
          <Pill color={bloc.color}>{en ? ({ occidental: "Western Bloc", sino_euroasiatico: "Sino-Eurasian Axis", multialineado: "Pragmatic multi-aligned", no_alineado: "Non-aligned / swing states" }[computeBloc(country)]) : bloc.label}</Pill>
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", marginBottom: 8 }}>{tr("ALINEAMIENTO ESTRATÉGICO", "STRATEGIC ALIGNMENT")}</div>
        <AlignBar label="EE.UU." value={country.usAlign} />
        <AlignBar label="China" value={country.cnAlign} />
        <AlignBar label="Rusia" value={country.ruAlign} />

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 8px" }}>{tr("ESTRATEGIA DE PAÍS", "COUNTRY STRATEGY")}</div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3 }}>{en ? COUNTRY_NARRATIVES_EN[country.id]?.strategy ?? country.strategy : country.strategy}</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{en ? COUNTRY_NARRATIVES_EN[country.id]?.strategyNote ?? country.strategyNote : country.strategyNote}</div>

        <div style={{
          marginTop: 18, padding: "12px 14px", borderRadius: 8,
          background: country.riskScore >= 70 ? "rgba(214,84,74,0.10)" : country.riskScore >= 50 ? "rgba(214,162,60,0.10)" : "rgba(63,174,114,0.10)",
          border: `1px solid ${country.riskScore >= 70 ? C.red : country.riskScore >= 50 ? C.amber : C.green}40`,
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", marginBottom: 4 }}>{tr("RIESGO GEOPOLÍTICO ZRC (0-100)", "ZRC GEOPOLITICAL RISK (0–100)")}</div>
          <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: country.riskScore >= 70 ? C.red : country.riskScore >= 50 ? C.amber : C.green }}>
            {country.riskScore}
          </div>
        </div>
</>}
{activeTab==="geopolitics" && <>        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 8px" }}>{tr("SALUD DIPLOMÁTICA", "DIPLOMATIC RELATIONS")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <Pill color={diploColor(country.diploUS)}>EE.UU. · {diploLabel(country.diploUS)}</Pill>
          <Pill color={diploColor(country.diploEU)}>UE · {diploLabel(country.diploEU)}</Pill>
          <Pill color={diploColor(country.diploCN)}>China · {diploLabel(country.diploCN)}</Pill>
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>{tr("VOTO EN NACIONES UNIDAS", "UNITED NATIONS VOTING")}</div>
        <StatRow label={tr("Alineamiento con EE.UU. (votos clave)","Alignment with US (key votes)")} value={`${country.unAlignUS}%`} valueColor={country.unAlignUS >= 60 ? C.green : country.unAlignUS <= 25 ? C.red : C.amber} />

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>{tr("SANCIONES", "SANCTIONS")}</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6, marginBottom: 4 }}>{en ? COUNTRY_NARRATIVES_EN[country.id]?.sanctions ?? country.sanctions : country.sanctions}</div>

</>}
{activeTab==="trade" && <>        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>{tr("COMERCIO E INVERSIÓN", "TRADE & INVESTMENT")}</div>
        <StatRow label={tr("Bloques / acuerdos","Blocs / agreements")} value={country.blocs.join(" · ")} />
        <StatRow label={tr("Arancel medio aplicado","Average applied tariff")} value={`${country.tariffAvg}%`} />
        <StatRow label={tr("IED entrante (anual)","Annual FDI inflows")} value={`$${country.fdiIn}Bn`} />
        <StatRow label={tr("IED saliente (anual)","Annual FDI outflows")} value={`$${country.fdiOut}Bn`} />
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.6 }}>{en ? COUNTRY_NARRATIVES_EN[country.id]?.tariffNote ?? country.tariffNote : country.tariffNote}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>{tr("DEPENDENCIA ENERGÉTICA", "ENERGY DEPENDENCY")}</div>
        <StatRow
          label={country.energyImportShare >= 0 ? tr("Dependencia de importación","Import dependence") : tr("Exportador neto","Net exporter")}
          value={`${Math.abs(country.energyImportShare)}%`}
          valueColor={country.energyImportShare >= 60 ? C.red : country.energyImportShare < 0 ? C.green : C.amber}
        />
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>{en ? COUNTRY_NARRATIVES_EN[country.id]?.energySuppliers ?? country.energySuppliers : country.energySuppliers}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>{tr("DEPENDENCIA TECNOLÓGICA", "TECHNOLOGY DEPENDENCY")}</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{en ? COUNTRY_NARRATIVES_EN[country.id]?.techDependency ?? country.techDependency : country.techDependency}</div>

        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", margin: "18px 0 4px" }}>{tr("FLUJOS DE TURISMO", "TOURISM FLOWS")}</div>
        <StatRow label={tr("Llegadas internacionales","International arrivals")} value={`${country.tourismInbound}M/año`} />
        <StatRow label={tr("Salidas al exterior","Outbound travel")} value={`${country.tourismOutbound}M/año`} />
        <StatRow label={tr("Principal origen/destino","Main origin / destination")} value={en ? translateTourism(country.tourismTopSource) : country.tourismTopSource} />

</>}
{activeTab==="macro" && <CountryMacroPanel country={country} lang={lang} />}
{activeTab==="institutions" && <CountryInstitutionsPanel country={country} lang={lang} />}
{activeTab==="decisions" && <CorporateDecisionLens country={country} lang={lang} />}
{activeTab==="investment" && <>        <div style={{padding:"13px 14px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em"}}>{tr("PERSPECTIVA CORPORATIVA ZRC", "ZRC CORPORATE PERSPECTIVE")}</div>
          <div style={{fontSize:12,lineHeight:1.65,color:C.textSec,marginTop:8}}>{tr("Puntos de comprobación para una operación: exposición comercial y regulatoria, disponibilidad energética, riesgo cambiario, restricciones a la inversión y concentración de clientes o proveedores. Se requiere due diligence específica.", "Transaction diligence priorities: trade and regulatory exposure, energy availability, FX risk, investment restrictions, and customer or supplier concentration. Transaction-specific due diligence is required.")}</div>
        </div>
        <StatRow label={tr("IED entrante (miles de millones USD)", "FDI inflows (USD bn)")} value={country.fdiIn} />
        <StatRow label={tr("IED saliente (miles de millones USD)", "FDI outflows (USD bn)")} value={country.fdiOut} />
        <StatRow label={tr("Arancel medio aplicado", "Average applied tariff")} value={country.tariffAvg+"%"} />
        <div style={{fontSize:11,color:C.textMuted,lineHeight:1.6,marginTop:12}}>{tr("Datos macrofinancieros verificables, flujos M&A y calificación soberana: pendientes de integración de fuentes, sin puntuaciones inventadas.", "Verified macrofinancial data, M&A flows and sovereign ratings: pending source integration; no invented scores.")}</div>
</>}
</div>
      </div>
    </div>
  );
}

function Legend({ colorMode, lang }) {
  const en = lang === "en";
  const blocLabel = (key) => en ? ({ occidental: "Western Bloc", sino_euroasiatico: "Sino-Eurasian Axis", multialineado: "Pragmatic multi-aligned", no_alineado: "Non-aligned / swing states" }[key] || BLOC_META[key]?.label) : BLOC_META[key]?.label;
  if (colorMode !== "bloc") {
    const gradientStops = colorMode === "riskScore"
      ? [[en ? "Low" : "Bajo", C.green], [en ? "Moderate" : "Moderado", C.amber], [en ? "High" : "Elevado", "#E08A3C"], [en ? "Critical" : "Crítico", C.red]]
      : [[en ? "Strong +" : "Fuerte +", "#4C8FD9"], [en ? "Slight +" : "Leve +", "#3FAE72"], ["Neutral", C.amber], [en ? "Slight −" : "Leve −", "#E08A3C"], [en ? "Strong −" : "Fuerte −", C.red]];
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
      {Object.entries(BLOC_META).map(([key,b]) => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6 }} title={en ? ({occidental:"Strong US / NATO / EU alignment",sino_euroasiatico:"Strong China / Russia alignment",multialineado:"Pragmatic balancing",no_alineado:"No dominant strategic alignment"}[key]) : b.desc}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, display: "inline-block" }} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textSec }}>{blocLabel(key)}</span>
        </div>
      ))}
    </div>
  );
}

// V2.5: observational comparison; official values never blended with ZRC editorial scores.
function OfficialCountryComparison({ countries, lang }) {
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const [state, setState] = useState({loading:true, values:{}});
  const [referenceId, setReferenceId] = useState(null);
  const ids = countries.map(c=>c.id).join(",");
  const referenceCountry = countries.find(c=>c.id===referenceId) || countries[0];
  const indicators = [
    ...WB_INDICATORS.filter(i=>["NY.GDP.MKTP.KD.ZG","FP.CPI.TOTL.ZG"].includes(i.code)).map(i=>({...i, source:"WDI"})),
    ...WB_GOVERNANCE_INDICATORS.filter(i=>["GOV_WGI_GE_EST","GOV_WGI_RL_EST"].includes(i.code)).map(i=>({...i, source:"WGI"}))
  ];
  useEffect(()=>{
    const controller = new AbortController();
    setState({loading:true,values:{}});
    const selected = ids.split(",").filter(Boolean);
    Promise.all(selected.flatMap(id=>indicators.map(async indicator=>{
      const iso3=WB_COUNTRY_ISO3[id];
      if (!iso3) return [id,indicator.code,null];
      try {
        const url=indicator.source==="WGI" ? worldBankGovernanceUrl(iso3,indicator.code) : worldBankIndicatorUrl(iso3,indicator.code);
        const response=await fetch(url,{signal:controller.signal});
        if (!response.ok) throw new Error("World Bank response "+response.status);
        return [id,indicator.code,latestWorldBankObservation(await response.json())];
      } catch { return [id,indicator.code,null]; }
    }))).then(entries=>{
      if (controller.signal.aborted) return;
      const values={};
      entries.forEach(([id,code,observation])=>{values[id]??={};values[id][code]=observation;});
      setState({loading:false,values});
    });
    return ()=>controller.abort();
  },[ids]);
  const format=(observation,indicator)=>{
    if (!observation) return tr("Sin dato","No data");
    const digits=indicator.source==="WGI"?2:1;
    return new Intl.NumberFormat(en?"en-US":"es-ES",{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(observation.value)+(indicator.source==="WDI"?"%":"")+" · "+observation.year;
  };
  return <section aria-label={tr("Comparativa oficial del Banco Mundial","Official World Bank comparison")} style={{marginTop:20,paddingTop:18,borderTop:`1px solid ${C.border}`}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{tr("Indicadores oficiales comparables","Comparable official indicators")}</div>
    <p style={{fontSize:11,lineHeight:1.6,color:C.textMuted,margin:"0 0 12px"}}>{tr("Fuente: Banco Mundial (WDI y WGI). Se muestra el último dato disponible y su año, que puede variar entre países. Las estimaciones WGI tienen incertidumbre estadística y no son puntuaciones ZRC.","Source: World Bank (WDI and WGI). Latest available value and year are shown; years may differ across countries. WGI estimates carry statistical uncertainty and are not ZRC scores.")}</p>
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",border:`1px solid ${C.border}`,borderRadius:14}}>
      <table style={{borderCollapse:"collapse",width:"100%",minWidth:500,fontSize:12,textAlign:"left"}}>
        <thead><tr><th scope="col" style={{padding:11,borderBottom:`1px solid ${C.border}`}}>{tr("Indicador","Indicator")}</th>{countries.map(c=><th scope="col" key={c.id} style={{padding:11,borderBottom:`1px solid ${C.border}`,minWidth:120}}>{c.flag} {en?COUNTRY_NAMES_EN[c.id]||c.name:c.name}</th>)}</tr></thead>
        <tbody>{indicators.map(i=><tr key={i.code}><th scope="row" style={{padding:11,borderBottom:`1px solid ${C.border}`,fontWeight:500,color:C.textSec}}>{en?i.en:i.es} <span style={{fontSize:10,color:C.textMuted}}>({i.source})</span></th>{countries.map(c=><td key={c.id} style={{padding:11,borderBottom:`1px solid ${C.border}`,fontVariantNumeric:"tabular-nums"}}>{state.loading?tr("Cargando…","Loading…"):format(state.values[c.id]?.[i.code],i)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {countries.length>1 && !state.loading && <section aria-label={tr("Diferencias entre países","Country indicator gaps")} style={{marginTop:18,padding:14,borderRadius:14,background:C.surface2,border:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
        <strong style={{fontSize:13}}>{tr("Brechas frente al país de referencia","Gaps vs reference country")}</strong>
        <select aria-label={tr("País de referencia","Reference country")} value={referenceCountry.id} onChange={e=>setReferenceId(e.target.value)} style={{border:`1px solid ${C.border}`,borderRadius:9,background:C.surface,color:C.text,padding:"8px 10px",maxWidth:"100%"}}>
          {countries.map(c=><option key={c.id} value={c.id}>{c.flag} {en?COUNTRY_NAMES_EN[c.id]||c.name:c.name}</option>)}
        </select>
      </div>
      <p style={{fontSize:11,lineHeight:1.6,color:C.textMuted,margin:"8px 0 12px"}}>{tr("Diferencia = país comparado menos país de referencia. Solo se calcula si ambos datos son del mismo año; WDI en puntos porcentuales y WGI en unidades de estimación.","Difference = compared country minus reference country. Only calculated for the same observation year; WDI in percentage points and WGI in estimate units.")}</p>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{width:"100%",minWidth:460,borderCollapse:"collapse",fontSize:12,textAlign:"left"}}>
          <thead><tr><th scope="col" style={{padding:9,borderBottom:`1px solid ${C.border}`}}>{tr("Indicador","Indicator")}</th>{countries.filter(c=>c.id!==referenceCountry.id).map(c=><th key={c.id} scope="col" style={{padding:9,borderBottom:`1px solid ${C.border}`}}>{c.flag} {en?COUNTRY_NAMES_EN[c.id]||c.name:c.name}</th>)}</tr></thead>
          <tbody>{indicators.map(i=><tr key={i.code}><th scope="row" style={{padding:9,borderBottom:`1px solid ${C.border}`,fontWeight:500}}>{en?i.en:i.es}</th>{countries.filter(c=>c.id!==referenceCountry.id).map(c=>{
            const a=state.values[referenceCountry.id]?.[i.code];
            const b=state.values[c.id]?.[i.code];
            const comparison=sameYearIndicatorGap(a,b);
            return <td key={c.id} style={{padding:9,borderBottom:`1px solid ${C.border}`,fontVariantNumeric:"tabular-nums"}}>
              {comparison ? <><strong>{comparison.gap>0?"+":""}{new Intl.NumberFormat(en?"en-US":"es-ES",{maximumFractionDigits:2}).format(comparison.gap)} {i.source==="WDI"?"pp":""}</strong> <span style={{color:C.textMuted,fontSize:10}}>({comparison.year})</span></> : <span style={{color:C.textMuted}}>{a&&b&&a.year!==b.year?tr("Años distintos","Different years"):tr("Sin datos comparables","No comparable data")}</span>}
            </td>;
          })}</tr>)}</tbody>
        </table>
      </div>
    </section>}
    <p style={{fontSize:10,color:C.textMuted,margin:"9px 0 0"}}><a href="https://data.worldbank.org/" target="_blank" rel="noopener noreferrer" style={{color:C.gold}}>{tr("Datos del Banco Mundial","World Bank data")} ↗</a> · <a href="https://www.worldbank.org/en/publication/worldwide-governance-indicators" target="_blank" rel="noopener noreferrer" style={{color:C.gold}}>WGI methodology ↗</a></p>
  </section>;
}

// Phase 1: transparent comparison of existing editorial country estimates.
function CountryComparison({ countries, lang, onRemove, onClear }) {
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const rows = [
    [tr("Riesgo geopolítico ZRC (0–100)", "ZRC geopolitical risk (0–100)"), c => c.riskScore],
    [tr("Alineamiento EE.UU. (−100 a +100)", "US alignment (−100 to +100)"), c => c.usAlign],
    [tr("Alineamiento China (−100 a +100)", "China alignment (−100 to +100)"), c => c.cnAlign],
    [tr("Alineamiento Rusia (−100 a +100)", "Russia alignment (−100 to +100)"), c => c.ruAlign],
    [tr("Arancel medio aplicado", "Average applied tariff"), c => c.tariffAvg + "%"],
    [tr("IED entrante anual (miles de millones USD)", "Annual FDI inflows (USD bn)"), c => c.fdiIn],
  ];
  return (
    <section aria-label={tr("Comparación de países", "Country comparison")} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:"18px 20px",marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
        <div><div style={{fontSize:10,letterSpacing:".12em",color:C.gold,fontWeight:700}}>ZRC · COUNTRY COMPARISON</div><div style={{fontSize:17,fontWeight:650,marginTop:5}}>{tr("Comparativa estratégica", "Strategic comparison")} · {countries.length}/3</div></div>
        <button type="button" onClick={onClear} style={{padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:9,background:C.surface,color:C.text,cursor:"pointer"}}>{tr("Vaciar comparación", "Clear comparison")}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${countries.length}, minmax(0,1fr))`,gap:10,marginBottom:16}}>
        {countries.map(c=><div key={c.id} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:12,padding:12,minWidth:0}}>
          <div style={{fontSize:11,color:C.textSec,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.flag} {en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginTop:8}}>
            <span style={{fontSize:25,fontWeight:750,color:c.riskScore>=70?C.red:c.riskScore>=50?C.amber:C.green}}>{c.riskScore}</span><span style={{fontSize:11,color:C.textMuted}}>/100</span>
          </div>
          <div role="meter" aria-label={tr("Riesgo ZRC", "ZRC risk")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.riskScore} style={{height:7,background:C.surface3,borderRadius:9,overflow:"hidden",marginTop:9}}>
            <div style={{width:`${Math.max(0,Math.min(100,c.riskScore))}%`,height:"100%",background:c.riskScore>=70?C.red:c.riskScore>=50?C.amber:C.green,borderRadius:9}}/>
          </div>
        </div>)}
      </div>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{borderCollapse:"collapse",width:"100%",minWidth:500,fontSize:12,textAlign:"left"}}>
          <thead><tr><th scope="col" style={{padding:12,borderBottom:`1px solid ${C.border}`}}>{tr("Indicador", "Indicator")}</th>{countries.map(c=><th scope="col" key={c.id} style={{padding:12,borderBottom:`1px solid ${C.border}`,minWidth:120}}>{c.flag} {en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name}<button type="button" onClick={()=>onRemove(c.id)} aria-label={tr("Quitar ","Remove ")+(en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name)} style={{marginLeft:8,border:"none",background:"transparent",color:C.textSec,cursor:"pointer"}}>×</button></th>)}</tr></thead>
          <tbody>{rows.map(([label, value])=><tr key={label}><th scope="row" style={{padding:12,borderBottom:`1px solid ${C.border}`,fontWeight:500,color:C.textSec}}>{label}</th>{countries.map(c=><td key={c.id} style={{padding:12,borderBottom:`1px solid ${C.border}`,fontVariantNumeric:"tabular-nums",fontWeight:650}}>{value(c)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p style={{fontSize:11,lineHeight:1.5,color:C.textMuted,margin:"12px 0 0"}}>{tr("Estimaciones editoriales de ZRC Research; no son datos oficiales en tiempo real. Las escalas de alineamiento son indicativas.", "ZRC Research editorial estimates, not live official data. Alignment scales are indicative.")}</p>
      <OfficialCountryComparison countries={countries} lang={lang} />
    </section>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function GeoRiskWorldMap({ onClose, onOpenIntelligence, lang: parentLang = "es" }) {
  const [localLang, setLocalLang] = useState(null);
  const lang = localLang ?? parentLang;
  const en = lang === "en";
  const tr = (es, english) => en ? english : es;
  const blocLabel = (key) => en ? ({ occidental: "Western Bloc", sino_euroasiatico: "Sino-Eurasian Axis", multialineado: "Pragmatic multi-aligned", no_alineado: "Non-aligned / swing states" }[key]) : BLOC_META[key].label;
  const blocDescription = (key) => en ? ({ occidental: "Strong alignment with the US, NATO and EU; limited strategic affinity with Beijing or Moscow.", sino_euroasiatico: "Strong alignment with China and/or Russia, with strategic distance from Washington.", multialineado: "Balances US, China and regional ties without committing to a fixed camp.", no_alineado: "No dominant alignment; positions may shift across international issues." }[key]) : BLOC_META[key].desc;
  const [selectedId, setSelectedId] = useState(null);
  const [countryPanelOpen, setCountryPanelOpen] = useState(false);
  const openCountry = (id) => { setSelectedId(id); setCountryPanelOpen(true); };
  const [comparisonIds, setComparisonIds] = useState([]);
  const comparisonRef = useRef(null);
  const viewComparison = () => comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [mapMode, setMapMode] = useState("territories");
  const [boundaries, setBoundaries] = useState(null);
  const [boundariesError, setBoundariesError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/georisk-world-42.geojson").then(response => { if (!response.ok) throw new Error("GeoRisk boundaries unavailable"); return response.json(); }).then(data => { if (active) setBoundaries(data); }).catch(error => { console.warn("GeoRisk boundaries could not load", error); if (active) setBoundariesError(true); });
    return () => { active = false; };
  }, []);
  const toggleComparison = (id) => setComparisonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev,id] : prev);
  const comparisonCountries = useMemo(() => comparisonIds.map(id => COUNTRIES.find(c => c.id === id)).filter(Boolean), [comparisonIds]); 
  const [search, setSearch] = useState("");
  const [colorMode, setColorMode] = useState("bloc");
  const [blocFilter, setBlocFilter] = useState(null);

  useEffect(() => {
    document.title = lang === "en" ? "ZRC GeoRisk World Map — Interactive Geopolitical Map" : "ZRC GeoRisk World Map — Mapa Geopolítico Interactivo";
  }, [lang]);

  const selected = useMemo(() => COUNTRIES.find((c) => c.id === selectedId) || null, [selectedId]);

  const searchResults = useMemo(() => {
    const q = normalizeCountrySearch(search);
    if (!q) return [];
    return COUNTRIES.filter(c => normalizeCountrySearch(c.name).includes(q) || normalizeCountrySearch(COUNTRY_NAMES_EN[c.id] || "").includes(q));
  }, [search]);
  const visibleCountries = useMemo(() => {
    if (search.trim()) return searchResults;
    return blocFilter ? COUNTRIES.filter(c => computeBloc(c) === blocFilter) : COUNTRIES;
  }, [blocFilter, search, searchResults]);

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
        .leaflet-container { background: #E1E9F3 !important; font-family: ${F.body} !important; }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: ${C.surface}; color: ${C.text}; }
        .leaflet-control-attribution { background: rgba(255,255,255,0.85) !important; color: ${C.textMuted} !important; }
        .leaflet-control-attribution a { color: ${C.textSec} !important; }
        .grwm-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 430px); gap: 16px; align-items: stretch; }
        .grwm-map { min-width: 0; }
        .grwm-detail { min-width: 0; }
        .grwm-detail-placeholder { height: 100%; }
        @media (max-width: 900px) {
          .grwm-layout { grid-template-columns: 1fr; }
          .grwm-panel { max-height: 70vh; }
          .grwm-map { height: min(55dvh, 460px) !important; min-height: 310px; }
          .grwm-panel { max-height: 70dvh; }
          .grwm-detail { display: none; }
          .grwm-detail.grwm-detail-open { display: block; position: fixed; inset: auto 0 0 0; z-index: 10000; max-height: 82dvh; overflow-y: auto; background: #F7F9FC; padding: 12px 12px max(16px, env(safe-area-inset-bottom)); border-radius: 22px 22px 0 0; box-shadow: 0 -12px 45px rgba(11,37,69,.28); overscroll-behavior: contain; }
          .grwm-detail.grwm-detail-open .grwm-panel { max-height: 66dvh; }
          .grwm-detail-placeholder { display: none !important; }
          .grwm-mobile-backdrop { display: block !important; }
          .grwm-map { border-radius: 16px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(247,249,252,0.94)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, padding: "0 clamp(16px,3vw,32px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0B2545, #2E6FB8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Globe2 size={17} color="#FFFFFF" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, letterSpacing: "0.2em" }}>ZRC · GEORISK WORLD MAP</div>
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.text, fontWeight: 600, marginTop: 1 }}>{tr("Mapa Geopolítico Interactivo", "Interactive Geopolitical Map")}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div role="group" aria-label={tr("Idioma del mapa", "Map language")} style={{display:"inline-flex",border:`1px solid ${C.borderHover}`,borderRadius:7,overflow:"hidden"}}>
              {["es","en"].map(code => <button key={code} type="button" onClick={() => setLocalLang(code)} aria-pressed={lang === code} lang={code} style={{padding:"9px 12px",background:lang === code ? C.goldDim : C.surface,color:lang === code ? C.gold : C.textSec,border:"none",fontFamily:F.mono,fontSize:11,fontWeight:700,cursor:"pointer"}}>{code.toUpperCase()}</button>)}
            </div>
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
            {COUNTRIES.length} {tr("economías clave agrupadas por alineamiento geopolítico estimado: comercio y aranceles, flujos de inversión, voto en Naciones Unidas, salud diplomática, dependencias energéticas y tecnológicas, turismo y estrategia de país. Elige un país en el mapa para ver el desglose completo.", "key economies grouped by estimated geopolitical alignment, covering trade and tariffs, investment flows, UN voting, diplomatic relations, energy and technology dependencies, tourism and country strategy. Select a country on the map to explore its profile.")}
          </div>
        </div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", padding:"18px 22px", background:"#E1E9F3", borderRadius:24, marginBottom:18 }}>
          <div>
            <div style={{fontSize:10,letterSpacing:".18em",fontWeight:700,color:C.gold,marginBottom:5}}>ZRC · GEOPOLITICAL INTELLIGENCE</div>
            <div style={{fontSize:22,fontWeight:300,color:"#0B2545"}}>{tr("Explora el equilibrio geopolítico global","Explore the global geopolitical landscape")}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input aria-label={tr("Buscar país","Search country")} value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr("Buscar país…","Search country…")} style={{padding:"12px 15px",borderRadius:14,border:`1px solid ${C.border}`,background:"#FFFFFF",color:C.text,minWidth:190,fontFamily:F.body}} />
            {search && <button onClick={()=>setSearch("")} style={{padding:"11px 13px",borderRadius:12,border:`1px solid ${C.border}`,background:"#FFFFFF",color:C.text,cursor:"pointer"}}>{tr("Limpiar","Clear")}</button>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:"12px 16px",marginBottom:16}}>
          <div style={{minWidth:0}}>
            <strong style={{fontSize:13,color:C.text}}>{tr("Country Intelligence · análisis país en profundidad","Country Intelligence · in-depth country research")}</strong>
            <div style={{fontSize:11,color:C.textSec,marginTop:3}}>{tr("15 fichas editoriales disponibles, con cinco pilares de riesgo, lectura inversora y puntos de vigilancia.","15 editorial profiles with five risk pillars, investment implications and watchpoints.")}</div>
          </div>
          <a href="/inteligencia/paises/" style={{whiteSpace:"nowrap",fontSize:12,fontWeight:750,padding:"11px 14px",color:"#fff",background:"#245a97",borderRadius:10,textDecoration:"none"}}>{tr("Explorar fichas país","Explore country profiles")} →</a>
        </div>
        {search.trim() && <div role="region" aria-label={tr("Resultados de búsqueda","Search results")} style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{searchResults.slice(0,10).map(c=><button type="button" key={c.id} onClick={()=>{openCountry(c.id);setBlocFilter(null);setSearch("");}} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:999,padding:"8px 12px",cursor:"pointer",color:C.text}}>{c.flag} {en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name}</button>)}{searchResults.length===0 && <span style={{color:C.textSec}}>{tr("Sin coincidencias","No matches")}</span>}</div>}
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16}}>
          <span style={{fontSize:12,color:C.textSec}}>{tr("Selecciona hasta tres países para comparar sus perfiles:", "Select up to three countries to compare their profiles:")}</span>
          <select aria-label={tr("Añadir país a comparación", "Add country to comparison")} value="" onChange={e=>{if(e.target.value)toggleComparison(e.target.value)}} disabled={comparisonIds.length===3} style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,maxWidth:"100%"}}>
            <option value="">{comparisonIds.length===3 ? tr("Máximo de tres países", "Three-country limit") : tr("Añadir país…", "Add country…")}</option>
            {COUNTRIES.filter(c=>!comparisonIds.includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.flag} {en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name}</option>)}
          </select>
          {comparisonCountries.map(c=><span key={c.id} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 11px",border:`1px solid ${C.borderHover}`,background:C.surface2,borderRadius:999,color:C.text}}>{c.flag} {en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name}<button type="button" aria-label={tr("Quitar de comparación: ","Remove from comparison: ")+(en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name)} onClick={()=>toggleComparison(c.id)} style={{border:"none",background:"transparent",color:C.textSec,cursor:"pointer",fontSize:17,padding:"0 3px"}}>×</button></span>)}
          {comparisonCountries.length > 0 && <button type="button" onClick={viewComparison} style={{padding:"10px 16px",borderRadius:10,border:"none",background:"#2E6FB8",color:"#fff",fontWeight:650,cursor:"pointer"}}>{tr("Ver comparación", "View comparison")} ({comparisonCountries.length})</button>}
        </div>
        {comparisonCountries.length > 0 && <div ref={comparisonRef} style={{scrollMarginTop:80}}><CountryComparison countries={comparisonCountries} lang={lang} onRemove={toggleComparison} onClear={()=>setComparisonIds([])} /></div>}
        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 16, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>{tr("COLOREAR POR", "COLOR BY")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COLOR_MODES.map((m) => (
                <button key={m.id} onClick={() => setColorMode(m.id)} className="grwm-color-btn" style={{
                  padding: "6px 12px", borderRadius: 6, border: `1px solid ${colorMode === m.id ? C.gold : C.border}`,
                  background: colorMode === m.id ? C.goldDim : "transparent", color: colorMode === m.id ? C.gold : C.textSec,
                  fontFamily: F.mono, fontSize: 11,
                }}>{en ? ({bloc:"Geopolitical bloc",usAlign:"US alignment",cnAlign:"China alignment",riskScore:"ZRC geopolitical risk"}[m.id]) : m.label}</button>
              ))}
            </div>
          </div>
          {colorMode === "bloc" && (
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>{tr("FILTRAR BLOQUE", "FILTER BLOC")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => setBlocFilter(null)} className="grwm-bloc-btn" style={{
                  padding: "6px 12px", borderRadius: 6, border: `1px solid ${!blocFilter ? C.borderHover : C.border}`,
                  background: !blocFilter ? C.surface3 : "transparent", color: !blocFilter ? C.text : C.textSec, fontFamily: F.mono, fontSize: 11,
                }}>{tr("Todos", "All")} ({COUNTRIES.length})</button>
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

        <div role="group" aria-label={tr("Visualización del mapa", "Map visualization")} style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:12}}>
          <span style={{fontSize:11,color:C.textSec,fontWeight:600}}>{tr("VISTA", "VIEW")}</span>
          {[["territories",tr("Territorios", "Territories")],["markers",tr("Marcadores", "Markers")]].map(([mode,label])=><button key={mode} type="button" aria-pressed={mapMode===mode} onClick={()=>setMapMode(mode)} style={{padding:"9px 13px",borderRadius:9,border:`1px solid ${mapMode===mode ? C.gold : C.border}`,background:mapMode===mode?C.surface2:C.surface,color:C.text,cursor:"pointer"}}>{label}</button>)}
          {mapMode==="territories" && !boundaries && <span role="status" style={{fontSize:11,color:C.textMuted}}>{boundariesError ? tr("Límites no disponibles; se muestran marcadores.", "Boundaries unavailable; showing markers.") : tr("Cargando límites geográficos…", "Loading country boundaries…")}</span>}
        </div>
        {selected && !countryPanelOpen && (
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"10px 12px",border:`1px solid ${C.borderHover}`,borderRadius:12,background:C.surface,marginBottom:12}}>
            <span style={{fontSize:12,color:C.textSec}}>{tr("Último país consultado:", "Last viewed country:")}</span>
            <button type="button" onClick={()=>setCountryPanelOpen(true)} style={{padding:"9px 12px",background:C.surface2,border:`1px solid ${C.borderHover}`,borderRadius:9,color:C.text,fontWeight:700,cursor:"pointer"}}>{selected.flag} {en ? COUNTRY_NAMES_EN[selected.id] || selected.name : selected.name} · {tr("Reabrir ficha", "Reopen profile")} →</button>
          </div>
        )}
        <div className="grwm-layout" style={{ marginBottom: 20 }}>
          {/* Map */}
          <div className="grwm-map" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 26, overflow: "hidden", height: 640, boxShadow: "0 12px 36px rgba(11,37,69,.08)" }}>
            <MapContainer preferCanvas center={[22, 20]} zoom={2} minZoom={2} maxZoom={7} style={{ width: "100%", height: "100%" }} worldCopyJump>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} updateWhenIdle keepBuffer={2} />
              
              {mapMode === "territories" && boundaries && (
                <GeoJSON
                  key={colorMode + ":" + (blocFilter || "all") + ":" + search.trim().toLowerCase() + ":" + selectedId}
                  data={{type:"FeatureCollection",features:boundaries.features.filter(f => visibleCountries.some(c => c.id === f.properties.id))}}
                  style={feature => {
                    const c = COUNTRIES.find(country => country.id === feature.properties.id);
                    const fill = c ? markerColor(colorMode,c) : C.surface3;
                    return {color:selectedId===c?.id?"#0B2545":"#FFFFFF",weight:selectedId===c?.id?2.5:0.9,fillColor:fill,fillOpacity:selectedId===c?.id?0.9:0.64};
                  }}
                  onEachFeature={(feature,layer) => {
                    const c = COUNTRIES.find(country => country.id === feature.properties.id);
                    if (!c) return;
                    layer.bindTooltip(c.flag + " " + (en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name));
                    layer.on("click", () => openCountry(c.id));
                  }}
                />
              )}
              {(mapMode === "markers" || !boundaries || visibleCountries.some(c=>c.id==="sg")) && visibleCountries.filter(c=>mapMode === "markers" || !boundaries || c.id==="sg").map((c) => (
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
                  eventHandlers={{ click: () => openCountry(c.id) }}
                >
                  <Tooltip direction="top" offset={[0, -4]}>
                    {c.flag} {en ? COUNTRY_NAMES_EN[c.id] || c.name : c.name} · {blocLabel(computeBloc(c))}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Detail panel */}
          {selected && countryPanelOpen ? (
            <div className="grwm-detail grwm-detail-open" role="dialog" aria-modal="true" aria-label={tr("Ficha de país","Country details")}>
              <button type="button" onClick={()=>toggleComparison(selected.id)} disabled={!comparisonIds.includes(selected.id) && comparisonIds.length>=3} style={{width:"100%",marginBottom:10,padding:"12px",border:`1px solid ${C.borderHover}`,borderRadius:10,background:C.surface2,color:C.text,cursor:"pointer",fontWeight:600}}>{comparisonIds.includes(selected.id) ? tr("✓ Quitar de comparación", "✓ Remove from comparison") : tr("+ Añadir a comparación", "+ Add to comparison")}</button>
              <CountryPanel key={selected.id} country={selected} onClose={() => setCountryPanelOpen(false)} lang={lang} />
            </div>
          ) : (
            <div className="grwm-detail-placeholder" style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 26, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10, minHeight: 300 }}>
              <Info size={22} color={C.textMuted} />
              <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, maxWidth: 240 }}>
                {tr("Selecciona un país en el mapa para ver comercio, alineamiento, dependencias y estrategia en detalle.", "Select a country to explore its trade, alignment, dependencies and strategy.")}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 10 }}>{tr("LEYENDA · TAMAÑO = PIB NOMINAL", "LEGEND · SIZE = NOMINAL GDP")}</div>
          <Legend colorMode={colorMode} lang={lang} />
        </div>

        {/* Bloc breakdown cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 20 }}>
          {Object.entries(BLOC_META).map(([key, b]) => (
            <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${b.color}`, borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: b.color }}>{en ? ({occidental:"Western Bloc",sino_euroasiatico:"Sino-Eurasian Axis",multialineado:"Pragmatic multi-aligned",no_alineado:"Non-aligned / swing states"}[key]) : b.label}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{blocCounts[key] || 0} {tr("países", "countries")}</span>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{blocDescription(key)}</div>
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
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.text, marginBottom: 6, fontWeight: 600 }}>{tr("Esto es la capa cualitativa. GeoRisk Dashboard añade la cuantitativa.", "This is the qualitative layer. GeoRisk Dashboard adds quantitative analysis.")}</div>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0 }}>
                {tr("Escenarios ilustrativos con controles interactivos e impactos estimados por clase de activo. GeoRisk Predictive ML añade perspectivas estadísticas sujetas a disponibilidad y validación de datos.", "Illustrative scenarios with interactive controls and estimated impacts by asset class. GeoRisk Predictive ML adds statistical outlooks subject to data availability and validation.")}
              </p>
            </div>
            <button onClick={onOpenIntelligence} className="grwm-cta" style={{
              padding: "12px 26px", background: C.gold, color: C.bg, border: "none", borderRadius: 8,
              fontFamily: F.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {tr("Ver GeoRisk Intelligence →", "Explore GeoRisk Intelligence →")}
            </button>
          </div>
        )}

        {/* Methodology */}
        <div style={{ padding: "16px 20px", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 11, color: C.textMuted, lineHeight: 1.7, fontFamily: F.body }}>
          {tr(`Metodología: GeoRisk World Map utiliza estimaciones editoriales compuestas de ZRC Research para ${COUNTRIES.length} economías. Los indicadores no son series oficiales en tiempo real y no deben interpretarse como datos certificados ni probabilidades calibradas. Las valoraciones pueden requerir revisión. No constituye asesoramiento de inversión.`, `Methodology: GeoRisk World Map uses composite editorial estimates from ZRC Research for ${COUNTRIES.length} economies. Indicators are not live official data, certified statistics or calibrated probabilities. Assessments may require revision. This is not investment advice.`)}
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>
          <span>© 2026 Zenith Rise Capital · Calesius Global SL · Madrid, Spain</span>
          <span>zenithrisecapital.com/mapa-geopolitico</span>
        </div>
      </div>
    </div>
  );
}
