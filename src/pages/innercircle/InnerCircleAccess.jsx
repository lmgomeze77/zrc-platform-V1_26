import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function InnerCircleAccess({ onBack }) {
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAccess(e) {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { data } = await supabase
      .from("inner_circle_members")
      .select("status")
      .eq("email", cleanEmail)
      .single();

    if (!data || data.status !== "approved") {
      setMessage("Access not granted. Request membership at luis@zenithrisecapital.com");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (signInError) {
      setMessage(signInError.message);
      setLoading(false);
      return;
    }

    localStorage.setItem("zrc-inner-circle-access", "true");
    setMessage("Access granted. Check your email for the magic link.");
    setLoading(false);
    window.location.reload();
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#06080C", padding:"40px 24px" }}>
      <div style={{ maxWidth:420, width:"100%", textAlign:"center" }}>
        <p style={{ fontFamily:"'Cormorant SC',serif", fontSize:10, letterSpacing:"0.45em", color:"rgba(184,152,42,0.6)", marginBottom:32 }}>ZRC CONFIDENCIAL</p>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontStyle:"italic", color:"#E8E0CC", marginBottom:12, fontWeight:400 }}>The Inner Circle</h2>
        <p style={{ fontFamily:"'Cormorant',serif", fontSize:16, fontStyle:"italic", color:"rgba(232,224,204,0.45)", marginBottom:40, lineHeight:1.7 }}>Acceso privado por invitación</p>
        <form onSubmit={handleAccess} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            type="email"
            placeholder="Su email..."
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ background:"transparent", border:"none", borderBottom:"1px solid rgba(184,152,42,0.35)", outline:"none", fontFamily:"'Cormorant',serif", fontSize:17, fontStyle:"italic", color:"#E8E0CC", padding:"8px 0", textAlign:"center" }}
          />
          <button type="submit" disabled={loading} style={{ marginTop:16, background:"none", border:"none", fontFamily:"'Cormorant SC',serif", fontSize:10, letterSpacing:"0.4em", color:"#B8982A", cursor:"pointer", padding:"8px 0" }}>
            {loading ? "..." : "ACCEDER"}
          </button>
        </form>
        {message && (
          <p style={{ marginTop:20, fontFamily:"'Cormorant SC',serif", fontSize:9, letterSpacing:"0.28em", color:"rgba(184,152,42,0.6)", lineHeight:1.7 }}>{message}</p>
        )}
        {onBack && (
          <button onClick={onBack} style={{ marginTop:32, background:"none", border:"none", fontFamily:"'Cormorant SC',serif", fontSize:9, letterSpacing:"0.3em", color:"rgba(232,224,204,0.3)", cursor:"pointer" }}>
            ← VOLVER
          </button>
        )}
      </div>
    </div>
  );
}
