import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NudgePreferences {
  id: string;
  user_id: string;
  phone_number: string;
  display_name: string | null;
  nudge_enabled: boolean;
  gratitude_reminder: boolean;
  habit_reminder: boolean;
  step_reminder: boolean;
  preferred_hour: number;
  timezone: string;
}

export function useNudgePreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['nudge_preferences', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NudgePreferences | null> => {
      const { data, error } = await supabase
        .from('nudge_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as NudgePreferences) ?? null;
    },
  });
}

export function useUpsertNudgePreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<NudgePreferences, 'id' | 'user_id'>>) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('nudge_preferences')
        .upsert(
          { user_id: user.id, ...patch } as any,
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nudge_preferences', user?.id] }),
  });
}
