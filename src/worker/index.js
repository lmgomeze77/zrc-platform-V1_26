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

    if (url.pathname === "/api/inner-circle/check" && request.method === "GET")
      return handleInnerCircleCheck(request, env);

    if (url.pathname === "/api/inner-circle/login" && request.method === "POST")
      return handleInnerCircleLogin(request, env);

    if (url.pathname === "/api/inner-circle/apply" && request.method === "POST")
      return handleInnerCircleApply(request, env);

    if (url.pathname === "/api/inner-circle/approve" && request.method === "GET")
      return handleInnerCircleApprove(request, env);

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

// ============================================================
// /api/inner-circle/check?email=
// ============================================================
async function handleInnerCircleCheck(request, env) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email || !isValidEmail(email))
    return jsonResponse({ status: "not_found" });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ status: "not_found" });

  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/inner_circle_members?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=status&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!resp.ok) return jsonResponse({ status: "not_found" });
    const data = await resp.json();
    return jsonResponse({ status: data?.[0]?.status || "not_found" });
  } catch (err) {
    console.error("IC check error:", err);
    return jsonResponse({ status: "not_found" });
  }
}

// ============================================================
// /api/inner-circle/login  (POST)  — email + password verification
// ============================================================
async function handleInnerCircleLogin(request, env) {
  let payload;
  try { payload = await request.json(); } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { email, password } = payload;

  if (!email || !isValidEmail(email) || !password)
    return jsonResponse({ status: "denied" });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ status: "denied" });

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Step 1: fetch the member row directly
    const memberResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/inner_circle_members?email=eq.${encodeURIComponent(cleanEmail)}&select=status,password_hash&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!memberResp.ok) return jsonResponse({ status: "denied" });
    const members = await memberResp.json();
    const member = members?.[0];

    if (!member || member.status !== "approved")
      return jsonResponse({ status: "denied" });

    // Step 2a: no password set yet → allow (admin needs to run SQL to set passwords)
    if (!member.password_hash)
      return jsonResponse({ status: "approved" });

    // Step 2b: password hash exists → verify via Supabase pgcrypto RPC
    const rpcResp = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ic_verify_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ p_email: cleanEmail, p_password: password }),
    });

    if (!rpcResp.ok) return jsonResponse({ status: "denied" });
    const valid = await rpcResp.json();

    return jsonResponse({ status: valid === true ? "approved" : "denied" });
  } catch (err) {
    console.error("IC login error:", err);
    return jsonResponse({ status: "denied" });
  }
}

// Generates a random readable password (no ambiguous chars)
function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join("");
}

// ============================================================
// /api/inner-circle/apply  (POST)
// ============================================================
async function handleInnerCircleApply(request, env) {
  let payload;
  try { payload = await request.json(); } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { email, name, organization, profile_category, reason } = payload;

  if (!email || !isValidEmail(email))
    return jsonResponse({ error: "Email inválido" }, 400);
  if (!name || name.trim().length < 2)
    return jsonResponse({ error: "Nombre requerido" }, 400);

  const cleanEmail = email.trim().toLowerCase();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ error: "Service unavailable" }, 503);

  // Check if already exists
  try {
    const checkResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/inner_circle_members?email=eq.${encodeURIComponent(cleanEmail)}&select=status&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (checkResp.ok) {
      const existing = await checkResp.json();
      if (existing?.[0]) {
        if (existing[0].status === "approved")
          return jsonResponse({ ok: false, error: "already_approved" });
        return jsonResponse({ ok: false, error: "already_pending" });
      }
    }
  } catch { /* proceed to insert */ }

  // Insert application
  try {
    const insertResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/inner_circle_members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim(),
          organization: organization?.trim() || null,
          profile_category: profile_category || null,
          reason: reason?.trim() || null,
          status: "pending",
        }),
      }
    );
    if (!insertResp.ok && insertResp.status !== 201) {
      const txt = await insertResp.text();
      console.error("IC insert error:", insertResp.status, txt);
      return jsonResponse({ error: "Error al guardar la solicitud" }, 500);
    }
  } catch (err) {
    console.error("IC insert error:", err);
    return jsonResponse({ error: "Error al guardar la solicitud" }, 500);
  }

  // Send admin notification email with one-click approve button
  if (env.RESEND_API_KEY) {
    try {
      const adminToken = env.INNER_CIRCLE_ADMIN_TOKEN || "";
      const approveUrl = `https://zenith-risecapital.lmgomeze77.workers.dev/api/inner-circle/approve?token=${encodeURIComponent(adminToken)}&email=${encodeURIComponent(cleanEmail)}`;
      await sendResendEmail(env, {
        from: "ZRC Inner Circle <noreply@zenithrisecapital.com>",
        to: env.NOTIFY_EMAIL || "luis@zenithrisecapital.com",
        subject: `⭕ Nueva solicitud Inner Circle — ${name.trim()}`,
        html: icAdminEmailHTML({ name: name.trim(), email: cleanEmail, organization: organization?.trim(), profile_category, reason: reason?.trim(), approveUrl }),
      });
    } catch (err) {
      console.error("IC admin email error:", err);
    }
  }

  return jsonResponse({ ok: true });
}

