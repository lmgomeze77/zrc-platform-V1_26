# GeoRisk Market Watch — cross-asset comparison v1

Investor-first cards for six assets now combine **three strictly separated** evidence types:

1. *Historical episodes* — existing archived Caldara–Iacoviello GPR groups, using three-month differences to all-period median. They are **not** ZRC-GRI-conditioned outcomes and do not establish causality.
2. *Observed market levels* — independently dated, sourced Brent and US Treasury 10-year observations when available through the GeoRisk forecast endpoint, plus the ECB EUR/USD level. No live equivalents are claimed for gold, S&P 500 or Bund 10-year.
3. *Independent statistical outlook* — 30/90-day EUR/USD level if the existing model publishes valid horizons. This is not an asset return or GRI-conditioned prediction. No fabricated forecasts for other assets.

The visible historical signal is displayed even when the market API is temporarily unavailable. The status is then **historical only**. A separate panel still allows per-asset regime exploration.

**Decision interpretation**: enables finding risks to review and checking whether statistically robust evidence exists. It does not justify trading, imply price targets for a portfolio, or combine heterogeneous evidence in a single probability or risk-adjusted return.

## Next acceptance gates
- Make market snapshot freshness explicit in each card, not merely source date.
- Reconcile spread/FX quotation conventions and units with live sources.
- Add source-vintage archival and ML walk-forward backtesting before promoting experimental index-conditioned signals.
- Browser/device visual QA (especially responsive grid, long labels, updated filters).
