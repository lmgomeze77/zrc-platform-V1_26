import { useEffect, useState } from "react";
import InnerCircle from "./InnerCircle";

const IC_API = "https://zenith-risecapital.lmgomeze77.workers.dev";
const IC_EMAIL_KEY = "zrc-ic-email";

export default function ProtectedInnerCircle({ onBack, onUnauthorized, useAuth }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem(IC_EMAIL_KEY);
    if (!savedEmail) {
      setAllowed(false);
      return;
    }
    fetch(`${IC_API}/api/inner-circle/check?email=${encodeURIComponent(savedEmail)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === "approved") {
          localStorage.setItem("zrc-inner-circle-access", "true");
          setAllowed(true);
        } else {
          localStorage.removeItem("zrc-inner-circle-access");
          setAllowed(false);
        }
      })
      .catch(() => {
        // On network error fall back to cached token rather than locking out
        const cached = localStorage.getItem("zrc-inner-circle-access") === "true";
        setAllowed(cached);
      });
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
    localStorage.removeItem("zrc-inner-circle-access");
    const redirect = onUnauthorized || onBack;
    if (redirect) redirect();
    return null;
  }

  return <InnerCircle onBack={onBack} useAuth={useAuth} />;
}
