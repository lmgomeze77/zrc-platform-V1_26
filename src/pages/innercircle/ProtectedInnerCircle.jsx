import { useEffect, useState } from "react";
import InnerCircle from "./InnerCircle";

export default function ProtectedInnerCircle({ onBack }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const hasAccess = localStorage.getItem("zrc-inner-circle-access");
    setAllowed(hasAccess === "true");
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
    if (onBack) { localStorage.removeItem("zrc-inner-circle-access"); onBack(); }
    return null;
  }

  return <InnerCircle onBack={onBack} />;
}
