import {IcText} from './icLocale';
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
        // A browser flag cannot establish membership when verification fails.
        localStorage.removeItem("zrc-inner-circle-access");
        setAllowed(false);
      });
  }, []);

  useEffect(() => {
    if (allowed !== false) return;
    localStorage.removeItem("zrc-inner-circle-access");
    const redirect = onUnauthorized || onBack;
    if (redirect) redirect();
  }, [allowed, onUnauthorized, onBack]);

  if (allowed === null) return <IcText><p role="status" style={{padding:32,color:"#E8E0CC"}}>Comprobando acceso…</p></IcText>;

  if (!allowed) return null;

  return <InnerCircle onBack={onBack} useAuth={useAuth} />;
}
