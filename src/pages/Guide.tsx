import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, X, Loader2, ArrowLeft, ArrowRight, Sparkles, Printer, Download,
  Check, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import HeroFrame from '@/components/visual/HeroFrame';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import PullQuote from '@/components/visual/PullQuote';
import heroForest from '@/assets/hero-forest.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import {
  useLifeVision, useUpsertLifeVision,
  useYearPriorities, useCreateYearPriority, useDeleteYearPriority,
  usePillarStates, useUpsertPillarState,
  useWhyStatements,
  YEAR_CATEGORIES, YEAR_CATEGORY_SUBTITLES,
  type YearCategory,
} from '@/hooks/useGuide';
import {
  useWorkshopSession, useStartOrUpdateWorkshop, useMarkStepComplete,
  useGeneralIdeas, useCreateGeneralIdea, useDeleteGeneralIdea,
  useBestSelfHabits, useCreateBestSelfHabit, useDeleteBestSelfHabit,
  useMonthActions, useCreateMonthAction, useDeleteMonthAction,
  TOTAL_STEPS, type ImportantPerson,
} from '@/hooks/useWorkshop';
import { useCreateTruthStatement } from '@/hooks/useTruthStatements';
import { useCreateCheckin } from '@/hooks/useCheckins';
import { PILLARS, PILLAR_SUBTOPICS, type Pillar, type PillarScore } from '@/lib/types';

const STEP_TITLES: Record<number, { eyebrow: string; title: string; intro: string }> = {
  1: {
    eyebrow: 'STEP 1 · WELCOME',
    title: 'Begin your Boundless Life Guide.',
    intro: 'A guided walk through eight reflections from the printed Boundless Life Guide. Take your time on each — the data lives with you, in this app, after you finish.',
  },
  2: {
    eyebrow: 'STEP 2 · YOUR IDEAS',
    title: '(Y)our Ideas',
    intro: 'Ideas can be a quote, a thought, or an action item. Capture General Ideas as they arise, and Priority Ideas — more action-oriented things that could become a 30-day to 1-year focus.',
  },
  3: {
    eyebrow: 'STEP 3 · YOUR NOW',
    title: '(Y)our Now',
    intro: 'For each of the seven areas of your life, rate your level of satisfaction (1 = lowest, 10 = highest).',
  },
  4: {
    eyebrow: 'STEP 3b · REFLECT',
    title: 'Where you are. How it feels.',
    intro: "Reflect on each pillar score. What's happening — or not happening — that's causing your score? How does it feel?",
  },
  5: {
    eyebrow: 'STEP 4 · YOUR LIFE',
    title: '(Y)our Life — 10+ years from now',
    intro: 'Pick a date 10+ years from today. Picture your future. Describe what is true in each of the four categories on that day.',
  },
  6: {
    eyebrow: 'STEP 5 · YOUR YEAR',
    title: '(Y)our Year',
    intro: 'Reviewing Your Life, what must happen this year in each of the four categories to move you closer to that future?',
  },
  7: {
    eyebrow: 'STEP 6 · YOUR WHY',
    title: '(Y)our Why',
    intro: 'For one of your priorities, work down the seven levels — keep asking "Why does it really matter to me?" The truth at the bottom is your Why.',
  },
  8: {
    eyebrow: 'STEP 7 · YOUR BEST SELF',
    title: 'Starts & Stops',
    intro: 'What are the daily actions that — done or not done — bring you closer to your best self? List your Starts (build) and Stops (release).',
  },
  9: {
    eyebrow: 'STEP 8 · YOUR MONTH',
    title: '(Y)our Month',
    intro: 'In the next 30 days, what are up to six actions you will take in alignment with your Year priorities? These will appear in your Actions list.',
  },
};

const RECAP_STEP = TOTAL_STEPS + 1; // step 10 = recap

// ---------------- Shell ----------------

