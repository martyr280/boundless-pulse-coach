-- Life vision (one row per user)
CREATE TABLE public.user_life_vision (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  vision_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_life_vision ENABLE ROW LEVEL SECURITY;
CREATE POLICY vision_own_select ON public.user_life_vision FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY vision_own_insert ON public.user_life_vision FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY vision_own_update ON public.user_life_vision FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY vision_own_delete ON public.user_life_vision FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_user_life_vision_updated_at
  BEFORE UPDATE ON public.user_life_vision
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Annual priorities
CREATE TABLE public.user_year_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  category TEXT NOT NULL,
  priority_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_year_priorities_user_year ON public.user_year_priorities (user_id, year, category, position);
ALTER TABLE public.user_year_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_own_select ON public.user_year_priorities FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY year_own_insert ON public.user_year_priorities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY year_own_update ON public.user_year_priorities FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY year_own_delete ON public.user_year_priorities FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_year_priority()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.category NOT IN ('Being','Relating','Doing','Having') THEN
    RAISE EXCEPTION 'Invalid category: %. Must be Being, Relating, Doing, or Having.', NEW.category;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_year_priority
  BEFORE INSERT OR UPDATE ON public.user_year_priorities
  FOR EACH ROW EXECUTE FUNCTION public.validate_year_priority();

-- Link truth statements to top tasks
ALTER TABLE public.user_truth_statements
  ADD COLUMN IF NOT EXISTS linked_top_task_id UUID REFERENCES public.lci_top_tasks(id) ON DELETE SET NULL;