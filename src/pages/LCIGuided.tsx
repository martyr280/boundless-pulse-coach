import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['highs_lows','top_task_review','your_now','year_review','new_top_tasks','help_needed'] as const;
const LABELS: Record<string,string> = {
  highs_lows: 'Highs & Lows', top_task_review: 'Top Task Review', your_now: '(Y)our Now',
  year_review: 'Year Review', new_top_tasks: 'New Top Tasks', help_needed: 'Support Needed',
};

export default function LCIGuided() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [runId, setRunId] = useState<string | undefined>(id);
  const [step, setStep] = useState<string>('highs_lows');
  const [status, setStatus] = useState<string>('in_progress');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    (async () => {
      if (id) {
        const { data } = await supabase.from('lci_guided_runs').select('*').eq('id', id).maybeSingle();
        if (data) {
          setRunId(data.id);
          setStep(data.step); setStatus(data.status);
          setMessages((data.messages as any[]) ?? []);
          // If resumed run has no messages yet, kick off the first turn.
          if (!((data.messages as any[]) ?? []).length) {
            await turn(undefined, false, data.id);
          }
        }
        return;
      }
      // No id in URL — try to resume latest in-progress run, otherwise start new.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('lci_guided_runs')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          setRunId(existing.id);
          setStep(existing.step); setStatus(existing.status);
          setMessages((existing.messages as any[]) ?? []);
          navigate(`/lci/guided/${existing.id}`, { replace: true });
          if (!((existing.messages as any[]) ?? []).length) {
            await turn(undefined, false, existing.id);
          }
          return;
        }
      }
      await turn(undefined, true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function turn(user_message?: string, start = false, explicitRunId?: string) {
    setBusy(true);
    try {
      const activeRunId = explicitRunId ?? runId;
      const { data, error } = await supabase.functions.invoke('lci-guided-session', {
        body: { run_id: activeRunId, user_message, start },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      setRunId(data.run_id);
      setStep(data.step);
      setStatus(data.status);
      setMessages((m) => {
        const next = [...m];
        if (user_message) next.push({ role: 'user', content: user_message });
        if (data.assistant) next.push({ role: 'assistant', content: data.assistant });
        return next;
      });
      // Persist run id in URL so refresh / return resumes the conversation.
      if (data.run_id && data.run_id !== id) {
        navigate(`/lci/guided/${data.run_id}`, { replace: true });
      }
      if (data.status === 'complete' && data.materialized_session_id) {
        toast.success('Guided Life Check In complete — saved to your Life Check In history.');
        setTimeout(() => navigate(`/lci/${data.materialized_session_id}`), 1200);
      } else if (data.step_complete && data.status !== 'complete') {
        // Step advanced — chain another turn so the coach kicks off the new step.
        setBusy(false);
        await turn(undefined, false, data.run_id);
        return;
      }
    } catch (e: any) {
      toast.error(e.message || 'Coach error');
    } finally {
      setBusy(false);
    }
  }

  const stepIdx = STEPS.indexOf(step as any);
  const progress = ((stepIdx + (status === 'complete' ? 1 : 0)) / STEPS.length) * 100;

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Guided Life Check In</p>
        <h1 className="h-display text-3xl mt-2">{LABELS[step] ?? step}</h1>
        <Progress value={progress} className="mt-4" />
        <p className="text-xs text-muted-foreground mt-2">Step {Math.min(stepIdx + 1, STEPS.length)} of {STEPS.length}</p>
      </div>
      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
        <CardContent>
          <div ref={scroller} className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {messages.map((m, i) => (
              <div key={i} className={`rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-primary/10 ml-12' : 'bg-muted/40 mr-12'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Coach is thinking…</div>}
          </div>
          {status !== 'complete' && (
            <div className="mt-4 space-y-3">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3}
                placeholder="Type your answer…" disabled={busy} />
              <Button variant="premium" className="w-full rounded-full font-bold uppercase tracking-[0.18em] h-11"
                disabled={busy || !input.trim()}
                onClick={() => { const v = input.trim(); setInput(''); turn(v); }}>
                Send
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
