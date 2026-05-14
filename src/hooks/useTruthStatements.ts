import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TruthStatement } from '@/lib/types';

async function fetchTruths(userId: string): Promise<TruthStatement[]> {
  const { data, error } = await supabase
    .from('user_truth_statements')
    .select('id, created_at, priority, levels, statement')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    id: t.id,
    date: (t.created_at as string).split('T')[0],
    priority: t.priority,
    levels: Array.isArray(t.levels) ? (t.levels as string[]) : [],
    statement: t.statement,
  }));
}

export function useTruthStatements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_truth_statements', user?.id],
    queryFn: () => fetchTruths(user!.id),
    enabled: !!user,
  });
}

export function useCreateTruthStatement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { priority: string; levels: string[]; statement: string }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('user_truth_statements').insert({
        user_id: user.id,
        priority: input.priority,
        levels: input.levels,
        statement: input.statement,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_truth_statements'] }),
  });
}
