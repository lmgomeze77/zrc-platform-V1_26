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
  // Visor Inmobiliario · Standard (89€/mes)
  "price_1TrGJVJXE9tayTtoA0b4UWUB": "visor_standard",
  // Visor Inmobiliario · Early Bird (950€/año)
  "price_1TrGd9JXE9tayTto0fZpTLDy": "visor_earlybird",
};

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (err) {
      return jsonResponse({ error: `Worker error: ${err.message}`, stack: err.stack?.slice(0, 300) }, 500);
    }
  },

  // Cloudflare Cron Trigger — see [triggers] in wrangler.toml (daily 06:00 UTC;
  // idempotent upsert on week_start means this just re-confirms the current
  // week's print, giving redundancy against a missed/failed Monday firing)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(computeAndStoreWeeklySnapshot(env, "zrc_weekly_cron"));
  },
};

async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return corsResponse();

    if (url.pathname === "/api/lead" && request.method === "POST")
      return handleLead(request, env);

    if (url.pathname === "/api/health" && request.method === "GET")
      return jsonResponse({ ok: true, ts: Date.now(), anthropic_key_set: !!env.ANTHROPIC_API_KEY });

    if (url.pathname === "/api/stripe-webhook" && request.method === "POST")
      return handleStripeWebhook(request, env);

    if (url.pathname === "/api/subscription" && request.method === "GET")
      return handleSubscriptionCheck(request, env);

    if (url.pathname === "/api/checkout-session" && request.method === "GET")
      return handleCheckoutSessionCheck(request, env);


    if (url.pathname === "/api/claude" && request.method === "POST")
      return handleClaude(request, env);

    if (url.pathname === "/api/assistant" && request.method === "POST")
      return handleAssistant(request, env);

    if (url.pathname === "/api/inner-circle/check" && request.method === "GET")
      return handleInnerCircleCheck(request, env);

    if (url.pathname === "/api/inner-circle/login" && request.method === "POST")
      return handleInnerCircleLogin(request, env);

    if (url.pathname === "/api/inner-circle/apply" && request.method === "POST")
      return handleInnerCircleApply(request, env);

    if (url.pathname === "/api/inner-circle/approve" && request.method === "GET")
      return handleInnerCircleApprove(request, env);

    if (url.pathname === "/api/georisk-index" && request.method === "GET")
      return handleGeoRiskIndexGet(request, env);

    if (url.pathname === "/api/georisk-index/snapshot" && request.method === "POST")
      return handleGeoRiskIndexSnapshot(request, env);

    if (url.pathname.startsWith("/api/"))
      return jsonResponse({ error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
}

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
        // El evento del webhook NO trae line_items expandido por defecto,
        // así que hay que volver a pedirle la sesión a la API de Stripe con
        // el price ya resuelto — si no, priceId siempre viene vacío y
        // getTierFromPrice() cae siempre en el tier por defecto.
        const priceId = await fetchSessionPriceId(env, session.id);
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
// /api/checkout-session?session_id=  (verifica pagos únicos: teaser/informe)
// ============================================================
// Requiere el secreto STRIPE_SECRET_KEY (Dashboard → Developers → API keys →
// Secret key). Se usa para confirmar server-side que una sesión de un Payment
// Link se pagó de verdad antes de generar el PDF — no basta con confiar en
// que el navegador vuelva con un session_id en la URL.
async function handleCheckoutSessionCheck(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId))
    return jsonResponse({ paid: false, error: "session_id inválido" }, 400);

  if (!env.STRIPE_SECRET_KEY)
    return jsonResponse({ paid: false, error: "Stripe no configurado" }, 500);

  try {
    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    if (!resp.ok) return jsonResponse({ paid: false, error: "Sesión no encontrada" }, 404);
    const session = await resp.json();

    return jsonResponse({
      paid: session.payment_status === "paid",
      clientReferenceId: session.client_reference_id || null,
      customerEmail: session.customer_details?.email || session.customer_email || null,
      amountTotal: session.amount_total,
    });
  } catch (err) {
    console.error("Checkout session check error:", err);
    return jsonResponse({ paid: false, error: "Error al verificar el pago" }, 502);
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

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return jsonResponse({ error: `Fetch failed: ${err.message}` }, 502);
  }

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch {
    return jsonResponse({ error: `Anthropic non-JSON (${resp.status}): ${text.slice(0, 300)}` }, 502);
  }
  return jsonResponse(data, resp.status);
}

