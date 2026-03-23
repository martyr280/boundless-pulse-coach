
-- Coaches table
CREATE TABLE public.coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  organization TEXT,
  access_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read coaches" ON public.coaches FOR SELECT USING (true);
CREATE POLICY "Allow public insert coaches" ON public.coaches FOR INSERT WITH CHECK (true);

-- Cohort members (clients linked to a coach)
CREATE TABLE public.cohort_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  alias TEXT NOT NULL DEFAULT 'Member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read cohort_members" ON public.cohort_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert cohort_members" ON public.cohort_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete cohort_members" ON public.cohort_members FOR DELETE USING (true);

-- Cohort check-ins (pillar scores submitted by members)
CREATE TABLE public.cohort_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.cohort_members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  family INTEGER NOT NULL DEFAULT 5,
  finance INTEGER NOT NULL DEFAULT 5,
  faith INTEGER NOT NULL DEFAULT 5,
  fitness INTEGER NOT NULL DEFAULT 5,
  faculty INTEGER NOT NULL DEFAULT 5,
  fun INTEGER NOT NULL DEFAULT 5,
  freedom INTEGER NOT NULL DEFAULT 5,
  daily_rating INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cohort_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read cohort_checkins" ON public.cohort_checkins FOR SELECT USING (true);
CREATE POLICY "Allow public insert cohort_checkins" ON public.cohort_checkins FOR INSERT WITH CHECK (true);

-- AI-generated trend insights
CREATE TABLE public.coach_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL DEFAULT 'trend',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read coach_insights" ON public.coach_insights FOR SELECT USING (true);
CREATE POLICY "Allow public insert coach_insights" ON public.coach_insights FOR INSERT WITH CHECK (true);
