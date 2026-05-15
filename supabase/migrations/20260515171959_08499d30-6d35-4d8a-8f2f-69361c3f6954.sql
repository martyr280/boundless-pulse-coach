
CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_email_idx ON public.email_verifications(lower(email), created_at DESC);
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (edge functions) accesses this table.
