# GeoRisk P0.3: observed macro starting levels

This phase replaces ONLY matched and fresh illustrative baseline levels in the GeoRisk Dashboard and GeoRisk ML scenario sensitivity tables. It does **not** recalibrate the impact coefficients, generate asset predictions, or alter the publicly published ZRC-GRI.

## Source mapping
- Euro area policy: `ECB_DEPOSIT_RATE` → EU `interest_rates` (ECB)
- Euro area HICP annual inflation: `EU_HICP` → EU `inflation_cpi` (Eurostat)
- Euro area ten-year reference curve: `ECB_10Y_YIELD` is **not mapped** to the Bund 10Y baseline, because they are different instruments.
- EUR/USD: `EURUSD` → EU `fx` (ECB)
- US consumer inflation: `US_CPI` → US `inflation_cpi` (BLS data via FRED)
- USD/CNY: `USDCNY` → China `fx` (ECB cross-rate derivation; validate semantics before stronger claims)

Never treat EUR/USD as DXY, Treasury US10Y as Bund, or global Brent as S&P GSCI. Other simulated levels remain labeled **fixed illustrative assumptions**.

## Eligibility
- Source URL must be HTTPS and provider present.
- Observation must be finite, non-future and at most ten days old for daily or 75 days for monthly indicators.
- An indicator unavailable for forecasting due to inadequate backtesting may still have a useful observed latest value, if fresh. Unavailable *stale* data must never be used.
- When endpoint is missing or network fails, fallback preserves the existing assumptions explicitly marked **illustrative**; avoids fabricated live prices.
- Scenario impact coefficients and sector multipliers are not statistically calibrated. Projections from observed starting levels are still sensitivity exercises only.

## Important follow-up
- Connect a dated official Bund 10Y series before replacing the illustrative Bund baseline.
- Replace ticker and all numerical 'current reference' copy with per-field provenance on remaining sections; P0.3 starts with a shared provenance card for both modules.
- Establish a dedicated observed-data endpoint with publication vintages and cache TTL rather than relying on the forecast API's current source payload.
- Add structured economic exposure inputs and calibrated transmission model (P0.4/P1).
