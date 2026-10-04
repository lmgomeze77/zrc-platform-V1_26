-- Durable, timestamped source observations for model calibration and thesis work.
CREATE TABLE IF NOT EXISTS georisk_market_observations (
  provider TEXT NOT NULL, series_id TEXT NOT NULL, observation_date TEXT NOT NULL,
  value REAL NOT NULL, unit TEXT NOT NULL, source_url TEXT NOT NULL,
  is_derived INTEGER NOT NULL DEFAULT 0 CHECK (is_derived IN (0, 1)),
  first_collected_at TEXT NOT NULL, last_revised_at TEXT,
  PRIMARY KEY (provider, series_id, observation_date)
);
CREATE INDEX IF NOT EXISTS idx_georisk_market_observations_date
  ON georisk_market_observations (series_id, observation_date);
CREATE TABLE IF NOT EXISTS georisk_market_revisions (
  revision_id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL,
  series_id TEXT NOT NULL, observation_date TEXT NOT NULL,
  previous_value REAL NOT NULL, revised_value REAL NOT NULL,
  detected_at TEXT NOT NULL, source_url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_georisk_market_revisions_series_date
  ON georisk_market_revisions (series_id, observation_date, detected_at);
CREATE TABLE IF NOT EXISTS georisk_market_collection_runs (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL,
  started_at TEXT NOT NULL, completed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  new_observations INTEGER NOT NULL DEFAULT 0,
  revisions_detected INTEGER NOT NULL DEFAULT 0, detail_json TEXT, error_message TEXT
);
