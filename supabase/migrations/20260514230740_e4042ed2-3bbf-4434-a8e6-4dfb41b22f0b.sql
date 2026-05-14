
DROP POLICY IF EXISTS partner_update ON public.user_partnerships;

CREATE POLICY partner_update ON public.user_partnerships FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_user_partnership()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.requester_id = NEW.recipient_id THEN
    RAISE EXCEPTION 'You cannot partner with yourself.';
  END IF;
  IF NEW.status NOT IN ('pending','accepted','declined') THEN
    RAISE EXCEPTION 'Invalid partnership status: %', NEW.status;
  END IF;
  IF NEW.status = 'accepted' AND NEW.requester_id = auth.uid() THEN
    RAISE EXCEPTION 'Requester cannot accept their own partnership request.';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_access_audit_log_user ON public.access_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_audit_log_route ON public.access_audit_log (route, created_at DESC);
