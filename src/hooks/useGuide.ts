import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type YearCategory = 'Being' | 'Relating' | 'Doing' | 'Having';
export const YEAR_CATEGORIES: YearCategory[] = ['Being', 'Relating', 'Doing', 'Having'];

export interface YearPriority {
  id: string;
  user_id: string;
  year: number;
  category: YearCategory;
  priority_text: string;
  position: number;
}

export interface LifeVision {
  id: string;
  user_id: string;
  vision_text: string;
  updated_at: string;
}

// ---------- Life Vision ----------

export function useLifeVision() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_life_vision', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LifeVision | null> => {
      const { data, error } = await supabase
        .from('user_life_vision')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as LifeVision) ?? null;
    },
  });
}

export function useUpsertLifeVision() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vision_text: string) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_life_vision')
        .upsert(
          { user_id: user.id, vision_text },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_life_vision'] }),
  });
}

// ---------- Year Priorities ----------

export function useYearPriorities(year?: number) {
  const { user } = useAuth();
  const targetYear = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['user_year_priorities', user?.id, targetYear],
    enabled: !!user,
    queryFn: async (): Promise<YearPriority[]> => {
      const { data, error } = await supabase
        .from('user_year_priorities')
        .select('*')
        .eq('user_id', user!.id)
        .eq('year', targetYear)
        .order('category', { ascending: true })
        .order('position', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as YearPriority[];
    },
  });
}

export function useCreateYearPriority() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category: YearCategory; priority_text: string; year?: number; position?: number }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('user_year_priorities').insert({
        user_id: user.id,
        category: input.category,
        priority_text: input.priority_text,
        year: input.year ?? new Date().getFullYear(),
        position: input.position ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_year_priorities'] }),
  });
}

export function useUpdateYearPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; priority_text?: string; position?: number }) => {
      const patch: Record<string, unknown> = {};
      if (input.priority_text !== undefined) patch.priority_text = input.priority_text;
      if (input.position !== undefined) patch.position = input.position;
      const { error } = await supabase.from('user_year_priorities').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_year_priorities'] }),
  });
}

export function useDeleteYearPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_year_priorities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_year_priorities'] }),
  });
}

export { useTruthStatements as useWhyStatements } from './useTruthStatements';
