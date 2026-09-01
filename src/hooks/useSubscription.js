import { useState, useEffect } from "react";

// A relative "/api/..." path only reaches the Worker when the current host
// is bound to it directly. On www.zenithrisecapital.com that binding does
// not cover every route, so a relative fetch here silently 404s (plain
// text, not JSON) and every paying subscriber reads back as tier "free".
// The workers.dev subdomain always resolves to this exact Worker.
const API_BASE = "https://zenith-risecapital.lmgomeze77.workers.dev";

export function useSubscription(email) {
  const [tier, setTier] = useState("free");
  const [status, setStatus] = useState("none");
  const [trialEnd, setTrialEnd] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) { setTier("free"); setStatus("none"); setTrialEnd(null); return; }
    setLoading(true);
    fetch(`${API_BASE}/api/subscription?email=${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : { tier: "free", status: "none", trialEnd: null }))
      .then((d) => {
        setTier(d.tier || "free");
        setStatus(d.status || "none");
        setTrialEnd(d.trialEnd || null);
        setLoading(false);
      })
      .catch(() => { setTier("free"); setStatus("none"); setTrialEnd(null); setLoading(false); });
  }, [email]);

  return { tier, status, trialEnd, loading };
}

// status === "expired": a 7-day trial that was started (post-registration)
// ran out with no payment method added — locks out everything, including
// tools that would otherwise be free (requiredTier: null), e.g. Observatory
// and Real Estate Visor. status === "none" (no subscription row at all —
// legacy accounts from before the trial system) is NOT treated as expired.
export function canAccessTool(tool, tier, status) {
  if (status === "expired") return false;
  if (!tool.requiredTier) return true;
  if (tier === "institutional") return true;
  return tier === tool.requiredTier;
}
