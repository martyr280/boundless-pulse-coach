CREATE TABLE public.nudge_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  nudge_enabled BOOLEAN NOT NULL DEFAULT true,
  gratitude_reminder BOOLEAN NOT NULL DEFAULT true,
  habit_reminder BOOLEAN NOT NULL DEFAULT true,
  step_reminder BOOLEAN NOT NULL DEFAULT true,
  preferred_hour INTEGER NOT NULL DEFAULT 9 CHECK (preferred_hour >= 0 AND preferred_hour <= 23),
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nudge_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.nudge_preferences FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.nudge_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.nudge_preferences FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.nudge_preferences FOR DELETE USING (true);

CREATE TABLE public.nudge_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  nudge_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nudge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read nudge_log" ON public.nudge_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert nudge_log" ON public.nudge_log FOR INSERT WITH CHECK (true);