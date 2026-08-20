// src/worker/index.js
// ZRC Backend Worker — /api/lead · /api/stripe-webhook · /api/subscription · /api/claude

const PRICE_TIERS = {
  // Intelligence Monthly (99€/mes)
  "price_1TiH08JXE9tayTtonVosuAze": "intelligence",
  // Intelligence Annual (948€/año)
  "price_1TiFcZJXE9tayTtoUKBizLcK": "intelligence",
  // Institutional Monthly (299€/mes)
  "price_1TUmUxJXE9tayTto9eYJWfrB": "institutional",
  // Institutional Annual (2,868€/año)
  "price_1TUmX4JXE9tayTtomgpKiVHI": "institutional",
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
    ctx.waitUntil((async () => {
      const snap = await computeAndStoreWeeklySnapshot(env, "zrc_weekly_cron");
      await sendWeeklyDigestEmails(env, snap);
    })());
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

    if (url.pathname === "/api/trial/start" && request.method === "POST")
      return handleTrialStart(request, env);


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

    if (url.pathname === "/api/admin/mrr" && request.method === "GET")
      return handleAdminMRR(request, env);

    if (url.pathname === "/api/admin/subscribers" && request.method === "GET")
      return handleAdminSubscribers(request, env);

    if (url.pathname === "/api/track-search" && request.method === "POST")
      return handleTrackSearch(request, env);

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
          status: ["active", "trialing"].includes(sub.status) ? "active" : "inactive",
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
// Response shape: { tier, status, trialEnd }
//   status: "none"     — no subscription row at all (legacy/grandfathered
//                         user, or never registered) — NOT trial-expired,
//                         keeps old always-free access to Observatory/Visor.
//           "trialing"  — within the 7-day free trial window.
//           "expired"   — trial ran out with no payment method added.
//           "active"    — paying subscriber.
//           other       — past_due / cancelled / inactive.
// ============================================================
async function handleSubscriptionCheck(request, env) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email || !isValidEmail(email))
    return jsonResponse({ tier: "free", status: "none", trialEnd: null });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ tier: "free", status: "none", trialEnd: null });

  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=tier,status,trial_end&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!resp.ok) return jsonResponse({ tier: "free", status: "none", trialEnd: null });
    const data = await resp.json();
    const row = data?.[0];

    if (!row)
      return jsonResponse({ tier: "free", status: "none", trialEnd: null });

    if (row.status === "trialing") {
      const trialEndMs = row.trial_end ? new Date(row.trial_end).getTime() : 0;
      if (trialEndMs > Date.now())
        return jsonResponse({ tier: row.tier || "intelligence", status: "trialing", trialEnd: row.trial_end });
      return jsonResponse({ tier: "free", status: "expired", trialEnd: row.trial_end });
    }

    if (row.status === "active")
      return jsonResponse({ tier: row.tier || "free", status: "active", trialEnd: null });

    return jsonResponse({ tier: "free", status: row.status || "inactive", trialEnd: null });
  } catch (err) {
    console.error("Subscription check error:", err);
    return jsonResponse({ tier: "free", status: "none", trialEnd: null });
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
// /api/trial/start  (POST) — creates a 7-day free trial on registration.
// Only inserts if no subscription row exists yet for this email, so
// re-registering with the same email can't reset an already-used trial.
// ============================================================
async function handleTrialStart(request, env) {
  let payload;
  try { payload = await request.json(); } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const email = (payload.email || "").trim().toLowerCase();
  if (!email || !isValidEmail(email))
    return jsonResponse({ error: "Email inválido" }, 400);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return jsonResponse({ error: "Service unavailable" }, 503);

  try {
    const checkResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (checkResp.ok) {
      const existing = await checkResp.json();
      if (existing?.[0]) return jsonResponse({ ok: true, alreadyExists: true });
    }
  } catch { /* proceed to insert */ }

  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const insertResp = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal,resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        email,
        tier: "intelligence",
        status: "trialing",
        trial_end: trialEnd,
      }),
    });
    if (!insertResp.ok && insertResp.status !== 201) {
      const txt = await insertResp.text();
      console.error("Trial start insert error:", insertResp.status, txt);
      return jsonResponse({ error: "No se pudo iniciar el trial" }, 500);
    }
  } catch (err) {
    console.error("Trial start error:", err);
    return jsonResponse({ error: "Error de conexión" }, 500);
  }

  return jsonResponse({ ok: true, trialEnd });
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
// Modelos de Workers AI en orden de preferencia. Cloudflare depreca modelos
// periódicamente (los Llama base murieron el 2026-05-30), así que se intentan
// en cadena hasta que uno responda.
const ASSISTANT_FREE_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/google/gemma-4-26b-a4b-it",
];
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
  let lastError = "";
  if (env.AI) {
    for (const model of ASSISTANT_FREE_MODELS) {
      try {
        const result = await env.AI.run(model, {
          messages: [{ role: "system", content: system }, ...trimmed],
          max_tokens: ASSISTANT_MAX_TOKENS,
        });
        const text = (result?.response || "").trim();
        if (text) return jsonResponse({ text, provider: "workers-ai", model });
      } catch (err) {
        lastError = err.message;
        console.error(`Assistant: Workers AI ${model} failed:`, err.message);
      }
    }
  }

  return jsonResponse({ error: "No AI provider available", detail: lastError.slice(0, 120) }, 503);
}

