-- =============================================================================
-- tools.javetech.online — Supabase schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- =============================================================================


-- ─── 1. User subscriptions table ─────────────────────────────────────────────
-- Stores Paddle subscription state per user.
-- Populated/updated by your Paddle webhook (see supabase-paddle-webhook.js)

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier                   text NOT NULL DEFAULT 'free'
                           CHECK (tier IN ('free', 'pro', 'business')),
  paddle_subscription_id text,
  paddle_plan_id         text,
  status                 text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),
  current_period_end     timestamptz,
  created_at             timestamptz DEFAULT now() NOT NULL,
  updated_at             timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscriptions_updated
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS: users can only read their own row; only service role can write
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by your Paddle webhook) bypasses RLS automatically.


-- ─── 2. Tool usage table ──────────────────────────────────────────────────────
-- One row per (user, tool, date). Count increments on each use.

CREATE TABLE IF NOT EXISTS public.tool_usage (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id    text NOT NULL,                -- e.g. 'compress-pdf', 'merge-pdf'
  date       date NOT NULL DEFAULT CURRENT_DATE,
  count      integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, tool_id, date)
);

-- RLS: users can only read/write their own usage rows
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.tool_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.tool_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.tool_usage FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── 3. increment_tool_usage RPC function ────────────────────────────────────
-- Called from the React component via supabase.rpc('increment_tool_usage', {...})
-- Upserts the usage row and increments count atomically.

CREATE OR REPLACE FUNCTION public.increment_tool_usage(
  p_user_id uuid,
  p_tool_id text,
  p_date    date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as postgres, bypasses RLS for the upsert
AS $$
BEGIN
  INSERT INTO public.tool_usage (user_id, tool_id, date, count)
  VALUES (p_user_id, p_tool_id, p_date, 1)
  ON CONFLICT (user_id, tool_id, date)
  DO UPDATE SET count = tool_usage.count + 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_tool_usage TO authenticated;


-- ─── 4. Indexes for performance ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tool_usage_user_date
  ON public.tool_usage (user_id, tool_id, date);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON public.user_subscriptions (user_id);


-- ─── 5. Auto-create a free subscription row on signup ─────────────────────────
-- When a new user signs up, automatically create a 'free' tier row.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- =============================================================================
-- Done! Verify by running:
--   SELECT * FROM public.user_subscriptions LIMIT 5;
--   SELECT * FROM public.tool_usage LIMIT 5;
-- =============================================================================
