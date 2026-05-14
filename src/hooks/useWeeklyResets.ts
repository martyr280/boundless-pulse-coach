import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Pillar } from '@/lib/types';

export interface WeeklyReset {
  id: string;
  week_start_date: string; // YYYY-MM-DD (Monday)
  scores: Record<Pillar, number | null>;
  personal_high: string;
  personal_low: string;
  business_high: string;
  business_low: string;
}

export interface WeeklyResetInput {
  weekStartDate: string;
  scores: Record<Pillar, number>;
  personal_high: string;
  personal_low: string;
  business_high: string;
  business_low: string;
}

/** Returns the Monday of the ISO week containing `date` as YYYY-MM-DD. */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

function rowToReset(r: any): WeeklyReset {
  return {
    id: r.id,
    week_start_date: r.week_start_date,
    scores: {
      Family: r.family_score,
      Finance: r.finance_score,
      Faith: r.faith_score,
      Fitness: r.fitness_score,
      Friends: r.friends_score,
      Fun: r.fun_score,
      Field: r.field_score,
    },
    personal_high: r.personal_high ?? '',
    personal_low: r.personal_low ?? '',
    business_high: r.business_high ?? '',
    business_low: r.business_low ?? '',
  };
}

export function useWeeklyResets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_weekly_resets', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyReset[]> => {
      const { data, error } = await supabase
        .from('user_weekly_resets')
        .select('*')
        .eq('user_id', user!.id)
        .order('week_start_date', { ascending: false })
        .limit(52);
      if (error) throw error;
      return (data ?? []).map(rowToReset);
    },
  });
}

export function useCurrentWeekReset() {
  const { data, ...rest } = useWeeklyResets();
  const wk = getWeekStart();
  return { data: data?.find((r) => r.week_start_date === wk) ?? null, ...rest };
}

export function useCreateOrUpdateWeeklyReset() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WeeklyResetInput) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_weekly_resets')
        .upsert(
          {
            user_id: user.id,
            week_start_date: input.weekStartDate,
            family_score: input.scores.Family,
            finance_score: input.scores.Finance,
            faith_score: input.scores.Faith,
            fitness_score: input.scores.Fitness,
            friends_score: input.scores.Friends,
            fun_score: input.scores.Fun,
            field_score: input.scores.Field,
            personal_high: input.personal_high || null,
            personal_low: input.personal_low || null,
            business_high: input.business_high || null,
            business_low: input.business_low || null,
          },
          { onConflict: 'user_id,week_start_date' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_weekly_resets'] }),
  });
}
