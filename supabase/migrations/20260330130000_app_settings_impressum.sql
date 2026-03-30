-- App-level key/value settings storage.
-- Adds an initial "impressum" entry that can be edited from the app.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for app_settings" ON public.app_settings;
CREATE POLICY "Allow all for app_settings"
ON public.app_settings
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.app_settings (key, value)
VALUES ('impressum', '')
ON CONFLICT (key) DO NOTHING;
