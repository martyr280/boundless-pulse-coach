
-- 1. Rename pillar columns on cohort_checkins
ALTER TABLE public.cohort_checkins RENAME COLUMN faculty TO friends;
ALTER TABLE public.cohort_checkins RENAME COLUMN freedom TO field;

-- 2. LCI sessions
CREATE TABLE public.lci_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_lci_date DATE,
  year_review TEXT,
  help_needed TEXT,
  ai_briefing TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lci_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lci_sessions" ON public.lci_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert lci_sessions" ON public.lci_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update lci_sessions" ON public.lci_sessions FOR UPDATE USING (true);
CREATE POLICY "Public delete lci_sessions" ON public.lci_sessions FOR DELETE USING (true);

-- 3. Highs & Lows
CREATE TABLE public.lci_highs_lows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lci_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'personal_high','personal_low','business_high','business_low'
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lci_highs_lows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lci_highs_lows" ON public.lci_highs_lows FOR SELECT USING (true);
CREATE POLICY "Public insert lci_highs_lows" ON public.lci_highs_lows FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update lci_highs_lows" ON public.lci_highs_lows FOR UPDATE USING (true);
CREATE POLICY "Public delete lci_highs_lows" ON public.lci_highs_lows FOR DELETE USING (true);

-- 4. Top tasks
CREATE TABLE public.lci_top_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lci_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'green', -- 'red','yellow','green'
  feel TEXT DEFAULT '',
  obstacles TEXT DEFAULT '',
  help_needed TEXT DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lci_top_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lci_top_tasks" ON public.lci_top_tasks FOR SELECT USING (true);
CREATE POLICY "Public insert lci_top_tasks" ON public.lci_top_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update lci_top_tasks" ON public.lci_top_tasks FOR UPDATE USING (true);
CREATE POLICY "Public delete lci_top_tasks" ON public.lci_top_tasks FOR DELETE USING (true);

-- 5. Action items
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_lci_id UUID REFERENCES public.lci_sessions(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read action_items" ON public.action_items FOR SELECT USING (true);
CREATE POLICY "Public insert action_items" ON public.action_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update action_items" ON public.action_items FOR UPDATE USING (true);
CREATE POLICY "Public delete action_items" ON public.action_items FOR DELETE USING (true);

-- 6. Action item dated updates
CREATE TABLE public.action_item_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_item_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read action_item_updates" ON public.action_item_updates FOR SELECT USING (true);
CREATE POLICY "Public insert action_item_updates" ON public.action_item_updates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update action_item_updates" ON public.action_item_updates FOR UPDATE USING (true);
CREATE POLICY "Public delete action_item_updates" ON public.action_item_updates FOR DELETE USING (true);

-- 7. Scheduled LCI for nudge prep
CREATE TABLE public.scheduled_lci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  display_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  prep_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_lci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scheduled_lci" ON public.scheduled_lci FOR SELECT USING (true);
CREATE POLICY "Public insert scheduled_lci" ON public.scheduled_lci FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scheduled_lci" ON public.scheduled_lci FOR UPDATE USING (true);
CREATE POLICY "Public delete scheduled_lci" ON public.scheduled_lci FOR DELETE USING (true);
