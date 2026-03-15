-- ── Prediction Quota Table ─────────────────────────────────────────────────
-- Server-side prediction usage tracking. One row per user per day per source.
-- The worker reserves quota atomically via reserve_prediction_quota RPC.

-- Drop old schema if migrating from v1 (single-source-per-day)
DROP FUNCTION IF EXISTS increment_prediction_quota(uuid, date, text);
DROP INDEX IF EXISTS idx_pquota_user_date;

CREATE TABLE IF NOT EXISTS prediction_quota (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date_bucket date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'manual_predict',
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per user + day + source
CREATE UNIQUE INDEX IF NOT EXISTS idx_pquota_user_date_source
  ON prediction_quota(user_id, date_bucket, source);

-- For monthly aggregation queries
CREATE INDEX IF NOT EXISTS idx_pquota_user_month
  ON prediction_quota(user_id, date_bucket);

-- ── Atomic reserve RPC ────────────────────────────────────────────────────
-- Checks daily and monthly totals against limits, then increments if allowed.
-- Returns JSON: { "allowed": true/false, "daily": N, "monthly": N }
-- Uses pg_advisory_xact_lock to serialize all concurrent calls for the same
-- user within the transaction, even when no rows exist yet (first call of day).

CREATE OR REPLACE FUNCTION reserve_prediction_quota(
  p_user_id uuid,
  p_date date,
  p_source text,
  p_daily_limit integer,
  p_monthly_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily integer;
  v_monthly integer;
  v_month text;
  v_lock_key bigint;
BEGIN
  -- Advisory lock keyed on user ID — serializes concurrent requests for the
  -- same user even when no quota rows exist yet. Released at transaction end.
  v_lock_key := ('x' || left(replace(p_user_id::text, '-', ''), 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Current daily total (all sources)
  SELECT COALESCE(SUM(count), 0) INTO v_daily
    FROM prediction_quota
    WHERE user_id = p_user_id AND date_bucket = p_date;

  -- Current monthly total (all sources, same month)
  v_month := to_char(p_date, 'YYYY-MM');
  SELECT COALESCE(SUM(count), 0) INTO v_monthly
    FROM prediction_quota
    WHERE user_id = p_user_id
      AND to_char(date_bucket, 'YYYY-MM') = v_month;

  -- Check limits
  IF v_daily >= p_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'daily', v_daily, 'monthly', v_monthly, 'reason', 'daily_limit');
  END IF;

  IF v_monthly >= p_monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'daily', v_daily, 'monthly', v_monthly, 'reason', 'monthly_limit');
  END IF;

  -- Reserve: atomic upsert for this user + day + source
  INSERT INTO prediction_quota (user_id, date_bucket, source, count, updated_at)
  VALUES (p_user_id, p_date, p_source, 1, now())
  ON CONFLICT (user_id, date_bucket, source)
  DO UPDATE SET
    count = prediction_quota.count + 1,
    updated_at = now();

  RETURN jsonb_build_object('allowed', true, 'daily', v_daily + 1, 'monthly', v_monthly + 1, 'reason', null);
END;
$$;

-- ── RLS (allow service role only) ─────────────────────────────────────────
ALTER TABLE prediction_quota ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists, then create
DROP POLICY IF EXISTS "service_role_all" ON prediction_quota;
CREATE POLICY "service_role_all" ON prediction_quota
  FOR ALL
  USING (auth.role() = 'service_role');
