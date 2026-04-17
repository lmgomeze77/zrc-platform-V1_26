import { Navigate } from "react-router-dom";

// ═══════════════════════════════════════════════════════
// REQUIRE ACCESS — Route wrapper
// Uso: envolver rutas protegidas en el router
//
//   <Route
//     path="/intelligence/georisk/live"
//     element={<RequireAccess><GeoRiskDashboard /></RequireAccess>}
//   />
// ═══════════════════════════════════════════════════════

export default function RequireAccess({ children, redirectTo = "/intelligence/georisk" }) {
  const granted = typeof window !== "undefined" && sessionStorage.getItem("georisk_access") === "granted";
  if (!granted) return <Navigate to={redirectTo} replace />;
  return children;
}
