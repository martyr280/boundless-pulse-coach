import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUp, ArrowDown, Calendar, HelpCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

interface Session {
  id: string;
  session_date: string;
  next_lci_date: string | null;
  ai_briefing: string | null;
  year_review: string | null;
  help_needed: string | null;
}
interface Task {
  id: string; title: string; status: string; feel: string | null;
  obstacles: string | null; help_needed: string | null; position: number;
}
interface HighLow { id: string; kind: string; body: string }

const fmtDate = (d: string) => { try { return format(parseISO(d), 'EEEE, MMMM d, yyyy'); } catch { return d; } };

const statusPill = (s: string) =>
  s === 'red' ? 'bg-destructive/15 text-destructive'
    : s === 'yellow' ? 'bg-warning/15 text-warning'
    : 'bg-primary/15 text-primary';

const HL_LABEL: Record<string, { label: string; positive: boolean }> = {
  personal_high: { label: 'Personal high', positive: true },
  personal_low: { label: 'Personal low', positive: false },
  business_high: { label: 'Business high', positive: true },
  business_low: { label: 'Business low', positive: false },
};

export default function LCIDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [highsLows, setHighsLows] = useState<HighLow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: s }, { data: t }, { data: hl }] = await Promise.all([
        supabase.from('lci_sessions').select('*').eq('id', id).maybeSingle(),
        supabase.from('lci_top_tasks').select('*').eq('session_id', id).order('position'),
        supabase.from('lci_highs_lows').select('*').eq('session_id', id),
      ]);
      setSession((s as Session) ?? null);
      setTasks((t ?? []) as Task[]);
      setHighsLows((hl ?? []) as HighLow[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="container max-w-3xl py-10"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  }
  if (!session) {
    return (
      <div className="container max-w-3xl py-10 space-y-4">
        <p className="font-bold">LCI not found.</p>
        <Button onClick={() => navigate('/lci')} variant="outline">Back to LCI list</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6 pb-24">
      <button onClick={() => navigate('/lci')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" /> All Life Check-Ins
      </button>

      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Life Check-In</p>
        <h1 className="h-display text-3xl mt-2">{fmtDate(session.session_date)}</h1>
        {session.next_lci_date && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Next LCI: {fmtDate(session.next_lci_date)}
          </p>
        )}
      </div>

      {highsLows.length > 0 && (
        <Card className="rounded-3xl border-2">
          <CardHeader><CardTitle className="text-base">Highs &amp; Lows</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highsLows.map((h) => {
              const meta = HL_LABEL[h.kind] ?? { label: h.kind, positive: true };
              const Icon = meta.positive ? ArrowUp : ArrowDown;
              return (
                <div key={h.id} className={`rounded-2xl px-4 py-3 ${meta.positive ? 'bg-primary/5' : 'bg-muted/40'}`}>
                  <p className={`flex items-center gap-1 text-xs font-semibold mb-1 ${meta.positive ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Icon className="h-3 w-3" /> {meta.label}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{h.body}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card className="rounded-3xl border-2">
          <CardHeader><CardTitle className="text-base">Top Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((t, i) => (
              <div key={t.id} className="rounded-2xl border bg-muted/20 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>{t.title}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusPill(t.status)}`}>
                    {t.status}
                  </span>
                </div>
                {t.feel && <p className="text-xs"><span className="font-semibold text-muted-foreground">Feel: </span>{t.feel}</p>}
                {t.obstacles && <p className="text-xs"><span className="font-semibold text-muted-foreground">Obstacles: </span>{t.obstacles}</p>}
                {t.help_needed && <p className="text-xs"><span className="font-semibold text-muted-foreground">Help needed: </span>{t.help_needed}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {session.year_review && (
        <Card className="rounded-3xl border-2">
          <CardHeader><CardTitle className="text-base">Year Review</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{session.year_review}</p>
          </CardContent>
        </Card>
      )}

      {session.help_needed && (
        <Card className="rounded-3xl border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Support Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{session.help_needed}</p>
          </CardContent>
        </Card>
      )}

      {session.ai_briefing && (
        <Card className="rounded-3xl border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /> AI Briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-muted/40 p-4 rounded-2xl font-sans">{session.ai_briefing}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