// ============================================================
// /api/assistant  (chat del asistente de la web, con cascada de proveedores)
// 1º Claude Haiku (de pago, barato) → 2º Workers AI de Cloudflare (asignación
// diaria gratuita, sin API key). Si ambos fallan, el frontend muestra su
// mensaje estático. Devuelve { text, provider }.
// ============================================================
const ASSISTANT_CLAUDE_MODEL = "claude-haiku-4-5";
const ASSISTANT_FREE_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const ASSISTANT_MAX_TOKENS = 250;

async function handleAssistant(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { system, messages } = body || {};
  if (typeof system !== "string" || !Array.isArray(messages) || messages.length === 0)
    return jsonResponse({ error: "system and messages required" }, 400);

  // Límites duros de consumo, independientes de lo que envíe el cliente.
  const trimmed = messages.slice(-6).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 1000),
  }));

  // 1) Claude Haiku
  if (env.ANTHROPIC_API_KEY) {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ASSISTANT_CLAUDE_MODEL,
          max_tokens: ASSISTANT_MAX_TOKENS,
          system,
          messages: trimmed,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data?.content?.find((b) => b.type === "text")?.text;
        if (text) return jsonResponse({ text, provider: "claude" });
      } else {
        console.error("Assistant: Anthropic error", resp.status, (await resp.text()).slice(0, 200));
      }
    } catch (err) {
      console.error("Assistant: Anthropic fetch failed:", err.message);
    }
  }

  // 2) Workers AI (gratis) — requiere binding [ai] en wrangler.toml
  if (env.AI) {
    try {
      const result = await env.AI.run(ASSISTANT_FREE_MODEL, {
        messages: [{ role: "system", content: system }, ...trimmed],
        max_tokens: ASSISTANT_MAX_TOKENS,
      });
      const text = (result?.response || "").trim();
      if (text) return jsonResponse({ text, provider: "workers-ai" });
    } catch (err) {
      console.error("Assistant: Workers AI failed:", err.message);
    }
  }

  return jsonResponse({ error: "No AI provider available" }, 503);
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

