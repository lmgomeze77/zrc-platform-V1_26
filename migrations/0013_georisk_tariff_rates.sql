-- Only reviewed, source-backed tariff records belong here. No illustrative seeds.
CREATE TABLE IF NOT EXISTS georisk_tariff_rates (
  destination TEXT NOT NULL,
  origin TEXT NOT NULL,
  commodity_code TEXT NOT NULL,
  rate_percent REAL NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 1000),
  treatment TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_until TEXT,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  PRIMARY KEY (destination, origin, commodity_code, treatment, valid_from)
);
