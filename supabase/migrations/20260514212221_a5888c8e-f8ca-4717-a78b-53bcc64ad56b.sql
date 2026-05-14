
-- ===== user_checkins =====
CREATE TABLE public.user_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_checkins_user_time ON public.user_checkins (user_id, checked_in_at DESC);
ALTER TABLE public.user_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_checkins_own_select ON public.user_checkins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_checkins_own_insert ON public.user_checkins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_checkins_own_update ON public.user_checkins FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_checkins_own_delete ON public.user_checkins FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== user_pillar_scores =====
CREATE TABLE public.user_pillar_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id UUID NOT NULL REFERENCES public.user_checkins(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL,
  score INTEGER NOT NULL,
  whats_happening TEXT,
  how_it_feels TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_pillar_scores_checkin ON public.user_pillar_scores (checkin_id);
ALTER TABLE public.user_pillar_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_pillar_scores_own_all ON public.user_pillar_scores
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_checkins c WHERE c.id = checkin_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_checkins c WHERE c.id = checkin_id AND c.user_id = auth.uid()));

-- Validation: pillar must be one of the canonical 7 F's; score 1-10
CREATE OR REPLACE FUNCTION public.validate_user_pillar_score()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pillar NOT IN ('Family','Finance','Faith','Fitness','Friends','Fun','Field') THEN
    RAISE EXCEPTION 'Invalid pillar: %. Must be one of Family, Finance, Faith, Fitness, Friends, Fun, Field.', NEW.pillar;
  END IF;
  IF NEW.score < 1 OR NEW.score > 10 THEN
    RAISE EXCEPTION 'Pillar score must be between 1 and 10. Got: %', NEW.score;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_user_pillar_score
  BEFORE INSERT OR UPDATE ON public.user_pillar_scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_pillar_score();

-- ===== user_journal_entries =====
CREATE TABLE public.user_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_rating INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  top_priority TEXT,
  top_priority_done BOOLEAN NOT NULL DEFAULT false,
  gratitude_1 TEXT,
  gratitude_2 TEXT,
  gratitude_3 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_journal_entries_user_date ON public.user_journal_entries (user_id, entry_date DESC);
ALTER TABLE public.user_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_journal_entries_own_select ON public.user_journal_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_journal_entries_own_insert ON public.user_journal_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_journal_entries_own_update ON public.user_journal_entries FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_journal_entries_own_delete ON public.user_journal_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Validation: daily_rating must be in -2..+2; step_count >= 0
CREATE OR REPLACE FUNCTION public.validate_user_journal_entry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.daily_rating < -2 OR NEW.daily_rating > 2 THEN
    RAISE EXCEPTION 'daily_rating must be between -2 and +2. Got: %', NEW.daily_rating;
  END IF;
  IF NEW.step_count < 0 THEN
    RAISE EXCEPTION 'step_count must be non-negative. Got: %', NEW.step_count;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_user_journal_entry
  BEFORE INSERT OR UPDATE ON public.user_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_journal_entry();

-- ===== user_journal_habits =====
CREATE TABLE public.user_journal_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.user_journal_entries(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_journal_habits_entry ON public.user_journal_habits (journal_entry_id);
ALTER TABLE public.user_journal_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_journal_habits_own_all ON public.user_journal_habits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_journal_entries e WHERE e.id = journal_entry_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_journal_entries e WHERE e.id = journal_entry_id AND e.user_id = auth.uid()));

-- ===== user_truth_statements =====
CREATE TABLE public.user_truth_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  priority TEXT NOT NULL,
  levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  statement TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_truth_statements_user_time ON public.user_truth_statements (user_id, created_at DESC);
ALTER TABLE public.user_truth_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_truth_statements_own_select ON public.user_truth_statements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_truth_statements_own_insert ON public.user_truth_statements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_truth_statements_own_update ON public.user_truth_statements FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_truth_statements_own_delete ON public.user_truth_statements FOR DELETE TO authenticated USING (user_id = auth.uid());
