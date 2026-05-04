-- Audit log for unauthorized access attempts to protected routes
CREATE TABLE public.access_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  route TEXT NOT NULL,
  required_roles TEXT[] NOT NULL DEFAULT '{}',
  user_roles TEXT[] NOT NULL DEFAULT '{}',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_audit_log_created_at ON public.access_audit_log (created_at DESC);
CREATE INDEX idx_access_audit_log_user_id ON public.access_audit_log (user_id);

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may insert their OWN denial event (or anonymous→null user_id).
CREATE POLICY "access_audit_log_insert_self"
ON public.access_audit_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Only admins can read the log.
CREATE POLICY "access_audit_log_admin_select"
ON public.access_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete (e.g. retention pruning).
CREATE POLICY "access_audit_log_admin_delete"
ON public.access_audit_log
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));