// ============================================================
// /api/lead — captura genérica de leads. La mayoría de formularios del
// sitio (modal del Visor, contacto, registro) siguen apuntando al backend
// externo en zrc-api.onrender.com; este endpoint del Worker lo usa por
// ahora la captura de email del GeoRisk Index (source="georisk-index"),
// que sí necesita que este pipeline envíe el email de verdad — ver
// sendWeeklyDigestEmails() para el envío semanal real.
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

  const isGeoRiskDigest = sourceClean === "georisk-index";

  if (env.RESEND_API_KEY) {
    try {
      await sendResendEmail(env, {
        from: "ZRC Labs <labs@zenithrisecapital.com>",
        to: env.NOTIFY_EMAIL || "luis@zenithrisecapital.com",
        subject: `🔔 Nuevo lead ${isGeoRiskDigest ? "GeoRisk Index" : "Visor"} — ${sector}`,
        html: notifyEmailHTML({ email, sector, source: sourceClean, rc: rcClean, country }),
      });
      await sendResendEmail(env, {
        from: "Zenith Rise Capital <noreply@zenithrisecapital.com>",
        to: email,
        subject: isGeoRiskDigest ? "Suscrito al ZRC GeoRisk Index semanal" : "Acceso al Visor Inmobiliario · ZRC Labs",
        html: isGeoRiskDigest ? georiskOptInEmailHTML({ email }) : welcomeEmailHTML({ email, sector }),
      });
    } catch (err) {
      console.error("Resend error:", err);
    }
  }

  return jsonResponse({ ok: true });
}

