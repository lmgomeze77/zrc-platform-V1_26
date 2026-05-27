// Supabase Edge Function — inner-circle-notifications
//
// PRIMARY path: Worker /api/inner-circle/approve (one-click email link)
//   → sets status='approved', welcome_email_sent=true, sends welcome email
//
// BACKUP path (this function): fires via Database Webhook on UPDATE
//   → only acts when status becomes 'approved' AND welcome_email_sent is false
//   → prevents double-send when approval comes through the Worker endpoint
//
// Set up: one UPDATE webhook only (see supabase-schema.sql for instructions)
//
// Secrets required (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY, ADMIN_EMAIL

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL") ?? "luis@zenithrisecapital.com";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL       = "https://zenithrisecapital.com";

// ── MAIN HANDLER ─────────────────────────────────────────────
serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    // Only handle UPDATE events where status just became 'approved'
    // AND welcome_email_sent is false (not already sent by the Worker)
    if (
      type === "UPDATE" &&
      record?.status === "approved" &&
      old_record?.status !== "approved" &&
      record?.welcome_email_sent !== true
    ) {
      const email = String(record.email ?? "");
      const name  = String(record.name ?? "");

      if (email.includes("@") && RESEND_API_KEY) {
        await sendWelcomeEmail(email, name);

        // Mark welcome_email_sent = true to prevent future double-sends
        if (SUPABASE_URL && SERVICE_KEY && record.id) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/inner_circle_members?id=eq.${record.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({ welcome_email_sent: true }),
            }
          );
        }

        console.log("Approval email sent (via Edge Function backup path):", email);
        return new Response(JSON.stringify({ sent: "member_approval" }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ skipped: true }), { status: 200 });

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// ── EMAIL TEMPLATE ────────────────────────────────────────────
async function sendWelcomeEmail(email: string, name: string) {
  const firstName = escapeHTML(name.split(" ")[0] || "");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Zenith Rise Capital <noreply@zenithrisecapital.com>",
      to: [email],
      subject: "Bienvenido al Inner Circle · Zenith Rise Capital",
      html: welcomeEmailHTML(firstName, escapeHTML(email)),
    }),
  });
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c: string) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
  );
}

function welcomeEmailHTML(firstName: string, email: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#06080C;color:#E8E0CC;padding:32px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#09090B;border:1px solid rgba(212,168,83,0.25);padding:48px 40px;">
    <div style="text-align:center;margin-bottom:36px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.45em;color:rgba(212,168,83,0.6);text-transform:uppercase;margin:0;">ZRC CONFIDENCIAL</p>
    </div>
    <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:34px;font-style:italic;color:#E8E0CC;text-align:center;margin:0 0 14px;">
      Bienvenido${firstName ? `, ${firstName}` : ""}.
    </h1>
    <p style="font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:rgba(232,224,204,0.45);text-align:center;line-height:1.7;margin:0 0 40px;">
      Tu solicitud ha sido aprobada.<br>Formas parte del Inner Circle.
    </p>
    <div style="background:rgba(212,168,83,0.05);border:1px solid rgba(212,168,83,0.2);padding:24px;margin-bottom:32px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.2em;color:rgba(212,168,83,0.7);text-transform:uppercase;margin:0 0 14px;">Cómo acceder</p>
      <ol style="font-size:14px;color:rgba(232,224,204,0.7);line-height:2.2;margin:0;padding-left:20px;">
        <li>Visita <strong style="color:#D4A853;">zenithrisecapital.com</strong></li>
        <li>Navega hasta la sección <strong>Community</strong></li>
        <li>Haz clic en <strong>Inner Circle</strong></li>
        <li>Introduce este email:<br><strong style="color:#D4A853;">${email}</strong></li>
      </ol>
    </div>
    <a href="${SITE_URL}" style="display:block;text-align:center;padding:14px 28px;background:rgba(212,168,83,0.1);color:#D4A853;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.35em;text-transform:uppercase;border:1px solid rgba(212,168,83,0.3);">
      ACCEDER AL INNER CIRCLE →
    </a>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:rgba(232,224,204,0.2);text-align:center;line-height:1.7;">
      Zenith Rise Capital · Inner Circle<br>zenithrisecapital.com
    </div>
  </div>
</body></html>`;
}