// Los Checkout Sessions no incluyen line_items en el payload del webhook
// salvo que se pidan expandidos, así que hay que volver a consultar la
// sesión a la API de Stripe (requiere STRIPE_SECRET_KEY).
async function fetchSessionPriceId(env, sessionId) {
  if (!env.STRIPE_SECRET_KEY || !sessionId) return "";
  try {
    const resp = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    if (!resp.ok) return "";
    const session = await resp.json();
    return session.line_items?.data?.[0]?.price?.id || "";
  } catch (err) {
    console.error("fetchSessionPriceId error:", err);
    return "";
  }
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
// GEORISK INDEX — /api/georisk-index (GET) · /api/georisk-index/snapshot (POST)
// ============================================================
// Mirrors the default ZRC scenario mix used by GeoRisk Dashboard / GeoRisk ML
// (sector = Global, multiplier x1.00) so the public index tracks the same
// methodology as the paid tools.
// Pesos base actualizados 2026-07-17 dado el riesgo reflejado en el feed del
// Observatorio: EEUU reinstaura bloqueo naval a Irán y amenaza con tomar el
// control del estrecho de Ormuz (escalada MENA severa, desplaza a la
// escalada arancelaria como escenario dominante); la coalición europea
// respalda gasto de defensa/eurobonos ante la escalada Rusia-Ucrania
// (leve alza en fragmentación europea vía prima de riesgo soberano);
// sin señales de desescalada diplomática comparables esta semana.
const GEORISK_INDEX_SCENARIOS = [
  { key: "tariff_escalation", label: "Escalada Arancelaria", prob: 0.34, risk: 78 },
  { key: "mena_instability", label: "Inestabilidad MENA", prob: 0.38, risk: 85 },
  { key: "eu_fragmentation", label: "Fragmentación Europea", prob: 0.20, risk: 72 },
  { key: "detente", label: "Distensión Geopolítica", prob: 0.08, risk: 28 },
];

function computeGeoRiskIndexValue() {
  const value = GEORISK_INDEX_SCENARIOS.reduce((sum, s) => sum + s.prob * s.risk, 0);
  const dominant = GEORISK_INDEX_SCENARIOS.reduce((a, b) => (b.prob > a.prob ? b : a));
  const label = value < 40 ? "BAJO" : value < 65 ? "MODERADO" : value < 80 ? "ELEVADO" : "CRÍTICO";
  return { value: Math.round(value * 100) / 100, dominantScenario: dominant.label, riskLabel: label };
}

// Monday (UTC) of the ISO week containing `date`
function isoWeekMonday(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function computeAndStoreWeeklySnapshot(env, source) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error("GeoRisk Index: Supabase not configured");
    return { ok: false, error: "Service unavailable" };
  }

  const { value, dominantScenario, riskLabel } = computeGeoRiskIndexValue();
  const weekStart = isoWeekMonday(new Date());

  try {
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/georisk_index_weekly`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        week_start: weekStart,
        index_value: value,
        dominant_scenario: dominantScenario,
        risk_label: riskLabel,
        source: source || "manual_snapshot",
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Supabase upsert error: ${resp.status} ${txt}`);
    }
    return { ok: true, weekStart, value, dominantScenario, riskLabel };
  } catch (err) {
    console.error("GeoRisk Index snapshot error:", err);
    return { ok: false, error: err.message };
  }
}

async function handleGeoRiskIndexGet(request, env) {
  const live = computeGeoRiskIndexValue();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ history: [], live });

  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/georisk_index_weekly?select=week_start,index_value,dominant_scenario,risk_label,source&order=week_start.asc`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!resp.ok) return jsonResponse({ history: [], live });
    let history = await resp.json();

    // Self-healing catch-up: the weekly print is normally written by the
    // Cron Trigger (see scheduled() below), but cron firings can be missed
    // or fail silently server-side with no visible alert. Rather than
    // staying stale until someone notices, check on every read whether the
    // current ISO week already has a row — if not, compute + upsert it here
    // so the very next page load repairs the series.
    const currentWeekStart = isoWeekMonday(new Date());
    const hasCurrentWeek = history.some((h) => h.week_start === currentWeekStart);
    if (!hasCurrentWeek) {
      const snap = await computeAndStoreWeeklySnapshot(env, "auto_catchup");
      if (snap.ok) {
        history = [
          ...history.filter((h) => h.week_start !== snap.weekStart),
          {
            week_start: snap.weekStart,
            index_value: snap.value,
            dominant_scenario: snap.dominantScenario,
            risk_label: snap.riskLabel,
            source: "auto_catchup",
          },
        ];
      }
    }

    return jsonResponse({ history, live });
  } catch (err) {
    console.error("GeoRisk Index fetch error:", err);
    return jsonResponse({ history: [], live });
  }
}

// Manual trigger to seed/force this week's print — e.g. right after deploy,
// or to re-run editorially. Gated behind the same admin token as Inner Circle.
async function handleGeoRiskIndexSnapshot(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!env.INNER_CIRCLE_ADMIN_TOKEN || token !== env.INNER_CIRCLE_ADMIN_TOKEN)
    return jsonResponse({ error: "Unauthorized" }, 403);

  const result = await computeAndStoreWeeklySnapshot(env, "manual_snapshot");
  return jsonResponse(result, result.ok ? 200 : 500);
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
  return new Response("", {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, content-type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
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

    // Supabase REST wraps scalar returns in an array: [true] or [false]
    const isValid = valid === true || (Array.isArray(valid) && valid[0] === true);
    return jsonResponse({ status: isValid ? "approved" : "denied" });
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
