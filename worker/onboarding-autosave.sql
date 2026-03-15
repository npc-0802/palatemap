-- ── Onboarding Autosave Table ────────────────────────────────────────────────
-- Stores in-progress onboarding state keyed by email so users can resume
-- from any device/browser after authenticating with the same email.
--
-- Security model:
--   Write: via save_onboarding_state RPC only (SECURITY DEFINER).
--     First save generates a random write_token, returned to the client.
--     Subsequent saves must present the matching token — prevents clobbering
--     by anyone who doesn't hold the token (stored in originating browser).
--   Read: authenticated users only, where auth.email() matches the row.
--   Delete: authenticated users only, where auth.email() matches the row.

CREATE TABLE IF NOT EXISTS onboarding_autosave (
  email text PRIMARY KEY,
  display_name text,
  state jsonb NOT NULL,
  write_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_autosave ENABLE ROW LEVEL SECURITY;

-- No anon table-level write policies — all writes go through the RPC
DROP POLICY IF EXISTS "anon_insert" ON onboarding_autosave;
DROP POLICY IF EXISTS "anon_update" ON onboarding_autosave;

-- Only authenticated users can read their own email's entry
DROP POLICY IF EXISTS "auth_select_own" ON onboarding_autosave;
CREATE POLICY "auth_select_own" ON onboarding_autosave
  FOR SELECT USING (auth.email() = email);

-- Only authenticated users can delete their own entry
DROP POLICY IF EXISTS "auth_delete_own" ON onboarding_autosave;
CREATE POLICY "auth_delete_own" ON onboarding_autosave
  FOR DELETE USING (auth.email() = email);

-- Service role has full access (for cleanup)
DROP POLICY IF EXISTS "service_role_all" ON onboarding_autosave;
CREATE POLICY "service_role_all" ON onboarding_autosave
  FOR ALL USING (auth.role() = 'service_role');

-- ── Save RPC ────────────────────────────────────────────────────────────────
-- First call (no existing row): creates row with a new random write_token,
--   returns the token so the client can store it for subsequent saves.
-- Subsequent calls: p_write_token must match the stored token, otherwise
--   the update is rejected and the function returns NULL.
-- Returns the write_token on success, NULL on token mismatch.

DROP FUNCTION IF EXISTS save_onboarding_state(text, text, jsonb);

CREATE OR REPLACE FUNCTION save_onboarding_state(
  p_email text,
  p_display_name text,
  p_state jsonb,
  p_write_token text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_existing_token text;
  v_new_token text;
BEGIN
  v_email := lower(trim(p_email));

  -- Check for existing row
  SELECT write_token INTO v_existing_token
    FROM onboarding_autosave
    WHERE email = v_email;

  IF v_existing_token IS NOT NULL THEN
    -- Row exists — require matching token to update
    IF p_write_token IS NULL OR p_write_token <> v_existing_token THEN
      RETURN NULL;  -- token mismatch, reject silently
    END IF;
    UPDATE onboarding_autosave
      SET display_name = p_display_name,
          state = p_state,
          updated_at = now()
      WHERE email = v_email;
    RETURN v_existing_token;
  ELSE
    -- New row — generate token
    v_new_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO onboarding_autosave (email, display_name, state, write_token, updated_at)
      VALUES (v_email, p_display_name, p_state, v_new_token, now());
    RETURN v_new_token;
  END IF;
END;
$$;

-- Cleanup: auto-delete entries older than 14 days (run periodically or via cron)
-- DELETE FROM onboarding_autosave WHERE updated_at < now() - interval '14 days';
