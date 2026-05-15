
CREATE TABLE public.lci_guided_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step text NOT NULL DEFAULT 'highs_lows',
  status text NOT NULL DEFAULT 'in_progress',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  materialized_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lci_guided_runs_user_idx ON public.lci_guided_runs(user_id, created_at DESC);
ALTER TABLE public.lci_guided_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY lci_guided_runs_own_select ON public.lci_guided_runs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY lci_guided_runs_own_insert ON public.lci_guided_runs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY lci_guided_runs_own_update ON public.lci_guided_runs
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY lci_guided_runs_own_delete ON public.lci_guided_runs
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER lci_guided_runs_set_updated_at
  BEFORE UPDATE ON public.lci_guided_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
