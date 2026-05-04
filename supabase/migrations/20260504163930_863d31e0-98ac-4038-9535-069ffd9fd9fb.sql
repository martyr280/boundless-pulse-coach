
-- =========================
-- 1. PROFILES + USER ROLES
-- =========================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  phone_number text,
  timezone text DEFAULT 'America/Chicago',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Roles
CREATE TYPE public.app_role AS ENUM ('member', 'coach', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger (generic)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- 2. ADD user_id + FKs to existing tables
-- =========================

-- LCI sessions
ALTER TABLE public.lci_sessions
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_lci_sessions_user ON public.lci_sessions(user_id);

-- Top tasks: FK to session (cascade)
ALTER TABLE public.lci_top_tasks
  ADD CONSTRAINT lci_top_tasks_session_fk
  FOREIGN KEY (session_id) REFERENCES public.lci_sessions(id) ON DELETE CASCADE;

-- Highs/lows: FK to session (cascade)
ALTER TABLE public.lci_highs_lows
  ADD CONSTRAINT lci_highs_lows_session_fk
  FOREIGN KEY (session_id) REFERENCES public.lci_sessions(id) ON DELETE CASCADE;

-- Action items: user_id + FKs
ALTER TABLE public.action_items
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT action_items_source_lci_fk
    FOREIGN KEY (source_lci_id) REFERENCES public.lci_sessions(id) ON DELETE SET NULL,
  ADD CONSTRAINT action_items_source_top_task_fk
    FOREIGN KEY (source_top_task_id) REFERENCES public.lci_top_tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_action_items_user ON public.action_items(user_id);

-- Action item updates: FK
ALTER TABLE public.action_item_updates
  ADD CONSTRAINT action_item_updates_item_fk
  FOREIGN KEY (action_item_id) REFERENCES public.action_items(id) ON DELETE CASCADE;

-- Nudge preferences
ALTER TABLE public.nudge_preferences
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_nudge_prefs_user ON public.nudge_preferences(user_id);

-- Scheduled LCI
ALTER TABLE public.scheduled_lci
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_scheduled_lci_user ON public.scheduled_lci(user_id);

-- Nudge log
ALTER TABLE public.nudge_log
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_nudge_log_user ON public.nudge_log(user_id);

-- Coaches: link to auth user
ALTER TABLE public.coaches
  ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_coaches_user ON public.coaches(user_id);

-- Cohort members: FK to coaches
ALTER TABLE public.cohort_members
  ADD CONSTRAINT cohort_members_coach_fk
  FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;

-- Cohort checkins: FK to members
ALTER TABLE public.cohort_checkins
  ADD CONSTRAINT cohort_checkins_member_fk
  FOREIGN KEY (member_id) REFERENCES public.cohort_members(id) ON DELETE CASCADE;

-- Coach insights: FK to coach
ALTER TABLE public.coach_insights
  ADD CONSTRAINT coach_insights_coach_fk
  FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;

-- =========================
-- 3. REPLACE PUBLIC RLS WITH OWNER RLS
-- =========================

-- LCI SESSIONS
DROP POLICY IF EXISTS "Public read lci_sessions" ON public.lci_sessions;
DROP POLICY IF EXISTS "Public insert lci_sessions" ON public.lci_sessions;
DROP POLICY IF EXISTS "Public update lci_sessions" ON public.lci_sessions;
DROP POLICY IF EXISTS "Public delete lci_sessions" ON public.lci_sessions;
CREATE POLICY "lci_sessions_own_select" ON public.lci_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lci_sessions_own_insert" ON public.lci_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lci_sessions_own_update" ON public.lci_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lci_sessions_own_delete" ON public.lci_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- LCI TOP TASKS (owned via session)
DROP POLICY IF EXISTS "Public read lci_top_tasks" ON public.lci_top_tasks;
DROP POLICY IF EXISTS "Public insert lci_top_tasks" ON public.lci_top_tasks;
DROP POLICY IF EXISTS "Public update lci_top_tasks" ON public.lci_top_tasks;
DROP POLICY IF EXISTS "Public delete lci_top_tasks" ON public.lci_top_tasks;
CREATE POLICY "lci_top_tasks_own_all" ON public.lci_top_tasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lci_sessions s WHERE s.id = lci_top_tasks.session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lci_sessions s WHERE s.id = lci_top_tasks.session_id AND s.user_id = auth.uid()));

-- LCI HIGHS/LOWS
DROP POLICY IF EXISTS "Public read lci_highs_lows" ON public.lci_highs_lows;
DROP POLICY IF EXISTS "Public insert lci_highs_lows" ON public.lci_highs_lows;
DROP POLICY IF EXISTS "Public update lci_highs_lows" ON public.lci_highs_lows;
DROP POLICY IF EXISTS "Public delete lci_highs_lows" ON public.lci_highs_lows;
CREATE POLICY "lci_highs_lows_own_all" ON public.lci_highs_lows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lci_sessions s WHERE s.id = lci_highs_lows.session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lci_sessions s WHERE s.id = lci_highs_lows.session_id AND s.user_id = auth.uid()));

