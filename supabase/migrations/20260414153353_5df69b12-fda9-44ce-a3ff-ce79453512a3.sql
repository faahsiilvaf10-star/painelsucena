ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS sidebar_animation text DEFAULT 'particles',
  ADD COLUMN IF NOT EXISTS sidebar_font text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_font_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_active_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_active_font_color text DEFAULT NULL;