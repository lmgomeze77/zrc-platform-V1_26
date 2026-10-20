# ZRC-GRI 2.0 — Governance and data-quality release

## Scope of this release
- Preserve the original *probability × intrinsic scenario risk* formula and four official scenarios. This release changes **diagnostics, input validation and eligibility to publish**, not proprietary scoring weights.
- Enforce a unique key and a label per scenario, normalized probabilities (sum = 1 ± 0.0001), finite risks within 0–100, and valid non-future input effective date.
- Flag input vintage older than 21 days. A stale or fallback/static input **must not overwrite** the weekly Supabase print. This may intentionally create a missing week rather than invent a legitimate refreshed reading.
- Publish the score's current four risk contributions, a verified weekly movement (only when previous print is at most 14 days old) and verification counts. A score's change is not a statistically calibrated surprise.
- Exclude `source=fallback_static` and unknown-provenance snapshots from displayed verified time series, without deleting historical data. The old data remains for audit/reconciliation.
- The UI labels current components as current only; no inference of individual components for historical weeks.

## Data-contract limitations
1. `georisk_index_weekly.week_start` is **not** the calculation/publication timestamp. Add immutable `calculated_at`, `published_at`, `input_version` and original input observations to a new versioned snapshot table before training point-in-time models.
2. `georisk_index_inputs.effective_date` is not a verified observation publication date. The 21-day threshold is an operational freshness guard, not proof that the evidence is reliable.
3. `evidence_driven` denotes the existing inputs table was available and passed validation. It does not imply the geopolitical scenario probabilities are objectively calibrated.
4. Future proposals: factor/region risk decomposition, exposure-weighted sector sensitivity, scenario transition matrix, historical surprise (only with frozen ex-ante model expectations), out-of-sample risk-to-asset impulse response tests.
5. As of this release **do not** rename 0–100 points as a probability of a geopolitical event or of asset losses.

## Analytical QA gates
- Weighted score unchanged for the same approved inputs.
- No default static value is written as a fresh weekly measurement.
- Freshness and excluded records appear explicitly in the public index UI.
- Annual comparisons and acceleration require enough clean consecutive observations, otherwise show unavailable.
- Tests remain part of GeoRisk CI.

## Release policy
Promote only if the automated workflow, backend API and browser presentation pass; verify no stale input turns into an optimistic current reading.
