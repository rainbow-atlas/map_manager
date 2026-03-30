-- Add fixed color support for categories.
-- Stores a hex color on each category so manager-assigned colors remain stable.

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS color text;

-- Ensure every category has a color.
WITH palette AS (
  SELECT ARRAY[
    '#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E',
    '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
    '#D946EF', '#EC4899'
  ] AS colors
),
ordered_categories AS (
  SELECT
    c.id,
    p.colors[(ROW_NUMBER() OVER (ORDER BY c.id) - 1) % array_length(p.colors, 1) + 1] AS assigned_color
  FROM public.categories c
  CROSS JOIN palette p
  WHERE c.color IS NULL OR btrim(c.color) = ''
)
UPDATE public.categories c
SET color = oc.assigned_color
FROM ordered_categories oc
WHERE c.id = oc.id;

ALTER TABLE public.categories
ALTER COLUMN color SET DEFAULT '#9B8ACF',
ALTER COLUMN color SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_color_hex_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_color_hex_check
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;
