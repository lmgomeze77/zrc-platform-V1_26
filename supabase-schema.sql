-- ============================================================
-- ZRC PLATFORM — Supabase Schema
-- Run this in Supabase SQL Editor to set up everything needed
-- ============================================================

-- ── 1. INNER CIRCLE MEMBERS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS inner_circle_members (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email            text        NOT NULL UNIQUE,
  name             text,
  organization     text,
  profile_category text,
  reason           text,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),
  notes            text,
  created_at       timestamptz DEFAULT now(),
  approved_at      timestamptz
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_inner_circle_email ON inner_circle_members(email);

-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE inner_circle_members ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to check their own status (for the access gate)
CREATE POLICY IF NOT EXISTS "anon can check own status"
  ON inner_circle_members FOR SELECT TO anon
  USING (true);

-- Allow anonymous users to submit membership applications
CREATE POLICY IF NOT EXISTS "anon can apply"
  ON inner_circle_members FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- ── 3. ADD COLUMNS (safe to run multiple times) ──────────────
ALTER TABLE inner_circle_members
  ADD COLUMN IF NOT EXISTS profile_category text,
  ADD COLUMN IF NOT EXISTS organization      text,
  ADD COLUMN IF NOT EXISTS reason            text;

-- ── 4. SEED YOUR ACCOUNT AS APPROVED ────────────────────────
INSERT INTO inner_circle_members (email, name, status, approved_at)
VALUES ('luis@zenithrisecapital.com', 'Luis Miguel Gómez', 'approved', now())
ON CONFLICT (email) DO UPDATE
  SET status = 'approved', approved_at = now();

-- ============================================================
-- USEFUL QUERIES FOR DAILY MANAGEMENT
-- ============================================================

-- VIEW PENDING APPLICATIONS
-- SELECT created_at::date, name, email, profile_category, organization, reason
-- FROM inner_circle_members
-- WHERE status = 'pending'
-- ORDER BY created_at DESC;

-- APPROVE A MEMBER (triggers webhook → sends approval email)
-- UPDATE inner_circle_members
-- SET status = 'approved', approved_at = now()
-- WHERE email = 'applicant@email.com';

-- REJECT A MEMBER
-- UPDATE inner_circle_members
-- SET status = 'rejected'
-- WHERE email = 'applicant@email.com';

-- VIEW ALL MEMBERS BY STATUS
-- SELECT status, count(*) FROM inner_circle_members GROUP BY status;

-- ============================================================
-- EDGE FUNCTION SETUP (run once in Supabase CLI or Dashboard)
-- ============================================================
-- 1. Deploy the function:
--    supabase functions deploy inner-circle-notifications
--
-- 2. Set secrets:
--    supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
--    supabase secrets set ADMIN_EMAIL=luis@zenithrisecapital.com
--
-- 3. Create TWO Database Webhooks in Supabase Dashboard:
--    Dashboard → Database → Webhooks → Create webhook
--
--    WEBHOOK A — New Applications:
--      Name:   inner-circle-new-application
--      Table:  inner_circle_members
--      Events: INSERT
--      URL:    https://<project-ref>.supabase.co/functions/v1/inner-circle-notifications
--      Header: Authorization: Bearer <service_role_key>
--
--    WEBHOOK B — Approvals:
--      Name:   inner-circle-approval
--      Table:  inner_circle_members
--      Events: UPDATE
--      URL:    https://<project-ref>.supabase.co/functions/v1/inner-circle-notifications
--      Header: Authorization: Bearer <service_role_key>
--
-- NOTE: Both webhooks point to the SAME function.
--       The function detects INSERT vs UPDATE automatically.
-- ============================================================
