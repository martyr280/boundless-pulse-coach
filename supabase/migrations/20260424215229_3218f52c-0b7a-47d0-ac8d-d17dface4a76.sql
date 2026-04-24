
ALTER TABLE public.action_items
  ADD COLUMN source_top_task_id UUID REFERENCES public.lci_top_tasks(id) ON DELETE SET NULL;

-- Backfill: link existing action items to their LCI top task by source_lci_id + title
UPDATE public.action_items ai
SET source_top_task_id = t.id
FROM public.lci_top_tasks t
WHERE ai.source_top_task_id IS NULL
  AND ai.source_lci_id IS NOT NULL
  AND ai.source_lci_id = t.session_id
  AND ai.title = t.title;

CREATE INDEX IF NOT EXISTS idx_action_items_source_top_task_id
  ON public.action_items(source_top_task_id);
