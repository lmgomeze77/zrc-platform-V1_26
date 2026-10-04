export const COUNTRY_PROFILE_UPDATED_AT = "2026-10-04";

export const PILLAR_META = {
  structural: { label: "Estructural", short: "Instituciones y gobernanza", source: "World Bank · WGI", sourceDate: "2024", href: "https://www.worldbank.org/en/publication/worldwide-governance-indicators" },
  conflict: { label: "Conflicto / atención", short: "Tensión y atención informativa", source: "GPR + GDELT", sourceDate: "30 sep 2026", href: "https://www.matteoiacoviello.com/gpr.htm" },
  macro: { label: "Macro", short: "Crecimiento, inflación y posición fiscal", source: "FMI · WEO", sourceDate: "abr 2026", href: "https://www.imf.org/en/Publications/WEO/weo-database/2026/April" },
  market: { label: "Mercado", short: "FX, diferencial y volatilidad", source: "Fuentes oficiales y mercado", sourceDate: "2 oct 2026", href: "https://data.ecb.europa.eu/" },
  qualitative: { label: "Cualitativo ZRC", short: "Dirección mensual y juicio analítico", source: "ZRC Research", sourceDate: "4 oct 2026", href: "https://www.crisisgroup.org/crisiswatch" },
};

const makePillars = (structural, conflict, macro, market, qualitative) => ({
  structural: { score: structural }, conflict: { score: conflict }, macro: { score: macro },
  market: { score: market }, qualitative: { score: qualitative },
});

