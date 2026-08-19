-- src/worker/schema.sql
-- ZRC D1 schema · zrc-leads database

-- Tabla principal de leads del Visor
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  sector TEXT NOT NULL,
  source TEXT NOT NULL,
  rc TEXT,
  parcela_json TEXT,
  country TEXT,
  user_agent TEXT,
  referer TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Tabla de búsquedas (analytics — qué RCs se consultan más)
-- Útil para detectar zonas calientes y para el matching inverso
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rc TEXT NOT NULL,
  municipio TEXT,
  provincia TEXT,
  uso TEXT,
  superficie REAL,
  lat REAL,
  lng REAL,
  email TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_searches_rc ON searches(rc);
CREATE INDEX IF NOT EXISTS idx_searches_provincia ON searches(provincia);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at);

-- ============================================================
-- MIGRATION — GeoRisk Index weekly email digest (Fase 1 del plan de
-- monetización). CREATE TABLE IF NOT EXISTS no añade columnas a una tabla
-- que ya existe en producción, así que esto necesita correrse aparte:
--   npx wrangler d1 execute zrc-leads --remote --command \
--     "ALTER TABLE leads ADD COLUMN digest_last_sent_week TEXT;"
-- Idempotente por semana ISO: sendWeeklyDigestEmails() en index.js solo
-- envía a un lead si esta columna no coincide con la semana actual.
-- ============================================================
ALTER TABLE leads ADD COLUMN digest_last_sent_week TEXT;