function WorkshopShell({
  step, children, onBack, onNext, nextLabel, nextDisabled, hideNext,
}: {
  step: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
}) {
  const meta = STEP_TITLES[step];
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="eyebrow">{meta?.eyebrow}</span>
          <span>Step {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <div className="space-y-2">
          <h1 className="h-display text-3xl md:text-4xl text-foreground">{meta?.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">{meta?.intro}</p>
        </div>
      </div>

      <div className="space-y-4">{children}</div>

      <div className="flex items-center justify-between pt-4 border-t border-border/40 sticky bottom-20 md:bottom-4 bg-background/80 backdrop-blur py-3 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={!onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {!hideNext && (
          <Button size="sm" onClick={onNext} disabled={nextDisabled || !onNext}>
            {nextLabel ?? 'Save & continue'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------- Step 1: Welcome + Name ----------------

function Step1Welcome({ onNext }: { onNext: () => void }) {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  useEffect(() => { if (profile?.display_name) setName(profile.display_name); }, [profile]);

  const save = async () => {
    if (name.trim() && name.trim() !== profile?.display_name) {
      try { await update.mutateAsync({ display_name: name.trim() }); } catch (e: any) {
        toast.error(e?.message || 'Could not save name');
        return;
      }
    }
    onNext();
  };

  return (
    <WorkshopShell step={1} onNext={save} nextDisabled={!name.trim()} nextLabel="Begin">
      <CinematicCard className="p-8 space-y-6">
        <PullQuote
          quote="A life well lived starts with knowing who is living it. Begin with your name."
          attribution="The Boundless Life Guide"
        />
        <div className="space-y-2">
          <label className="eyebrow text-[10px] text-muted-foreground">Your name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What name should we use?"
            className="h-12 text-lg bg-background/40"
          />
        </div>
      </CinematicCard>
    </WorkshopShell>
  );
}

// ---------------- Step 2: Ideas ----------------

function Step2Ideas({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data: ideas = [] } = useGeneralIdeas();
  const { data: priorities = [] } = useYearPriorities();
  const createIdea = useCreateGeneralIdea();
  const delIdea = useDeleteGeneralIdea();
  const createPriority = useCreateYearPriority();
  const delPriority = useDeleteYearPriority();
  const [ideaDraft, setIdeaDraft] = useState('');
  const [prioDraft, setPrioDraft] = useState('');
  const [prioCategory, setPrioCategory] = useState<YearCategory>('Relationships');

  const priorityIdeas = priorities.filter((p) => (p as any).kind === 'priority_idea' || !(p as any).kind || true)
    .filter((p) => (p as any).kind === 'priority_idea');

  const addIdea = async () => {
    if (!ideaDraft.trim()) return;
    try { await createIdea.mutateAsync({ idea_text: ideaDraft.trim(), position: ideas.length }); setIdeaDraft(''); }
    catch (e: any) { toast.error(e?.message || 'Could not save idea'); }
  };
  const addPriority = async () => {
    if (!prioDraft.trim()) return;
    try {
      await createPriority.mutateAsync({
        category: prioCategory,
        priority_text: prioDraft.trim(),
        position: priorityIdeas.length,
        kind: 'priority_idea',
      });
      setPrioDraft('');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save priority idea');
    }
  };

  return (
    <WorkshopShell step={2} onBack={onBack} onNext={onNext}>
      <div className="grid gap-4 md:grid-cols-2">
        <CinematicCard className="p-5 space-y-3">
          <h3 className="h-display text-lg">General Ideas</h3>
          <p className="text-xs text-muted-foreground">Anything you hear, feel, or see that you'd like to capture.</p>
          <div className="space-y-1.5 min-h-[60px] max-h-[260px] overflow-auto pr-1">
            {ideas.length === 0 && <p className="text-xs italic text-muted-foreground/60">No ideas yet.</p>}
            {ideas.map((i) => (
              <div key={i.id} className="group flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                <span className="flex-1">{i.idea_text}</span>
                <button onClick={() => delIdea.mutate(i.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Input value={ideaDraft} onChange={(e) => setIdeaDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIdea(); } }}
              placeholder="Capture an idea…" className="h-8 text-sm bg-transparent" />
            <Button size="icon" variant="ghost" onClick={addIdea} disabled={!ideaDraft.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CinematicCard>

        <CinematicCard className="p-5 space-y-3">
          <h3 className="h-display text-lg">Priority Ideas</h3>
          <p className="text-xs text-muted-foreground">Action-oriented — things that could become a 30-day to 1-year focus.</p>
          <div className="space-y-1.5 min-h-[60px] max-h-[260px] overflow-auto pr-1">
            {priorityIdeas.length === 0 && <p className="text-xs italic text-muted-foreground/60">No priority ideas yet.</p>}
            {priorityIdeas.map((p) => (
              <div key={p.id} className="group flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                <Badge variant="outline" className="text-[9px] py-0 h-4">{p.category}</Badge>
                <span className="flex-1">{p.priority_text}</span>
                <button onClick={() => delPriority.mutate(p.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex gap-1 flex-wrap">
              {YEAR_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setPrioCategory(c)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${prioCategory === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground'}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={prioDraft} onChange={(e) => setPrioDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPriority(); } }}
                placeholder="Add a priority idea…" className="h-8 text-sm bg-transparent" />
              <Button size="icon" variant="ghost" onClick={addPriority} disabled={!prioDraft.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CinematicCard>
      </div>
    </WorkshopShell>
  );
}

// ---------------- Step 3: Pillar Scores ----------------

function Step3Scores({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [scores, setScores] = useState<Record<Pillar, number>>(
    Object.fromEntries(PILLARS.map((p) => [p, 5])) as Record<Pillar, number>,
  );
  const [saving, setSaving] = useState(false);
  const createCheckin = useCreateCheckin();

  const submit = async () => {
    setSaving(true);
    try {
      const pillarScores: PillarScore[] = PILLARS.map((p) => ({ pillar: p, score: scores[p] }));
      await createCheckin.mutateAsync(pillarScores);
      onNext();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save scores');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkshopShell step={3} onBack={onBack} onNext={submit} nextDisabled={saving}
      nextLabel={saving ? 'Saving…' : 'Save scores & continue'}>
      <div className="space-y-3">
        {PILLARS.map((p) => (
          <CinematicCard key={p} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="h-display text-base">{p}</h3>
                <p className="text-[11px] text-muted-foreground leading-snug max-w-md">{PILLAR_SUBTOPICS[p]}</p>
              </div>
              <span className="h-display text-3xl text-primary tabular-nums w-10 text-right">{scores[p]}</span>
            </div>
            <Slider value={[scores[p]]} min={1} max={10} step={1}
              onValueChange={(v) => setScores((s) => ({ ...s, [p]: v[0] }))} />
          </CinematicCard>
        ))}
      </div>
    </WorkshopShell>
  );
}

// ---------------- Step 4: Pillar Reflection ----------------

function Step4Reflection({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data: states = [] } = usePillarStates();
  const upsert = useUpsertPillarState();
  const byPillar = useMemo(() => Object.fromEntries(states.map((s) => [s.pillar, s])) as Record<Pillar, any>, [states]);
  const [drafts, setDrafts] = useState<Record<Pillar, { current: string; feels: string }>>(() =>
    Object.fromEntries(PILLARS.map((p) => [p, { current: '', feels: '' }])) as any,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && states.length >= 0) {
      setDrafts(Object.fromEntries(PILLARS.map((p) => {
        const s = byPillar[p];
        return [p, { current: s?.current_state ?? '', feels: s?.future_state ?? '' }];
      })) as any);
      setHydrated(true);
    }
  }, [states, byPillar, hydrated]);

  const saveAll = async () => {
    try {
      await Promise.all(PILLARS.map((p) =>
        upsert.mutateAsync({ pillar: p, current_state: drafts[p].current, future_state: drafts[p].feels }),
      ));
      onNext();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save reflections');
    }
  };

  return (
    <WorkshopShell step={4} onBack={onBack} onNext={saveAll}>
      <div className="space-y-3">
        {PILLARS.map((p) => (
          <CinematicCard key={p} className="p-4 space-y-3">
            <h3 className="h-display text-base">{p}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="eyebrow text-[10px] text-muted-foreground">What's happening</p>
                <Textarea value={drafts[p].current}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p]: { ...d[p], current: e.target.value } }))}
                  placeholder="Where this area is right now…"
                  className="min-h-[80px] text-sm bg-background/40" />
              </div>
              <div className="space-y-1">
                <p className="eyebrow text-[10px] text-primary/80">How it feels</p>
                <Textarea value={drafts[p].feels}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p]: { ...d[p], feels: e.target.value } }))}
                  placeholder="The feeling that goes with it…"
                  className="min-h-[80px] text-sm bg-background/40 border-primary/30" />
              </div>
            </div>
          </CinematicCard>
        ))}
      </div>
    </WorkshopShell>
  );
}

// ---------------- Step 5: Your Life ----------------

function Step5YourLife({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data: session } = useWorkshopSession();
  const update = useStartOrUpdateWorkshop();
  const { data: vision } = useLifeVision();
  const upsertVision = useUpsertLifeVision();

  const [date, setDate] = useState(session?.future_self_date ?? '');
  const [age, setAge] = useState<string>(session?.future_self_age?.toString() ?? '');
  const [people, setPeople] = useState<ImportantPerson[]>(
    Array.isArray(session?.important_people) && session!.important_people.length > 0
      ? session!.important_people
      : [{ name: '', age: '' }, { name: '', age: '' }, { name: '', age: '' }],
  );
  const [futureGrid, setFutureGrid] = useState<Record<YearCategory, string>>(() => {
    try { return JSON.parse(vision?.vision_text || '{}').grid ?? Object.fromEntries(YEAR_CATEGORIES.map((c) => [c, ''])) as any; }
    catch { return Object.fromEntries(YEAR_CATEGORIES.map((c) => [c, ''])) as any; }
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && session !== undefined && vision !== undefined) {
      if (session) {
        setDate(session.future_self_date ?? '');
        setAge(session.future_self_age?.toString() ?? '');
        if (Array.isArray(session.important_people) && session.important_people.length > 0)
          setPeople(session.important_people);
      }
      try {
        const parsed = JSON.parse(vision?.vision_text || '{}');
        if (parsed.grid) setFutureGrid({ ...Object.fromEntries(YEAR_CATEGORIES.map((c) => [c, ''])), ...parsed.grid });
      } catch { /* ignore */ }
      setHydrated(true);
    }
  }, [session, vision, hydrated]);

  const save = async () => {
    try {
      await update.mutateAsync({
        future_self_date: date || null,
        future_self_age: age ? parseInt(age, 10) : null,
        important_people: people.filter((p) => p.name.trim() || p.age.trim()),
      });
      // Compose a markdown vision_text from grid + grid object stored as JSON
      const md = YEAR_CATEGORIES.map((c) => `## ${c}\n${futureGrid[c] || ''}`).join('\n\n');
      const visionPayload = JSON.stringify({ markdown: md, grid: futureGrid, date, age });
      await upsertVision.mutateAsync(visionPayload);
      onNext();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save Your Life');
    }
  };

  const updPerson = (i: number, patch: Partial<ImportantPerson>) =>
    setPeople((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <WorkshopShell step={5} onBack={onBack} onNext={save}>
      <CinematicCard className="p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <p className="eyebrow text-[10px] text-muted-foreground">Pick a date 10+ years from now</p>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/40" />
          </div>
          <div className="space-y-1">
            <p className="eyebrow text-[10px] text-muted-foreground">Your age on that date</p>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 55" className="bg-background/40" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="eyebrow text-[10px] text-muted-foreground">Important people in your life on that date</p>
          <div className="grid gap-2 md:grid-cols-3">
            {people.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input value={p.name} onChange={(e) => updPerson(i, { name: e.target.value })} placeholder="Name" className="bg-background/40" />
                <Input value={p.age} onChange={(e) => updPerson(i, { age: e.target.value })} placeholder="Age" className="w-20 bg-background/40" />
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPeople((arr) => [...arr, { name: '', age: '' }])}>
            <Plus className="h-3 w-3 mr-1" /> Add person
          </Button>
        </div>
      </CinematicCard>

      <div className="grid gap-4 md:grid-cols-2">
        {YEAR_CATEGORIES.map((c) => (
          <CinematicCard key={c} className="p-5 space-y-2">
            <div>
              <h3 className="h-display text-lg">{c}</h3>
              <p className="text-[11px] text-muted-foreground">{YEAR_CATEGORY_SUBTITLES[c]}</p>
            </div>
            <Textarea value={futureGrid[c]}
              onChange={(e) => setFutureGrid((g) => ({ ...g, [c]: e.target.value }))}
              placeholder="What is true on that future date…"
              className="min-h-[140px] text-sm bg-background/40" />
          </CinematicCard>
        ))}
      </div>
    </WorkshopShell>
  );
}

// ---------------- Step 6: Your Year ----------------

function Step6YourYear({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data: session } = useWorkshopSession();
  const update = useStartOrUpdateWorkshop();
  const year = new Date().getFullYear();
  const { data: priorities = [] } = useYearPriorities(year);
  const create = useCreateYearPriority();
  const del = useDeleteYearPriority();
  const [mantra, setMantra] = useState(session?.mantra ?? '');
  const [drafts, setDrafts] = useState<Record<YearCategory, string>>(
    Object.fromEntries(YEAR_CATEGORIES.map((c) => [c, ''])) as any,
  );

  useEffect(() => { if (session) setMantra(session.mantra ?? ''); }, [session]);

  const yearPriorities = priorities.filter((p) => !(p as any).kind || (p as any).kind === 'year_priority');
  const grouped = useMemo(() => {
    const map: Record<YearCategory, typeof yearPriorities> = {
      Relationships: [], Achievements: [], Habits: [], Wealth: [],
    };
    for (const p of yearPriorities) {
      const c = p.category as YearCategory;
      if (map[c]) map[c].push(p);
    }
    return map;
  }, [yearPriorities]);

  const add = async (c: YearCategory) => {
    const text = drafts[c].trim();
    if (!text) return;
    try {
      await create.mutateAsync({ category: c, priority_text: text, position: grouped[c].length });
      setDrafts((d) => ({ ...d, [c]: '' }));
    } catch (e: any) { toast.error(e?.message || 'Could not add'); }
  };

  const save = async () => {
    try { await update.mutateAsync({ mantra }); onNext(); }
    catch (e: any) { toast.error(e?.message || 'Could not save mantra'); }
  };

  return (
    <WorkshopShell step={6} onBack={onBack} onNext={save}>
      <CinematicCard className="p-5 space-y-2">
        <p className="eyebrow text-[10px] text-muted-foreground">My mantra is</p>
        <Input value={mantra} onChange={(e) => setMantra(e.target.value)}
          placeholder="A short phrase that anchors your year…"
          className="text-lg h-12 bg-background/40 font-serif-italic" />
      </CinematicCard>

      <div className="grid gap-4 md:grid-cols-2">
        {YEAR_CATEGORIES.map((c) => (
          <CinematicCard key={c} className="p-5 space-y-3">
            <div>
              <h3 className="h-display text-lg">{c}</h3>
              <p className="text-[11px] text-muted-foreground">{YEAR_CATEGORY_SUBTITLES[c]}</p>
            </div>
            <div className="space-y-1.5 min-h-[60px]">
              {grouped[c].length === 0 && <p className="text-xs italic text-muted-foreground/60">No priorities yet.</p>}
              {grouped[c].map((p) => (
                <div key={p.id} className="group flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                  <span className="flex-1">{p.priority_text}</span>
                  <button onClick={() => del.mutate(p.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Input value={drafts[c]} onChange={(e) => setDrafts((d) => ({ ...d, [c]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(c); } }}
                placeholder={`Add a ${c.toLowerCase()} priority…`} className="h-8 text-sm bg-transparent" />
              <Button size="icon" variant="ghost" onClick={() => add(c)} disabled={!drafts[c].trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CinematicCard>
        ))}
      </div>
    </WorkshopShell>
  );
}

// ---------------- Step 7: Your Why ----------------

function Step7YourWhy({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data: priorities = [] } = useYearPriorities();
  const create = useCreateTruthStatement();
  const yearPriorities = priorities.filter((p) => !(p as any).kind || (p as any).kind === 'year_priority' || (p as any).kind === 'priority_idea');
  const [priority, setPriority] = useState('');
  const [levels, setLevels] = useState<string[]>(['', '', '', '', '', '', '']);
  const [statement, setStatement] = useState('');

  const fill = (i: number, v: string) => setLevels((arr) => arr.map((x, idx) => (idx === i ? v : x)));

  const save = async () => {
    if (!priority.trim() || !statement.trim()) {
      toast.error('Pick a priority and write your truth statement');
      return;
    }
    try {
      await create.mutateAsync({ priority, levels: levels.filter(Boolean), statement });
      toast.success('Why captured');
      onNext();
    } catch (e: any) { toast.error(e?.message || 'Could not save'); }
  };

  return (
    <WorkshopShell step={7} onBack={onBack} onNext={save}
      nextLabel={create.isPending ? 'Saving…' : 'Save Why & continue'}
      nextDisabled={create.isPending}>
      <CinematicCard className="p-5 space-y-4">
        <div className="space-y-2">
          <p className="eyebrow text-[10px] text-muted-foreground">My priority</p>
          {yearPriorities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {yearPriorities.slice(0, 12).map((p) => (
                <button key={p.id} onClick={() => setPriority(p.priority_text)}
                  className={`text-[11px] px-2 py-1 rounded-full border ${priority === p.priority_text ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground'}`}>
                  {p.priority_text}
                </button>
              ))}
            </div>
          )}
          <Input value={priority} onChange={(e) => setPriority(e.target.value)}
            placeholder="Or type a priority…" className="bg-background/40" />
        </div>

        <div className="space-y-2">
          <p className="eyebrow text-[10px] text-muted-foreground">Seven levels of why</p>
          {levels.map((v, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] text-muted-foreground/80">
                Level {i + 1}: {i === 0 ? 'Why is this important to me? (So that…)' : 'Why does that really matter? (So that…)'}
              </p>
              <Input value={v} onChange={(e) => fill(i, e.target.value)}
                placeholder="So that…" className="bg-background/40" />
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="eyebrow text-[10px] text-primary">My truth / my why</p>
          <Textarea value={statement} onChange={(e) => setStatement(e.target.value)}
            placeholder="The single sentence that captures the truth at the bottom…"
            className="min-h-[100px] bg-background/40 border-primary/30 font-serif-italic text-base" />
        </div>
      </CinematicCard>
    </WorkshopShell>
  );
}

// ---------------- Step 8: Best Self ----------------

function Step8BestSelf({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data: habits = [] } = useBestSelfHabits();
  const create = useCreateBestSelfHabit();
  const del = useDeleteBestSelfHabit();
  const starts = habits.filter((h) => h.kind === 'start');
  const stops = habits.filter((h) => h.kind === 'stop');
  const [startDraft, setStartDraft] = useState('');
  const [stopDraft, setStopDraft] = useState('');

  const add = async (kind: 'start' | 'stop') => {
    const text = (kind === 'start' ? startDraft : stopDraft).trim();
    if (!text) return;
    try {
      const list = kind === 'start' ? starts : stops;
      await create.mutateAsync({ habit_text: text, kind, position: list.length });
      if (kind === 'start') setStartDraft(''); else setStopDraft('');
    } catch (e: any) { toast.error(e?.message || 'Could not save'); }
  };

  return (
    <WorkshopShell step={8} onBack={onBack} onNext={onNext}>
      <div className="grid gap-4 md:grid-cols-2">
        <CinematicCard className="p-5 space-y-3">
          <h3 className="h-display text-lg">Starts</h3>
          <p className="text-xs text-muted-foreground">Daily habits to build.</p>
          <div className="space-y-1.5 min-h-[60px]">
            {starts.length === 0 && <p className="text-xs italic text-muted-foreground/60">No Starts yet.</p>}
            {starts.map((h) => (
              <div key={h.id} className="group flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                <span className="flex-1">{h.habit_text}</span>
                <button onClick={() => del.mutate(h.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Input value={startDraft} onChange={(e) => setStartDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add('start'); } }}
              placeholder="Add a Start…" className="h-8 text-sm bg-transparent" />
            <Button size="icon" variant="ghost" onClick={() => add('start')} disabled={!startDraft.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CinematicCard>

        <CinematicCard className="p-5 space-y-3">
          <h3 className="h-display text-lg">Stops</h3>
          <p className="text-xs text-muted-foreground">Daily habits to release.</p>
          <div className="space-y-1.5 min-h-[60px]">
            {stops.length === 0 && <p className="text-xs italic text-muted-foreground/60">No Stops yet.</p>}
            {stops.map((h) => (
              <div key={h.id} className="group flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                <span className="flex-1">{h.habit_text}</span>
                <button onClick={() => del.mutate(h.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Input value={stopDraft} onChange={(e) => setStopDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add('stop'); } }}
              placeholder="Add a Stop…" className="h-8 text-sm bg-transparent" />
            <Button size="icon" variant="ghost" onClick={() => add('stop')} disabled={!stopDraft.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CinematicCard>
      </div>
    </WorkshopShell>
  );
}

// ---------------- Step 9: Your Month ----------------

function Step9YourMonth({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const { data: actions = [] } = useMonthActions();
  const create = useCreateMonthAction();
  const del = useDeleteMonthAction();
  const [drafts, setDrafts] = useState<{ text: string; due: string }[]>(
    Array.from({ length: 6 }, () => ({ text: '', due: '' })),
  );

  const filled = drafts.filter((d) => d.text.trim());

  const finish = async () => {
    try {
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        if (!d.text.trim()) continue;
        await create.mutateAsync({
          action_text: d.text.trim(),
          position: actions.length + i,
          due_date: d.due || null,
        });
      }
      toast.success('30-day plan created');
      onFinish();
    } catch (e: any) { toast.error(e?.message || 'Could not save'); }
  };

  return (
    <WorkshopShell step={9} onBack={onBack} onNext={finish}
      nextLabel={create.isPending ? 'Saving…' : 'Finish workshop'}
      nextDisabled={create.isPending || (filled.length === 0 && actions.length === 0)}>
      {actions.length > 0 && (
        <CinematicCard className="p-4 space-y-2">
          <p className="eyebrow text-[10px] text-muted-foreground">Already saved this month</p>
          <div className="space-y-1.5">
            {actions.map((a) => (
              <div key={a.id} className="group flex items-center gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                <span className="flex-1">{a.action_text}</span>
                {a.due_date && <span className="text-[10px] text-muted-foreground">{a.due_date}</span>}
                <button onClick={() => del.mutate(a.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CinematicCard>
      )}

      <CinematicCard className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">Up to six actions for the next 30 days. Each one will be added to your Actions list.</p>
        {drafts.map((d, i) => (
          <div key={i} className="flex gap-2">
            <Input value={d.text}
              onChange={(e) => setDrafts((arr) => arr.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))}
              placeholder={`Action ${i + 1}`} className="bg-background/40" />
            <Input type="date" value={d.due}
              onChange={(e) => setDrafts((arr) => arr.map((x, idx) => (idx === i ? { ...x, due: e.target.value } : x)))}
              className="w-40 bg-background/40" />
          </div>
        ))}
      </CinematicCard>
    </WorkshopShell>
  );
}

// ---------------- Recap ----------------

function Recap({ onRestart }: { onRestart: () => void }) {
  const { data: profile } = useProfile();
  const { data: vision } = useLifeVision();
  const { data: priorities = [] } = useYearPriorities();
  const { data: states = [] } = usePillarStates();
  const { data: whys = [] } = useWhyStatements();
  const { data: habits = [] } = useBestSelfHabits();
  const { data: actions = [] } = useMonthActions();
  const { data: ideas = [] } = useGeneralIdeas();
  const { data: session } = useWorkshopSession();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  let visionGrid: Record<string, string> = {};
  try { visionGrid = JSON.parse(vision?.vision_text || '{}').grid ?? {}; } catch { /* */ }

  async function downloadPdf() {
    const node = document.getElementById('guide-recap');
    if (!node) return;
    setExporting(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const name = (profile?.display_name ?? 'Boundless').replace(/[^a-z0-9-_]+/gi, '_');
      const stamp = new Date().toISOString().slice(0, 10);
      await (html2pdf() as any)
        .set({
          margin: [10, 10, 10, 10],
          filename: `${name}-Boundless-Life-Guide-${stamp}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(node)
        .save();
      toast.success('PDF downloaded');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not export PDF');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div id="guide-recap" className="space-y-6 print:space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <SectionEyebrow>RECAP</SectionEyebrow>
          <h1 className="h-display text-3xl md:text-4xl">{profile?.display_name ?? 'Your'} Boundless Life Guide</h1>
          {session?.mantra && <p className="font-serif-italic text-lg text-primary mt-2">"{session.mantra}"</p>}
        </div>
        <div className="flex gap-2 print:hidden" data-print-hide>
          <Button variant="premium" size="sm" onClick={downloadPdf} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? 'Generating…' : 'Download PDF'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="ghost" size="sm" onClick={onRestart}>Edit</Button>
        </div>
      </div>

      {ideas.length > 0 && (
        <CinematicCard className="p-5">
          <h3 className="h-display text-lg mb-2">Ideas</h3>
          <ul className="text-sm space-y-1">
            {ideas.map((i) => <li key={i.id}>• {i.idea_text}</li>)}
          </ul>
        </CinematicCard>
      )}

      <CinematicCard className="p-5">
        <h3 className="h-display text-lg mb-3">Your Now — pillar reflections</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {states.map((s) => (
            <div key={s.id} className="text-sm space-y-1">
              <p className="font-semibold">{s.pillar}</p>
              {s.current_state && <p className="text-muted-foreground"><span className="text-[10px] uppercase tracking-wider">Now:</span> {s.current_state}</p>}
              {s.future_state && <p className="text-muted-foreground"><span className="text-[10px] uppercase tracking-wider">Feels:</span> {s.future_state}</p>}
            </div>
          ))}
        </div>
      </CinematicCard>

      {Object.values(visionGrid).some((v) => (v as string)?.trim()) && (
        <CinematicCard className="p-5">
          <h3 className="h-display text-lg mb-3">Your Life — 10+ years from now</h3>
          {session?.future_self_date && (
            <p className="text-xs text-muted-foreground mb-3">
              {session.future_self_date}{session.future_self_age ? ` · age ${session.future_self_age}` : ''}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {YEAR_CATEGORIES.map((c) => visionGrid[c] ? (
              <div key={c}>
                <p className="font-semibold text-sm">{c}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{visionGrid[c]}</p>
              </div>
            ) : null)}
          </div>
        </CinematicCard>
      )}

      {priorities.length > 0 && (
        <CinematicCard className="p-5">
          <h3 className="h-display text-lg mb-3">Your Year</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {YEAR_CATEGORIES.map((c) => {
              const list = priorities.filter((p) => p.category === c && (!(p as any).kind || (p as any).kind === 'year_priority'));
              if (list.length === 0) return null;
              return (
                <div key={c}>
                  <p className="font-semibold text-sm">{c}</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {list.map((p) => <li key={p.id}>• {p.priority_text}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </CinematicCard>
      )}

      {whys.length > 0 && (
        <CinematicCard className="p-5">
          <h3 className="h-display text-lg mb-3">Your Why</h3>
          {whys.slice(0, 3).map((w) => (
            <div key={w.id} className="mb-3">
              <p className="text-xs text-muted-foreground">{w.priority}</p>
              <p className="font-serif-italic text-base">"{w.statement}"</p>
            </div>
          ))}
        </CinematicCard>
      )}

      {habits.length > 0 && (
        <CinematicCard className="p-5">
          <h3 className="h-display text-lg mb-3">Best Self — Starts & Stops</h3>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold">Starts</p>
              <ul className="text-muted-foreground space-y-1">
                {habits.filter((h) => h.kind === 'start').map((h) => <li key={h.id}>+ {h.habit_text}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Stops</p>
              <ul className="text-muted-foreground space-y-1">
                {habits.filter((h) => h.kind === 'stop').map((h) => <li key={h.id}>− {h.habit_text}</li>)}
              </ul>
            </div>
          </div>
        </CinematicCard>
      )}

      {actions.length > 0 && (
        <CinematicCard className="p-5">
          <h3 className="h-display text-lg mb-3">Your Month — 30-day actions</h3>
          <ul className="text-sm space-y-1">
            {actions.map((a) => (
              <li key={a.id}>
                ☐ {a.action_text}
                {a.due_date && <span className="text-muted-foreground text-[11px] ml-2">due {a.due_date}</span>}
              </li>
            ))}
          </ul>
        </CinematicCard>
      )}

      <div className="flex gap-2 print:hidden">
        <Button onClick={() => navigate('/')}>Open my dashboard</Button>
        <Button variant="outline" onClick={() => navigate('/checkin')}>Start a daily check-in</Button>
      </div>
    </div>
  );
}

// ---------------- Landing splash ----------------

function Landing({ onStart, hasSession }: { onStart: () => void; hasSession: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <HeroFrame
        image={heroForest}
        height="md"
        align="left"
        eyebrow={<SectionEyebrow>A LIFE WELL LIVED</SectionEyebrow>}
        title={<>The Boundless Life Guide</>}
        subtitle="An eight-step reflection to set your direction — from where you are today to a vivid picture of the life you're building toward."
      />
      <CinematicCard className="p-6 space-y-4">
        <PullQuote
          quote="Begin with the end in mind. The truth at the bottom of your why creates the emotion to change."
          attribution="Andy Bailey"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={onStart} size="lg">
            <BookOpen className="h-4 w-4 mr-2" />
            {hasSession ? 'Continue the workshop' : 'Begin the workshop'}
          </Button>
          {hasSession && (
            <Button variant="outline" onClick={() => navigate('/guide?view=recap')}>
              View my recap
            </Button>
          )}
        </div>
      </CinematicCard>
    </div>
  );
}

// ---------------- Page ----------------

const GuidePage = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const stepParam = params.get('step');
  const view = params.get('view');
  const { data: session, isLoading } = useWorkshopSession();
  const start = useStartOrUpdateWorkshop();
  const markComplete = useMarkStepComplete();

  const step = stepParam ? parseInt(stepParam, 10) : 0;
  const isRecap = view === 'recap' || (session?.completed_at != null && step === 0);

  const goStep = (n: number) => {
    if (n > TOTAL_STEPS) { setParams({ view: 'recap' }); return; }
    if (n < 1) { setParams({}); return; }
    setParams({ step: n.toString() });
  };

  const handleNext = async (currentStep: number) => {
    try { await markComplete.mutateAsync(currentStep); } catch { /* non-fatal */ }
    goStep(currentStep + 1);
  };

  const beginWorkshop = async () => {
    try {
      if (!session) await start.mutateAsync({ current_step: 1 });
      goStep(session?.current_step && session.current_step > 0 ? session.current_step : 1);
    } catch (e: any) { toast.error(e?.message || 'Could not start'); }
  };

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isRecap ? (
          <Recap onRestart={() => goStep(1)} />
        ) : step === 0 ? (
          <Landing onStart={beginWorkshop} hasSession={!!session} />
        ) : step === 1 ? (
          <Step1Welcome onNext={() => handleNext(1)} />
        ) : step === 2 ? (
          <Step2Ideas onBack={() => goStep(1)} onNext={() => handleNext(2)} />
        ) : step === 3 ? (
          <Step3Scores onBack={() => goStep(2)} onNext={() => handleNext(3)} />
        ) : step === 4 ? (
          <Step4Reflection onBack={() => goStep(3)} onNext={() => handleNext(4)} />
        ) : step === 5 ? (
          <Step5YourLife onBack={() => goStep(4)} onNext={() => handleNext(5)} />
        ) : step === 6 ? (
          <Step6YourYear onBack={() => goStep(5)} onNext={() => handleNext(6)} />
        ) : step === 7 ? (
          <Step7YourWhy onBack={() => goStep(6)} onNext={() => handleNext(7)} />
        ) : step === 8 ? (
          <Step8BestSelf onBack={() => goStep(7)} onNext={() => handleNext(8)} />
        ) : step === 9 ? (
          <Step9YourMonth onBack={() => goStep(8)} onFinish={async () => {
            await markComplete.mutateAsync(9).catch(() => {});
            setParams({ view: 'recap' });
          }} />
        ) : (
          <Landing onStart={beginWorkshop} hasSession={!!session} />
        )}
      </div>
    </div>
  );
};

export default GuidePage;
