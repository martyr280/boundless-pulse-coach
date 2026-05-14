import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { JournalEntry } from '@/lib/types';

export interface NewJournalEntry {
  dailyRating: number;
  stepCount: number;
  topPriority: string;
  topPriorityDone: boolean;
  gratitude: [string, string, string];
  bestSelfHabits: Record<string, boolean>;
}

async function fetchEntries(userId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('user_journal_entries')
    .select('id, entry_date, daily_rating, step_count, top_priority, top_priority_done, gratitude_1, gratitude_2, gratitude_3, user_journal_habits(habit_name, completed)')
    .eq('user_id', userId)
    .order('entry_date', { ascending: true })
    .limit(2000);
  if (error) throw error;
  return (data ?? []).map((e: any) => ({
    id: e.id,
    date: e.entry_date,
    dailyRating: e.daily_rating,
    stepCount: e.step_count,
    topPriority: e.top_priority ?? '',
    topPriorityDone: e.top_priority_done,
    gratitude: [e.gratitude_1 ?? '', e.gratitude_2 ?? '', e.gratitude_3 ?? ''] as [string, string, string],
    bestSelfHabits: Object.fromEntries(
      (e.user_journal_habits ?? []).map((h: any) => [h.habit_name, h.completed]),
    ),
  }));
}

export function useJournalEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_journal_entries', user?.id],
    queryFn: () => fetchEntries(user!.id),
    enabled: !!user,
  });
}

export function useCreateJournalEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: NewJournalEntry) => {
      if (!user) throw new Error('Not signed in');
      const { data: created, error } = await supabase
        .from('user_journal_entries')
        .insert({
          user_id: user.id,
          entry_date: new Date().toISOString().split('T')[0],
          daily_rating: entry.dailyRating,
          step_count: entry.stepCount,
          top_priority: entry.topPriority || null,
          top_priority_done: entry.topPriorityDone,
          gratitude_1: entry.gratitude[0] || null,
          gratitude_2: entry.gratitude[1] || null,
          gratitude_3: entry.gratitude[2] || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const habits = Object.entries(entry.bestSelfHabits).map(([habit_name, completed]) => ({
        journal_entry_id: created.id,
        habit_name,
        completed,
      }));
      if (habits.length) {
        const { error: hErr } = await supabase.from('user_journal_habits').insert(habits);
        if (hErr) throw hErr;
      }
      return created.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_journal_entries'] }),
  });
}
