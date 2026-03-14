-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
-- This trigger fires whenever a new user is inserted into auth.users
-- (e.g. on email/password signup, OAuth, magic link, etc.) and
-- automatically creates a corresponding row in public.profiles.
-- It runs as SECURITY DEFINER so it bypasses RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    'viewer'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the trigger first in case it already exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BACK-FILL: create profiles for any auth users that don't
-- have one yet (covers users who signed up before this trigger)
-- ============================================================
INSERT INTO public.profiles (id, first_name, last_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', 'New'),
  COALESCE(u.raw_user_meta_data->>'last_name',  'User'),
  'viewer'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);
