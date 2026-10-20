# GeoRisk P0 — Single Scenario Contract, Phase 1

The GeoRisk Dashboard and GeoRisk ML previously duplicated the same four scenario definitions in separate components, allowing them to drift. Both now import `src/data/georiskScenarioContract.js`.

## Guarantees

1. The reference model's four analyst scenarios and their weights, severity assumptions and exposure matrices remain numerically unchanged. Regression tests preserve the reference score of 75.46/100 (global multiplier 1.0).
2. Scenario contract validates common field coverage and finite bounded transmission coefficients across the euro area, US and China region groups.
3. Both interfaces state explicitly that weights, severity and transmission coefficients are **analyst assumptions, not observed frequencies or statistically calibrated market responses**.
4. The macro baselines inside the two simulators remain **fixed illustrative values**; independent observed ECB, Eurostat, BLS and other panels are separate and dated. No output should describe the illustrative baselines as live.
5. The **public** ZRC-GRI remains a separate, versioned four-scenario index with different risk drivers. It must not be silently replaced by the scenario explorer model: doing so would corrupt the time series and the ML factor history.

## Next P0 migration gates

- Approve a single *taxonomy* of geopolitical factors and map current drivers and their alternatives explicitly. Note simultaneous, correlated events and separate their weights from event probabilities.
- Store a versioned crosswalk and backtest any changed index before introducing a new official methodology (GRI v3). Preserve historical prints and versions.
- Reconcile dynamically observed macro reference levels with scenarios by unique series ID, units, observation date and expiry.
- Calibrate scenario-to-variable impacts independently, displaying which numbers remain judgmental.
- Ensure decision recommendations incorporate the actual exposure/horizon and show evidence versus assumption.

This stage is a low-risk structural correction; it is **not** a claim of predictive calibration or of a unified official index.
