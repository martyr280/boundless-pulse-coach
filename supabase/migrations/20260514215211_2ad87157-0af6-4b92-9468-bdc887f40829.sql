-- Extend action_item_updates with coach push tracking
ALTER TABLE public.action_item_updates
  ADD COLUMN IF NOT EXISTS update_type TEXT NOT NULL DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS update_text TEXT,
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Link cohort_members to real auth users
ALTER TABLE public.cohort_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Coaches can read action_items for users linked to their cohort members
DROP POLICY IF EXISTS "coach_read_member_action_items" ON public.action_items;
CREATE POLICY "coach_read_member_action_items"
ON public.action_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cohort_members cm
    JOIN public.coaches c ON c.id = cm.coach_id
    WHERE cm.user_id = action_items.user_id
      AND c.user_id = auth.uid()
  )
);

-- Coaches can insert action_item_updates for those same items
DROP POLICY IF EXISTS "coach_insert_action_item_updates" ON public.action_item_updates;
CREATE POLICY "coach_insert_action_item_updates"
ON public.action_item_updates FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.action_items ai
    JOIN public.cohort_members cm ON cm.user_id = ai.user_id
    JOIN public.coaches c ON c.id = cm.coach_id
    WHERE ai.id = action_item_updates.action_item_id
      AND c.user_id = auth.uid()
  )
);

-- Coaches can read action_item_updates they or their cohort members created
DROP POLICY IF EXISTS "coach_read_action_item_updates" ON public.action_item_updates;
CREATE POLICY "coach_read_action_item_updates"
ON public.action_item_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.action_items ai
    JOIN public.cohort_members cm ON cm.user_id = ai.user_id
    JOIN public.coaches c ON c.id = cm.coach_id
    WHERE ai.id = action_item_updates.action_item_id
      AND c.user_id = auth.uid()
  )
);