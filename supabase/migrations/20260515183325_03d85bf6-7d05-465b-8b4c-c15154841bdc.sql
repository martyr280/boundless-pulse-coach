
-- 1. Update validate_year_priority to use PDF categories
CREATE OR REPLACE FUNCTION public.validate_year_priority()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.category NOT IN ('Relationships','Achievements','Habits','Wealth') THEN
    RAISE EXCEPTION 'Invalid category: %. Must be Relationships, Achievements, Habits, or Wealth.', NEW.category;
  END IF;
  IF NEW.kind IS NOT NULL AND NEW.kind NOT IN ('year_priority','priority_idea') THEN
    RAISE EXCEPTION 'Invalid kind: %. Must be year_priority or priority_idea.', NEW.kind;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Add kind column to user_year_priorities, then remap legacy categories
ALTER TABLE public.user_year_priorities
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'year_priority';

UPDATE public.user_year_priorities SET category = 'Relationships' WHERE category = 'Relating';
UPDATE public.user_year_priorities SET category = 'Achievements'  WHERE category = 'Doing';
UPDATE public.user_year_priorities SET category = 'Habits'        WHERE category = 'Being';
UPDATE public.user_year_priorities SET category = 'Wealth'        WHERE category = 'Having';

-- Re-attach trigger
DROP TRIGGER IF EXISTS trg_validate_year_priority ON public.user_year_priorities;
CREATE TRIGGER trg_validate_year_priority
BEFORE INSERT OR UPDATE ON public.user_year_priorities
FOR EACH ROW EXECUTE FUNCTION public.validate_year_priority();

-- 3. workshop_sessions
CREATE TABLE public.workshop_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_step int NOT NULL DEFAULT 1,
  mantra text NOT NULL DEFAULT '',
  future_self_date date,
  future_self_age int,
  important_people jsonb NOT NULL DEFAULT '[]'::jsonb,
  cohort_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.workshop_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workshop_sessions_own_all ON public.workshop_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_workshop_sessions_updated_at
BEFORE UPDATE ON public.workshop_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. workshop_step_completions
CREATE TABLE public.workshop_step_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_session_id uuid NOT NULL REFERENCES public.workshop_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  step int NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_session_id, step)
);
ALTER TABLE public.workshop_step_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workshop_step_completions_own_all ON public.workshop_step_completions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. user_general_ideas (page 2)
CREATE TABLE public.user_general_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idea_text text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_general_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_general_ideas_own_all ON public.user_general_ideas
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_user_general_ideas_updated_at
BEFORE UPDATE ON public.user_general_ideas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. user_best_self_habits (page 7)
CREATE TABLE public.user_best_self_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_text text NOT NULL,
  kind text NOT NULL DEFAULT 'start',
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_best_self_habits_kind_chk CHECK (kind IN ('start','stop'))
);
ALTER TABLE public.user_best_self_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_best_self_habits_own_all ON public.user_best_self_habits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_user_best_self_habits_updated_at
BEFORE UPDATE ON public.user_best_self_habits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. user_month_actions (page 8)
CREATE TABLE public.user_month_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_text text NOT NULL,
  position int NOT NULL DEFAULT 0,
  due_date date,
  completed_at timestamptz,
  cycle_id uuid REFERENCES public.user_cycles(id) ON DELETE SET NULL,
  action_item_id uuid REFERENCES public.action_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_month_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_month_actions_own_all ON public.user_month_actions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_month_actions_coach_select ON public.user_month_actions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cohort_members cm
    JOIN public.coaches c ON c.id = cm.coach_id
    WHERE cm.user_id = user_month_actions.user_id AND c.user_id = auth.uid()
  ));
CREATE TRIGGER trg_user_month_actions_updated_at
BEFORE UPDATE ON public.user_month_actions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
