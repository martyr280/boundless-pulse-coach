import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import HeroFrame from '@/components/visual/HeroFrame';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import PullQuote from '@/components/visual/PullQuote';
import heroMountains from '@/assets/hero-mountains.jpg';
import {
  useLifeVision,
  useUpsertLifeVision,
  useYearPriorities,
  useCreateYearPriority,
  useUpdateYearPriority,
  useDeleteYearPriority,
  useWhyStatements,
  usePillarStates,
  useUpsertPillarState,
  YEAR_CATEGORIES,
  type YearCategory,
  type YearPriority,
  type PillarState,
} from '@/hooks/useGuide';
import { PILLARS, PILLAR_SUBTOPICS, type Pillar } from '@/lib/types';

const CATEGORY_DESCRIPTIONS: Record<YearCategory, string> = {
  Being: 'Who you are becoming',
  Relating: 'Your key relationships',
  Doing: "The work you'll execute",
  Having: 'What you want to own or experience',
};

// ---------- Life Vision section ----------

function LifeVisionSection() {
  const { data: vision, isLoading } = useLifeVision();
  const upsert = useUpsertLifeVision();
  const [text, setText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!hydrated && vision !== undefined) {
      const initial = vision?.vision_text ?? '';
      setText(initial);
      lastSavedRef.current = initial;
      setHydrated(true);
    }
  }, [vision, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (text === lastSavedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await upsert.mutateAsync(text);
        lastSavedRef.current = text;
        toast.success('Vision saved', { duration: 1200 });
      } catch (e: any) {
        toast.error(e?.message || 'Could not save vision');
      }
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, hydrated, upsert]);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <SectionEyebrow>YOUR LIFE</SectionEyebrow>
        <h2 className="h-display text-2xl md:text-3xl text-foreground">Where are you going?</h2>
      </div>

      <CinematicCard className="p-6 md:p-8 space-y-4">
        {!text && hydrated && (
          <PullQuote
            quote="Begin with the end in mind. What does a life that truly feels like yours look like in 10 years?"
            attribution="Andy Bailey"
          />
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="In 10 years, my life looks like…"
          className="min-h-[220px] resize-y bg-background/40 border-border/60 text-base leading-relaxed"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.length.toLocaleString()} chars</span>
          <span>
            {upsert.isPending ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            ) : hydrated && text === lastSavedRef.current && text ? (
              'Saved'
            ) : (
              ''
            )}
          </span>
        </div>
      </CinematicCard>
    </section>
  );
}

// ---------- Year Priority Card ----------

