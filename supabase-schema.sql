-- ============================================================
-- ZRC PLATFORM — Supabase Schema
-- Run this in Supabase SQL Editor to set up everything needed
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT
-- ============================================================

-- ── 1. SUBSCRIPTIONS TABLE (Stripe-linked tiers + free trial) ─
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email                  text        NOT NULL UNIQUE,
  tier                   text        NOT NULL DEFAULT 'free',    -- 'free' | 'intelligence' | 'institutional'
  status                 text        NOT NULL DEFAULT 'active',  -- 'active' | 'trialing' | 'inactive' | 'past_due' | 'cancelled'
  trial_end              timestamptz,                            -- set when status = 'trialing'; 7-day free trial on registration
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS automatically — no policy needed for the Worker.

-- Add trial_end to an existing table (safe if already present):
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_end timestamptz;

-- To grant free access to a founding member (no Stripe payment required):
-- INSERT INTO subscriptions (email, tier, status)
-- VALUES ('member@example.com', 'intelligence', 'active')
-- ON CONFLICT (email) DO UPDATE
--   SET tier = excluded.tier, status = excluded.status, updated_at = now();

-- NOTE ON THE FREE TRIAL / LEGACY USERS:
-- Only accounts that go through the registration flow AFTER this schema
-- change get a row here with status='trialing'. Accounts with NO row at
-- all (everyone who registered before this change) are treated by the
-- Worker as legacy/grandfathered — they keep the old always-free access
-- to Observatory and Real Estate Visor, unaffected by trial expiry.


-- ── 2. INNER CIRCLE MEMBERS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS inner_circle_members (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email              text        NOT NULL UNIQUE,
  name               text,
  organization       text,
  profile_category   text,
  reason             text,
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','rejected')),
  notes              text,
  welcome_email_sent boolean     NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  approved_at        timestamptz,
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inner_circle_email  ON inner_circle_members(email);
CREATE INDEX IF NOT EXISTS idx_inner_circle_status ON inner_circle_members(status);

ALTER TABLE inner_circle_members ENABLE ROW LEVEL SECURITY;
-- Service role (Worker) bypasses RLS automatically.
-- All reads/writes go through the Cloudflare Worker using the service_role key.
-- No anon policies needed.

-- Add new columns to existing tables (safe if already present):
ALTER TABLE inner_circle_members
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();


-- ── 3. SEED YOUR ACCOUNT AS APPROVED ────────────────────────
INSERT INTO inner_circle_members (email, name, status, approved_at, welcome_email_sent)
VALUES ('luis@zenithrisecapital.com', 'Luis Miguel Gómez', 'approved', now(), true)
ON CONFLICT (email) DO UPDATE
  SET status = 'approved', approved_at = now(), welcome_email_sent = true;


-- ── 4. GEORISK INDEX — WEEKLY SNAPSHOTS ─────────────────────
-- Public-facing weekly print of the ZRC GeoRisk composite score.
-- Written by the Worker's Monday cron (or the manual snapshot endpoint);
-- read by the public GeoRisk Index page (no login required).
CREATE TABLE IF NOT EXISTS georisk_index_weekly (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start        date        NOT NULL UNIQUE,   -- Monday (ISO week) the print belongs to
  index_value       numeric(5,2) NOT NULL,          -- composite risk score, 0-100
  dominant_scenario text,
  risk_label        text,       -- BAJO | MODERADO | ELEVADO | CRÍTICO
  source            text        NOT NULL DEFAULT 'zrc_weekly_cron', -- 'zrc_weekly_cron' | 'manual_snapshot'
  notes             text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_georisk_index_week ON georisk_index_weekly(week_start);

ALTER TABLE georisk_index_weekly ENABLE ROW LEVEL SECURITY;
-- Service role (Worker) bypasses RLS automatically for both the cron writer
-- and the public read endpoint (/api/georisk-index) — no anon policy needed,
-- since the frontend never talks to Supabase directly.


-- ============================================================
-- USEFUL QUERIES FOR DAILY MANAGEMENT
-- ============================================================

-- VIEW PENDING APPLICATIONS
-- SELECT created_at::date, name, email, profile_category, organization, reason
-- FROM inner_circle_members
-- WHERE status = 'pending'
-- ORDER BY created_at DESC;

-- APPROVE A MEMBER via one-click link (recommended):
--   Click the APPROVE button in the email you receive from ZRC Inner Circle.
--   This calls the Worker endpoint which approves + sends the welcome email.

-- APPROVE A MEMBER manually via SQL (Edge Function webhook sends welcome email):
-- UPDATE inner_circle_members
-- SET status = 'approved', approved_at = now()
-- WHERE email = 'applicant@email.com';

-- REJECT A MEMBER
-- UPDATE inner_circle_members
-- SET status = 'rejected'
-- WHERE email = 'applicant@email.com';

-- VIEW ALL MEMBERS BY STATUS
-- SELECT status, count(*) FROM inner_circle_members GROUP BY status;

-- VIEW GEORISK INDEX HISTORY
-- SELECT week_start, index_value, risk_label, dominant_scenario, source
-- FROM georisk_index_weekly ORDER BY week_start;

-- MANUALLY BACKFILL/CORRECT A WEEKLY PRINT (e.g. editorial override)
-- INSERT INTO georisk_index_weekly (week_start, index_value, dominant_scenario, risk_label, source, notes)
-- VALUES ('2026-07-06', 72.9, 'Escalada Arancelaria', 'ELEVADO', 'manual_snapshot', 'Seed inicial')
-- ON CONFLICT (week_start) DO UPDATE
--   SET index_value = excluded.index_value, dominant_scenario = excluded.dominant_scenario,
--       risk_label = excluded.risk_label, source = excluded.source, notes = excluded.notes;


-- ============================================================
-- EDGE FUNCTION SETUP (backup path — fires on manual SQL approval)
-- ============================================================
-- The primary approval path is the one-click APPROVE link in the admin email
-- (Worker endpoint). The Edge Function is a backup for manual SQL approvals.
--
-- 1. Deploy the function:
--    supabase functions deploy inner-circle-notifications
--
-- 2. Set secrets in Supabase Dashboard → Edge Functions → Secrets:
--    RESEND_API_KEY   = re_xxxxxxxxxxxx
--    ADMIN_EMAIL      = luis@zenithrisecapital.com
--
-- 3. Create ONE Database Webhook in Supabase Dashboard:
--    Dashboard → Database → Webhooks → Create webhook
--
--    WEBHOOK — Approvals only:
--      Name:   inner-circle-approval
--      Table:  inner_circle_members
--      Events: UPDATE (only)
--      URL:    https://<project-ref>.supabase.co/functions/v1/inner-circle-notifications
--      Header: Authorization: Bearer <service_role_key>
--
--    NOTE: Only the UPDATE webhook is needed.
--          Admin notification emails are sent by the Worker on apply.
--          The Edge Function only sends the welcome email on manual SQL approval
--          (when welcome_email_sent is false — prevents double-send with Worker).
-- ============================================================