// ============================================================
// /api/track-search  (Fase 1 del plan de monetización: visibilidad de
// volumen de búsquedas — la tabla `searches` existía en el schema desde
// antes pero nunca se escribía en ella, así que hoy no hay ningún dato de
// cuánta gente busca en el Visor gratis, solo de quién deja el email al
// tope de 3 búsquedas. Fire-and-forget desde el cliente: un fallo aquí
// nunca debe bloquear ni ensuciar la experiencia de búsqueda real.)
// ============================================================
async function handleTrackSearch(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false }, 400);
  }

  const { rc, municipio, provincia, uso, superficie, lat, lng, email } = payload || {};
  if (!rc || typeof rc !== "string" || rc.length > 20)
    return jsonResponse({ ok: false }, 400);

  const num = (n) => (typeof n === "number" && Number.isFinite(n) ? n : null);

  try {
    await env.DB.prepare(
      `INSERT INTO searches (rc, municipio, provincia, uso, superficie, lat, lng, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      rc.substring(0, 20),
      (municipio || "").toString().substring(0, 120),
      (provincia || "").toString().substring(0, 120),
      (uso || "").toString().substring(0, 120),
      num(superficie),
      num(lat),
      num(lng),
      email && isValidEmail(email) ? email : null,
      new Date().toISOString()
    ).run();
  } catch (err) {
    // No bloquear ni fallar la búsqueda real por esto — solo loguear.
    console.error("track-search insert error:", err);
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

// Envío real del email semanal a quien se suscribió desde la captura del
// GeoRisk Index (source="georisk-index" en /api/lead) — cierra el círculo
// de la promesa "te lo mandamos cada lunes". El cron corre a diario como
// redundancia del snapshot, así que esto debe ser idempotente por semana:
// solo manda a un lead si digest_last_sent_week no coincide ya con la
// semana actual, y lo actualiza justo después de mandarlo.
async function sendWeeklyDigestEmails(env, snap) {
  if (!snap?.ok || !env.RESEND_API_KEY || !env.DB) return;

  let leads;
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, email FROM leads
       WHERE source = 'georisk-index'
         AND (digest_last_sent_week IS NULL OR digest_last_sent_week != ?)`
    ).bind(snap.weekStart).all();
    leads = results || [];
  } catch (err) {
    // Lo más probable si esto falla es que la migración de
    // digest_last_sent_week (ver schema.sql) todavía no se haya corrido en
    // producción — no debe tumbar el resto del cron por eso.
    console.error("sendWeeklyDigestEmails: leads query failed:", err);
    return;
  }
  if (!leads.length) return;

  const weeklyChange = await computeWeeklyChange(env, snap.weekStart, snap.value);
  const html = weeklyDigestEmailHTML({
    weekStart: snap.weekStart, value: snap.value,
    riskLabel: snap.riskLabel, dominantScenario: snap.dominantScenario, weeklyChange,
  });

  for (const lead of leads) {
    try {
      await sendResendEmail(env, {
        from: "Zenith Rise Capital <noreply@zenithrisecapital.com>",
        to: lead.email,
        subject: `ZRC-GRI semana del ${snap.weekStart}: ${snap.value.toFixed(1)} (${snap.riskLabel})`,
        html,
      });
      await env.DB.prepare(`UPDATE leads SET digest_last_sent_week = ? WHERE id = ?`)
        .bind(snap.weekStart, lead.id).run();
    } catch (err) {
      console.error(`Weekly digest send failed for lead ${lead.id}:`, err);
    }
  }
}

