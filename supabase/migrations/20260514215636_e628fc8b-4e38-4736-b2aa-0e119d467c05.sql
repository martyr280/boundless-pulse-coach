CREATE INDEX IF NOT EXISTS idx_cohort_members_user_id
  ON public.cohort_members(user_id);

CREATE INDEX IF NOT EXISTS idx_action_item_updates_action_item_id
  ON public.action_item_updates(action_item_id);