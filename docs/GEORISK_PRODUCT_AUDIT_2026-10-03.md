# GeoRisk product audit and roadmap

**Review date:** 3 October 2026  
**Scope:** GeoRisk Index, GeoRisk Dashboard, GeoRisk Predictive ML and the GeoRisk World Map, based on the source currently in `main`.  
**Purpose:** make the product easier to use and more adaptable while protecting analytical credibility. This is a code and methodology review; production data connections and the live deployment were not independently verified in this pass.

## Assessment

GeoRisk already has a useful product shape: a public country map, an index, a scenario dashboard and an AI-assisted analysis surface. The main constraint is evidence quality, not a shortage of charts. Several interface labels imply live market data, calibrated probabilities or predictive performance that the current code does not establish. Before expanding the number of indicators, the product needs a clear evidence trail, explicit assumptions and validation against observed outcomes.

## Findings in the current implementation

| Area | What the code currently does | User impact |
|---|---|---|
| Dashboard inputs | `GeoRiskDashboard.jsx` contains fixed regional reference values, source labels, scenario probabilities, transmission vectors and sector multipliers. No market-data fetch is present in this component. | “Live”, “actual” and “continuous recalibration” language can be read as current data or validated probabilities. |
| Historical charts | Dashboard and ML sparkline series were generated with `Math.random()` around the fixed references. | Synthetic shapes looked like observed history and changed between visits. Removed in this branch. |
| Scenario weights | Four default weights sum to 100%, but each slider moves independently. The previous score and impacts used the raw slider values. | A custom scenario mix could have a total other than 100%, distorting scores. Calculations now normalize weights and cap the composite risk at 100. |
| NLP in Dashboard | `analyzeText` counts terms from a small bilingual dictionary. It does not resolve negation, context, entities, source reliability or event timing. | This is a keyword screen, not contextual NLP or an objective measure of geopolitical risk. |
| Predictive ML | `GeoRiskML.jsx` calls Claude with the entered text and current model profile. The source does not provide a historical training set, external evidence retrieval, citations or a calibration process. | The response is an AI-generated synthesis, not a validated statistical forecast. |
| Forecast chart | The original risk path included random drift and an unlabeled confidence band. | Results were non-reproducible and could be mistaken for a probability forecast. Replaced here with a deterministic, explicitly uncalibrated sensitivity band. |
| Scenario NLP side effects | NLP output previously changed scenario weights automatically. | Analyst assumptions could change without a clear review step. NLP suggestions are now kept separate from the manually selected weights. |
| GeoRisk Index | Worker code reads the latest `georisk_index_inputs` row when Supabase configuration and data are available, but falls back to hard-coded scenarios dated `2026-08-20`. The UI already displays the input date and distinguishes `evidence_driven` from `fallback_static`. | Verify that production data and refresh jobs are healthy and that the displayed status matches the Worker response. |
| GeoRisk World Map | `GeoRiskWorldMap.jsx` contains an editorial dataset of about 42 economies. Its source comment explicitly says the figures are not live UN Comtrade/UNGA/IMF series; country scores and economic values are embedded in the component. | Its public explanatory copy should preserve the editorial/illustrative status and show observation dates and provenance before numeric fields are treated as comparable evidence. |\n| Breadth and adaptation | Dashboard contexts are limited to euro area, US and China, five broad sectors, six economic channels and a short list of asset classes. Country, company, supply-chain and portfolio exposures are not user-configurable. | “Adaptable to different environments” requires a reusable exposure layer, not only extra region buttons. |

## Improvements in this branch

- Replaced the Dashboard’s “LIVE” state with “MODELO” and added a visible notice that its embedded reference values are not live market observations.
- Removed randomized sparkline generation and made disconnected historical series explicit.
- Clarified that the Dashboard’s keyword tool is a literal keyword screen.
- Normalized slider weights in both applications before aggregating scenario risk and variable impacts.
- Made the ML sensitivity curve deterministic and labeled its band as illustrative rather than a statistical confidence interval.
- Removed the automatic NLP update to scenario weights; the output is now a suggestion, leaving assumptions under analyst control.
- Replaced unsupported live, calibration and operational claims with language consistent with the code.

## Recommended product roadmap

### P0 — Evidence and trust

