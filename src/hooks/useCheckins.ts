import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PillarScore, CheckIn, Pillar } from '@/lib/types';

const QK = {
  list: (uid?: string) => ['user_checkins', uid] as const,
  latest: (uid?: string) => ['user_checkins', 'latest', uid] as const,
};

async function fetchCheckins(userId: string): Promise<CheckIn[]> {
  const { data: checkins, error } = await supabase
    .from('user_checkins')
    .select('id, checked_in_at, overall_score, user_pillar_scores(pillar, score, whats_happening, how_it_feels)')
    .eq('user_id', userId)
    .order('checked_in_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (checkins ?? []).map((c: any) => ({
    id: c.id,
    date: (c.checked_in_at as string).split('T')[0],
    scores: (c.user_pillar_scores ?? []).map((s: any) => ({
      pillar: s.pillar as Pillar,
      score: s.score,
      whats_happening: s.whats_happening ?? '',
      how_it_feels: s.how_it_feels ?? '',
    })) as PillarScore[],
  }));
}

export function useCheckins() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.list(user?.id),
    queryFn: () => fetchCheckins(user!.id),
    enabled: !!user,
  });
}

export function useLatestCheckin() {
  const { data, ...rest } = useCheckins();
  return { data: data?.[0] ?? null, ...rest };
}

export function useCreateCheckin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scores: PillarScore[]) => {
      if (!user) throw new Error('Not signed in');
      const overall = scores.length
        ? Number((scores.reduce((s, p) => s + p.score, 0) / scores.length).toFixed(2))
        : null;
      const { data: checkin, error } = await supabase
        .from('user_checkins')
        .insert({ user_id: user.id, overall_score: overall })
        .select('id')
        .single();
      if (error) throw error;
      const rows = scores.map((s) => ({
        checkin_id: checkin.id,
        pillar: s.pillar,
        score: s.score,
        whats_happening: s.whats_happening ?? null,
        how_it_feels: s.how_it_feels ?? null,
      }));
      const { error: psErr } = await supabase.from('user_pillar_scores').insert(rows);
      if (psErr) throw psErr;
      return checkin.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_checkins'] });
    },
  });
}
