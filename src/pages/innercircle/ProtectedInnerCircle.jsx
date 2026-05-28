import { useEffect, useState } from "react";
import InnerCircle from "./InnerCircle";

export default function ProtectedInnerCircle({ onBack, onUnauthorized }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const hasAccess = localStorage.getItem("zrc-inner-circle-access");
    setAllowed(hasAccess === "true");
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
    localStorage.removeItem("zrc-inner-circle-access");
    const redirect = onUnauthorized || onBack;
    if (redirect) redirect();
    return null;
  }

  return <InnerCircle onBack={onBack} />;
}