// ============================================================
// /api/inner-circle/approve?token=&email=
// ============================================================
async function handleInnerCircleApprove(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  const adminToken = env.INNER_CIRCLE_ADMIN_TOKEN;
  if (!adminToken || token !== adminToken)
    return new Response("Unauthorized", { status: 403 });

  if (!email || !isValidEmail(email))
    return new Response("Invalid email", { status: 400 });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return new Response("Service unavailable", { status: 503 });

  const cleanEmail = email.trim().toLowerCase();

  // Fetch current member record
  let member = null;
  try {
    const checkResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/inner_circle_members?email=eq.${encodeURIComponent(cleanEmail)}&select=id,name,status,welcome_email_sent&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (checkResp.ok) {
      const data = await checkResp.json();
      member = data?.[0] || null;
    }
  } catch { /* proceed */ }

  if (!member)
    return htmlResponse(icApproveResultHTML({ success: false, email: cleanEmail, message: "Solicitud no encontrada." }));

  if (member.status === "approved")
    return htmlResponse(icApproveResultHTML({ success: true, alreadyApproved: true, name: member.name, email: cleanEmail }));

  // Generate a password for the new member
  const plainPassword = generatePassword(10);

  // Approve: set status, approved_at, welcome_email_sent=true
  try {
    const patchResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/inner_circle_members?email=eq.${encodeURIComponent(cleanEmail)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          status: "approved",
          approved_at: new Date().toISOString(),
          welcome_email_sent: true,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!patchResp.ok) {
      const txt = await patchResp.text();
      console.error("IC approve PATCH error:", patchResp.status, txt);
      return htmlResponse(icApproveResultHTML({ success: false, email: cleanEmail, message: "Error al actualizar en base de datos." }));
    }
  } catch (err) {
    console.error("IC approve error:", err);
    return htmlResponse(icApproveResultHTML({ success: false, email: cleanEmail, message: "Error de conexión." }));
  }

  // Store bcrypt hash of the generated password via Supabase RPC
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ic_set_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ p_email: cleanEmail, p_password: plainPassword }),
    });
  } catch (err) {
    console.error("IC set password error:", err);
  }

  // Send welcome email with the access password
  if (env.RESEND_API_KEY) {
    try {
      await sendResendEmail(env, {
        from: "Zenith Rise Capital <noreply@zenithrisecapital.com>",
        to: cleanEmail,
        subject: "Bienvenido al Inner Circle · Zenith Rise Capital",
        html: icWelcomeEmailHTML({ name: member.name, email: cleanEmail, password: plainPassword }),
      });
    } catch (err) {
      console.error("IC welcome email error:", err);
    }
  }

  return htmlResponse(icApproveResultHTML({ success: true, name: member.name, email: cleanEmail }));
}

