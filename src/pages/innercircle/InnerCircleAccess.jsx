import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function InnerCircleAccess() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleAccess(e) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    const { data } = await supabase
      .from("inner_circle_members")
      .select("status")
      .eq("email", cleanEmail)
      .single();

    if (!data || data.status !== "approved") {
      setMessage("Access pending approval.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      setMessage("Error sending access email.");
    } else {
      ocalStorage.setItem("zrc-inner-circle-access","true"); setMessage("Access granted."); window.location.reload();
    }
  }

  return (
    <main className=\"min-h-screen bg-black text-white flex items-center justify-center px-6\">
      <div className=\"w-full max-w-xl border border-white/10 p-10 bg-white/[0.03]\">
        <p className=\"text-xs uppercase tracking-[0.35em] text-[#D4A853]\">
          ZRC Inner Circle
        </p>

        <h1 className=\"mt-6 text-5xl font-serif\">
          Restricted Intelligence Access
        </h1>

        <p className=\"mt-6 text-white/60 leading-7\">
          Access is reserved for approved investors and strategic operators.
        </p>

        <form onSubmit={handleAccess} className=\"mt-8 space-y-4\">
          <input
            type=\"email\"
            required
            placeholder=\"Registered email\"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className=\"w-full bg-black border border-white/10 px-5 py-4 text-white outline-none focus:border-[#D4A853]\"
          />

          <button className=\"w-full bg-white text-black py-4 uppercase tracking-[0.2em] hover:bg-[#D4A853]\">
            Send Secure Access Link
          </button>
        </form>

        {message && (
          <p className=\"mt-6 text-white/50\">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