async function computeWeeklyChange(env, currentWeekStart, currentValue) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;
  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/georisk_index_weekly?select=week_start,index_value&week_start=lt.${currentWeekStart}&order=week_start.desc&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows.length ? currentValue - rows[0].index_value : null;
  } catch {
    return null;
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

function georiskOptInEmailHTML({ email }) {
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#F5F3EE;color:#1A1A1A;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;padding:40px;border-top:3px solid #D4A853;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.2em;color:#D4A853;text-transform:uppercase;margin-bottom:16px;">
      ZRC · GEORISK INDEX
    </div>
    <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:28px;margin:0 0 16px;color:#0B1F3F;">
      Suscrito al índice semanal
    </h1>
    <p style="font-size:15px;line-height:1.7;color:#404040;margin:0 0 16px;">
      Cada lunes recibirás el ZRC-GRI de la semana — el score compuesto (0–100),
      el escenario geopolítico dominante y el cambio frente a la semana anterior.
    </p>
    <a href="https://www.zenithrisecapital.com/#georisk-index" style="display:inline-block;padding:12px 28px;background:#0B1F3F;color:#FFFFFF;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">
      Ver el índice ahora
    </a>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E8E5DC;font-size:12px;color:#71717A;line-height:1.6;">
      Zenith Rise Capital · Calesius Global S.L.<br>
      Madrid · zenithrisecapital.com
    </div>
  </div>
</body></html>`;
}

function weeklyDigestEmailHTML({ weekStart, value, riskLabel, dominantScenario, weeklyChange }) {
  const changeArrow = weeklyChange == null ? "" : weeklyChange >= 0 ? "▲" : "▼";
  const changeColor = weeklyChange == null ? "#71717A" : weeklyChange >= 0 ? "#DC2626" : "#16A34A";
  const changeText = weeklyChange == null ? "" : `${changeArrow} ${Math.abs(weeklyChange).toFixed(1)} pts vs. semana anterior`;
  return `<!DOCTYPE html>
<html><body style="font-family:'Helvetica Neue',sans-serif;background:#F5F3EE;color:#1A1A1A;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;padding:40px;border-top:3px solid #D4A853;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.2em;color:#D4A853;text-transform:uppercase;margin-bottom:16px;">
      ZRC-GRI · SEMANA DEL ${escapeHTML(weekStart)}
    </div>
    <div style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:56px;color:#0B1F3F;line-height:1;margin-bottom:6px;">
      ${value.toFixed(1)}
    </div>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;color:#71717A;margin-bottom:8px;">
      ${escapeHTML(riskLabel || "")}
    </div>
    ${changeText ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:${changeColor};margin-bottom:20px;">${changeText}</div>` : ""}
    ${dominantScenario ? `<p style="font-size:14px;line-height:1.6;color:#404040;margin:0 0 24px;"><strong>Escenario dominante:</strong> ${escapeHTML(dominantScenario)}</p>` : ""}
    <a href="https://www.zenithrisecapital.com/#georisk-index" style="display:inline-block;padding:12px 28px;background:#0B1F3F;color:#FFFFFF;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">
      Ver el histórico completo
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
// /api/admin/mrr?token=  — panel interno OKR/KPI de crecimiento. Sin esto,
// cualquier decisión de crecimiento se toma a ciegas. Reutiliza
// INNER_CIRCLE_ADMIN_TOKEN como secreto de admin en vez de crear uno nuevo
// — mismo patrón que /api/inner-circle/approve.
// ============================================================
// Objetivo (OKR): €100.000/mes de MRR. Los Key Results son los 4 streams de
// ingreso recurrente que realmente se están persiguiendo hoy — el quinto
// stream del plan original (datos licenciados a terceros vía GeoRisk
// Index/Macro Pulse) se aparcó, así que no tiene KR aquí. Precio mensual de
// lista por tier, usado solo para estimar MRR — la tabla subscriptions no
// guarda price_id/intervalo de facturación por fila (ver
// supabase-schema.sql), así que un suscriptor anual de Early Bird se cuenta
// a su equivalente mensual (950/12): aproximación, no el MRR exacto de
// Stripe. Mantener sincronizado con PricingPage.jsx / STRIPE_LINKS.
const OBJECTIVE_TARGET_MRR = 100000;
const TIER_MONTHLY_PRICE = {
  intelligence: 99,
  institutional: 299,
  visor_standard: 89,
  visor_earlybird: 950 / 12,
  free: 0,
};
const TIER_LABELS = {
  intelligence: "Intelligence",
  institutional: "Institutional",
  visor_standard: "Visor Standard",
  visor_earlybird: "Visor Early Bird",
  free: "Free",
};
// KR targets del blend ilustrativo del plan de crecimiento (~1,150 cuentas
// de pago, la mayoría en Intelligence como motor de volumen).
const KR_TARGETS = {
  intelligence: 49500,   // 500 × €99
  institutional: 17940,  // 60 × €299
  visor_standard: 13350, // 150 × €89
  visor_earlybird: 3167, // 40 × (950/12)
};

async function handleAdminMRR(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const adminToken = env.INNER_CIRCLE_ADMIN_TOKEN;
  if (!adminToken || token !== adminToken)
    return new Response("Unauthorized", { status: 403 });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return new Response("Service unavailable", { status: 503 });

  let rows = [];
  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?select=tier,status,created_at,updated_at&order=created_at.desc&limit=5000`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (resp.ok) rows = await resp.json();
  } catch (err) {
    console.error("Admin MRR fetch error:", err);
  }

  const [searches, leads] = await Promise.all([summarizeSearches(env), summarizeLeads(env)]);

  return htmlResponse(adminDashboardHTML(summarizeSubscriptions(rows), searches, leads, token));
}

// ============================================================
// /api/admin/subscribers?token=  — lista individual de suscriptores. El
// dashboard OKR/KPI solo agrega por tier; esto es para buscar/verificar a
// una persona concreta sin tener que entrar a Supabase directamente. Mismo
// secreto de admin, misma tabla que handleAdminMRR, pero seleccionando
// email también (la vista agregada lo omite a propósito).
// ============================================================
async function handleAdminSubscribers(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const adminToken = env.INNER_CIRCLE_ADMIN_TOKEN;
  if (!adminToken || token !== adminToken)
    return new Response("Unauthorized", { status: 403 });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY)
    return new Response("Service unavailable", { status: 503 });

  let rows = [];
  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?select=email,tier,status,created_at,updated_at&order=created_at.desc&limit=500`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    );
    if (resp.ok) rows = await resp.json();
  } catch (err) {
    console.error("Admin subscribers fetch error:", err);
  }

  return htmlResponse(adminSubscribersHTML(rows, token));
}

function adminSubscribersHTML(rows, token) {
  const bg = "#06080C", surface = "#111318", border = "#23262E", gold = "#D4A853", text = "#E8E0CC", muted = "rgba(232,224,204,0.5)";
  const green = "#4ADE80", red = "#F0665E", amber = "#F5A623";
  const statusColor = { active: green, cancelled: red, past_due: amber, inactive: muted };

  const dateFmt = (d) => { try { return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }); } catch { return d || "—"; } };

  const rowsHTML = rows.length
    ? rows.map((r) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid ${border};color:${text};">${escapeHTML(r.email || "—")}</td>
        <td style="padding:11px 16px;border-bottom:1px solid ${border};color:${muted};font-family:'IBM Plex Mono',monospace;">${escapeHTML(TIER_LABELS[r.tier] || r.tier || "—")}</td>
        <td style="padding:11px 16px;border-bottom:1px solid ${border};">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${statusColor[r.status] || muted};">${escapeHTML(r.status || "—")}</span>
        </td>
        <td style="padding:11px 16px;border-bottom:1px solid ${border};color:${muted};font-family:'IBM Plex Mono',monospace;font-size:11px;text-align:right;">${dateFmt(r.created_at)}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" style="padding:20px 16px;color:${muted};font-style:italic;">No subscribers yet.</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ZRC · Subscribers</title></head>
  <body style="margin:0;background:${bg};color:${text};font-family:'Helvetica Neue',sans-serif;min-height:100vh;padding:48px 24px;box-sizing:border-box;">
    <div style="max-width:820px;margin:0 auto;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.3em;color:rgba(212,168,83,0.6);margin-bottom:8px;">ZRC · INTERNAL</p>
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:28px;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:38px;color:${text};margin:0;">Subscribers <span style="font-family:'IBM Plex Mono',monospace;font-size:14px;color:${muted};">(${rows.length})</span></h1>
        <a href="/api/admin/mrr?token=${encodeURIComponent(token)}" style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.08em;color:${gold};text-decoration:none;">← Growth dashboard</a>
      </div>

      <table style="width:100%;border-collapse:collapse;background:${surface};">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 16px;border-bottom:1px solid ${border};font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;">Email</th>
            <th style="text-align:left;padding:10px 16px;border-bottom:1px solid ${border};font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;">Tier</th>
            <th style="text-align:left;padding:10px 16px;border-bottom:1px solid ${border};font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;">Status</th>
            <th style="text-align:right;padding:10px 16px;border-bottom:1px solid ${border};font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;">Since</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>

      <p style="font-size:11px;color:rgba(232,224,204,0.35);line-height:1.6;margin-top:20px;font-style:italic;">
        Shows up to the 500 most recent subscription records, most recent first — includes free-tier and cancelled rows, not just active paid ones. This is the raw Supabase "subscriptions" table; it won't include Visor Teaser/Informe one-time buyers or Inner Circle members, who live in separate tables.
      </p>
    </div>
  </body></html>`;
}

// Volumen de búsquedas gratuitas del Visor — el escalón de más arriba del
// embudo (búsquedas → leads del gate de 3 → subs). No falla nunca: si D1 no
// responde o la tabla aún no existe en producción, degrada a ceros en vez
// de tirar abajo el resto del panel.
async function summarizeSearches(env) {
  const empty = { last7d: 0, prev7d: 0, last30d: 0, topProvincias: [] };
  if (!env.DB) return empty;
  try {
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
    const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const [c7, cPrev7, c30, top] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM searches WHERE created_at >= ?`).bind(since7).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM searches WHERE created_at >= ? AND created_at < ?`).bind(since14, since7).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM searches WHERE created_at >= ?`).bind(since30).first(),
      env.DB.prepare(
        `SELECT provincia, COUNT(*) AS n FROM searches WHERE created_at >= ? AND provincia != ''
         GROUP BY provincia ORDER BY n DESC LIMIT 5`
      ).bind(since30).all(),
    ]);

    return {
      last7d: c7?.n || 0,
      prev7d: cPrev7?.n || 0,
      last30d: c30?.n || 0,
      topProvincias: (top?.results || []).map((r) => ({ provincia: r.provincia, count: r.n })),
    };
  } catch (err) {
    console.error("Admin searches summary error:", err);
    return empty;
  }
}