// ============================================================
// INNER CIRCLE EMAIL TEMPLATES
// ============================================================
function icAdminEmailHTML({ name, email, organization, profile_category, reason, approveUrl }) {
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#09090B;color:#FAFAFA;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#111113;border:1px solid rgba(212,168,83,0.3);padding:40px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.25em;color:#D4A853;text-transform:uppercase;margin-bottom:8px;">
      ZRC INNER CIRCLE
    </div>
    <h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:26px;color:#E8E0CC;margin:0 0 28px;">
      Nueva solicitud de acceso
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:28px;">
      <tr><td style="padding:8px 0;color:#71717A;width:150px;vertical-align:top;">Nombre</td><td style="padding:8px 0;color:#FAFAFA;"><strong>${escapeHTML(name)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#71717A;vertical-align:top;">Email</td><td style="padding:8px 0;color:#D4A853;font-family:'IBM Plex Mono',monospace;font-size:12px;">${escapeHTML(email)}</td></tr>
      ${organization ? `<tr><td style="padding:8px 0;color:#71717A;vertical-align:top;">Organización</td><td style="padding:8px 0;color:#FAFAFA;">${escapeHTML(organization)}</td></tr>` : ""}
      ${profile_category ? `<tr><td style="padding:8px 0;color:#71717A;vertical-align:top;">Perfil</td><td style="padding:8px 0;color:#FAFAFA;">${escapeHTML(profile_category)}</td></tr>` : ""}
      ${reason ? `<tr><td style="padding:8px 0;color:#71717A;vertical-align:top;">Motivo</td><td style="padding:8px 0;color:#FAFAFA;line-height:1.6;">${escapeHTML(reason)}</td></tr>` : ""}
    </table>
    <a href="${approveUrl}" style="display:block;text-align:center;padding:16px 28px;background:#D4A853;color:#000;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.35em;text-transform:uppercase;font-weight:700;margin-bottom:16px;">
      ✓ APROBAR ACCESO
    </a>
    <p style="font-size:11px;color:#52525B;text-align:center;line-height:1.6;margin:0 0 20px;">
      Un clic aprueba al miembro y le envía el email de bienvenida automáticamente.
    </p>
    <div style="padding:16px;background:#0A0A0C;border:1px solid #27272A;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#52525B;line-height:1.8;">
      Alternativa SQL:<br>
      UPDATE inner_circle_members<br>
      SET status = 'approved', approved_at = now()<br>
      WHERE email = '${escapeHTML(email)}';
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #27272A;font-size:11px;color:#52525B;">
      Zenith Rise Capital · Inner Circle
    </div>
  </div>
</body></html>`;
}

function icWelcomeEmailHTML({ name, email, password }) {
  const firstName = escapeHTML((name || email).split(" ")[0]);
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#06080C;color:#E8E0CC;padding:32px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#09090B;border:1px solid rgba(212,168,83,0.25);padding:48px 40px;">
    <div style="text-align:center;margin-bottom:36px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.45em;color:rgba(212,168,83,0.6);text-transform:uppercase;margin:0;">ZRC CONFIDENCIAL</p>
    </div>
    <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:34px;font-style:italic;color:#E8E0CC;text-align:center;margin:0 0 14px;">
      Bienvenido, ${firstName}.
    </h1>
    <p style="font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:rgba(232,224,204,0.45);text-align:center;line-height:1.7;margin:0 0 40px;">
      Tu solicitud ha sido aprobada.<br>Formas parte del Inner Circle.
    </p>
    <div style="background:rgba(212,168,83,0.05);border:1px solid rgba(212,168,83,0.2);padding:24px;margin-bottom:24px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.2em;color:rgba(212,168,83,0.7);text-transform:uppercase;margin:0 0 14px;">Tus credenciales de acceso</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:rgba(232,224,204,0.5);width:90px;">Email</td>
          <td style="padding:8px 0;color:#D4A853;font-family:'IBM Plex Mono',monospace;font-size:13px;">${escapeHTML(email)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:rgba(232,224,204,0.5);">Contraseña</td>
          <td style="padding:8px 0;color:#E8E0CC;font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:700;letter-spacing:0.1em;">${escapeHTML(password || "—")}</td>
        </tr>
      </table>
    </div>
    <div style="background:rgba(212,168,83,0.05);border:1px solid rgba(212,168,83,0.2);padding:24px;margin-bottom:32px;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.2em;color:rgba(212,168,83,0.7);text-transform:uppercase;margin:0 0 14px;">Cómo acceder</p>
      <ol style="font-size:14px;color:rgba(232,224,204,0.7);line-height:2.2;margin:0;padding-left:20px;">
        <li>Visita <strong style="color:#D4A853;">zenithrisecapital.com</strong></li>
        <li>Haz clic en <strong>Inner Circle</strong> en el menú</li>
        <li>Introduce tu email y la contraseña de arriba</li>
      </ol>
    </div>
    <a href="https://www.zenithrisecapital.com" style="display:block;text-align:center;padding:14px 28px;background:rgba(212,168,83,0.1);color:#D4A853;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.35em;text-transform:uppercase;border:1px solid rgba(212,168,83,0.3);">
      ACCEDER AL INNER CIRCLE →
    </a>
    <p style="font-size:11px;color:rgba(232,224,204,0.25);text-align:center;margin-top:20px;line-height:1.6;">
      Guarda esta contraseña en un lugar seguro. Si necesitas resetearla contacta a luis@zenithrisecapital.com
    </p>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:rgba(232,224,204,0.2);text-align:center;line-height:1.7;">
      Zenith Rise Capital · Inner Circle<br>zenithrisecapital.com
    </div>
  </div>
</body></html>`;
}

function icApproveResultHTML({ success, name, email, message, alreadyApproved }) {
  const bg = "#06080C", gold = "#D4A853";
  const base = `font-family:'Helvetica Neue',sans-serif;background:${bg};color:#E8E0CC;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;padding:24px;box-sizing:border-box;`;
  if (alreadyApproved) return `<!DOCTYPE html><html><body style="${base}"><div style="max-width:380px;width:100%;text-align:center;"><p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.3em;color:rgba(212,168,83,0.5);margin-bottom:20px;">ZRC INNER CIRCLE</p><div style="font-size:36px;margin-bottom:16px;color:${gold};">ℹ</div><h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:26px;color:#E8E0CC;margin:0 0 12px;">Ya aprobado</h2><p style="font-size:14px;color:rgba(232,224,204,0.5);line-height:1.6;">${escapeHTML(name || email)} ya tiene acceso.</p></div></body></html>`;
  if (success) return `<!DOCTYPE html><html><body style="${base}"><div style="max-width:380px;width:100%;text-align:center;"><p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.3em;color:rgba(212,168,83,0.5);margin-bottom:20px;">ZRC INNER CIRCLE</p><div style="width:56px;height:56px;border-radius:50%;border:1px solid rgba(212,168,83,0.5);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:26px;color:${gold};">✓</div><h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:30px;color:#E8E0CC;margin:0 0 12px;">Aprobado</h2><p style="font-size:15px;color:rgba(232,224,204,0.6);line-height:1.6;margin:0 0 8px;"><strong style="color:#E8E0CC;">${escapeHTML(name || email)}</strong></p><p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(212,168,83,0.6);">Email de bienvenida enviado →</p></div></body></html>`;
  return `<!DOCTYPE html><html><body style="${base}"><div style="max-width:380px;width:100%;text-align:center;"><p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.3em;color:rgba(212,168,83,0.5);margin-bottom:20px;">ZRC INNER CIRCLE</p><div style="font-size:36px;margin-bottom:16px;">✗</div><h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:26px;color:#E8E0CC;margin:0 0 12px;">Error</h2><p style="font-size:14px;color:rgba(232,224,204,0.5);line-height:1.6;">${escapeHTML(message || "Error desconocido")}</p></div></body></html>`;
}

function htmlResponse(body) {
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
