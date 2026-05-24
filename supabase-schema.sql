-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run

create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  email                 text unique not null,
  tier                  text not null default 'free',   -- 'free' | 'intelligence' | 'institutional'
  status                text not null default 'active', -- 'active' | 'inactive' | 'past_due' | 'cancelled'
  stripe_customer_id    text,
  stripe_subscription_id text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Index for webhook lookups by Stripe customer
create index if not exists idx_subscriptions_stripe_customer
  on subscriptions(stripe_customer_id);

-- Row-level security: only the service role (your worker) can write.
-- The anon key used by the frontend cannot write or read other users' rows.
alter table subscriptions enable row level security;

-- Service role bypasses RLS automatically — no policy needed for the worker.
-- Optionally: allow users to read their own row if you use Supabase Auth:
-- create policy "users can read own subscription"
--   on subscriptions for select
--   using (auth.jwt() ->> 'email' = email);

-- To manually grant access to a founding member (no payment required):
-- insert into subscriptions (email, tier, status)
-- values ('member@example.com', 'intelligence', 'active')
-- on conflict (email) do update set tier = excluded.tier, status = excluded.status, updated_at = now();
