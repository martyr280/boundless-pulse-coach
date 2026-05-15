import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, ClipboardList, Sparkles, ArrowUp, ArrowDown, Calendar, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

interface SessionRow {
  id: string;
  session_date: string;
  next_lci_date: string | null;
  ai_briefing: string | null;
  year_review: string | null;
  help_needed: string | null;
  created_at: string;
}

interface TaskRow {
  id: string;
  session_id: string;
  status: string;
  title: string;
  position: number;
}

interface HighLowRow {
  session_id: string;
  kind: string;
  body: string;
}

const statusDot = (s: string) =>
  s === 'red' ? 'bg-destructive'
    : s === 'yellow' ? 'bg-warning'
    : 'bg-primary';

const statusPill = (s: string) =>
  s === 'red' ? 'bg-destructive/15 text-destructive'
    : s === 'yellow' ? 'bg-warning/15 text-warning'
    : 'bg-primary/15 text-primary';

const fmtDate = (d: string) => {
  try { return format(parseISO(d), 'EEE, MMM d, yyyy'); } catch { return d; }
};

const LCIPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [highsLows, setHighsLows] = useState<HighLowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from('lci_sessions')
        .select('id, session_date, next_lci_date, ai_briefing, year_review, help_needed, created_at')
        .order('session_date', { ascending: false });
      const { data: t } = await supabase
        .from('lci_top_tasks')
        .select('id, session_id, status, title, position')
        .order('position', { ascending: true });
      const { data: hl } = await supabase
        .from('lci_highs_lows')
        .select('session_id, kind, body');
      setSessions((s ?? []) as SessionRow[]);
      setTasks((t ?? []) as TaskRow[]);
      setHighsLows((hl ?? []) as HighLowRow[]);
      setLoading(false);
    })();
  }, []);

  const tasksBySession = useMemo(() => {
    const m = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      const arr = m.get(t.session_id) ?? [];
      arr.push(t);
      m.set(t.session_id, arr);
    }
    return m;
  }, [tasks]);

  const hlBySession = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    for (const h of highsLows) {
      const obj = m.get(h.session_id) ?? {};
      obj[h.kind] = h.body;
      m.set(h.session_id, obj);
    }
    return m;
  }, [highsLows]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-2xl mx-auto">
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
          const sTasks = tasksBySession.get(s.id) ?? [];
          const counts = {
            red: sTasks.filter((t) => t.status === 'red').length,
            yellow: sTasks.filter((t) => t.status === 'yellow').length,
            green: sTasks.filter((t) => t.status === 'green').length,
          };
          const hl = hlBySession.get(s.id) ?? {};
          const personalHigh = hl.personal_high;
          const personalLow = hl.personal_low;
          const businessHigh = hl.business_high;
          const businessLow = hl.business_low;
          const hasHL = personalHigh || personalLow || businessHigh || businessLow;
          return (
            <Card
              key={s.id}
              className="border-2 rounded-3xl cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/lci/${s.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between gap-2">
                  <span>{fmtDate(s.session_date)}</span>
                  {s.ai_briefing && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> AI
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusPill('red')}`}>R {counts.red}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusPill('yellow')}`}>Y {counts.yellow}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusPill('green')}`}>G {counts.green}</span>
                  <span className="ml-auto text-muted-foreground">
                    {sTasks.length} top {sTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                {sTasks.length > 0 && (
                  <ul className="space-y-1.5">
                    {sTasks.slice(0, 5).map((t) => (
                      <li key={t.id} className="flex items-start gap-2 text-sm">
                        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusDot(t.status)}`} />
                        <span className="line-clamp-1">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {hasHL && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {personalHigh && (
                      <div className="rounded-2xl bg-primary/5 px-3 py-2 text-xs">
                        <p className="flex items-center gap-1 font-semibold text-primary mb-0.5"><ArrowUp className="h-3 w-3" /> Personal high</p>
                        <p className="text-foreground/90 line-clamp-2">{personalHigh}</p>
                      </div>
                    )}
                    {personalLow && (
                      <div className="rounded-2xl bg-muted/40 px-3 py-2 text-xs">
                        <p className="flex items-center gap-1 font-semibold text-muted-foreground mb-0.5"><ArrowDown className="h-3 w-3" /> Personal low</p>
                        <p className="text-foreground/90 line-clamp-2">{personalLow}</p>
                      </div>
                    )}
                    {businessHigh && (
                      <div className="rounded-2xl bg-primary/5 px-3 py-2 text-xs">
                        <p className="flex items-center gap-1 font-semibold text-primary mb-0.5"><ArrowUp className="h-3 w-3" /> Business high</p>
                        <p className="text-foreground/90 line-clamp-2">{businessHigh}</p>
                      </div>
                    )}
                    {businessLow && (
                      <div className="rounded-2xl bg-muted/40 px-3 py-2 text-xs">
                        <p className="flex items-center gap-1 font-semibold text-muted-foreground mb-0.5"><ArrowDown className="h-3 w-3" /> Business low</p>
                        <p className="text-foreground/90 line-clamp-2">{businessLow}</p>
                      </div>
                    )}
                  </div>
                )}

                {s.year_review && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    <span className="font-semibold text-foreground/80">Year review: </span>{s.year_review}
                  </p>
                )}

                {s.help_needed && (
                  <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1">
                    <HelpCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span><span className="font-semibold text-foreground/80">Support: </span>{s.help_needed}</span>
                  </p>
                )}

                {s.next_lci_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Next LCI: {fmtDate(s.next_lci_date)}
                  </p>
                )}

                {s.ai_briefing && (
                  <details className="text-sm" onClick={(e) => e.stopPropagation()}>
                    <summary className="cursor-pointer font-semibold text-primary">View AI briefing</summary>
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
