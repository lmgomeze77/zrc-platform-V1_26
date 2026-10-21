# GeoRisk P0.4 — audit of transmission and asset sensitivities

## Audit result
The existing scenario-to-variable `impactByRegion` coefficients are bounded, dimensionless *analyst assumptions*. Each region-specific macro baseline is dated or explicitly illustrated per P0.3, but multiplying a dimensionless impact by an arbitrary volatility factor of five **does not** create a statistically calibrated level forecast. Do not use this for VaR, capital requirements, expected total return or automatic trades.

The asset matrices previously duplicated in the Dashboard and GeoRisk ML have been centralized into a versioned data contract (`src/data/georiskSensitivityAudit.js`). Existing coefficient arithmetic and the sovereign-bond overlay are preserved for backward compatibility, but outputs are classified as **illustrative heuristic points, not percentage returns**. A contributor disclosure now displays the exact impact × coefficient components. Missing required inputs return an unavailable state rather than an invented zero.

## Main exposure caveats
- FX signs depend on quotation convention: EUR/USD, DXY and USD/CNY must never share a direction interpretation automatically.
- The EU ten-year market reference must not be silently confused with the German Bund.
- A variable labelled `capital_flows` is currently qualitative and must not be treated as a currency or comparable IED volume.
- The legacy coefficient matrix can reverse sign relative to an economic intuition depending on its factor mix; such outputs are **not reliable portfolio recommendations**.
- Even a correctly observed macro start level does not validate its shock coefficient or sector multiplier.

## What this release deliberately does not claim
No new estimation or calibration, no significance tests, no causal identification, no out-of-sample success, no predictive return distribution, no conclusion that asset sensitivity differences are priced by the market.

## Next criteria for quantitative upgrades
1. Define a documented economic unit and horizon for every dependent variable and each shock factor.
2. Create a training dataset with point-in-time scenario events and macro/asset observations; no revised future information.
3. Estimate exposures with robust shrinkage, asset and region interactions, lag structure and asymmetric shock controls.
4. Hold out unexposed periods, benchmark against null and simple financial models; measure error and stability.
5. Only replace illustrative coefficients if out-of-sample evidence, explainability and signed methodology review pass.
