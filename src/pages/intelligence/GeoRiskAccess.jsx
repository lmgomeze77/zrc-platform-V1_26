import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// ═══════════════════════════════════════════════════════
// GEORISK ACCESS GATE — Zenith Rise Capital
// Ruta: /intelligence/georisk
// ═══════════════════════════════════════════════════════

const NAVY = "#0B1F3F";
const GOLD = "#C8A951";
const IVORY = "#F6F2EA";
const GRAY = "#6B7280";

// Configurable via .env: VITE_GEORISK_PASSWORD
const ACCESS_KEY = import.meta.env.VITE_GEORISK_PASSWORD || "zrc2026";

// Adjust to your actual Resend endpoint if different
const REQUEST_ENDPOINT = import.meta.env.VITE_ACCESS_REQUEST_ENDPOINT || "/api/access-request";

export default function GeoRiskAccess() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "request" | "sent"
  const [form, setForm] = useState({ name: "", email: "", org: "", purpose: "" });
  const [sending, setSending] = useState(false);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === ACCESS_KEY) {
      sessionStorage.setItem("georisk_access", "granted");
      navigate("/intelligence/georisk/live");
    } else {
      setError("Clave incorrecta. Si no dispone de acceso, solicítelo abajo.");
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(REQUEST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "GeoRisk Dashboard", ...form }),
      });
      if (!res.ok) throw new Error("fail");
      setMode("sent");
    } catch {
      // Fallback: open mailto so the request still reaches you
      const body = `Tool: GeoRisk Dashboard%0D%0ANombre: ${form.name}%0D%0AEmail: ${form.email}%0D%0AOrganización: ${form.org}%0D%0AUso previsto: ${form.purpose}`;
      window.location.href = `mailto:luis@zenithrisecapital.com?subject=Solicitud%20de%20acceso%20%E2%80%94%20GeoRisk&body=${body}`;
      setMode("sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: IVORY, minHeight: "100vh", fontFamily: "'EB Garamond', Garamond, 'Times New Roman', serif", color: NAVY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        {/* Breadcrumb */}
        <Link to="/intelligence" style={{ fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: GRAY, textDecoration: "none" }}>
          ← Inteligencia
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 60, marginTop: 32, alignItems: "start" }}>
          {/* LEFT: description */}
          <div>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOLD, marginBottom: 16, fontWeight: 600 }}>
              Modelo propietario · Calesius Global SL
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 500, letterSpacing: -0.5, margin: "0 0 20px", lineHeight: 1.1 }}>
              GeoRisk Dashboard
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.65, color: GRAY, margin: "0 0 28px" }}>
              Sistema interactivo de scoring geopolítico: modele escenarios, ajuste probabilidades y visualice el impacto sobre variables macroeconómicas, sectores y asignación de activos.
            </p>
            <div style={{ width: 60, height: 2, background: GOLD, margin: "0 0 28px" }} />

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                { t: "Cuatro escenarios base", d: "Escalada arancelaria, inestabilidad MENA, fragmentación UE, distensión" },
                { t: "Seis variables macro", d: "Tipos, inflación, EUR/USD, commodities, yields, flujos IED" },
                { t: "Multiplicadores sectoriales", d: "Global, Real Estate, Financiero, Industrial, Energía" },
                { t: "NLP Analyzer", d: "Scoring de riesgo sobre texto libre de noticias y briefings" },
                { t: "Señales de asignación", d: "Recomendaciones por clase de activo con racional automatizado" },
              ].map((f, i) => (
                <li key={i} style={{ padding: "14px 0", borderBottom: "1px solid #E5E0D3", display: "flex", gap: 16 }}>
                  <div style={{ width: 4, background: GOLD, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: NAVY, marginBottom: 2 }}>{f.t}</div>
                    <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.5 }}>{f.d}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 32, padding: 20, background: "#fff", border: `1px solid #E5E0D3`, borderLeft: `3px solid ${GOLD}` }}>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 8, fontWeight: 600 }}>
                Aviso
              </div>
              <p style={{ fontSize: 14, color: GRAY, margin: 0, lineHeight: 1.6 }}>
                Las señales generadas por GeoRisk son de uso exclusivamente informativo para miembros registrados y no constituyen asesoramiento de inversión.
              </p>
            </div>
          </div>

          {/* RIGHT: gate */}
          <div style={{ position: "sticky", top: 40 }}>
            <div style={{ background: NAVY, color: "#fff", padding: "40px 36px", borderTop: `3px solid ${GOLD}` }}>
              {mode === "login" && (
                <>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOLD, marginBottom: 16, fontWeight: 600 }}>
                    🔒 Acceso restringido
                  </div>
                  <h2 style={{ fontSize: 28, fontWeight: 500, margin: "0 0 10px", letterSpacing: -0.3 }}>
                    Miembros registrados
                  </h2>
                  <p style={{ fontSize: 14, color: "#C4CAD4", margin: "0 0 28px", lineHeight: 1.6 }}>
                    Introduzca su clave de acceso para continuar al dashboard.
                  </p>

                  <form onSubmit={handleUnlock}>
                    <label style={{ display: "block", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#9BA3B0", marginBottom: 8, fontWeight: 600 }}>
                      Clave de acceso
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      autoFocus
                      style={{
                        width: "100%", padding: "12px 14px", fontSize: 15,
                        background: "#081A34", border: `1px solid ${error ? "#EF4444" : "#1E3A5F"}`,
                        color: "#fff", fontFamily: "'EB Garamond', serif", outline: "none",
                        transition: "border 0.2s",
                      }}
                      onFocus={(e) => { if (!error) e.target.style.borderColor = GOLD; }}
                      onBlur={(e) => { if (!error) e.target.style.borderColor = "#1E3A5F"; }}
                    />
                    {error && (
                      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      style={{
                        width: "100%", marginTop: 20, padding: "14px", fontSize: 13, fontWeight: 700,
                        fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase",
                        background: GOLD, color: NAVY, border: "none", cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#D9BD6A"}
                      onMouseLeave={(e) => e.currentTarget.style.background = GOLD}
                    >
                      Acceder al Dashboard
                    </button>
                  </form>

                  <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #1E3A5F" }}>
                    <p style={{ fontSize: 14, color: "#9BA3B0", margin: "0 0 12px" }}>
                      ¿Aún no tiene acceso?
                    </p>
                    <button
                      onClick={() => setMode("request")}
                      style={{
                        width: "100%", padding: "12px", fontSize: 13, fontWeight: 600,
                        fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase",
                        background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = NAVY; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = GOLD; }}
                    >
                      Solicitar acceso
                    </button>
                  </div>
                </>
              )}

              {mode === "request" && (
                <>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOLD, marginBottom: 16, fontWeight: 600 }}>
                    Solicitud de acceso
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 500, margin: "0 0 10px", letterSpacing: -0.3 }}>
                    Presente su solicitud
                  </h2>
                  <p style={{ fontSize: 14, color: "#C4CAD4", margin: "0 0 24px", lineHeight: 1.6 }}>
                    Revisaremos su solicitud y le responderemos en 1–2 días hábiles.
                  </p>

                  <form onSubmit={handleRequest}>
                    {[
                      { k: "name", label: "Nombre completo", type: "text", required: true },
                      { k: "email", label: "Email profesional", type: "email", required: true },
                      { k: "org", label: "Organización", type: "text", required: false },
                    ].map((f) => (
                      <div key={f.k} style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#9BA3B0", marginBottom: 6, fontWeight: 600 }}>
                          {f.label}{f.required && <span style={{ color: GOLD }}> *</span>}
                        </label>
                        <input
                          type={f.type}
                          required={f.required}
                          value={form[f.k]}
                          onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                          style={{
                            width: "100%", padding: "10px 12px", fontSize: 14,
                            background: "#081A34", border: "1px solid #1E3A5F",
                            color: "#fff", fontFamily: "'EB Garamond', serif", outline: "none",
                          }}
                        />
                      </div>
                    ))}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#9BA3B0", marginBottom: 6, fontWeight: 600 }}>
                        Uso previsto
                      </label>
                      <textarea
                        rows={3}
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        style={{
                          width: "100%", padding: "10px 12px", fontSize: 14,
                          background: "#081A34", border: "1px solid #1E3A5F",
                          color: "#fff", fontFamily: "'EB Garamond', serif", outline: "none", resize: "vertical",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      style={{
                        width: "100%", marginTop: 12, padding: "14px", fontSize: 13, fontWeight: 700,
                        fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase",
                        background: GOLD, color: NAVY, border: "none",
                        cursor: sending ? "wait" : "pointer", opacity: sending ? 0.7 : 1,
                      }}
                    >
                      {sending ? "Enviando…" : "Enviar solicitud"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      style={{
                        width: "100%", marginTop: 10, padding: "8px", fontSize: 12,
                        fontFamily: "Arial, sans-serif", color: "#9BA3B0",
                        background: "transparent", border: "none", cursor: "pointer",
                      }}
                    >
                      ← Volver al login
                    </button>
                  </form>
                </>
              )}

              {mode === "sent" && (
                <>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: GOLD, marginBottom: 16, fontWeight: 600 }}>
                    ✓ Solicitud enviada
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 500, margin: "0 0 14px", letterSpacing: -0.3 }}>
                    Gracias por su interés
                  </h2>
                  <p style={{ fontSize: 15, color: "#C4CAD4", margin: "0 0 20px", lineHeight: 1.6 }}>
                    Hemos recibido su solicitud y le responderemos a <strong style={{ color: GOLD }}>{form.email}</strong> en los próximos días hábiles.
                  </p>
                  <Link
                    to="/intelligence"
                    style={{
                      display: "block", width: "100%", padding: "12px", fontSize: 13, fontWeight: 600,
                      fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase",
                      background: "transparent", color: GOLD, border: `1px solid ${GOLD}`,
                      textAlign: "center", textDecoration: "none",
                    }}
                  >
                    Volver a Inteligencia
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
