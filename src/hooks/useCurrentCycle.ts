import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserCycle {
  id: string;
  user_id: string;
  started_on: string;
  ended_on: string | null;
  target_days: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface CycleProgress {
  cycle: UserCycle | null;
  dayNumber: number;       // 1-based day in the cycle, clamped to target_days
  completedDays: number;   // distinct journal-entry dates within the cycle
  targetDays: number;
}

function dayDiff(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso + 'T00:00:00Z').getTime();
  return Math.floor((b - a) / 86_400_000);
}

export function useCurrentCycle() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['current_cycle', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CycleProgress> => {
      const { data: cycles, error } = await supabase
        .from('user_cycles')
        .select('id, user_id, started_on, ended_on, target_days, status')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('started_on', { ascending: false })
        .limit(1);
      if (error) throw error;
      const cycle = (cycles?.[0] as UserCycle | undefined) ?? null;
      if (!cycle) return { cycle: null, dayNumber: 0, completedDays: 0, targetDays: 30 };

      const today = new Date().toISOString().split('T')[0];
      const dayNumber = Math.min(
        cycle.target_days,
        Math.max(1, dayDiff(cycle.started_on, today) + 1),
      );

      const { count } = await supabase
        .from('user_journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('entry_date', cycle.started_on);

      return {
        cycle,
        dayNumber,
        completedDays: count ?? 0,
        targetDays: cycle.target_days,
      };
    },
  });
}

export function useStartCycle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetDays?: number) => {
      if (!user) throw new Error('Not signed in');
      const days = targetDays ?? 30;
      // Close any prior active cycle (defensive — partial unique index also enforces this)
      await supabase
        .from('user_cycles')
        .update({ status: 'abandoned', ended_on: new Date().toISOString().split('T')[0] } as any)
        .eq('user_id', user.id)
        .eq('status', 'active');
      const { error } = await supabase.from('user_cycles').insert({
        user_id: user.id,
        target_days: days,
        status: 'active',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['current_cycle'] }),
  });
}

export function useEndCycle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'completed' | 'abandoned' }) => {
      const { error } = await supabase
        .from('user_cycles')
        .update({ status: input.status, ended_on: new Date().toISOString().split('T')[0] })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['current_cycle', user?.id] }),
  });
}
