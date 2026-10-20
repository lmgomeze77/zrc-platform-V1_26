# GeoRisk P0.2 — Factor taxonomy and scenario crosswalk

## Release scope

A single **qualitative** risk-factor vocabulary covers the GeoRisk Dashboard / GeoRisk ML scenario explorer and the independently published ZRC-GRI. Version: `zrc-risk-taxonomy-2026-10-v1`.

| Factor | Economic transmission | Typical monitoring |
| --- | --- | --- |
| Conflict and energy security | Energy prices, routes, insurance, industrial costs | Brent, WTI, Red Sea/Hormuz shipping |
| Trade and restrictions | Tariffs, exports, intermediate imports, demand | Announced and enacted trade measures |
| Sovereign and financing | Sovereign spreads, credit supply, funding terms | Bund/UST yields, spreads |
| Political and social stability | Governance, migration pressures, policy stability | WGI, election/policy reports |
| Diplomacy and de-escalation | Agreements, removal of restrictions, recovery | Effective treaties and sanctions changes |

## Important constraints

1. This mapping **does not change** either system's four scenario keys, probabilities, risk severities or impact coefficients.
2. The mapping is **many-to-many and thematic**, not an econometric equivalence. For example, Russo-Ukrainian attrition overlaps with security-energy and sovereign-financing channels, but cannot be converted to the dashboard's MENA or EU-fragmentation weights.
3. A high index reading cannot be numerically converted to a simulation probability; historical GRI prints remain valid under their original methodology and published scenario set.
4. The GRI's live Supabase input keys can differ from the versioned fallback; unknown keys must remain *unmapped*, not be automatically inferred from a label.
5. A static, qualitative taxonomy does not address interactions or coincident events. Future methodology needs a multi-factor risk engine and a versioned crosswalk approved by research governance.
6. The dashboard exposes the relationship transparently and retains reference scores. There is **no new predictive-calibration claim**.

## Next release gates

- Ensure current production GRI input keys are auditable against this taxonomy, with dated provenance.
- Design a new versioned and orthogonal *factor* index, without retroactively rewriting ZRC-GRI v1/v2 history.
- Validate multi-event exposure sensitivity rather than treating scenario weights as probabilities of mutually exclusive events.
- Link the factor readings and point-in-time publication timestamps to ML backtests and corporate exposure analysis.
