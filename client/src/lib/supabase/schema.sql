-- ============================================================
-- Slovak for Foreigners — Supabase Database Schema
-- Run this in the Supabase SQL editor (once, top to bottom)
-- ============================================================


-- ── 1. user_profiles ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  display_name  text        NOT NULL DEFAULT '',
  avatar_url    text,
  alias         text        UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: select own profile"  ON public.user_profiles;
DROP POLICY IF EXISTS "users: insert own profile"  ON public.user_profiles;
DROP POLICY IF EXISTS "users: update own profile"  ON public.user_profiles;
DROP POLICY IF EXISTS "users: delete own profile"  ON public.user_profiles;

CREATE POLICY "users: select own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users: update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users: delete own profile"
  ON public.user_profiles FOR DELETE
  USING (auth.uid() = id);


-- ── 2. user_progress ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_progress (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  xp                integer     NOT NULL DEFAULT 0,
  level             integer     NOT NULL DEFAULT 1,
  streak            integer     NOT NULL DEFAULT 0,
  last_played_date  text,
  streak_multiplier numeric     NOT NULL DEFAULT 1.0,
  unlocked_stages   text[]      NOT NULL DEFAULT '{"survival"}',
  tried_emergency_scenarios text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: select own progress"  ON public.user_progress;
DROP POLICY IF EXISTS "users: insert own progress"  ON public.user_progress;
DROP POLICY IF EXISTS "users: update own progress"  ON public.user_progress;
DROP POLICY IF EXISTS "users: delete own progress"  ON public.user_progress;

CREATE POLICY "users: select own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users: insert own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own progress"
  ON public.user_progress FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. lesson_records ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_records (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id        text        NOT NULL,
  strength         integer     NOT NULL DEFAULT 100,
  strikes          integer     NOT NULL DEFAULT 0,
  completed_at     timestamptz NOT NULL,
  times_completed  integer     NOT NULL DEFAULT 1,
  xp_earned        integer     NOT NULL DEFAULT 0,
  last_decayed_at  text,
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: select own lesson records"  ON public.lesson_records;
DROP POLICY IF EXISTS "users: insert own lesson records"  ON public.lesson_records;
DROP POLICY IF EXISTS "users: update own lesson records"  ON public.lesson_records;
DROP POLICY IF EXISTS "users: delete own lesson records"  ON public.lesson_records;

CREATE POLICY "users: select own lesson records"
  ON public.lesson_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users: insert own lesson records"
  ON public.lesson_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own lesson records"
  ON public.lesson_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own lesson records"
  ON public.lesson_records FOR DELETE
  USING (auth.uid() = user_id);


-- ── 4. snail_race_records ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.snail_race_records (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id          text    NOT NULL,
  attempts_today    integer NOT NULL DEFAULT 0,
  last_attempt_date text,
  best_score        integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, stage_id)
);

ALTER TABLE public.snail_race_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: select own snail race records"  ON public.snail_race_records;
DROP POLICY IF EXISTS "users: insert own snail race records"  ON public.snail_race_records;
DROP POLICY IF EXISTS "users: update own snail race records"  ON public.snail_race_records;
DROP POLICY IF EXISTS "users: delete own snail race records"  ON public.snail_race_records;

CREATE POLICY "users: select own snail race records"
  ON public.snail_race_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users: insert own snail race records"
  ON public.snail_race_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own snail race records"
  ON public.snail_race_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own snail race records"
  ON public.snail_race_records FOR DELETE
  USING (auth.uid() = user_id);


-- ── 5. alias_change_log ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alias_change_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_alias  text,
  new_alias  text        NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alias_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own alias log"
  ON public.alias_change_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users: insert own alias log"
  ON public.alias_change_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── 6. Auto-create rows on sign-up ──────────────────────────
--
-- Fires after a new row is inserted into auth.users (i.e. after
-- any sign-up method: email/password, Google, magic link, etc.)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, email, alias)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NULL
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger first so re-running the script is safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 7. updated_at auto-stamp ────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_progress_updated_at ON public.user_progress;

CREATE TRIGGER set_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ── 8. Admin flag ────────────────────────────────────────────

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Run after the admin user has signed up (no-op if they haven't yet):
UPDATE public.user_profiles SET is_admin = true WHERE email = 'thioulouby@gmail.com';


-- ── 9. is_admin helper (security definer prevents RLS recursion) ─────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true
  );
$$;


-- ── 10. user_sessions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE,  -- null = guest
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_active_at   timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  duration_seconds integer,
  device_type      text        CHECK (device_type IN ('mobile', 'desktop'))
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: insert own sessions"    ON public.user_sessions;
DROP POLICY IF EXISTS "anon: insert guest sessions"   ON public.user_sessions;
DROP POLICY IF EXISTS "users: update own sessions"    ON public.user_sessions;
DROP POLICY IF EXISTS "anon: update guest sessions"   ON public.user_sessions;
DROP POLICY IF EXISTS "admin: read all sessions"      ON public.user_sessions;

-- Authenticated users insert/update their own session rows
CREATE POLICY "users: insert own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Anonymous (guest) users insert/update rows where user_id IS NULL
-- UUID session IDs are unguessable, so this is safe in practice
CREATE POLICY "anon: insert guest sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE POLICY "anon: update guest sessions"
  ON public.user_sessions FOR UPDATE
  USING (user_id IS NULL);

-- Admin can read all sessions
CREATE POLICY "admin: read all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.is_admin());


-- ── 11. Admin read/write policies on existing tables ─────────────────────────

-- user_profiles: admin reads all (second SELECT policy is OR'd with the existing one)
DROP POLICY IF EXISTS "admin: read all profiles" ON public.user_profiles;
CREATE POLICY "admin: read all profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin());

-- user_progress: admin reads all
DROP POLICY IF EXISTS "admin: read all progress" ON public.user_progress;
CREATE POLICY "admin: read all progress"
  ON public.user_progress FOR SELECT
  USING (public.is_admin());

-- physical_session_regist: admin reads all
DROP POLICY IF EXISTS "admin: read all physical sessions" ON public.physical_session_regist;
CREATE POLICY "admin: read all physical sessions"
  ON public.physical_session_regist FOR SELECT
  USING (public.is_admin());

-- npc_profiles: admin can update weekly_xp
DROP POLICY IF EXISTS "admin: update npc_profiles" ON public.npc_profiles;
CREATE POLICY "admin: update npc_profiles"
  ON public.npc_profiles FOR UPDATE
  USING (public.is_admin());
