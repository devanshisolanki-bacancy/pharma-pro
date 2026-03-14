-- ============================================================
-- FIX: Auto-assign default pharmacy when creating profiles
-- ============================================================
-- Replaces handle_new_user() so new signups get pharmacy_id set
-- to the first active pharmacy. Also backfills existing profiles
-- that have pharmacy_id = NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_pharmacy_id UUID;
BEGIN
  -- Pick the first active pharmacy as the default assignment
  SELECT id INTO default_pharmacy_id
  FROM public.pharmacies
  WHERE is_active = TRUE
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.profiles (id, first_name, last_name, role, pharmacy_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  'User'),
    'viewer',
    default_pharmacy_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger (function replace is enough, but this is explicit)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BACK-FILL: assign the default pharmacy to any profile that
-- currently has pharmacy_id = NULL
-- ============================================================
UPDATE public.profiles
SET pharmacy_id = (
  SELECT id FROM public.pharmacies
  WHERE is_active = TRUE
  ORDER BY created_at
  LIMIT 1
)
WHERE pharmacy_id IS NULL;