function PriorityRow({ p }: { p: YearPriority }) {
  const update = useUpdateYearPriority();
  const del = useDeleteYearPriority();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.priority_text);

  const save = async () => {
    setEditing(false);
    if (draft.trim() === p.priority_text) return;
    if (!draft.trim()) {
      setDraft(p.priority_text);
      return;
    }
    try {
      await update.mutateAsync({ id: p.id, priority_text: draft.trim() });
    } catch (e: any) {
      toast.error(e?.message || 'Could not update');
    }
  };

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2">
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(p.priority_text);
              setEditing(false);
            }
          }}
          className="h-7 px-2 text-sm bg-transparent border-0 focus-visible:ring-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm text-foreground/90 leading-snug hover:text-primary transition-colors"
        >
          {p.priority_text}
        </button>
      )}
      <button
        type="button"
        onClick={() => del.mutate(p.id, {
          onError: (e: any) => toast.error(e?.message || 'Failed to delete priority'),
        })}
        aria-label="Delete priority"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CategoryColumn({ category, items }: { category: YearCategory; items: YearPriority[] }) {
  const create = useCreateYearPriority();
  const [draft, setDraft] = useState('');

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      await create.mutateAsync({
        category,
        priority_text: text,
        position: items.length,
      });
      setDraft('');
    } catch (e: any) {
      toast.error(e?.message || 'Could not add priority');
    }
  };

  return (
    <CinematicCard className="p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="h-display text-lg text-foreground">{category}</h3>
        <p className="text-xs text-muted-foreground">{CATEGORY_DESCRIPTIONS[category]}</p>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/60 italic">No priorities yet.</p>
        )}
        {items.map((p) => (
          <PriorityRow key={p.id} p={p} />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a priority…"
          className="h-8 text-sm bg-transparent"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={add}
          disabled={!draft.trim() || create.isPending}
          aria-label={`Add ${category} priority`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </CinematicCard>
  );
}

function YearPrioritiesSection() {
  const year = new Date().getFullYear();
  const { data: priorities = [] } = useYearPriorities(year);

  const grouped = useMemo(() => {
    const map: Record<YearCategory, YearPriority[]> = {
      Being: [],
      Relating: [],
      Doing: [],
      Having: [],
    };
    for (const p of priorities) {
      const cat = p.category as YearCategory;
      if (map[cat]) map[cat].push(p);
    }
    return map;
  }, [priorities]);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <SectionEyebrow>YOUR YEAR · {year}</SectionEyebrow>
        <h2 className="h-display text-2xl md:text-3xl text-foreground">What matters this year?</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {YEAR_CATEGORIES.map((cat) => (
          <CategoryColumn key={cat} category={cat} items={grouped[cat]} />
        ))}
      </div>
    </section>
  );
}

// ---------- Why Statements ----------

function WhySection() {
  const navigate = useNavigate();
  const { data: whys = [], isLoading } = useWhyStatements();

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <SectionEyebrow>YOUR WHY</SectionEyebrow>
        <h2 className="h-display text-2xl md:text-3xl text-foreground">What drives you</h2>
      </div>

      {isLoading ? (
        <CinematicCard className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CinematicCard>
      ) : whys.length === 0 ? (
        <CinematicCard className="p-8 text-center space-y-4">
          <p className="text-foreground/80">
            Complete a 7 Whys session with your AI Coach to discover your Root Why.
          </p>
          <Button onClick={() => navigate('/coach')}>Open AI Coach</Button>
        </CinematicCard>
      ) : (
        <div className="space-y-4">
          {whys.map((w) => (
            <CinematicCard key={w.id} className="p-6 md:p-8">
              <PullQuote quote={w.statement} attribution={`${w.priority} · ${w.date}`} />
            </CinematicCard>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Current State / Future State ----------

function PillarStateRow({ pillar, state }: { pillar: Pillar; state?: PillarState }) {
  const upsert = useUpsertPillarState();
  const [current, setCurrent] = useState(state?.current_state ?? '');
  const [future, setFuture] = useState(state?.future_state ?? '');
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ c: string; f: string }>({
    c: state?.current_state ?? '',
    f: state?.future_state ?? '',
  });

  useEffect(() => {
    if (!hydrated && state !== undefined) {
      setCurrent(state?.current_state ?? '');
      setFuture(state?.future_state ?? '');
      lastSavedRef.current = {
        c: state?.current_state ?? '',
        f: state?.future_state ?? '',
      };
      setHydrated(true);
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (current === lastSavedRef.current.c && future === lastSavedRef.current.f) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await upsert.mutateAsync({ pillar, current_state: current, future_state: future });
        lastSavedRef.current = { c: current, f: future };
      } catch (e: any) {
        toast.error(e?.message || `Could not save ${pillar}`);
      }
    }, 900);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [current, future, hydrated, upsert, pillar]);

  return (
    <CinematicCard className="p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="h-display text-lg text-foreground">{pillar}</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">{PILLAR_SUBTOPICS[pillar]}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="eyebrow text-[10px] text-muted-foreground">Current State</p>
          <Textarea
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Where this pillar is right now…"
            className="min-h-[110px] resize-y bg-background/40 border-border/60 text-sm leading-relaxed"
          />
        </div>
        <div className="space-y-1.5">
          <p className="eyebrow text-[10px] text-primary/80">Future State</p>
          <Textarea
            value={future}
            onChange={(e) => setFuture(e.target.value)}
            placeholder="What this pillar looks like at its best…"
            className="min-h-[110px] resize-y bg-background/40 border-primary/30 text-sm leading-relaxed"
          />
        </div>
      </div>
    </CinematicCard>
  );
}

function PillarStateSection() {
  const { data: states = [], isLoading } = usePillarStates();
  const byPillar = useMemo(() => {
    const map: Partial<Record<Pillar, PillarState>> = {};
    for (const s of states) map[s.pillar] = s;
    return map;
  }, [states]);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <SectionEyebrow>YOUR PILLARS · CURRENT vs FUTURE</SectionEyebrow>
        <h2 className="h-display text-2xl md:text-3xl text-foreground">
          Where you are. Where you're going.
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          For each of the 7 Fs, capture an honest read of today and a vivid picture of the future
          you're building toward. These anchor every Pulse, LCI, and coaching conversation.
        </p>
      </div>

      {isLoading ? (
        <CinematicCard className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CinematicCard>
      ) : (
        <div className="space-y-4">
          {PILLARS.map((p) => (
            <PillarStateRow key={p} pillar={p} state={byPillar[p]} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Page ----------

const GuidePage = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-10">
        <HeroFrame
          image={heroMountains}
          height="sm"
          align="left"
          eyebrow={<SectionEyebrow>THE GUIDE</SectionEyebrow>}
          title={<>Your living foundation.</>}
          subtitle="Vision, priorities, and the truth that drives them — in one place."
        />

        <LifeVisionSection />
        <YearPrioritiesSection />
        <PillarStateSection />
        <WhySection />
      </div>
    </div>
  );
};

export default GuidePage;
