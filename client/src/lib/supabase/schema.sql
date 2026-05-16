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
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

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


-- ── 5. Auto-create rows on sign-up ──────────────────────────
--
-- Fires after a new row is inserted into auth.users (i.e. after
-- any sign-up method: email/password, Google, magic link, etc.)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create progress row with survival stage unlocked
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


-- ── 6. updated_at auto-stamp ────────────────────────────────

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