// Opt-ins al digest semanal del GeoRisk Index — el único lead magnet cuyo
// origen es 100% visible aquí (el modal de leads del Visor y los
// formularios de contacto/registro van al backend externo en
// zrc-api.onrender.com y no son consultables desde este Worker).
async function summarizeLeads(env) {
  const empty = { georiskOptins: 0, georiskOptinsLast30d: 0 };
  if (!env.DB) return empty;
  try {
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const [total, last30] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM leads WHERE source = 'georisk-index'`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM leads WHERE source = 'georisk-index' AND created_at >= ?`).bind(since30).first(),
    ]);
    return { georiskOptins: total?.n || 0, georiskOptinsLast30d: last30?.n || 0 };
  } catch (err) {
    console.error("Admin leads summary error:", err);
    return empty;
  }
}

function summarizeSubscriptions(rows) {
  const now = new Date();
  const thisMonthKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthKey = `${lastMonthDate.getUTCFullYear()}-${lastMonthDate.getUTCMonth()}`;
  const monthKey = (d) => { const dt = new Date(d); return `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`; };

  const byTier = {};
  const newThisMonthByTier = {};
  const cancelledThisMonthByTier = {};
  let newThisMonth = 0, newLastMonth = 0, cancelledThisMonth = 0;

  for (const r of rows) {
    if (r.status === "active") {
      byTier[r.tier] = (byTier[r.tier] || 0) + 1;
      // "New this/last month" tracks paid signups only — a free-tier row
      // going active isn't a conversion worth counting here.
      if (r.tier !== "free") {
        const k = monthKey(r.created_at);
        if (k === thisMonthKey) {
          newThisMonth++;
          newThisMonthByTier[r.tier] = (newThisMonthByTier[r.tier] || 0) + 1;
        } else if (k === lastMonthKey) {
          newLastMonth++;
        }
      }
    }
    if (r.status === "cancelled" && r.updated_at && monthKey(r.updated_at) === thisMonthKey) {
      cancelledThisMonth++;
      cancelledThisMonthByTier[r.tier] = (cancelledThisMonthByTier[r.tier] || 0) + 1;
    }
  }

  const tiers = Object.keys(TIER_MONTHLY_PRICE)
    .filter((t) => t !== "free")
    .map((tier) => {
      const count = byTier[tier] || 0;
      const price = TIER_MONTHLY_PRICE[tier];
      const mrr = count * price;
      // Proxy para "activos hace un mes": el conteo de hoy, menos las altas
      // de este mes (aún no existían) más las bajas de este mes (seguían
      // activos entonces). No reconstruye antigüedad más allá de un mes,
      // pero da una tendencia MoM sin necesitar guardar un histórico de MRR.
      const countLastMonth = Math.max(0, count - (newThisMonthByTier[tier] || 0) + (cancelledThisMonthByTier[tier] || 0));
      return {
        tier, label: TIER_LABELS[tier] || tier, count, mrr,
        target: KR_TARGETS[tier] || 0,
        mrrLastMonth: countLastMonth * price,
        newThisMonth: newThisMonthByTier[tier] || 0,
        cancelledThisMonth: cancelledThisMonthByTier[tier] || 0,
      };
    });

  const totalMrr = tiers.reduce((sum, t) => sum + t.mrr, 0);
  const totalMrrLastMonth = tiers.reduce((sum, t) => sum + t.mrrLastMonth, 0);
  const totalActive = tiers.reduce((sum, t) => sum + t.count, 0);

  return { tiers, totalMrr, totalMrrLastMonth, totalActive, newThisMonth, newLastMonth, cancelledThisMonth };
}

