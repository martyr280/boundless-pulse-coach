CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_read_authenticated
  ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY app_settings_admin_write
  ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_settings (key, value) VALUES ('nudges_enabled', 'false'::jsonb)
  ON CONFLICT (key) DO NOTHING;