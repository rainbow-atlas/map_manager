-- Allow locations to have multiple categories (many-to-many)
-- via public.location_categories join table.

-- Join table
CREATE TABLE IF NOT EXISTS public.location_categories (
  location_id integer NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (location_id, category_id)
);

-- Backfill existing single-category rows from locations.category
-- (treat them as "specifically selected" categories).
INSERT INTO public.categories (name)
SELECT DISTINCT l.category
FROM public.locations l
WHERE l.category IS NOT NULL
  AND btrim(l.category) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.location_categories (location_id, category_id)
SELECT l.id, c.id
FROM public.locations l
JOIN public.categories c
  ON c.name = l.category
WHERE l.category IS NOT NULL
  AND btrim(l.category) <> ''
ON CONFLICT DO NOTHING;

-- RLS + policies (match your existing "allow all" style)
ALTER TABLE public.location_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for location_categories" ON public.location_categories;
CREATE POLICY "Allow all for location_categories"
  ON public.location_categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissions for anon/authenticated keys
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_categories TO authenticated;

