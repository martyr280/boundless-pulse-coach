-- ---------- profiles.email + sync ----------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email <> u.email);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;
CREATE TRIGGER trg_sync_profile_email
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- Also stamp email at signup. handle_new_user already inserts into profiles; patch it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

-- ---------- user_partnerships ----------
CREATE TABLE public.user_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_partnership UNIQUE (requester_id, recipient_id)
);

CREATE OR REPLACE FUNCTION public.validate_user_partnership()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.requester_id = NEW.recipient_id THEN
    RAISE EXCEPTION 'You cannot partner with yourself.';
  END IF;
  IF NEW.status NOT IN ('pending','accepted','declined') THEN
    RAISE EXCEPTION 'Invalid partnership status: %', NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_user_partnership
  BEFORE INSERT OR UPDATE ON public.user_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_partnership();

ALTER TABLE public.user_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_select ON public.user_partnerships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY partner_insert ON public.user_partnerships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY partner_update ON public.user_partnerships FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY partner_delete ON public.user_partnerships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- ---------- partner_task_notes ----------
CREATE TABLE public.partner_task_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES public.user_partnerships(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  lci_top_task_id UUID NOT NULL REFERENCES public.lci_top_tasks(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_task_notes_task ON public.partner_task_notes (lci_top_task_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_partner_task_note()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.note_text IS NULL OR length(btrim(NEW.note_text)) = 0 THEN
    RAISE EXCEPTION 'Note text cannot be blank.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_partner_task_note
  BEFORE INSERT OR UPDATE ON public.partner_task_notes
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_task_note();

ALTER TABLE public.partner_task_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select ON public.partner_task_notes FOR SELECT TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_partnerships up
      WHERE up.id = partnership_id
        AND (up.requester_id = auth.uid() OR up.recipient_id = auth.uid())
        AND up.status = 'accepted'
    )
  );

CREATE POLICY notes_insert ON public.partner_task_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_partnerships up
      WHERE up.id = partnership_id
        AND (up.requester_id = auth.uid() OR up.recipient_id = auth.uid())
        AND up.status = 'accepted'
    )
  );

-- Allow partners to read each other's profile (display_name, avatar, email) when accepted.
CREATE POLICY profiles_partner_select ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_partnerships up
      WHERE up.status = 'accepted'
        AND (
          (up.requester_id = auth.uid() AND up.recipient_id = profiles.id) OR
          (up.recipient_id = auth.uid() AND up.requester_id = profiles.id)
        )
    )
  );

-- Allow partners to read each other's weekly resets and lci sessions/top tasks.
CREATE POLICY weekly_partner_select ON public.user_weekly_resets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_partnerships up
      WHERE up.status = 'accepted'
        AND (
          (up.requester_id = auth.uid() AND up.recipient_id = user_weekly_resets.user_id) OR
          (up.recipient_id = auth.uid() AND up.requester_id = user_weekly_resets.user_id)
        )
    )
  );

CREATE POLICY lci_sessions_partner_select ON public.lci_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_partnerships up
      WHERE up.status = 'accepted'
        AND (
          (up.requester_id = auth.uid() AND up.recipient_id = lci_sessions.user_id) OR
          (up.recipient_id = auth.uid() AND up.requester_id = lci_sessions.user_id)
        )
    )
  );

CREATE POLICY lci_top_tasks_partner_select ON public.lci_top_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lci_sessions s
      JOIN public.user_partnerships up
        ON up.status = 'accepted'
       AND (
         (up.requester_id = auth.uid() AND up.recipient_id = s.user_id) OR
         (up.recipient_id = auth.uid() AND up.requester_id = s.user_id)
       )
      WHERE s.id = lci_top_tasks.session_id
    )
  );