function adminDashboardHTML(subs, searches, leads, token) {
  const { tiers, totalMrr, totalMrrLastMonth, totalActive, newThisMonth, newLastMonth, cancelledThisMonth } = subs;
  const bg = "#06080C", surface = "#111318", border = "#23262E", gold = "#D4A853", text = "#E8E0CC", muted = "rgba(232,224,204,0.5)";
  const green = "#4ADE80", red = "#F0665E";

  const fmt = (n) => `€${Math.round(n).toLocaleString("en-US")}`;
  const pct = (n) => `${Math.round(n)}%`;
  const clampPct = (n) => Math.max(0, Math.min(100, n));
  const deltaFmt = (delta, unit = "") => {
    if (delta === 0) return `<span style="color:${muted};">±0${unit}</span>`;
    const color = delta > 0 ? green : red;
    const sign = delta > 0 ? "+" : "";
    return `<span style="color:${color};">${sign}${typeof delta === "number" && unit === "€" ? Math.round(delta).toLocaleString("en-US") : delta}${unit}</span>`;
  };
  const bar = (pctVal, color = gold) => `
    <div style="height:6px;background:${border};border-radius:3px;overflow:hidden;margin-top:12px;">
      <div style="height:100%;width:${clampPct(pctVal)}%;background:${color};"></div>
    </div>`;

  // ── Objective ──
  const objPct = OBJECTIVE_TARGET_MRR > 0 ? (totalMrr / OBJECTIVE_TARGET_MRR) * 100 : 0;
  const mrrDelta = totalMrr - totalMrrLastMonth;
  const mrrDeltaPct = totalMrrLastMonth > 0 ? (mrrDelta / totalMrrLastMonth) * 100 : (totalMrr > 0 ? 100 : 0);

  const objectiveHTML = `
    <div style="border:1px solid ${border};border-top:3px solid ${gold};background:${surface};padding:32px;margin-bottom:36px;">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.14em;color:${gold};text-transform:uppercase;margin-bottom:6px;">Objective</div>
      <div style="font-family:'Outfit',sans-serif;font-size:14px;color:${text};margin-bottom:20px;">Reach €100,000/month in recurring revenue</div>
      <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:56px;color:${gold};line-height:1;">${fmt(totalMrr)}</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:${muted};">of ${fmt(OBJECTIVE_TARGET_MRR)} target · ${pct(objPct)}</div>
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;margin-top:8px;">
        ${deltaFmt(mrrDelta, "€")} MoM &nbsp;(${deltaFmt(Math.round(mrrDeltaPct), "%")})
      </div>
      ${bar(objPct)}
    </div>`;

  // ── Key Results (one per revenue stream being pursued) ──
  const krCardsHTML = tiers.map((t) => {
    const krPct = t.target > 0 ? (t.mrr / t.target) * 100 : 0;
    const delta = t.mrr - t.mrrLastMonth;
    return `
    <div style="background:${surface};padding:22px;">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;margin-bottom:8px;">${escapeHTML(t.label)}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:${text};">${fmt(t.mrr)}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:${muted};margin-top:2px;">of ${fmt(t.target)} target · ${pct(krPct)}</div>
      ${bar(krPct)}
      <div style="display:flex;justify-content:space-between;margin-top:14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:${muted};">
        <span>${t.count} active</span>
        <span>${deltaFmt(delta, "€")} MoM</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:${muted};">
        <span>+${t.newThisMonth} new</span>
        <span>-${t.cancelledThisMonth} cancelled</span>
      </div>
    </div>`;
  }).join("");

  // ── KPIs (leading indicators — no revenue target, just trend) ──
  const searchDelta = searches.last7d - searches.prev7d;
  const netNewSubsDelta = newThisMonth - newLastMonth;

  const topProvinciasHTML = searches.topProvincias.length
    ? searches.topProvincias.map((p) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid ${border};color:${text};">${escapeHTML(p.provincia)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid ${border};color:${muted};font-family:'IBM Plex Mono',monospace;text-align:right;">${p.count}</td>
      </tr>`).join("")
    : `<tr><td colspan="2" style="padding:14px 16px;color:${muted};font-style:italic;">No searches tracked yet.</td></tr>`;

  const kpiCard = (label, value, deltaHTML) => `
    <div style="background:${surface};padding:20px;">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;margin-bottom:8px;">${label}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:30px;color:${text};">${value}</div>
      ${deltaHTML ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:11px;margin-top:4px;">${deltaHTML}</div>` : ""}
    </div>`;

  const kpiHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1px;background:${border};margin-bottom:24px;">
      ${kpiCard("Searches, last 7d", searches.last7d, `${deltaFmt(searchDelta)} vs prior 7d`)}
      ${kpiCard("Searches, last 30d", searches.last30d)}
      ${kpiCard("GeoRisk digest opt-ins", leads.georiskOptins, `+${leads.georiskOptinsLast30d} in last 30d`)}
      ${kpiCard("New paid subs this month", newThisMonth, `${deltaFmt(netNewSubsDelta)} vs last month`)}
      ${kpiCard("Cancelled this month", cancelledThisMonth)}
      ${kpiCard("Active paid subs", totalActive)}
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ZRC · Growth Dashboard</title></head>
  <body style="margin:0;background:${bg};color:${text};font-family:'Helvetica Neue',sans-serif;min-height:100vh;padding:48px 24px;box-sizing:border-box;">
    <div style="max-width:820px;margin:0 auto;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.3em;color:rgba(212,168,83,0.6);margin-bottom:8px;">ZRC · INTERNAL</p>
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:32px;">
        <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:38px;color:${text};margin:0;">Growth dashboard</h1>
        <a href="/api/admin/subscribers?token=${encodeURIComponent(token)}" style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.08em;color:${gold};text-decoration:none;">Subscribers →</a>
      </div>

      ${objectiveHTML}

      <h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:24px;color:${text};margin:0 0 6px;">Key results</h2>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:${muted};letter-spacing:0.05em;margin:0 0 16px;">
        The four revenue streams currently being pursued toward the objective above.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:${border};margin-bottom:36px;">
        ${krCardsHTML}
      </div>

      <h2 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:24px;color:${text};margin:0 0 6px;">KPIs — leading indicators</h2>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:${muted};letter-spacing:0.05em;margin:0 0 16px;">
        Top-of-funnel signals — these predict the key results above, they aren't revenue themselves.
      </p>
      ${kpiHTML}

      <table style="width:100%;border-collapse:collapse;background:${surface};margin-bottom:24px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 16px;border-bottom:1px solid ${border};font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;">Top provinces, last 30d</th>
            <th style="text-align:right;padding:10px 16px;border-bottom:1px solid ${border};font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;">Searches</th>
          </tr>
        </thead>
        <tbody>${topProvinciasHTML}</tbody>
      </table>

      <div style="padding:16px 18px;border:1px dashed ${border};margin-top:8px;">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.1em;color:${muted};text-transform:uppercase;margin-bottom:8px;">Known blind spots</div>
        <p style="font-size:11px;color:rgba(232,224,204,0.5);line-height:1.7;margin:0;">
          Estimated MRR uses each tier's list price — annual subscribers (Visor Early Bird) are counted at their monthly-equivalent value, since billing interval isn't stored per-row today; MoM deltas are a proxy reconstructed from this month's joins/cancellations, not a stored historical snapshot. Treat both as directional and cross-check against Stripe for exact figures.
          Visor Teaser/Informe one-time PDF purchases aren't tracked here at all — check Stripe directly for that revenue.
          The Visor's own lead-capture modal and the site's contact/register forms post to an external backend (zrc-api.onrender.com) this dashboard can't see — only the GeoRisk Index digest opt-in is visible here.
        </p>
      </div>
    </div>
  </body></html>`;
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
