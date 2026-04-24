import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ClipboardList, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'red' | 'yellow' | 'green';
interface PriorTask {
  id: string;
  title: string;
  status: Status;
  feel: string;
  obstacles: string;
  help_needed: string;
}

const STATUS_LABEL: Record<Status, string> = { red: 'Red', yellow: 'Yellow', green: 'Green' };

const LCINewPage = () => {
  const navigate = useNavigate();
  const [sessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDate, setNextDate] = useState('');
  const [highs, setHighs] = useState({ personal_high: '', business_high: '', personal_low: '', business_low: '' });
  const [yearReview, setYearReview] = useState('');
  const [helpNeeded, setHelpNeeded] = useState('');
  const [topTasks, setTopTasks] = useState<string[]>(['', '', '', '', '']);
  const [priorTasks, setPriorTasks] = useState<PriorTask[]>([]);
  const [loadingPrior, setLoadingPrior] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load prior session's top tasks for review
  useEffect(() => {
    (async () => {
      const { data: prevSessions } = await supabase
        .from('lci_sessions')
        .select('id')
        .order('session_date', { ascending: false })
        .limit(1);
      if (prevSessions && prevSessions.length > 0) {
        const { data: prev } = await supabase
          .from('lci_top_tasks')
          .select('id, title')
          .eq('session_id', prevSessions[0].id)
          .order('position');
        if (prev) {
          setPriorTasks(prev.map((t: any) => ({
            id: t.id, title: t.title, status: 'green' as Status,
            feel: '', obstacles: '', help_needed: '',
          })));
        }
      }
      setLoadingPrior(false);
    })();
  }, []);

  const updatePrior = (idx: number, patch: Partial<PriorTask>) => {
    setPriorTasks((prev) => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  const updateTopTask = (idx: number, val: string) => {
    setTopTasks((prev) => prev.map((t, i) => i === idx ? val : t));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Create session
      const { data: session, error: sessionErr } = await supabase
        .from('lci_sessions')
        .insert({
          session_date: sessionDate,
          next_lci_date: nextDate || null,
          year_review: yearReview,
          help_needed: helpNeeded,
        })
        .select('id')
        .single();
      if (sessionErr || !session) throw sessionErr ?? new Error('Failed to create session');

      // 2. Highs/lows
      const hlRows = (Object.keys(highs) as (keyof typeof highs)[])
        .map((k) => ({ session_id: session.id, kind: k, body: highs[k] }))
        .filter((r) => r.body.trim() !== '');
      if (hlRows.length) await supabase.from('lci_highs_lows').insert(hlRows);

      // 3. New top tasks (and create matching action items)
      const newTaskRows = topTasks
        .map((title, position) => ({ session_id: session.id, title: title.trim(), position, status: 'green' }))
        .filter((r) => r.title !== '');
      if (newTaskRows.length) {
        await supabase.from('lci_top_tasks').insert(newTaskRows);
        await supabase.from('action_items').insert(
          newTaskRows.map((r) => ({ title: r.title, source_lci_id: session.id }))
        );
      }

      // 4. Save status updates on prior tasks as new dated notes on the matching action items
      for (const p of priorTasks) {
        if (!p.feel && !p.obstacles && !p.help_needed && p.status === 'green') continue;
        const note = [
          `Status: ${STATUS_LABEL[p.status]}`,
          p.feel && `Feel: ${p.feel}`,
          p.obstacles && `In the way: ${p.obstacles}`,
          p.help_needed && `Help needed: ${p.help_needed}`,
        ].filter(Boolean).join(' · ');
        // Find matching action_item by title
        const { data: ai } = await supabase
          .from('action_items')
          .select('id')
          .eq('title', p.title)
          .order('created_at', { ascending: false })
          .limit(1);
        if (ai && ai.length > 0) {
          await supabase.from('action_item_updates').insert({ action_item_id: ai[0].id, note });
          if (p.status === 'green') {
            await supabase.from('action_items').update({ completed_at: new Date().toISOString() }).eq('id', ai[0].id);
          }
        }
      }

      // 5. Trigger AI briefing (fire-and-forget for UX, but await so we can show it)
      toast.success('LCI saved. Generating coach briefing…');
      const briefingResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lci-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ session_id: session.id }),
        }
      );
      if (!briefingResp.ok) {
        const err = await briefingResp.json().catch(() => ({}));
        toast.error(err.error || 'Briefing failed (LCI still saved)');
      }
      navigate('/lci');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save LCI');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="font-bold">Saving and generating briefing…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/lci')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">New LCI</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Catch up, align, connect, and decide the top tasks for the next period.
      </p>

      {/* Next LCI date */}
      <Card className="border-2 rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">1. Next LCI Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="rounded-2xl" />
          <p className="text-[11px] text-muted-foreground mt-2">
            We'll send a WhatsApp prep nudge 3 days before this date.
          </p>
        </CardContent>
      </Card>

      {/* Highs & Lows */}
      <Card className="border-2 rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">2. Highs &amp; Lows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            ['personal_high', 'Personal High'],
            ['business_high', 'Business High'],
            ['personal_low', 'Personal Low'],
            ['business_low', 'Business Low'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <p className="text-xs font-bold mb-1">{label}</p>
              <Textarea
                rows={2}
                value={highs[key]}
                onChange={(e) => setHighs((h) => ({ ...h, [key]: e.target.value }))}
                className="rounded-2xl text-sm"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Review prior top tasks */}
      <Card className="border-2 rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">3. Review Last Period's Top Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPrior && <p className="text-xs text-muted-foreground">Loading prior tasks…</p>}
          {!loadingPrior && priorTasks.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No prior LCI found — skip this section.</p>
          )}
          {priorTasks.map((p, idx) => (
            <div key={p.id} className="border-2 rounded-2xl p-3 space-y-2">
              <p className="font-bold text-sm">{p.title}</p>
              <div className="flex gap-2">
                {(['red', 'yellow', 'green'] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => updatePrior(idx, { status: s })}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-full border-2 transition-colors ${
                      p.status === s
                        ? s === 'red' ? 'bg-destructive text-destructive-foreground border-destructive'
                          : s === 'yellow' ? 'bg-warning text-warning-foreground border-warning'
                          : 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-muted-foreground'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <Textarea rows={1} placeholder="How do you feel about it?" value={p.feel}
                onChange={(e) => updatePrior(idx, { feel: e.target.value })} className="text-xs rounded-xl" />
              <Textarea rows={1} placeholder="Anything getting in your way?" value={p.obstacles}
                onChange={(e) => updatePrior(idx, { obstacles: e.target.value })} className="text-xs rounded-xl" />
              <Textarea rows={1} placeholder="How can others help?" value={p.help_needed}
                onChange={(e) => updatePrior(idx, { help_needed: e.target.value })} className="text-xs rounded-xl" />
              {p.status === 'green' && (
                <p className="text-[10px] text-primary font-semibold">Will mark the matching action item as completed.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Year review */}
      <Card className="border-2 rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">4. Year Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Anything to update or add? What did you learn? Top tasks to focus on next?"
            value={yearReview}
            onChange={(e) => setYearReview(e.target.value)}
            className="rounded-2xl text-sm"
          />
        </CardContent>
      </Card>

      {/* New top tasks */}
      <Card className="border-2 rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">5. Five New Top Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topTasks.map((t, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs font-bold text-primary w-4">{i + 1}.</span>
              <Input
                value={t}
                onChange={(e) => updateTopTask(i, e.target.value)}
                placeholder={`Top task ${i + 1}`}
                className="rounded-2xl text-sm"
              />
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            Each non-empty task auto-creates an Action Item.
          </p>
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="border-2 rounded-3xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">6. What can your coach help you with?</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="What do you need to succeed?"
            value={helpNeeded}
            onChange={(e) => setHelpNeeded(e.target.value)}
            className="rounded-2xl text-sm"
          />
        </CardContent>
      </Card>

      <Button className="w-full font-bold rounded-2xl h-12 text-base" onClick={handleSave}>
        <Sparkles className="h-5 w-5 mr-2" />
        Save &amp; Generate Briefing
      </Button>
    </div>
  );
};

export default LCINewPage;
