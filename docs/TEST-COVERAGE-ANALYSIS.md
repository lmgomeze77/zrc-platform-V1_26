# Test Coverage Analysis — ZRC Platform

_Analysis date: 2026-08-03 · Scope: full repository at `main`_

## 1. Current state: there is no test coverage

This is not "low coverage" — it is **zero**. Concretely:

| Signal | Finding |
| --- | --- |
| Test files | None. No `*.test.*`, `*.spec.*`, `__tests__/`, or `e2e/` anywhere in the repo. |
| Test runner | None. `package.json` has no `test` script and no test dependency (no Vitest, Jest, Playwright, `@cloudflare/vitest-pool-workers`). |
| Linting / type checking | None. No ESLint, no Prettier, no TypeScript (the one `.ts` file is a Deno Supabase Edge Function). |
| CI gates | `.github/workflows/deploy.yml` runs `npm ci && npm run build && wrangler deploy` on every push to `main`. **The only gate before production is whether Vite can bundle the code.** |

The practical consequence: a change that breaks Stripe entitlement mapping, the
Inner Circle login path, or the residual-value model still compiles, still
bundles, and still auto-deploys to production. There is no mechanism in the
repo today that would catch it.

Roughly 13,600 lines of JS/JSX are shipped with no automated verification, of
which ~1,256 lines (`src/worker/index.js`) handle payments, authentication, and
customer data.

## 2. Why this matters here specifically

Three properties of this codebase make the absence of tests unusually
expensive:

1. **The worker is the payment and auth boundary.** Stripe webhooks, tier
   entitlement, trial windows, Inner Circle credentials, and D1 lead storage
   all live in one 1,256-line module of plain functions. This is the highest
   consequence code in the repo and the easiest to test — it is almost entirely
   pure logic plus `fetch`.
2. **Business logic is duplicated across modules.** The paywall rules exist in
   two independent implementations (see §3.1). Duplication without tests is how
   silent divergence becomes a production entitlement bug.
3. **Deploy is fully automatic.** Push to `main` → live. There is no staging
   step and no human gate, so the test suite _is_ the gate — and it does not
   exist.

## 3. Latent defects that tests would already be catching

These are not hypotheticals. Each was found by reading the code during this
analysis, and each is directly expressible as a unit test.

### 3.1 The paywall logic is forked, and the two forks disagree

`useSubscription` and the access rule are implemented **twice**:

- `src/hooks/useSubscription.js:3` — imported and used by
  `src/pages/labs/RealEstateVisor.jsx:11`.
- `src/App.jsx:461` — a second, inline copy used by `App.jsx` itself and passed
  down to `Observatory`.

They are not equivalent. The `App.jsx` copy normalises the email before
querying:

```js
const normalised = email.trim().toLowerCase();   // App.jsx:469
fetch(`${API_BASE}/api/subscription?email=${encodeURIComponent(normalised)}`)
```

The `hooks/` copy does not:

```js
fetch(`/api/subscription?email=${encodeURIComponent(email)}`)   // useSubscription.js:12
```

The worker looks the row up with PostgREST `email=eq.<value>`, which is
case-sensitive. **A subscriber who registered as `Luis@Example.com` is
correctly tiered everywhere in `App.jsx` but reads as `free` inside the Real
Estate Visor.** A paying customer silently loses access to the feature they
paid for.

Two further divergences in the same pair: the `hooks/` copy omits
`setLoading(false)` on the no-email early return (`useSubscription.js:10`),
leaving `loading` stuck true; and it calls a relative `/api/...` path while
`App.jsx` uses an absolute `API_BASE`.

The access rule is likewise duplicated — `canAccessTool` in
`useSubscription.js:31` and `canAccess` in `App.jsx:1162` — currently
identical, with nothing to keep them that way.

### 3.2 Unknown Stripe price IDs silently upgrade the customer

```js
function getTierFromPrice(priceId) {
  return PRICE_TIERS[priceId] || "intelligence";   // worker/index.js:514
}
```

The fallback for an unrecognised price is a **paid** tier, not `free`. Combined
with `fetchSessionPriceId` (`worker/index.js:521`), which returns `""` whenever
`STRIPE_SECRET_KEY` is unset or the Stripe call fails, this means: if that
secret is missing or Stripe has a bad minute, **every** completed checkout —
including a €89 `visor_standard` purchase — is provisioned as `intelligence`.
Note also that four of the six entries in `PRICE_TIERS` are still placeholders
(`price_intelligence_monthly`, etc., `worker/index.js:6-19`), so real
Intelligence and Institutional purchases are landing on that fallback path
today. An Institutional customer is currently being provisioned as
`intelligence`.

### 3.3 Stripe signature verification mishandles secret rotation

```js
const parts = sig.split(",").reduce((acc, part) => {
  const [k, v] = part.split("=");
  if (k === "t") acc.timestamp = v;
  if (k === "v1") acc.signature = v;   // worker/index.js:543 — last one wins
  return acc;
}, {});
```

