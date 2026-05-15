import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PartnershipStatus = 'pending' | 'accepted' | 'declined';

export interface Partnership {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: PartnershipStatus;
  created_at: string;
  updated_at: string;
}

export interface PartnerTaskNote {
  id: string;
  partnership_id: string;
  author_id: string;
  lci_top_task_id: string;
  note_text: string;
  created_at: string;
}

export interface PartnerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface PartnerTopTask {
  id: string;
  session_id: string;
  title: string;
  status: string;
  position: number;
}

export interface PartnerWeeklyReset {
  id: string;
  user_id: string;
  week_start_date: string;
  family_score: number | null;
  finance_score: number | null;
  faith_score: number | null;
  fitness_score: number | null;
  friends_score: number | null;
  fun_score: number | null;
  field_score: number | null;
  personal_high: string | null;
  personal_low: string | null;
  business_high: string | null;
  business_low: string | null;
}

// ---------- Partnerships ----------

export function useMyPartnerships() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_partnerships', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Partnership[]> => {
      const { data, error } = await supabase
        .from('user_partnerships')
        .select('*')
        .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Partnership[];
    },
  });
}

export function useAcceptedPartner() {
  const { user } = useAuth();
  const { data: partnerships, ...rest } = useMyPartnerships();
  const accepted = (partnerships ?? []).find((p) => p.status === 'accepted') ?? null;
  const partnerId = accepted
    ? accepted.requester_id === user?.id
      ? accepted.recipient_id
      : accepted.requester_id
    : null;
  return { partnership: accepted, partnerId, ...rest };
}

export function useSendPartnerRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error('Not signed in');
      const cleaned = email.trim().toLowerCase();
      if (!cleaned) throw new Error('Enter an email.');
      const { data, error } = await supabase.functions.invoke('partner-request', {
        body: { email: cleaned },
      });
      if (error) {
        const msg = (data as any)?.error || error.message || 'Could not send request.';
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_partnerships'] }),
  });
}

export function useRespondToPartnerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'accepted' | 'declined' }) => {
      const { error } = await supabase
        .from('user_partnerships')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_partnerships'] }),
  });
}

// ---------- Partner data ----------

export function usePartnerProfile(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner_profile', partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<PartnerProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', partnerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PartnerProfile) ?? null;
    },
  });
}

export function usePartnerLatestWeeklyReset(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner_weekly_reset', partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<PartnerWeeklyReset | null> => {
      const { data, error } = await supabase
        .from('user_weekly_resets')
        .select('*')
        .eq('user_id', partnerId!)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PartnerWeeklyReset) ?? null;
    },
  });
}

export function usePartnerTopTasks(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner_top_tasks', partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<PartnerTopTask[]> => {
      const { data: session, error: sErr } = await supabase
        .from('lci_sessions')
        .select('id')
        .eq('user_id', partnerId!)
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!session) return [];
      const { data, error } = await supabase
        .from('lci_top_tasks')
        .select('id, session_id, title, status, position')
        .eq('session_id', session.id)
        .order('position', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PartnerTopTask[];
    },
  });
}

export function usePartnerTaskNotes(topTaskId: string | null) {
  return useQuery({
    queryKey: ['partner_task_notes', topTaskId],
    enabled: !!topTaskId,
    queryFn: async (): Promise<PartnerTaskNote[]> => {
      const { data, error } = await supabase
        .from('partner_task_notes')
        .select('*')
        .eq('lci_top_task_id', topTaskId!)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PartnerTaskNote[];
    },
  });
}

export function useCreatePartnerTaskNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { partnership_id: string; lci_top_task_id: string; note_text: string }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('partner_task_notes').insert({
        partnership_id: input.partnership_id,
        lci_top_task_id: input.lci_top_task_id,
        author_id: user.id,
        note_text: input.note_text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['partner_task_notes', vars.lci_top_task_id] }),
  });
}
