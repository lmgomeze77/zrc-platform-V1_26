import { Link } from "react-router-dom";

// ═══════════════════════════════════════════════════════
// INTELLIGENCE INDEX — Zenith Rise Capital
// Ruta: /intelligence
// ═══════════════════════════════════════════════════════

const TOOLS = [
  {
    id: "georisk",
    title: "GeoRisk Dashboard",
    subtitle: "Scoring de riesgo geopolítico en tiempo real con sliders de escenario.",
    gated: true,
    available: true,
    href: "/intelligence/georisk",
    tag: "Modelo propietario",
  },
  {
    id: "morning",
    title: "Morning Intelligence",
    subtitle: "Briefing diario automatizado: geopolítica, macro, mercados e impacto para ZRC.",
    gated: false,
    available: true,
    href: "/intelligence/morning",
    tag: "Publicación diaria",
  },
  {
    id: "research",
    title: "Research & Briefings",
    subtitle: "Notas temáticas, deep dives sectoriales y análisis de coyuntura.",
    gated: false,
    available: false,
    href: "#",
    tag: "Próximamente",
  },
];

const NAVY = "#0B1F3F";
const GOLD = "#C8A951";
const IVORY = "#F6F2EA";
const GRAY = "#6B7280";

export default function IntelligenceIndex() {
  return (
    <div style={{ background: IVORY, minHeight: "100vh", fontFamily: "'EB Garamond', Garamond, 'Times New Roman', serif", color: NAVY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      `}</style>

      {/* Hero */}
      <section style={{ padding: "80px 24px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOLD, marginBottom: 16, fontWeight: 600 }}>
          Inteligencia · Investment Intelligence
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 500, letterSpacing: -0.5, margin: "0 0 16px", lineHeight: 1.1 }}>
          Un enfoque cuantitativo<br />al riesgo geopolítico.
        </h1>
        <p style={{ fontSize: 20, lineHeight: 1.6, color: GRAY, maxWidth: 720, margin: 0, fontStyle: "italic" }}>
          Modelos propietarios, briefings diarios y análisis institucional para decisiones de inversión informadas por el contexto global.
        </p>
        <div style={{ width: 80, height: 2, background: GOLD, marginTop: 40 }} />
      </section>

      {/* Tool grid */}
      <section style={{ padding: "24px 24px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {TOOLS.map((t) => (
            <ToolCard key={t.id} tool={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolCard({ tool }) {
  const disabled = !tool.available;
  const inner = (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${disabled ? "#E5E7EB" : "#D4C8A8"}`,
        padding: "32px 28px",
        height: "100%",
        position: "relative",
        transition: "all 0.25s ease",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = GOLD;
          e.currentTarget.style.boxShadow = `0 8px 24px ${NAVY}15`;
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = "#D4C8A8";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Gold accent */}
      <div style={{ width: 32, height: 2, background: GOLD, marginBottom: 20 }} />

      {/* Tag */}
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 12, fontWeight: 600 }}>
        {tool.tag}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 26, fontWeight: 500, margin: "0 0 10px", letterSpacing: -0.3, color: NAVY }}>
        {tool.title}
      </h3>

      {/* Subtitle */}
      <p style={{ fontSize: 15, lineHeight: 1.6, color: GRAY, margin: "0 0 24px", minHeight: 72 }}>
        {tool.subtitle}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 20, borderTop: "1px solid #F0EBE0" }}>
        {tool.gated ? (
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: NAVY, letterSpacing: 0.5 }}>
            🔒 Acceso exclusivo para miembros registrados
          </span>
        ) : (
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: GRAY, letterSpacing: 0.5 }}>
            {disabled ? "En desarrollo" : "Acceso libre"}
          </span>
        )}
        {!disabled && (
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>
            →
          </span>
        )}
      </div>
    </div>
  );

  if (disabled) return <div>{inner}</div>;
  return (
    <Link to={tool.href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  );
}