During a webhook signing-secret rotation Stripe sends a `v1` signature for
_each_ active secret. This reducer keeps only the last, so valid webhooks are
rejected mid-rotation — payments stop provisioning, and because
`handleStripeWebhook` returns 200 on downstream failures by design
(`worker/index.js:174`), the failure is quiet. Verified:

```
"t=123,v1=aaa,v1=bbb"  →  { timestamp: "123", signature: "bbb" }
```

Secondary: the comparison at `worker/index.js:561` is a plain `!==` on hex
strings rather than a constant-time compare, and the replay-window check runs
_after_ it.

### 3.4 Inner Circle: an approval whose password write fails becomes an auth bypass

`handleInnerCircleLogin` grants access when no password hash is stored:

```js
if (!member.password_hash)
  return jsonResponse({ status: "approved" });   // worker/index.js:926 — any password works
```

`handleInnerCircleApprove` sets that hash via the `ic_set_password` RPC — and
**ignores the result entirely** (`worker/index.js:1120-1132`: no `resp.ok`
check, errors only logged). If the RPC fails, the member is `approved` with a
null hash, and from then on anyone who knows their email address logs in with
any password at all.

Independently, `ProtectedInnerCircle.jsx:16` gates access on
`/api/inner-circle/check?email=` alone — an unauthenticated GET that reports
approval status for any address. Setting `zrc-ic-email` in localStorage to a
known member's address is sufficient to enter; no password is involved. On
network error it falls back to the cached `zrc-inner-circle-access` flag
(`ProtectedInnerCircle.jsx:29`), which is itself client-writable.

### 3.5 Unmetered LLM proxy

`/api/claude` (`worker/index.js:334`) forwards the caller's JSON body verbatim
to the Anthropic Messages API using the server's key, with no authentication,
no rate limit, and no cap on `model` or `max_tokens`. `/api/assistant` right
below it does cap both (`ASSISTANT_MAX_TOKENS`, 6-message trim,
`worker/index.js:394`); `/api/claude` does not. Every endpoint also serves
`Access-Control-Allow-Origin: *` (`worker/index.js:759`). Tests won't fix the
design, but there is currently nothing asserting that the caps which _do_ exist
stay in place.

## 4. Where to add tests, in priority order

### Tier 1 — Worker API (highest consequence, lowest effort)

`src/worker/index.js`. Pure functions plus `fetch`, no DOM, no framework. A
single afternoon covers the security-critical surface.

Pure helpers — trivial, no mocking:
- `getTierFromPrice` — every configured price maps correctly; **unknown and
  empty input must not yield a paid tier** (§3.2).
- `verifyStripeSignature` — valid signature; tampered body; missing header;
  malformed header; expired timestamp; **multiple `v1` values (§3.3)**.
- `isValidEmail`, `escapeHTML` — the latter guards injection into the admin and
  welcome emails, which interpolate user-supplied `name`/`reason`.
- `isoWeekMonday` — Sunday rollover (the `|| 7` branch,
  `worker/index.js:647`), month and year boundaries, DST-adjacent dates.
- `computeGeoRiskIndexValue` — weighted sum, dominant-scenario pick, and the
  three `BAJO/MODERADO/ELEVADO/CRÍTICO` thresholds including exact boundary
  values (40, 65, 80).
- `generatePassword` — length, charset, absence of ambiguous characters.

Handlers — with `fetch` and `env` stubbed:
- `handleSubscriptionCheck` — the full status matrix documented at
  `worker/index.js:182-190`: `none` / `trialing` / `expired` / `active` /
  `past_due`. Trial expiry is a timestamp comparison against `Date.now()`
  (`worker/index.js:220`) and deserves explicit just-before / just-after cases.
- `handleStripeWebhook` — one test per event type; unsigned and mis-signed
  requests rejected with 400; the deliberate return-200-on-handler-error
  contract (`worker/index.js:174`) asserted so it is not "fixed" by accident.
- `handleTrialStart` — a second registration with the same email must not reset
  a consumed trial (`worker/index.js:294`).
- `handleInnerCircleLogin` — non-approved member denied; wrong password denied;
  Supabase's `[true]`/`true` scalar-wrapping both handled
  (`worker/index.js:944`); **and the null-hash branch pinned as an explicit,
  deliberate decision (§3.4)**.
- `handleInnerCircleApprove` / `handleGeoRiskIndexSnapshot` — missing token,
  wrong token, and correct token against `INNER_CIRCLE_ADMIN_TOKEN`.
- Router — unknown `/api/*` → 404; `OPTIONS` → CORS preflight; non-API paths
  fall through to `env.ASSETS`.

Suggested tooling: **Vitest + `@cloudflare/vitest-pool-workers`**, which runs
the handlers in `workerd` with real `crypto.subtle` (needed for the HMAC path)
and real D1/AI binding fakes. Plain Vitest with a stubbed `env` also works and
is a smaller step; the worker pool is worth it for the D1 `/api/lead` path.