export const COUNTRY_PROFILES = [
  {
    iso: "ESP", slug: "espana", name: "España", flag: "🇪🇸", region: "Iberia", score: 36, trend: "stable",
    pillars: makePillars(24, 22, 41, 33, 39),
    summary: "Riesgo institucional bajo y anclaje europeo sólido. La atención inversora se concentra en la ejecución fiscal, la fragmentación política y la sensibilidad de los activos domésticos al ciclo de tipos.",
    watch: ["Señales sobre la senda presupuestaria y la ejecución de fondos europeos.", "Evolución del diferencial soberano frente a Alemania.", "Revisiones de inflación y actividad para el cierre de 2026."],
    implications: ["Sesgo neutral en deuda soberana, condicionado por el diferencial periférico.", "Apoyo relativo para bancos y concesiones si el crecimiento resiste.", "Vigilar exposición regulatoria en energía, vivienda e infraestructuras."],
    source: { label: "Comisión Europea · España", href: "https://economy-finance.ec.europa.eu/economic-surveillance-eu-member-states/country-pages/spain_en" },
  },
  {
    iso: "PRT", slug: "portugal", name: "Portugal", flag: "🇵🇹", region: "Iberia", score: 31, trend: "stable",
    pillars: makePillars(20, 18, 34, 32, 30),
    summary: "Perfil defensivo dentro de la periferia europea, con instituciones estables y menor prima geopolítica. Vivienda, productividad y dependencia del ciclo europeo siguen siendo los principales focos.",
    watch: ["Decisiones fiscales que alteren la trayectoria de deuda.", "Indicadores de vivienda, crédito y turismo.", "Cambios en el diferencial soberano y expectativas del BCE."],
    implications: ["Deuda portuguesa mantiene atractivo relativo si continúa la disciplina fiscal.", "Bancos y consumo conservan apoyo, con vigilancia sobre vivienda.", "Infraestructura y renovables ofrecen exposición de duración larga con riesgo regulatorio moderado."],
    source: { label: "Comisión Europea · Portugal", href: "https://economy-finance.ec.europa.eu/economic-surveillance-eu-member-states/country-pages/portugal_en" },
  },
  {
    iso: "MEX", slug: "mexico", name: "México", flag: "🇲🇽", region: "LATAM", score: 58, trend: "up",
    pillars: makePillars(58, 50, 55, 62, 61),
    summary: "Nearshoring y profundidad manufacturera conviven con incertidumbre institucional, presión fiscal y alta sensibilidad a la relación comercial con Estados Unidos.",
    watch: ["Mensajes de Washington vinculados a comercio y revisión de USMCA.", "Señales fiscales y apoyo a empresas públicas.", "Peso mexicano, curva local y anuncios de inversión manufacturera."],
    implications: ["Mantener cobertura FX en posiciones no remuneradas en pesos.", "Favorecer exportadores integrados en Norteamérica frente a demanda doméstica regulada.", "Exigir prima adicional en activos expuestos a decisiones administrativas."],
    source: { label: "FMI · México", href: "https://www.imf.org/en/Countries/MEX" },
  },
  {
    iso: "COL", slug: "colombia", name: "Colombia", flag: "🇨🇴", region: "LATAM", score: 64, trend: "up",
    pillars: makePillars(63, 60, 68, 65, 66),
    summary: "La combinación de presión fiscal, seguridad territorial y ruido político mantiene elevada la prima de riesgo, pese al soporte de recursos naturales y un marco macro con capacidad de ajuste.",
    watch: ["Cumplimiento de la regla fiscal y anuncios presupuestarios.", "Incidentes de seguridad con impacto en energía o transporte.", "Peso colombiano, inflación y trayectoria esperada de tipos."],
    implications: ["Priorizar emisores con ingresos en divisa y balances conservadores.", "Duración local solo con compensación suficiente por volatilidad fiscal.", "Energía e infraestructura requieren escenarios explícitos de regulación y seguridad."],
    source: { label: "FMI · Colombia", href: "https://www.imf.org/en/Countries/COL" },
  },
  {
    iso: "BRA", slug: "brasil", name: "Brasil", flag: "🇧🇷", region: "LATAM", score: 55, trend: "up",
    pillars: makePillars(48, 45, 60, 61, 55),
    summary: "Mercado profundo y diversificado, pero con una prima marcada por la credibilidad fiscal, el coste de capital y el ciclo político. Materias primas amortiguan parte del riesgo externo.",
    watch: ["Disciplina del marco fiscal y composición del gasto.", "Expectativas de inflación y comunicación del banco central.", "Volatilidad electoral y comportamiento del real."],
    implications: ["Preferencia por exportadores y compañías con poder de fijación de precios.", "La renta fija local exige gestión activa de duración.", "Evitar concentración en sectores dependientes de gasto público sin cobertura."],
    source: { label: "FMI · Brasil", href: "https://www.imf.org/en/Countries/BRA" },
  },
  {
    iso: "CHL", slug: "chile", name: "Chile", flag: "🇨🇱", region: "LATAM", score: 43, trend: "stable",
    pillars: makePillars(32, 31, 45, 48, 45),
    summary: "Instituciones comparativamente fuertes y acceso profundo a mercado, con sensibilidad elevada al cobre, China y a cambios regulatorios internos.",
    watch: ["Precio del cobre y señales de demanda china.", "Definiciones regulatorias en minería, pensiones y energía.", "Peso chileno y expectativas de crecimiento doméstico."],
    implications: ["Minera y utilities siguen siendo el canal principal de transmisión geopolítica.", "Activos locales favorecidos por claridad regulatoria y estabilización de inflación.", "Mantener diversificación frente al ciclo de China."],
    source: { label: "FMI · Chile", href: "https://www.imf.org/en/Countries/CHL" },
  },
  {
    iso: "ARG", slug: "argentina", name: "Argentina", flag: "🇦🇷", region: "LATAM", score: 72, trend: "down",
    pillars: makePillars(61, 42, 78, 84, 70),
    summary: "El ajuste macro reduce desequilibrios, pero la fragilidad de reservas, el régimen cambiario y la capacidad política de sostener reformas mantienen el riesgo en niveles altos.",
    watch: ["Reservas, brecha cambiaria y cambios en controles de capital.", "Ejecución fiscal y apoyo político a las reformas.", "Acceso a financiación externa y calendario con organismos multilaterales."],
    implications: ["Exposición solo con límites estrictos de liquidez y tamaño.", "Favorecer compañías exportadoras con generación de divisas.", "Distinguir mejora direccional de normalización completa: el riesgo de reversión sigue alto."],
    source: { label: "FMI · Argentina", href: "https://www.imf.org/en/Countries/ARG" },
  },
  {
    iso: "PER", slug: "peru", name: "Perú", flag: "🇵🇪", region: "LATAM", score: 61, trend: "stable",
    pillars: makePillars(58, 55, 62, 59, 68),
    summary: "Fortalezas macro heredadas y minería competitiva contrastan con baja capacidad política, conflicto social recurrente y elevada incertidumbre de ejecución.",
    watch: ["Transición política y nombramientos económicos.", "Protestas o bloqueos alrededor de corredores mineros.", "Cobre, sol peruano y señales de inversión privada."],
    implications: ["Minera de calidad conserva atractivo, con descuento por interrupción operativa.", "Deuda soberana ofrece amortiguador macro frente al riesgo político.", "Evitar depender de calendarios de permisos demasiado ajustados."],
    source: { label: "FMI · Perú", href: "https://www.imf.org/en/Countries/PER" },
  },
  {
    iso: "URY", slug: "uruguay", name: "Uruguay", flag: "🇺🇾", region: "LATAM", score: 33, trend: "stable",
    pillars: makePillars(22, 25, 37, 42, 34),
    summary: "El perfil institucional más sólido de la región compensa el tamaño reducido del mercado y la exposición a Argentina, Brasil y al ciclo agrícola.",
    watch: ["Precios agrícolas y condiciones climáticas.", "Evolución fiscal y salarial.", "Contagio financiero o comercial desde Argentina y Brasil."],
    implications: ["Buen ancla regional para renta fija y proyectos de infraestructura.", "La liquidez de mercado exige disciplina de entrada y salida.", "Celulosa, renovables y servicios exportables mantienen sesgo favorable."],
    source: { label: "FMI · Uruguay", href: "https://www.imf.org/en/Countries/URY" },
  },
  {
    iso: "PAN", slug: "panama", name: "Panamá", flag: "🇵🇦", region: "LATAM", score: 46, trend: "stable",
    pillars: makePillars(42, 35, 49, 55, 47),
    summary: "El canal, la dolarización y el papel logístico sostienen la tesis inversora. Fiscalidad, gobernanza y vulnerabilidad climática determinan la prima de riesgo.",
    watch: ["Tráfico y restricciones operativas del Canal de Panamá.", "Consolidación fiscal y financiación soberana.", "Conflictos sociales ligados a minería e infraestructura."],
    implications: ["Logística e infraestructura siguen siendo la exposición estructural más clara.", "La dolarización reduce riesgo FX, no el riesgo fiscal.", "Incluir escenarios de agua y licencia social en activos de larga duración."],
    source: { label: "Autoridad del Canal de Panamá", href: "https://pancanal.com/en/" },
  },
  {
    iso: "MAR", slug: "marruecos", name: "Marruecos", flag: "🇲🇦", region: "MENA", score: 49, trend: "stable",
    pillars: makePillars(46, 44, 53, 48, 54),
    summary: "Estabilidad política relativa, integración industrial con Europa e inversión en infraestructuras sostienen el perfil; agua, empleo y tensiones regionales son los principales límites.",
    watch: ["Sequía, reservas de agua y efecto sobre agricultura e inflación.", "Relación comercial con la UE y avance de proyectos industriales.", "Evolución del entorno del Sáhara Occidental y Argelia."],
    implications: ["Automoción, logística y renovables mantienen sesgo constructivo.", "Incorporar riesgo hídrico en agricultura, utilities e inmobiliario.", "La exposición exportadora a Europa requiere cobertura del ciclo regional."],
    source: { label: "FMI · Marruecos", href: "https://www.imf.org/en/Countries/MAR" },
  },
  {
    iso: "SAU", slug: "arabia-saudi", name: "Arabia Saudí", flag: "🇸🇦", region: "MENA", score: 51, trend: "stable",
    pillars: makePillars(54, 62, 45, 47, 52),
    summary: "Capacidad fiscal y dirección estratégica sostienen la diversificación, mientras petróleo, concentración decisoria y tensiones regionales mantienen una prima geopolítica relevante.",
    watch: ["Decisiones OPEP+ y trayectoria del crudo.", "Priorización y financiación de proyectos de Vision 2030.", "Señales de escalada regional o disrupción marítima."],
    implications: ["Favorecer proyectos con respaldo fiscal claro y demanda verificable.", "Banca, turismo e infraestructura se benefician de la inversión pública.", "Cubrir escenarios de petróleo bajo y retrasos en megaproyectos."],
    source: { label: "FMI · Arabia Saudí", href: "https://www.imf.org/en/Countries/SAU" },
  },
  {
    iso: "ARE", slug: "emiratos-arabes-unidos", name: "Emiratos Árabes Unidos", flag: "🇦🇪", region: "MENA", score: 38, trend: "stable",
    pillars: makePillars(39, 48, 31, 36, 40),
    summary: "Balances sólidos, hubs financieros y diversificación reducen el riesgo macro. La proximidad a focos regionales y la sensibilidad de flujos globales elevan el componente geopolítico.",
    watch: ["Seguridad marítima y aérea en el Golfo.", "Flujos inmobiliarios, crédito y liquidez regional.", "Cambios regulatorios o de cumplimiento financiero internacional."],
    implications: ["Hub regional preferente para exposición MENA diversificada.", "Vigilar valoraciones inmobiliarias y concentración de demanda externa.", "Logística, finanzas y turismo mantienen soporte estructural."],
    source: { label: "FMI · Emiratos Árabes Unidos", href: "https://www.imf.org/en/Countries/ARE" },
  },
  {
    iso: "TUR", slug: "turkiye", name: "Türkiye", flag: "🇹🇷", region: "MENA", score: 69, trend: "down",
    pillars: makePillars(62, 64, 74, 72, 73),
    summary: "La normalización monetaria mejora la dirección del riesgo, pero inflación, reservas, financiación externa y alta discrecionalidad política mantienen un perfil elevado.",
    watch: ["Inflación realizada y credibilidad de la política monetaria.", "Reservas netas, lira y refinanciación corporativa externa.", "Posicionamiento regional entre OTAN, Rusia y Oriente Medio."],
    implications: ["La dirección mejora, pero requiere cobertura FX y ventanas tácticas.", "Exportadores y turismo ofrecen protección parcial frente a la lira.", "Exigir prima por intervención regulatoria y cambios de política."],
    source: { label: "FMI · Türkiye", href: "https://www.imf.org/en/Countries/TUR" },
  },
  {
    iso: "ISR", slug: "israel", name: "Israel", flag: "🇮🇱", region: "MENA", score: 79, trend: "up",
    pillars: makePillars(43, 92, 58, 71, 88),
    summary: "La base tecnológica e institucional contrasta con un riesgo de conflicto excepcionalmente alto, presión fiscal y posibilidad de escalada regional con impacto directo en actividad y capital.",
    watch: ["Negociaciones de alto el fuego y riesgo de ampliación regional.", "Movilización, gasto de defensa y trayectoria fiscal.", "Shekel, primas de riesgo y continuidad operativa del sector tecnológico."],
    implications: ["Reducir concentración y priorizar compañías con ingresos globales.", "Mantener coberturas de divisa y liquidez ante eventos discontinuos.", "La calidad tecnológica no elimina el riesgo de duración e interrupción operativa."],
    source: { label: "International Crisis Group · Israel/Palestine", href: "https://www.crisisgroup.org/middle-east-north-africa/east-mediterranean-mena/israelpalestine" },
  },
];

export const COUNTRY_BY_SLUG = Object.fromEntries(COUNTRY_PROFILES.map(country => [country.slug, country]));

export function riskBand(score) {
  if (score <= 35) return { label: "Bajo", color: "#45c58a" };
  if (score <= 50) return { label: "Moderado", color: "#e0b35a" };
  if (score <= 65) return { label: "Elevado", color: "#f08a4b" };
  if (score <= 80) return { label: "Alto", color: "#ed5d5d" };
  return { label: "Crítico", color: "#c95bf0" };
}

export const trendMeta = {
  up: { symbol: "↑", label: "Riesgo al alza", color: "#ed5d5d" },
  down: { symbol: "↓", label: "Riesgo a la baja", color: "#45c58a" },
  stable: { symbol: "→", label: "Estable", color: "#e0b35a" },
};