-- ACTION ITEMS
DROP POLICY IF EXISTS "Public read action_items" ON public.action_items;
DROP POLICY IF EXISTS "Public insert action_items" ON public.action_items;
DROP POLICY IF EXISTS "Public update action_items" ON public.action_items;
DROP POLICY IF EXISTS "Public delete action_items" ON public.action_items;
CREATE POLICY "action_items_own_select" ON public.action_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "action_items_own_insert" ON public.action_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "action_items_own_update" ON public.action_items
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "action_items_own_delete" ON public.action_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ACTION ITEM UPDATES (owned via item)
DROP POLICY IF EXISTS "Public read action_item_updates" ON public.action_item_updates;
DROP POLICY IF EXISTS "Public insert action_item_updates" ON public.action_item_updates;
DROP POLICY IF EXISTS "Public update action_item_updates" ON public.action_item_updates;
DROP POLICY IF EXISTS "Public delete action_item_updates" ON public.action_item_updates;
CREATE POLICY "action_item_updates_own_all" ON public.action_item_updates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.action_items a WHERE a.id = action_item_updates.action_item_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.action_items a WHERE a.id = action_item_updates.action_item_id AND a.user_id = auth.uid()));

-- NUDGE PREFERENCES
DROP POLICY IF EXISTS "Allow public read" ON public.nudge_preferences;
DROP POLICY IF EXISTS "Allow public insert" ON public.nudge_preferences;
DROP POLICY IF EXISTS "Allow public update" ON public.nudge_preferences;
DROP POLICY IF EXISTS "Allow public delete" ON public.nudge_preferences;
CREATE POLICY "nudge_prefs_own_select" ON public.nudge_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "nudge_prefs_own_insert" ON public.nudge_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "nudge_prefs_own_update" ON public.nudge_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "nudge_prefs_own_delete" ON public.nudge_preferences
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- SCHEDULED LCI
DROP POLICY IF EXISTS "Public read scheduled_lci" ON public.scheduled_lci;
DROP POLICY IF EXISTS "Public insert scheduled_lci" ON public.scheduled_lci;
DROP POLICY IF EXISTS "Public update scheduled_lci" ON public.scheduled_lci;
DROP POLICY IF EXISTS "Public delete scheduled_lci" ON public.scheduled_lci;
CREATE POLICY "scheduled_lci_own_all" ON public.scheduled_lci
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- NUDGE LOG: read-own only; inserts via service role only
DROP POLICY IF EXISTS "Allow public read nudge_log" ON public.nudge_log;
DROP POLICY IF EXISTS "Allow public insert nudge_log" ON public.nudge_log;
CREATE POLICY "nudge_log_own_select" ON public.nudge_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- COACHES
DROP POLICY IF EXISTS "Allow public read coaches" ON public.coaches;
DROP POLICY IF EXISTS "Allow public insert coaches" ON public.coaches;
CREATE POLICY "coaches_own_select" ON public.coaches
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coaches_self_insert" ON public.coaches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'coach'));
CREATE POLICY "coaches_own_update" ON public.coaches
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- COHORT MEMBERS
DROP POLICY IF EXISTS "Allow public read cohort_members" ON public.cohort_members;
DROP POLICY IF EXISTS "Allow public insert cohort_members" ON public.cohort_members;
DROP POLICY IF EXISTS "Allow public delete cohort_members" ON public.cohort_members;
CREATE POLICY "cohort_members_coach_all" ON public.cohort_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = cohort_members.coach_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = cohort_members.coach_id AND c.user_id = auth.uid()));

-- COHORT CHECKINS
DROP POLICY IF EXISTS "Allow public read cohort_checkins" ON public.cohort_checkins;
DROP POLICY IF EXISTS "Allow public insert cohort_checkins" ON public.cohort_checkins;
CREATE POLICY "cohort_checkins_coach_all" ON public.cohort_checkins
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cohort_members m
    JOIN public.coaches c ON c.id = m.coach_id
    WHERE m.id = cohort_checkins.member_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cohort_members m
    JOIN public.coaches c ON c.id = m.coach_id
    WHERE m.id = cohort_checkins.member_id AND c.user_id = auth.uid()
  ));

-- COACH INSIGHTS
DROP POLICY IF EXISTS "Allow public read coach_insights" ON public.coach_insights;
DROP POLICY IF EXISTS "Allow public insert coach_insights" ON public.coach_insights;
CREATE POLICY "coach_insights_coach_all" ON public.coach_insights
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_insights.coach_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_insights.coach_id AND c.user_id = auth.uid()));
