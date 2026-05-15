-- Phase 1 schema: evening reflection + 30-day cycle + inbound WhatsApp log

-- ===== G3: evening reflection columns =====
ALTER TABLE public.user_journal_entries
  ADD COLUMN IF NOT EXISTS evening_reflection TEXT,
  ADD COLUMN IF NOT EXISTS evening_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_day INT;

-- ===== G3: user_cycles table =====
CREATE TABLE IF NOT EXISTS public.user_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  target_days INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_cycles_own_select ON public.user_cycles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_cycles_own_insert ON public.user_cycles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_cycles_own_update ON public.user_cycles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_cycles_own_delete ON public.user_cycles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Only one active cycle per user
CREATE UNIQUE INDEX IF NOT EXISTS user_cycles_one_active
  ON public.user_cycles(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_cycles_user ON public.user_cycles(user_id);

CREATE TRIGGER trg_user_cycles_updated_at
  BEFORE UPDATE ON public.user_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validation: status must be one of active/completed/abandoned, target_days positive
CREATE OR REPLACE FUNCTION public.validate_user_cycle()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active','completed','abandoned') THEN
    RAISE EXCEPTION 'Invalid cycle status: %', NEW.status;
  END IF;
  IF NEW.target_days < 1 THEN
    RAISE EXCEPTION 'target_days must be >= 1';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_user_cycle
  BEFORE INSERT OR UPDATE ON public.user_cycles
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_cycle();

-- ===== G3: auto-stamp cycle_day on journal insert =====
CREATE OR REPLACE FUNCTION public.assign_journal_cycle_day()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_cycle RECORD;
BEGIN
  IF NEW.cycle_day IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT id, started_on, target_days INTO v_cycle
    FROM public.user_cycles
   WHERE user_id = NEW.user_id AND status = 'active'
   LIMIT 1;
  IF FOUND THEN
    NEW.cycle_day := GREATEST(1, (NEW.entry_date - v_cycle.started_on)::int + 1);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_assign_journal_cycle_day
  BEFORE INSERT ON public.user_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.assign_journal_cycle_day();

-- ===== G4: inbound WhatsApp log =====
CREATE TABLE IF NOT EXISTS public.nudge_inbound_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  matched_outbound_id UUID,
  matched_intent TEXT,
  captured_to TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nudge_inbound_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY nudge_inbound_own_select ON public.nudge_inbound_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_nudge_inbound_user ON public.nudge_inbound_log(user_id);
CREATE INDEX IF NOT EXISTS idx_nudge_inbound_received ON public.nudge_inbound_log(received_at DESC);
