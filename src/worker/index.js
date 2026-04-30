// src/worker/index.js
// ZRC Backend Worker — endpoint /api/lead
// Intercepta solo /api/*. Todo lo demás lo sirven los assets estáticos automáticamente.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight (por si llamamos desde otro dominio en el futuro)
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    // Routing manual
    if (url.pathname === "/api/lead" && request.method === "POST") {
      return handleLead(request, env);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({ ok: true, ts: Date.now() });
    }

    // Cualquier otro /api/* → 404 (no caemos al SPA fallback)
    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "Not found" }, 404);
    }

    // Fallback (no debería ocurrir si run_worker_first solo apunta a /api/*)
    return env.ASSETS.fetch(request);
  },
};

// ============================================================
// /api/lead — captura de leads del Visor
// ============================================================
async function handleLead(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { email, sector, source, rc, parcela } = payload;

  // Validación básica
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: "Email inválido" }, 400);
  }
  if (!sector || sector.length > 100) {
    return jsonResponse({ error: "Sector inválido" }, 400);
  }

  const sourceClean = (source || "unknown").substring(0, 50);
  const rcClean = rc ? String(rc).substring(0, 20) : null;
  const parcelaClean = parcela ? JSON.stringify(parcela).substring(0, 2000) : null;

  // Headers de contexto (útil para analytics)
  const userAgent = request.headers.get("User-Agent") || "";
  const country = request.cf?.country || "";
  const referer = request.headers.get("Referer") || "";

  // Insertar en D1
  try {
    await env.DB.prepare(
      `INSERT INTO leads (email, sector, source, rc, parcela_json, country, user_agent, referer, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      email,
      sector,
      sourceClean,
      rcClean,
      parcelaClean,
      country,
      userAgent.substring(0, 500),
      referer.substring(0, 500),
      new Date().toISOString()
    ).run();
  } catch (err) {
    console.error("D1 insert error:", err);
    return jsonResponse({ error: "Storage error" }, 500);
  }

  // Enviar emails con Resend (no bloqueante — si falla, el lead ya está guardado)
  if (env.RESEND_API_KEY) {
    try {
      // Email de notificación interna
      await sendResendEmail(env, {
        from: "ZRC Labs <labs@zenithrisecapital.com>",
        to: env.NOTIFY_EMAIL || "luis@zenithrisecapital.com",
        subject: `🔔 Nuevo lead Visor — ${sector}`,
        html: notifyEmailHTML({ email, sector, source: sourceClean, rc: rcClean, country }),
      });

      // Email de bienvenida al lead
      await sendResendEmail(env, {
        from: "Zenith Rise Capital <noreply@zenithrisecapital.com>",
        to: email,
        subject: "Acceso al Visor Inmobiliario · ZRC Labs",
        html: welcomeEmailHTML({ email, sector }),
      });
    } catch (err) {
      console.error("Resend error:", err);
      // No fallamos la respuesta — el lead ya está guardado
    }
  }

  return jsonResponse({ ok: true });
}

// ============================================================
// HELPERS
// ============================================================
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendResendEmail(env, { from, to, subject, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Resend ${resp.status}: ${txt}`);
  }
  return resp.json();
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================
function notifyEmailHTML({ email, sector, source, rc, country }) {
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#09090B;color:#FAFAFA;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#111113;border:1px solid #27272A;padding:32px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.18em;color:#D4A853;text-transform:uppercase;margin-bottom:16px;">
      ZRC LABS · NUEVO LEAD
    </div>
    <h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;margin:0 0 24px;font-size:24px;color:#D4A853;">
      Lead capturado en Visor Inmobiliario
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#A1A1AA;width:140px;">Email</td><td style="padding:8px 0;color:#FAFAFA;"><strong>${escapeHTML(email)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#A1A1AA;">Sector</td><td style="padding:8px 0;color:#FAFAFA;">${escapeHTML(sector)}</td></tr>
      <tr><td style="padding:8px 0;color:#A1A1AA;">Fuente</td><td style="padding:8px 0;color:#FAFAFA;font-family:'IBM Plex Mono',monospace;font-size:12px;">${escapeHTML(source)}</td></tr>
      ${rc ? `<tr><td style="padding:8px 0;color:#A1A1AA;">Última RC</td><td style="padding:8px 0;color:#FAFAFA;font-family:'IBM Plex Mono',monospace;font-size:12px;">${escapeHTML(rc)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#A1A1AA;">País</td><td style="padding:8px 0;color:#FAFAFA;">${escapeHTML(country || "—")}</td></tr>
    </table>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #27272A;font-size:12px;color:#71717A;">
      Acceso a la base completa: D1 · zrc-leads
    </div>
  </div>
</body></html>`;
}

function welcomeEmailHTML({ email, sector }) {
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#F5F3EE;color:#1A1A1A;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;padding:40px;border-top:3px solid #D4A853;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.2em;color:#D4A853;text-transform:uppercase;margin-bottom:16px;">
      ZENITH RISE CAPITAL · LABS
    </div>
    <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:28px;margin:0 0 16px;color:#0B1F3F;">
      Bienvenido al Visor Inmobiliario
    </h1>
    <p style="font-size:15px;line-height:1.7;color:#404040;margin:0 0 16px;">
      Gracias por registrarte. Tu acceso al modo demo del Visor está activo:
      búsquedas ilimitadas por referencia catastral, capas de riesgo, alertas
      regulatorias y matching con mandatos ZRC.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#404040;margin:0 0 24px;">
      También recibirás cada mes el informe <em>Zenrise State</em> con
      indicadores macro y señales de mercado extraídas de nuestras herramientas.
    </p>
    <a href="https://www.zenithrisecapital.com" style="display:inline-block;padding:12px 28px;background:#0B1F3F;color:#FFFFFF;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">
      Volver al Visor
    </a>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E8E5DC;font-size:12px;color:#71717A;line-height:1.6;">
      Zenith Rise Capital · Calesius Global S.L.<br>
      Madrid · zenithrisecapital.com
    </div>
  </div>
</body></html>`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
