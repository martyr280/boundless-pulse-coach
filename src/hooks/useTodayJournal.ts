import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TodayJournal {
  id: string | null;
  entry_date: string;
  evening_reflection: string | null;
  evening_completed_at: string | null;
  cycle_day: number | null;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function useTodayJournal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['today_journal', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TodayJournal> => {
      const date = todayIso();
      const { data, error } = await supabase
        .from('user_journal_entries')
        .select('id, entry_date, evening_reflection, evening_completed_at, cycle_day')
        .eq('user_id', user!.id)
        .eq('entry_date', date)
        .maybeSingle();
      if (error) throw error;
      return (
        (data as TodayJournal) ?? {
          id: null,
          entry_date: date,
          evening_reflection: null,
          evening_completed_at: null,
          cycle_day: null,
        }
      );
    },
  });
}

export function useSaveEveningReflection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('Not signed in');
      const date = todayIso();
      const trimmed = text.trim();
      const completedAt = trimmed ? new Date().toISOString() : null;

      // Try to find existing row for today
      const { data: existing, error: lookupErr } = await supabase
        .from('user_journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', date)
        .maybeSingle();
      if (lookupErr) throw lookupErr;

      if (existing?.id) {
        const { error } = await supabase
          .from('user_journal_entries')
          .update({
            evening_reflection: trimmed || null,
            evening_completed_at: completedAt,
          } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_journal_entries').insert({
          user_id: user.id,
          entry_date: date,
          daily_rating: 0,
          step_count: 0,
          evening_reflection: trimmed || null,
          evening_completed_at: completedAt,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today_journal'] });
      qc.invalidateQueries({ queryKey: ['current_cycle'] });
    },
  });
}
