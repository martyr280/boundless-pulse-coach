import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NudgesToggle() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['app_setting', 'nudges_enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings').select('value, updated_at')
        .eq('key', 'nudges_enabled').maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enabled = data?.value === true;

  const mut = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'nudges_enabled',
        value: next as any,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ['app_setting', 'nudges_enabled'] });
      toast.success(next ? 'Nudges enabled' : 'Nudges disabled');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not update setting'),
  });

  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
          <Bell className="h-3.5 w-3.5" /> Nudge engine
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {isLoading ? 'Loading…' : enabled ? 'Sending is ON' : 'Sending is OFF'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Master kill-switch. When off, the scheduled job runs but sends nothing.
          </p>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={enabled}
            disabled={mut.isPending}
            onCheckedChange={(v) => mut.mutate(v)}
          />
        )}
      </CardContent>
    </Card>
  );
}
