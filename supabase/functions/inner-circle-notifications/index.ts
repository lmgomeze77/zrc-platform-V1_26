// supabase/functions/inner-circle-notifications/index.ts
// Single Edge Function handles two webhook events:
//   INSERT  → notifies ZRC admin (Luis) of new membership application
//   UPDATE  → sends welcome/approval email to the new member
//
// Deploy: supabase functions deploy inner-circle-notifications
// Env:    RESEND_API_KEY, ADMIN_EMAIL (set in Supabase dashboard → Settings → Edge Functions)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL") ?? "luis@zenithrisecapital.com";
const FROM_EMAIL     = "ZRC Inner Circle <luis@zenithrisecapital.com>";
const SITE_URL       = "https://zenithrisecapital.com";

// ── SHARED HELPER ────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    throw new Error(err);
  }
  return res.json();
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────
function baseStyle() {
  return `
    background:#06080C; color:#E8E0CC;
    font-family:'Georgia',serif; padding:48px 32px;
    max-width:560px; margin:0 auto; line-height:1.7;
  `;
}

function adminNotificationEmail(record: Record<string, string>) {
  const { name, email, profile_category, organization, reason } = record;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="${baseStyle()}">
    <p style="font-family:monospace;font-size:10px;letter-spacing:0.4em;color:rgba(184,152,42,0.7);text-transform:uppercase;margin-bottom:24px;">
      ZRC INNER CIRCLE — NEW APPLICATION
    </p>
    <h1 style="font-size:22px;font-weight:400;font-style:italic;color:#E8E0CC;margin-bottom:24px;">
      Nueva solicitud de membresía
    </h1>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      ${[
        ["Nombre",      name            ?? "—"],
        ["Email",       email           ?? "—"],
        ["Perfil",      profile_category ?? "—"],
        ["Organización",organization    ?? "—"],
        ["Motivo",      reason          ?? "—"],
      ].map(([k,val]) => `
        <tr>
          <td style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:rgba(184,152,42,0.6);text-transform:uppercase;padding:10px 0 10px;border-bottom:1px solid rgba(255,255,255,0.06);width:130px;vertical-align:top;">${k}</td>
          <td style="font-size:14px;color:#E8E0CC;padding:10px 0 10px;border-bottom:1px solid rgba(255,255,255,0.06);">${val}</td>
        </tr>`
      ).join("")}
    </table>
    <p style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:rgba(232,224,204,0.4);margin-bottom:20px;">
      Para aprobar, ejecuta en Supabase SQL Editor:
    </p>
    <pre style="background:rgba(255,255,255,0.05);border:1px solid rgba(184,152,42,0.2);padding:16px;font-family:monospace;font-size:12px;color:#D4A853;border-radius:4px;overflow-x:auto;">
UPDATE inner_circle_members
SET status = 'approved', approved_at = now()
WHERE email = '${email}';</pre>
    <p style="margin-top:32px;font-family:monospace;font-size:9px;letter-spacing:0.3em;color:rgba(232,224,204,0.2);">
      Zenith Rise Capital · ZRC Inner Circle
    </p>
  </body></html>`;
}

function memberApprovalEmail(name: string | null, email: string) {
  const displayName = name ? `${name},` : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="${baseStyle()}">
    <p style="font-family:monospace;font-size:10px;letter-spacing:0.4em;color:rgba(184,152,42,0.7);text-transform:uppercase;margin-bottom:32px;">
      ZRC CONFIDENCIAL
    </p>
    <h1 style="font-size:28px;font-weight:400;font-style:italic;color:#E8E0CC;margin-bottom:16px;">
      Acceso aprobado al Inner Circle
    </h1>
    <p style="font-size:15px;color:rgba(232,224,204,0.65);margin-bottom:28px;">
      ${displayName} tu solicitud de acceso al
      <strong style="color:#D4A853;">ZRC Inner Circle</strong>
      ha sido aprobada.
    </p>
    <p style="font-size:15px;color:rgba(232,224,204,0.65);margin-bottom:36px;">
      Para acceder, visita la plataforma, haz clic en
      <strong style="color:#E8E0CC;">Inner Circle</strong>
      en el menú de navegación e introduce este email.
      Recibirás un enlace de acceso instantáneo en tu bandeja de entrada.
    </p>
    <a href="${SITE_URL}" style="display:inline-block;background:#D4A853;color:#000;padding:14px 32px;font-family:monospace;font-size:11px;letter-spacing:0.35em;text-decoration:none;text-transform:uppercase;border-radius:2px;">
      ACCEDER AL INNER CIRCLE →
    </a>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);">
      <p style="font-size:13px;color:rgba(232,224,204,0.4);margin-bottom:8px;">
        ZRC Inner Circle — Inteligencia privada. Por invitación.
      </p>
      <p style="font-family:monospace;font-size:9px;letter-spacing:0.3em;color:rgba(232,224,204,0.2);">
        zenithrisecapital.com · Madrid · Est. 2024
      </p>
    </div>
  </body></html>`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    // ── NEW APPLICATION (INSERT) ─────────────────────────────
    if (type === "INSERT") {
      await sendEmail(
        ADMIN_EMAIL,
        `[ZRC Inner Circle] Nueva solicitud: ${record.name ?? record.email}`,
        adminNotificationEmail(record),
      );
      console.log("Admin notified of new application:", record.email);
      return new Response(JSON.stringify({ sent: "admin_notification" }), { status: 200 });
    }

    // ── APPROVAL (UPDATE: pending → approved) ───────────────
    if (type === "UPDATE") {
      const wasApproved = old_record?.status !== "approved" && record.status === "approved";
      if (!wasApproved) {
        return new Response(JSON.stringify({ skipped: "status_unchanged_or_not_approval" }), { status: 200 });
      }
      await sendEmail(
        record.email,
        "Tu acceso al ZRC Inner Circle ha sido aprobado",
        memberApprovalEmail(record.name, record.email),
      );
      console.log("Approval email sent to:", record.email);
      return new Response(JSON.stringify({ sent: "member_approval" }), { status: 200 });
    }

    return new Response(JSON.stringify({ skipped: "unknown_event_type" }), { status: 200 });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
