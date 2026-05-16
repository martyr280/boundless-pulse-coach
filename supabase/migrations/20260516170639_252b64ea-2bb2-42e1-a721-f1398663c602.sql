
CREATE TABLE public.activity_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  success boolean NOT NULL,
  reason text,
  method text,
  user_agent text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert login events"
  ON public.activity_login_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read login events"
  ON public.activity_login_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX activity_login_events_created_at_idx ON public.activity_login_events (created_at DESC);

CREATE TABLE public.activity_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own page views"
  ON public.activity_page_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read page views"
  ON public.activity_page_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX activity_page_views_created_at_idx ON public.activity_page_views (created_at DESC);
