
CREATE TABLE public.user_weekly_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  family_score INTEGER,
  finance_score INTEGER,
  faith_score INTEGER,
  fitness_score INTEGER,
  friends_score INTEGER,
  fun_score INTEGER,
  field_score INTEGER,
  personal_high TEXT,
  personal_low TEXT,
  business_high TEXT,
  business_low TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_user_weekly_resets_user_week ON public.user_weekly_resets (user_id, week_start_date);
CREATE INDEX idx_user_weekly_resets_user_time ON public.user_weekly_resets (user_id, week_start_date DESC);
ALTER TABLE public.user_weekly_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_own_select ON public.user_weekly_resets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY weekly_own_insert ON public.user_weekly_resets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY weekly_own_update ON public.user_weekly_resets FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY weekly_own_delete ON public.user_weekly_resets FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_user_weekly_reset()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v INT;
BEGIN
  FOREACH v IN ARRAY ARRAY[NEW.family_score, NEW.finance_score, NEW.faith_score, NEW.fitness_score, NEW.friends_score, NEW.fun_score, NEW.field_score]
  LOOP
    IF v IS NOT NULL AND (v < 1 OR v > 10) THEN
      RAISE EXCEPTION 'Pillar scores must be between 1 and 10. Got: %', v;
    END IF;
  END LOOP;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_user_weekly_reset
  BEFORE INSERT OR UPDATE ON public.user_weekly_resets
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_weekly_reset();
