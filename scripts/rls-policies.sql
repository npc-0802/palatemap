-- ═══════════════════════════════════════════════════════════════
-- Palate Map · Row-Level Security Policies
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Enable RLS on all tables ──────────────────────────────

ALTER TABLE palatemap_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE palatemap_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_log ENABLE ROW LEVEL SECURITY;


-- ── 2. palatemap_users ──────────────────────────────────────
--
-- SELECT: all authenticated users can read (needed for friend search,
--   invite token lookup, friend profile loading). The app filters
--   what it shows in the UI layer.
-- INSERT/UPDATE/DELETE: own row only (matched via auth_id = auth.uid())

CREATE POLICY "Authenticated users can read profiles"
  ON palatemap_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON palatemap_users FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON palatemap_users FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON palatemap_users FOR DELETE
  TO authenticated
  USING (auth_id = auth.uid());


-- ── 3. palatemap_friendships ────────────────────────────────
--
-- All operations require the current user to be a party to the friendship.
-- The join through palatemap_users.auth_id links auth.uid() to the app's
-- internal user id used in requester_id / addressee_id.

CREATE POLICY "Users can view own friendships"
  ON palatemap_friendships FOR SELECT
  TO authenticated
  USING (
    requester_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
    OR addressee_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );

-- INSERT: user must be either the requester (sending request) or the
-- addressee (accepting an invite link creates the row with status='accepted')
CREATE POLICY "Users can create friend requests"
  ON palatemap_friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
    OR addressee_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );

-- UPDATE restricted to addressee (only they can accept a request)
CREATE POLICY "Addressee can accept friend requests"
  ON palatemap_friendships FOR UPDATE
  TO authenticated
  USING (
    addressee_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );

-- DELETE allowed for either party (unfriend, cancel, decline)
CREATE POLICY "Users can delete own friendships"
  ON palatemap_friendships FOR DELETE
  TO authenticated
  USING (
    requester_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
    OR addressee_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );


-- ── 4. prediction_log ───────────────────────────────────────
--
-- Users can only access their own prediction rows.

CREATE POLICY "Users can view own predictions"
  ON prediction_log FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can log own predictions"
  ON prediction_log FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own predictions"
  ON prediction_log FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM palatemap_users WHERE auth_id = auth.uid())
  );


-- ── 5. RPC: Link auth_id for legacy accounts ───────────────
--
-- Legacy accounts may have auth_id = NULL. When a user authenticates
-- and we find their row by email, we need to set auth_id. This is a
-- one-time migration per user. The function verifies the email matches
-- before allowing the link.

CREATE OR REPLACE FUNCTION link_auth_id(target_user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE palatemap_users
  SET auth_id = auth.uid()
  WHERE id = target_user_id
    AND email = user_email
    AND (auth_id IS NULL OR auth_id = auth.uid());
END;
$$;


-- ── 6. RPC: Clear invite token (cross-user write) ──────────
--
-- The friend invite flow needs to clear another user's invite_token
-- after acceptance. This can't go through normal RLS (it's a
-- cross-user UPDATE), so we use a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION clear_invite_token(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only clear if caller has an accepted friendship with the target
  IF EXISTS (
    SELECT 1 FROM palatemap_friendships f
    JOIN palatemap_users u ON u.auth_id = auth.uid()
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = target_user_id AND f.addressee_id = u.id)
        OR (f.addressee_id = target_user_id AND f.requester_id = u.id)
      )
  ) THEN
    UPDATE palatemap_users SET invite_token = NULL WHERE id = target_user_id;
  END IF;
END;
$$;
