import { useState, useEffect } from "react";

export function useSubscription(email) {
  const [tier, setTier] = useState("free");
  const [status, setStatus] = useState("none");
  const [trialEnd, setTrialEnd] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) { setTier("free"); setStatus("none"); setTrialEnd(null); return; }
    setLoading(true);
    fetch(`/api/subscription?email=${encodeURIComponent(email)}`)
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
