# Historical observations for GeoRisk and the thesis

## Capture now
- Free primary source: European Central Bank daily reference-rate XML.
- The Worker schedule captures this source every day into Cloudflare D1, the database already bound to the Worker.
- The first successful run imports the provider's five-year window. Later runs compare the available window and write only new dates or corrections. Rows already stored remain after the provider's rolling five-year window moves on.
- Each observation is keyed by provider, series and source date and records value, unit, source, first collection time and whether it is derived. USD/CNY is calculated from EUR/CNY and EUR/USD for the same date.
- A corrected source value creates a separate before/after revision entry. Daily attempts record their status, time and counts.
- An attributed endpoint and CSV download provide the accumulating series independently of the provider's own history limit.

## Model and thesis
Observed data do not calibrate a coefficient by themselves. Scenario weights, sector factors and impact coefficients remain assumptions until tested against an outcome series.
For thesis use, define each variable and its release date; align forecasts and outcomes by horizon; preserve corrections; reserve periods from fitting for out-of-sample tests; compare against a simple baseline; and report errors and uncertainty. EUR/USD is not DXY. ECB USD/CNY is a derived cross, not the PBOC fixing.

## Deployment
The additive migration in migrations/0001_georisk_market_history.sql creates observations, revision and collection-run tables. Production applies the migration before deploying the Worker. The existing D1 leads table is left intact.
