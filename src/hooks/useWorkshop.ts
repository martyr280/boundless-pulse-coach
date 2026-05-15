import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const TOTAL_STEPS = 9;

export interface ImportantPerson {
  name: string;
  age: string;
}

export interface WorkshopSession {
  id: string;
  user_id: string;
  current_step: number;
  mantra: string;
  future_self_date: string | null;
  future_self_age: number | null;
  important_people: ImportantPerson[];
  started_at: string;
  completed_at: string | null;
}

export interface GeneralIdea {
  id: string;
  idea_text: string;
  position: number;
}

export interface BestSelfHabit {
  id: string;
  habit_text: string;
  kind: 'start' | 'stop';
  position: number;
  is_active: boolean;
}

export interface MonthAction {
  id: string;
  action_text: string;
  position: number;
  due_date: string | null;
  completed_at: string | null;
}

// ---------- Session ----------

export function useWorkshopSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workshop_session', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WorkshopSession | null> => {
      const { data, error } = await supabase
        .from('workshop_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as WorkshopSession) ?? null;
    },
  });
}

export function useStartOrUpdateWorkshop() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WorkshopSession>) => {
      if (!user) throw new Error('Not signed in');
      const { data: existing } = await supabase
        .from('workshop_sessions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('workshop_sessions')
          .update(patch as never)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workshop_sessions')
          .insert({ user_id: user.id, current_step: 1, ...patch } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop_session'] }),
  });
}

export function useMarkStepComplete() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: number) => {
      if (!user) throw new Error('Not signed in');
      const { data: session } = await supabase
        .from('workshop_sessions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!session) return;
      await supabase.from('workshop_step_completions').upsert(
        { workshop_session_id: session.id, user_id: user.id, step } as never,
        { onConflict: 'workshop_session_id,step' },
      );
      const nextStep = Math.min(step + 1, TOTAL_STEPS);
      const updates: Record<string, unknown> = { current_step: nextStep };
      if (step === TOTAL_STEPS) updates.completed_at = new Date().toISOString();
      await supabase.from('workshop_sessions').update(updates as never).eq('id', session.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop_session'] }),
  });
}

// ---------- General Ideas ----------

export function useGeneralIdeas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_general_ideas', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<GeneralIdea[]> => {
      const { data, error } = await supabase
        .from('user_general_ideas')
        .select('*')
        .eq('user_id', user!.id)
        .order('position', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as GeneralIdea[];
    },
  });
}

export function useCreateGeneralIdea() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { idea_text: string; position?: number }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_general_ideas')
        .insert({ user_id: user.id, idea_text: input.idea_text, position: input.position ?? 0 } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_general_ideas'] }),
  });
}

export function useDeleteGeneralIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_general_ideas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_general_ideas'] }),
  });
}

// ---------- Best Self Habits ----------

export function useBestSelfHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_best_self_habits', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BestSelfHabit[]> => {
      const { data, error } = await supabase
        .from('user_best_self_habits')
        .select('*')
        .eq('user_id', user!.id)
        .order('position', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as BestSelfHabit[];
    },
  });
}

export function useCreateBestSelfHabit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { habit_text: string; kind: 'start' | 'stop'; position?: number }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_best_self_habits')
        .insert({
          user_id: user.id,
          habit_text: input.habit_text,
          kind: input.kind,
          position: input.position ?? 0,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_best_self_habits'] }),
  });
}

export function useDeleteBestSelfHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_best_self_habits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_best_self_habits'] }),
  });
}

// ---------- Month Actions ----------

export function useMonthActions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_month_actions', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MonthAction[]> => {
      const { data, error } = await supabase
        .from('user_month_actions')
        .select('*')
        .eq('user_id', user!.id)
        .order('position', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MonthAction[];
    },
  });
}

export function useCreateMonthAction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action_text: string; position?: number; due_date?: string | null }) => {
      if (!user) throw new Error('Not signed in');
      // Also push into action_items so it appears in /actions
      const { data: actionItem } = await supabase
        .from('action_items')
        .insert({
          user_id: user.id,
          title: input.action_text,
          due_date: input.due_date ?? null,
        } as never)
        .select('id')
        .single();
      const { error } = await supabase
        .from('user_month_actions')
        .insert({
          user_id: user.id,
          action_text: input.action_text,
          position: input.position ?? 0,
          due_date: input.due_date ?? null,
          action_item_id: actionItem?.id ?? null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_month_actions'] });
      qc.invalidateQueries({ queryKey: ['action_items'] });
    },
  });
}

export function useDeleteMonthAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_month_actions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_month_actions'] }),
  });
}
