import { useState, useEffect } from "react";

export function useSubscription(email) {
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) { setTier("free"); return; }
    setLoading(true);
    fetch(`/api/subscription?email=${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : { tier: "free" }))
      .then((d) => { setTier(d.tier || "free"); setLoading(false); })
      .catch(() => { setTier("free"); setLoading(false); });
  }, [email]);

  return { tier, loading };
}

export function canAccessTool(tool, tier) {
  if (!tool.requiredTier) return true;
  if (tier === "institutional") return true;
  return tier === tool.requiredTier;
}
