import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type YearCategory = 'Relationships' | 'Achievements' | 'Habits' | 'Wealth';
export const YEAR_CATEGORIES: YearCategory[] = ['Relationships', 'Achievements', 'Habits', 'Wealth'];

export const YEAR_CATEGORY_SUBTITLES: Record<YearCategory, string> = {
  Relationships: 'Love, Family, Friends, Self',
  Achievements: 'Significance, Winning, Impact',
  Habits: 'Faith, Discipline, Fitness, Rituals',
  Wealth: 'Finance, Legacy, Freedom',
};

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
      const patch: { priority_text?: string; position?: number } = {};
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

// ---------- Pillar State (Current vs Future) ----------

import type { Pillar } from '@/lib/types';

export interface PillarState {
  id: string;
  user_id: string;
  pillar: Pillar;
  current_state: string;
  future_state: string;
  updated_at: string;
}

export function usePillarStates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_pillar_state', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PillarState[]> => {
      const { data, error } = await supabase
        .from('user_pillar_state')
        .select('*')
        .eq('user_id', user!.id)
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PillarState[];
    },
  });
}

export function useUpsertPillarState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pillar: Pillar; current_state?: string; future_state?: string }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_pillar_state')
        .upsert(
          {
            user_id: user.id,
            pillar: input.pillar,
            current_state: input.current_state ?? '',
            future_state: input.future_state ?? '',
          },
          { onConflict: 'user_id,pillar' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pillar_state'] }),
  });
}
