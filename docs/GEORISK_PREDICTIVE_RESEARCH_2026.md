# ZRC GeoRisk ML 2.0 — risk-conditioned research protocol (October 2026)

## What the code does today
- The existing 30/90-day benchmark is preserved. The new `risk_research` response field is independent and explicitly experimental.
- The published weekly ZRC-GRI is supplied from `georisk_index_weekly` in Supabase; `fallback_static` observations are excluded.
- Index prints become usable conservatively **7 days after `week_start`**, avoiding using a Monday-dated weekly score that may only have been computed later. Only prints from the preceding 28 days qualify.
- For existing ECB FX price series, calculate log returns over non-overlapping 30- and 90-day outcomes and regress subsequent return on **index level and weekly change** (centered ridge regression). This is a *testable hypothesis*, not evidence that geopolitics drives the return.
- Hold out the last 35% of independent outcome windows; select no hyperparameters on that sample. Minimum 16 training and 12 validation outcomes and at least 5% lower MAE than zero return are mandatory. Otherwise return no risk-conditioned point forecast.
- FX series in the existing feed: EUR/USD, EUR/GBP, EUR/CNY, USD/CNY, EUR/MXN, EUR/BRL, EUR/TRY, EUR/ILS and EUR/ZAR. Only comparisons with actual data and sufficient ZRC-GRI history become available.
- Validation never backfills unavailable observations with guessed values.

## Critical shortcomings before claiming reliable predictive ability
1. **Historical coverage:** the ZRC weekly series began recently. The 30/90-day validation gates may remain unfilled for many months/years. Do not loosen the gates to generate impressive-looking numbers.
2. **Publication timestamp:** `week_start` is the Monday of the week, *not* proof of when the input became known; the 7-day delay is conservative but not a substitute for storing `calculated_at`, `published_at` and input revision/version snapshots.
3. **Endogeneity:** ZRC-GRI could itself incorporate market returns or news responding to prices. Use lagged inputs, controls and ablation tests. Predictive association is not causal impact.
4. **Model comparison:** baseline must include persistence, trend, and eventually a parsimonious autoregression; 5% MAE is only a preliminary promotion threshold, not statistical significance. Evaluate directional accuracy, RMSE, MASE, interval coverage and Diebold–Mariano with sufficient samples.
5. **Repeated tuning bias:** version and freeze specifications before touching unseen periods. A single static split is not a fully nested walk-forward procedure; move to repeated expanding-window re-fitting at each origin. Until then present only as research.
6. **Intervals:** do not borrow errors or bands from the original benchmark to portray the risk-conditioned model. Calibrate risk-specific intervals on separate validation residuals.
7. **Risk inputs:** explicitly version geopolitical scenario weights, effective dates and evidence sources. Reject `fallback_static` and invalid non-point-in-time revisions.
8. **Region consistency:** global ZRC-GRI should interact with regional vulnerability/exposure, not imply that identical risk movements have the same sign everywhere.

## Indicator expansion roadmap (no invented observations)
| Series | Source candidate | Cadence | Status |
| --- | --- | --- | --- |
| Brent / WTI | EIA / FRED sourced series with permission and archived snapshots | Daily | Not connected |
| Natural gas TTF | ICE/ECB/market licensed provider, verify publication rights | Daily | Not connected |
| Gold | LBMA or licensed market provider | Daily | Not connected |
| VIX | Cboe licensed historical data | Daily | Not connected |
| EUR sovereign spreads, US 10Y | ECB / US Treasury / FRED | Daily | Partially connected (ECB euro area 10Y, not spreads) |
| US/EU investment-grade & high-yield OAS | ICE BofA via FRED with licensing check | Daily | Not connected |
| Global/country geopolitical risk | Caldara–Iacoviello GPR snapshot with publication dates | Monthly | Existing GeoRisk context, not model feature |
| Governance | World Bank WGI | Annual | Country profile context only |
| Freight cost | Freightos / Drewry / Baltic relevant indexes, permission required | Weekly | Not connected |

## Next implementation phase
- Establish an independent `market_indicator_catalog`, archival ingestion into D1/Supabase (value, unit, timestamp, original release timestamp, revision, source URL and permissions).
- Add lead-lag impulse-response analysis and regional exposure interactions; test risk-level, risk-velocity and surprise as separate features.
- Use expanding-window evaluation, pre-registered benchmarks and explicit no-signal states.
- Only release models with stable out-of-sample incremental skill and comprehensible explanatory cards.
