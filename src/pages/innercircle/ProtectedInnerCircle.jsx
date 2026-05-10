import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import InnerCirclePrivate from "./InnerCirclePrivate";

export default function ProtectedInnerCircle() {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setAllowed(false);
        return;
      }

      const { data } = await supabase
        .from("inner_circle_members")
        .select("status")
        .eq("email", user.email.toLowerCase())
        .single();

      setAllowed(data?.status === "approved");
    }

    checkUser();
  }, []);

  if (allowed === null) {
    return (
      <main className=\"min-h-screen bg-black text-white flex items-center justify-center\">
        Verifying access...
      </main>
    );
  }

  if (!allowed) {
    window.location.reload();
    return null;
  }

  return <InnerCirclePrivate />;
}
