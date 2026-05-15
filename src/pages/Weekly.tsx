import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowUp, ArrowDown, Minus, CalendarDays, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PILLARS, PILLAR_SUBTOPICS, type Pillar } from '@/lib/types';
import {
  useWeeklyResets,
  useCurrentWeekReset,
  useCreateOrUpdateWeeklyReset,
  getWeekStart,
  type WeeklyReset,
} from '@/hooks/useWeeklyResets';
import HeroFrame from '@/components/visual/HeroFrame';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import heroSummit from '@/assets/hero-summit.jpg';
import { useCurrentCycle } from '@/hooks/useCurrentCycle';

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function avgScore(r: WeeklyReset): number | null {
  const vals = PILLARS.map((p) => r.scores[p]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1));
}

const WeeklyPage = () => {
  const navigate = useNavigate();
  const { data: history = [], isLoading } = useWeeklyResets();
  const { data: currentWeek } = useCurrentWeekReset();
  const { data: cycle } = useCurrentCycle();
  const cycleActive = !!cycle?.cycle;
  const cadenceLabel = cycleActive ? 'Daily' : 'Weekly';
  const upsert = useCreateOrUpdateWeeklyReset();
  const weekStart = getWeekStart();

  const [editing, setEditing] = useState(false);
  const showForm = editing || !currentWeek;

  const initialScores = useMemo<Record<Pillar, number>>(() => {
    const seed: Record<string, number> = {};
    PILLARS.forEach((p) => {
      seed[p] = currentWeek?.scores[p] ?? 5;
    });
    return seed as Record<Pillar, number>;
  }, [currentWeek]);

  const [scores, setScores] = useState<Record<Pillar, number>>(initialScores);
  const [personalHigh, setPersonalHigh] = useState(currentWeek?.personal_high ?? '');
  const [personalLow, setPersonalLow] = useState(currentWeek?.personal_low ?? '');
  const [businessHigh, setBusinessHigh] = useState(currentWeek?.business_high ?? '');
  const [businessLow, setBusinessLow] = useState(currentWeek?.business_low ?? '');

  const handleSubmit = async () => {
    try {
      await upsert.mutateAsync({
        weekStartDate: weekStart,
        scores,
        personal_high: personalHigh,
        personal_low: personalLow,
        business_high: businessHigh,
        business_low: businessLow,
      });
      toast.success('Weekly reset saved');
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save weekly reset');
    }
  };

  // Find prior week (the most recent one BEFORE current week)
  const priorWeek = history.find((r) => r.week_start_date < weekStart) ?? null;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <HeroFrame
        image={heroSummit}
        eyebrow={<SectionEyebrow>{cycleActive ? `Your Daily Breakdown · Day ${cycle?.dayNumber} of ${cycle?.targetDays}` : 'Your Weekly Breakdown'}</SectionEyebrow>}
        title={
          showForm ? (
            <>How was <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">your {cycleActive ? 'day' : 'week'}</span>?</>
          ) : (
            <>This {cycleActive ? 'day' : 'week'}, <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">in summary</span></>
          )
        }
        subtitle={showForm ? 'Rate each pillar 1–10' : formatWeekRange(weekStart)}
        height="md"
        align="left"
        className="mb-6"
      />

      {showForm ? (
        <SubmitSection
          scores={scores}
          setScores={setScores}
          personalHigh={personalHigh}
          setPersonalHigh={setPersonalHigh}
          personalLow={personalLow}
          setPersonalLow={setPersonalLow}
          businessHigh={businessHigh}
          setBusinessHigh={setBusinessHigh}
          businessLow={businessLow}
          setBusinessLow={setBusinessLow}
          onSubmit={handleSubmit}
          submitting={upsert.isPending}
          existing={!!currentWeek}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <SummarySection current={currentWeek!} prior={priorWeek} onEdit={() => setEditing(true)} />
      )}

      {/* History */}
      <div className="mt-8">
        <SectionEyebrow>History</SectionEyebrow>
        <h2 className="h-display text-lg mb-3 mt-1">Last weeks</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length <= 1 ? (
          <CinematicCard>
            <CardContent className="p-5 text-center">
              <CalendarDays className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                No history yet. Submit a few weeks to start spotting trends.
              </p>
            </CardContent>
          </CinematicCard>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 8).map((r) => {
              const avg = avgScore(r);
              return (
                <CinematicCard key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          Week of
                        </p>
                        <p className="text-sm font-bold">{formatWeekRange(r.week_start_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary leading-none">{avg ?? '—'}</p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-1">
                          Avg
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {PILLARS.map((p) => {
                        const v = r.scores[p];
                        const h = v ? `${v * 10}%` : '0%';
                        return (
                          <div key={p} className="flex-1" title={`${p}: ${v ?? '—'}`}>
                            <div className="h-8 bg-muted rounded-md overflow-hidden flex items-end">
                              <div
                                className="w-full bg-primary/70 transition-all"
                                style={{ height: h }}
                              />
                            </div>
                            <p className="text-[8px] text-center mt-1 uppercase tracking-wider text-muted-foreground font-bold">
                              {p[0]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CinematicCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface SubmitProps {
  scores: Record<Pillar, number>;
  setScores: (fn: (prev: Record<Pillar, number>) => Record<Pillar, number>) => void;
  personalHigh: string;
  setPersonalHigh: (v: string) => void;
  personalLow: string;
  setPersonalLow: (v: string) => void;
  businessHigh: string;
  setBusinessHigh: (v: string) => void;
  businessLow: string;
  setBusinessLow: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  existing: boolean;
  onCancel: () => void;
}

const SubmitSection = ({
  scores, setScores,
  personalHigh, setPersonalHigh,
  personalLow, setPersonalLow,
  businessHigh, setBusinessHigh,
  businessLow, setBusinessLow,
  onSubmit, submitting, existing, onCancel,
}: SubmitProps) => (
  <>
    <div className="space-y-4">
      {PILLARS.map((pillar) => {
        const score = scores[pillar];
        const isLow = score < 5;
        return (
          <CinematicCard key={pillar} className={isLow ? 'border-warning/40' : ''}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm uppercase tracking-[0.16em]">{pillar}</span>
                <span className={`text-2xl font-black ${isLow ? 'text-warning' : 'text-primary'}`}>
                  {score}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug -mt-1">
                {PILLAR_SUBTOPICS[pillar]}
              </p>
              <Slider
                value={[score]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setScores((prev) => ({ ...prev, [pillar]: v }))}
              />
            </CardContent>
          </CinematicCard>
        );
      })}
    </div>

    <div className="mt-6 space-y-4">
      <SectionEyebrow>Highs &amp; Lows</SectionEyebrow>
      {[
        { label: 'Personal High', value: personalHigh, set: setPersonalHigh, placeholder: 'A win in your personal life this week…' },
        { label: 'Personal Low', value: personalLow, set: setPersonalLow, placeholder: 'A struggle or disappointment…' },
        { label: 'Business High', value: businessHigh, set: setBusinessHigh, placeholder: 'A professional win this week…' },
        { label: 'Business Low', value: businessLow, set: setBusinessLow, placeholder: 'A professional setback…' },
      ].map(({ label, value, set, placeholder }) => (
        <CinematicCard key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-[0.18em]">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              className="rounded-2xl text-sm"
              rows={2}
            />
          </CardContent>
        </CinematicCard>
      ))}
    </div>

    <div className="mt-6 flex gap-2">
      {existing && (
        <Button variant="outline" className="flex-1 rounded-2xl h-12 font-bold" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button
        className="flex-1 font-bold rounded-2xl h-12 text-base"
        variant="premium"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
        {existing ? 'Update Weekly Reset' : 'Save Weekly Reset'}
      </Button>
    </div>
  </>
);

const SummarySection = ({
  current,
  prior,
  onEdit,
}: {
  current: WeeklyReset;
  prior: WeeklyReset | null;
  onEdit: () => void;
}) => {
  const avg = avgScore(current);
  return (
    <>
      <CinematicCard className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Average</p>
              <p className="text-4xl font-black text-primary leading-none">{avg ?? '—'}</p>
            </div>
            <button
              onClick={onEdit}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary hover:underline"
            >
              Edit this week
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {PILLARS.map((p) => {
              const v = current.scores[p];
              const prev = prior?.scores[p] ?? null;
              let delta: 'up' | 'down' | 'same' = 'same';
              if (v != null && prev != null) {
                if (v > prev) delta = 'up';
                else if (v < prev) delta = 'down';
              }
              return (
                <div key={p} className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                    {p.slice(0, 3)}
                  </p>
                  <div className="rounded-xl border-2 border-border py-2 px-1 bg-card">
                    <p className="text-lg font-black text-foreground">{v ?? '—'}</p>
                    <div className="flex items-center justify-center mt-0.5 h-3">
                      {delta === 'up' && <ArrowUp className="h-3 w-3 text-primary" />}
                      {delta === 'down' && <ArrowDown className="h-3 w-3 text-warning" />}
                      {delta === 'same' && <Minus className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!prior && (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              First weekly reset — no prior week to compare yet.
            </p>
          )}
        </CardContent>
      </CinematicCard>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Personal High', value: current.personal_high },
          { label: 'Personal Low', value: current.personal_low },
          { label: 'Business High', value: current.business_high },
          { label: 'Business Low', value: current.business_low },
        ].map(({ label, value }) => (
          <CinematicCard key={label}>
            <CardContent className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                {label}
              </p>
              <p className="text-sm">{value || <span className="text-muted-foreground italic">—</span>}</p>
            </CardContent>
          </CinematicCard>
        ))}
      </div>
    </>
  );
};

export default WeeklyPage;