1. Create a single data contract for every indicator: source URL/provider, series ID, geography, unit, frequency, observation date, retrieval time, license, transformation, missing-data rule and status.
2. Show freshness and provenance beside every displayed value. Use explicit states: **current**, **delayed**, **stale**, **fallback** and **unavailable**. Never show a fallback as live.
3. Replace embedded macro values with a versioned data service. If no feed is available, hide the “current value” and show the last observation date or “not connected”.
4. Separate **observed fact**, **source interpretation**, **model assumption**, **scenario output** and **analyst judgement** in the UI and export.
5. Version the scenario library, coefficients and model rules. Record who changed them, when, why and which outputs changed.
6. Keep a reproducible run record: inputs, source snapshots, model version, parameters, outputs and timestamp.

**Acceptance:** a reviewer can trace every non-user-entered number to a dated source or see an explicit “illustrative assumption” label; replaying the same inputs produces identical outputs.

### P1 — Scenarios people can actually use

1. Add a guided scenario builder: event, actors/countries, severity, duration, probability range, transmission channels and invalidation conditions.
2. Provide editable **base / adverse / relief** cases, a side-by-side comparison and one-click reset. Normalize probabilities with a visible 100% total.
3. Explain each transmission step from event to variable to asset/company exposure. Make coefficients and units inspectable.
4. Allow the analyst to add a country, sector, company or supply-chain node and define first- and second-order exposures.
5. Save, duplicate, name and export scenario workspaces; include a concise committee-ready decision note with assumptions and sources.

**Acceptance:** two analysts can save and compare distinct cases without overwriting the ZRC baseline; all results show the selected horizon, region, sector and assumptions.

### P2 — Broader contexts and practical workflows

- Move regions, sectors, channels and asset mappings into validated configuration data instead of component constants.
- Start with a clear selection flow: **question → geography → time horizon → sector/exposure → scenario**.
- Support country groups and company exposures, including imported exposure weights, revenue geography, input dependencies, currencies, financing and liquidity channels.
- Add sector-specific transmission maps and let users override them with documented values.
- Provide reusable templates for energy disruption, sanctions, trade restrictions, election/policy shocks, sovereign stress, cyber risk and supply-chain disruption.
- Add filters, definitions, tooltips, keyboard support, mobile layouts and accessible color/contrast rules.

**Acceptance:** the same event can be examined for two geographies and two sectors with explicit, comparable assumptions; no unexplained multiplier is the only reason outputs differ.

### P3 — Forecasting and objectivity

1. Do not use “forecast”, “confidence” or “probability” for AI-generated output unless a defined target, horizon, dataset and evaluation method support the term.
2. If a forecasting model is introduced, store dated predictions and compare them with realized outcomes using appropriate calibration and scoring metrics. Publish sample size and limitations.
3. Show uncertainty ranges only when the range is statistically defined; otherwise call it a scenario or sensitivity range.
4. For AI analysis, return source links and quoted evidence spans, separate extraction from inference, and show model/provider/version and retrieval date.
5. Add a human review step before AI suggestions change a scenario, score or saved assessment.
6. Audit for language, geography and source-coverage bias; allow users to challenge a source or mark an output as disputed.

**Acceptance:** a forecast has a defined outcome and horizon, out-of-sample evaluation, a calibration record and reproducible inputs. An AI summary has evidence links and never presents its self-reported confidence as calibrated probability.

## Suggested screen structure

1. **Decision brief:** one-sentence question, geography, exposure, horizon and current data status.
2. **Evidence:** key facts with date, source and reliability notes.
3. **Scenario comparison:** base / adverse / relief with weights that visibly total 100%.
4. **Transmission:** event → geopolitical channel → macro variable → exposure → impact.
5. **Sensitivity:** show which assumptions move the output most.
6. **Watchlist:** confirmation signals, invalidation triggers, owner and review date.
7. **Export:** reproducible one-page brief with model version, sources and caveats.

## Immediate production checks still required

- Confirm the production `georisk_index_inputs` schema and most recent effective date.
- Confirm the scheduled refresh succeeded and that production reports `evidence_driven`, not `fallback_static`.
- Verify the user-facing index date and status match the Worker response.
- Review scenario and asset coefficients with a documented source or label them as analyst assumptions.
- Add meaningful build and behavior checks before merging this branch; the repository was reviewed through GitHub source APIs and was not built locally in this pass.