### Tier 2 — Financial and scoring models (pure, and wrong answers are invisible)

These are deterministic functions whose output is a number a client acts on. A
regression produces a plausible-looking wrong figure, not a crash — exactly the
failure mode tests exist for.

- `calcResidual` (`RealEstateVisor.jsx:1141`) — residual land value, IRR, and
  the `investabilityScore` band edges (25 / 45 / 70) and their `tier` mapping.
  Guard the degenerate inputs: `superficie === 0` divides by zero at
  `valorResidualPorM2`; a negative residual feeds `Math.max(...,0)` into the IRR
  denominator.
- `computeModel` (`FinancialIntelligenceSystem.jsx:78`) — the 13-week cash-flow
  engine. Highest-value target in this tier: AR/AP lag conversion, opening
  balance drain-down, the `firesThisWeek` day-of-month → week-of-month mapping
  (`FinancialIntelligenceSystem.jsx:98-102`), `runwayWeeks` when
  `avgWeeklyOut === 0` (returns the sentinel `99`), `dpo` when `annualCOGS` is
  zero (`Infinity`/`NaN`), and each of the five risk rules at its threshold.
- `computeSovereignBondRiskImpact`, `estimatePriceImpact`, `buildForecast`
  (`GeoRiskML.jsx:121-247`) — golden-value tests over the scenario weights, plus
  the `clamp` boundaries.
- `priceByProvince` / `normalizeProv` (`RealEstateVisor.jsx:1102-1130`) — the
  accent-stripping and alias table (`CORUÑA A` → `A Coruña`, `BALEARS ILLES` →
  `Illes Balears`, …), and the silent `|| 2000` default, which is a
  wrong-valuation vector for any province name that fails to normalise.

These need no framework at all — extract them into importable modules (several
already are exported) and assert numbers.

### Tier 3 — Access control and hooks

- **First: delete one of the two `useSubscription` implementations** (§3.1),
  then test the survivor once. Testing both forks entrenches the duplication.
- `canAccessTool` (`useSubscription.js:31`) — the full grid of
  `{tier} × {status} × {requiredTier}`, with the two documented subtleties
  pinned: `expired` locks even `requiredTier: null` tools, and `none` (legacy
  accounts) does not. That comment is load-bearing product policy with nothing
  enforcing it.
- `ProtectedInnerCircle` (`ProtectedInnerCircle.jsx`) — approved, non-approved,
  no stored email, and the deliberate offline-cache fallback.

React Testing Library + Vitest, with `fetch` and `localStorage` stubbed.

### Tier 4 — Node scripts and one smoke path

- `extractJSON` (`scripts/update-market.js:18`) — this is the fragile heart of
  the market ticker: it strips fences, brace-matches, and has two fallback
  paths. Table-test it against fenced JSON, prose-wrapped JSON, truncated
  output, nested braces, and empty input. It parses untrusted LLM output and it
  writes a file that is committed to `main` by a cron workflow.
- `scripts/generate-headlines.js` — same treatment for its parse/validate step.
- One Playwright smoke test — load the SPA, confirm the tool grid renders and a
  gated tool shows the upgrade prompt for a free user. Chromium is already
  available in CI images; this catches the class of breakage a bundler cannot.

### Tier 5 — CI gate

Add a `test` job to `deploy.yml` that must pass before `wrangler deploy`.
Without this the suite is documentation, not a gate. Worth pairing with ESLint
— several findings above (unused `hooks/useSubscription.js` export surface,
ignored promise results) are lint-visible.

## 5. Suggested sequencing

| Step | Work | Payoff |
| --- | --- | --- |
| 1 | Add Vitest + a `test` script; one test file for the worker's pure helpers | Infrastructure exists; §3.2 and §3.3 become visible |
| 2 | De-duplicate `useSubscription`; test the survivor | Closes the live §3.1 entitlement bug |
| 3 | Handler tests for subscription, webhook, trial, Inner Circle auth | Covers the payment/auth boundary |
| 4 | `calcResidual` + `computeModel` golden-value tests | Protects the numbers customers act on |
| 5 | Wire `npm test` into `deploy.yml` before `wrangler deploy` | Makes all of the above a real gate |
| 6 | `extractJSON` table tests; Playwright smoke test | Covers the cron pipeline and the render path |

Steps 1–3 address every issue in §3 and are, in my estimate, a day of work.

## 6. Note on the findings in §3

§3.1 through §3.4 are defects in production code, not test gaps — a test suite
would surface them but does not fix them. §3.1 (wrong tier inside the Visor for
mixed-case emails) and §3.2 (unknown price → paid tier, currently affecting all
Intelligence and Institutional purchases via the placeholder price IDs) are
worth addressing on their own timeline, independently of any testing work.
