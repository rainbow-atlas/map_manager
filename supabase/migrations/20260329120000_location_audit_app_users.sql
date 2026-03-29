-- Location audit columns were FK'd to auth.users and filled via auth.uid().
-- This app uses public.app_users (custom login), so point FKs at app_users and
-- let the client send created_by / updated_by. Keep updated_at on UPDATE only.

-- Clear FKs that cannot reference app_users (e.g. old Supabase Auth ids)
UPDATE public.locations l
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = l.created_by);

UPDATE public.locations l
SET updated_by = NULL
WHERE updated_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = l.updated_by);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'locations'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%created_by%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'locations'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%updated_by%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.app_users (id) ON DELETE SET NULL;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.app_users (id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_set_location_audit_fields ON public.locations;
DROP FUNCTION IF EXISTS public.set_location_audit_fields ();

CREATE OR REPLACE FUNCTION public.set_location_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_location_updated_at ON public.locations;
CREATE TRIGGER trg_set_location_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.set_location_updated_at ();
