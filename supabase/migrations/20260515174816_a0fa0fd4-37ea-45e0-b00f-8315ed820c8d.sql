-- Framework content for the admin CMS
CREATE TABLE public.framework_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'general',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);

-- Only one active version per slug
CREATE UNIQUE INDEX framework_content_one_active_per_slug
  ON public.framework_content (slug)
  WHERE is_active = true;

CREATE INDEX framework_content_slug_idx ON public.framework_content (slug);
CREATE INDEX framework_content_kind_idx ON public.framework_content (kind);

-- Validate kind via trigger (CHECK constraints can't reference a small enum cleanly here)
CREATE OR REPLACE FUNCTION public.validate_framework_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind NOT IN ('vision','year_priority','prompt','general') THEN
    RAISE EXCEPTION 'Invalid framework_content.kind: %. Must be vision, year_priority, prompt, or general.', NEW.kind;
  END IF;
  IF length(btrim(NEW.slug)) = 0 THEN
    RAISE EXCEPTION 'framework_content.slug cannot be blank.';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER framework_content_validate
BEFORE INSERT OR UPDATE ON public.framework_content
FOR EACH ROW EXECUTE FUNCTION public.validate_framework_content();

ALTER TABLE public.framework_content ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read active rows
CREATE POLICY "framework_content_read_active"
  ON public.framework_content FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can do everything (including reading inactive versions)
CREATE POLICY "framework_content_admin_all"
  ON public.framework_content FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));