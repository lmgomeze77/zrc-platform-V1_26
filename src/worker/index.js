// src/worker/index.js
// ZRC Backend Worker — /api/lead · /api/stripe-webhook · /api/subscription · /api/claude

// Fill these with real Stripe Price IDs from your dashboard
// Dashboard → Products → select plan → copy "Price ID" (starts with price_)
const PRICE_TIERS = {
  // Intelligence Monthly  (price_XXXX)
  "price_intelligence_monthly": "intelligence",
  // Intelligence Annual   (price_XXXX)
  "price_intelligence_annual": "intelligence",
  // Institutional Monthly (price_XXXX)
  "price_institutional_monthly": "institutional",
  // Institutional Annual  (price_XXXX)
  "price_institutional_annual": "institutional",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return corsResponse();

    if (url.pathname === "/api/lead" && request.method === "POST")
      return handleLead(request, env);

    if (url.pathname === "/api/health" && request.method === "GET")
      return jsonResponse({ ok: true, ts: Date.now() });

    if (url.pathname === "/api/stripe-webhook" && request.method === "POST")
      return handleStripeWebhook(request, env);

    if (url.pathname === "/api/subscription" && request.method === "GET")
      return handleSubscriptionCheck(request, env);

    if (url.pathname === "/api/claude" && request.method === "POST")
      return handleClaude(request, env);

    if (url.pathname.startsWith("/api/"))
      return jsonResponse({ error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
  },
};

// ============================================================
// /api/stripe-webhook
// ============================================================
async function handleStripeWebhook(request, env) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return jsonResponse({ error: "Webhook not configured" }, 500);
  }

  try {
    await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature verification failed:", err.message);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email =
          session.customer_email ||
          session.customer_details?.email;
        const priceId =
          session.line_items?.data?.[0]?.price?.id || "";
        const tier = getTierFromPrice(priceId);
        if (email) {
          await upsertSubscription(env, {
            email,
            tier,
            status: "active",
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const tier = getTierFromPrice(
          sub.items?.data?.[0]?.price?.id || ""
        );
        await upsertSubscriptionByCustomer(env, {
          stripeCustomerId: sub.customer,
          tier,
          status: sub.status === "active" ? "active" : "inactive",
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await upsertSubscriptionByCustomer(env, {
          stripeCustomerId: sub.customer,
          tier: "free",
          status: "cancelled",
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await upsertSubscriptionByCustomer(env, {
          stripeCustomerId: invoice.customer,
          status: "past_due",
        });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 so Stripe doesn't retry — event already logged
  }

  return jsonResponse({ received: true });
}

// ============================================================
// /api/subscription?email=
// ============================================================
async function handleSubscriptionCheck(request, env) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email || !isValidEmail(email))
    return jsonResponse({ tier: "free" });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ tier: "free" });

  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&status=eq.active&select=tier&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!resp.ok) return jsonResponse({ tier: "free" });
    const data = await resp.json();
    return jsonResponse({ tier: data?.[0]?.tier || "free" });
  } catch (err) {
    console.error("Subscription check error:", err);
    return jsonResponse({ tier: "free" });
  }
}

// ============================================================
// /api/claude  (proxy for AI Report in FIS)
// ============================================================
async function handleClaude(request, env) {
  if (!env.ANTHROPIC_API_KEY)
    return jsonResponse({ error: "AI not configured" }, 503);

  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  return jsonResponse(data, resp.status);
}

// ============================================================
// /api/lead  (unchanged)
// ============================================================
async function handleLead(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { email, sector, source, rc, parcela } = payload;

  if (!email || !isValidEmail(email))
    return jsonResponse({ error: "Email inválido" }, 400);
  if (!sector || sector.length > 100)
    return jsonResponse({ error: "Sector inválido" }, 400);

  const sourceClean = (source || "unknown").substring(0, 50);
  const rcClean = rc ? String(rc).substring(0, 20) : null;
  const parcelaClean = parcela ? JSON.stringify(parcela).substring(0, 2000) : null;

  const userAgent = request.headers.get("User-Agent") || "";
  const country = request.cf?.country || "";
  const referer = request.headers.get("Referer") || "";

  try {
    await env.DB.prepare(
      `INSERT INTO leads (email, sector, source, rc, parcela_json, country, user_agent, referer, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      email, sector, sourceClean, rcClean, parcelaClean,
      country, userAgent.substring(0, 500), referer.substring(0, 500),
      new Date().toISOString()
    ).run();
  } catch (err) {
    console.error("D1 insert error:", err);
    return jsonResponse({ error: "Storage error" }, 500);
  }

  if (env.RESEND_API_KEY) {
    try {
      await sendResendEmail(env, {
        from: "ZRC Labs <labs@zenithrisecapital.com>",
        to: env.NOTIFY_EMAIL || "luis@zenithrisecapital.com",
        subject: `🔔 Nuevo lead Visor — ${sector}`,
        html: notifyEmailHTML({ email, sector, source: sourceClean, rc: rcClean, country }),
      });
      await sendResendEmail(env, {
        from: "Zenith Rise Capital <noreply@zenithrisecapital.com>",
        to: email,
        subject: "Acceso al Visor Inmobiliario · ZRC Labs",
        html: welcomeEmailHTML({ email, sector }),
      });
    } catch (err) {
      console.error("Resend error:", err);
    }
  }

  return jsonResponse({ ok: true });
}

// ============================================================
// STRIPE HELPERS
// ============================================================
function getTierFromPrice(priceId) {
  return PRICE_TIERS[priceId] || "intelligence";
}

async function verifyStripeSignature(body, sig, secret) {
  if (!sig) throw new Error("No stripe-signature header");

  const parts = sig.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k === "t") acc.timestamp = v;
    if (k === "v1") acc.signature = v;
    return acc;
  }, {});

  if (!parts.timestamp || !parts.signature)
    throw new Error("Malformed stripe-signature");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC", key, encoder.encode(`${parts.timestamp}.${body}`)
  );
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (hex !== parts.signature) throw new Error("Signature mismatch");

  if (Math.abs(Date.now() / 1000 - parseInt(parts.timestamp, 10)) > 300)
    throw new Error("Webhook timestamp too old");
}

// ============================================================
// SUPABASE HELPERS
// ============================================================
async function upsertSubscription(env, { email, tier, status, stripeCustomerId, stripeSubscriptionId }) {
  const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      email,
      tier,
      status,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Supabase upsert error: ${resp.status} ${txt}`);
  }
}

async function upsertSubscriptionByCustomer(env, { stripeCustomerId, tier, status }) {
  const patch = { updated_at: new Date().toISOString() };
  if (tier) patch.tier = tier;
  if (status) patch.status = status;

  const resp = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${encodeURIComponent(stripeCustomerId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(patch),
    }
  );
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Supabase patch error: ${resp.status} ${txt}`);
  }
}

// ============================================================
// GENERAL HELPERS
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
