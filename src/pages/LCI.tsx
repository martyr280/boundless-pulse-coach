import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, ClipboardList, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SessionRow {
  id: string;
  session_date: string;
  next_lci_date: string | null;
  ai_briefing: string | null;
  created_at: string;
}

interface TaskRow { session_id: string; status: string }

const statusColor = (s: string) =>
  s === 'red' ? 'bg-destructive/15 text-destructive'
    : s === 'yellow' ? 'bg-warning/15 text-warning'
    : 'bg-primary/15 text-primary';

const LCIPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from('lci_sessions')
        .select('id, session_date, next_lci_date, ai_briefing, created_at')
        .order('session_date', { ascending: false });
      const { data: t } = await supabase
        .from('lci_top_tasks')
        .select('session_id, status');
      setSessions((s ?? []) as SessionRow[]);
      setTasks((t ?? []) as TaskRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold">Life Check-In</h1>
        <Button onClick={() => navigate('/lci/new')} className="rounded-2xl font-bold">
          <Plus className="h-4 w-4 mr-1" /> New LCI
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Catch up, align, connect, and decide the most important actions to keep moving forward.
      </p>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && sessions.length === 0 && (
        <Card className="border-2 rounded-3xl">
          <CardContent className="p-6 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold mb-1">No LCIs yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start your first Life Check-In worksheet.
            </p>
            <Button onClick={() => navigate('/lci/new')} className="rounded-2xl font-bold">
              <Plus className="h-4 w-4 mr-1" /> Start LCI
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sessions.map((s) => {
          const sTasks = tasks.filter((t) => t.session_id === s.id);
          const counts = {
            red: sTasks.filter((t) => t.status === 'red').length,
            yellow: sTasks.filter((t) => t.status === 'yellow').length,
            green: sTasks.filter((t) => t.status === 'green').length,
          };
          return (
            <Card key={s.id} className="border-2 rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>{s.session_date}</span>
                  {s.ai_briefing && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> AI
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusColor('red')}`}>R {counts.red}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusColor('yellow')}`}>Y {counts.yellow}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusColor('green')}`}>G {counts.green}</span>
                  <span className="ml-auto text-muted-foreground">
                    {sTasks.length} top tasks
                  </span>
                </div>
                {s.next_lci_date && (
                  <p className="text-xs text-muted-foreground">Next LCI: {s.next_lci_date}</p>
                )}
                {s.ai_briefing && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-semibold text-primary">View briefing</summary>
                    <pre className="whitespace-pre-wrap text-xs mt-2 bg-muted/40 p-3 rounded-2xl font-sans">{s.ai_briefing}</pre>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LCIPage;
