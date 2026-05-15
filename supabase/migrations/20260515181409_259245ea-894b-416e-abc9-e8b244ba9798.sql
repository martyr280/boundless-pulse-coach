CREATE TABLE public.user_pillar_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pillar TEXT NOT NULL,
  current_state TEXT NOT NULL DEFAULT '',
  future_state TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pillar)
);

ALTER TABLE public.user_pillar_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pillar_state_own_select" ON public.user_pillar_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "pillar_state_own_insert" ON public.user_pillar_state
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "pillar_state_own_update" ON public.user_pillar_state
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "pillar_state_own_delete" ON public.user_pillar_state
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_user_pillar_state()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pillar NOT IN ('Family','Finance','Faith','Fitness','Friends','Fun','Field') THEN
    RAISE EXCEPTION 'Invalid pillar: %', NEW.pillar;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_pillar_state_validate
BEFORE INSERT OR UPDATE ON public.user_pillar_state
FOR EACH ROW EXECUTE FUNCTION public.validate_user_pillar_state();