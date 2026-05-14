import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import HeroFrame from '@/components/visual/HeroFrame';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import heroSummit from '@/assets/hero-summit.jpg';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useUpsertLifeVision } from '@/hooks/useGuide';
import { useCreateCheckin } from '@/hooks/useCheckins';
import { PILLARS, type Pillar, type PillarScore } from '@/lib/types';

const TOTAL_STEPS = 5;

const ProgressBar = ({ step }: { step: number }) => (
  <div className="w-full max-w-2xl mx-auto mb-8">
    <div className="flex items-center justify-between mb-2">
      <span className="eyebrow">Step {step} of {TOTAL_STEPS}</span>
      <span className="text-xs text-muted-foreground">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
    </div>
    <div className="h-1 w-full bg-border/40 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-500 shadow-glow"
        style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
      />
    </div>
  </div>
);

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const upsertVision = useUpsertLifeVision();
  const createCheckin = useCreateCheckin();

  const [step, setStep] = useState(1);
  const [vision, setVision] = useState('');
  const [scores, setScores] = useState<Record<Pillar, number>>(() => {
    const seed: Record<string, number> = {};
    PILLARS.forEach((p) => (seed[p] = 5));
    return seed as Record<Pillar, number>;
  });
  const [topTask, setTopTask] = useState('');
  const [phone, setPhone] = useState('');
  const [hour, setHour] = useState(9);
  const [busy, setBusy] = useState(false);

  // Bounce out if already complete
  useEffect(() => {
    if (profile?.onboarding_complete) navigate('/', { replace: true });
  }, [profile, navigate]);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));

  const finish = async () => {
    setBusy(true);
    try {
      await updateProfile.mutateAsync({ onboarding_complete: true });
      toast.success("You're all set.");
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to complete onboarding');
    } finally {
      setBusy(false);
    }
  };

  // ----- Step handlers -----

  const handleVisionNext = async (skip = false) => {
    setBusy(true);
    try {
      if (!skip && vision.trim()) {
        await upsertVision.mutateAsync(vision.trim());
      }
      next();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save vision');
    } finally {
      setBusy(false);
    }
  };

  const handlePulseNext = async () => {
    setBusy(true);
    try {
      const pillarScores: PillarScore[] = PILLARS.map((p) => ({
        pillar: p,
        score: scores[p],
        whats_happening: '',
        how_it_feels: '',
      }));
      await createCheckin.mutateAsync(pillarScores);
      next();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save your Pulse');
    } finally {
      setBusy(false);
    }
  };

  const handleTopTaskNext = async (skip = false) => {
    setBusy(true);
    try {
      if (!skip && topTask.trim() && user) {
        // lci_top_tasks requires a session_id — create an onboarding LCI session first.
        const { data: session, error: sErr } = await supabase
          .from('lci_sessions')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        if (sErr) throw sErr;
        const { error: tErr } = await supabase.from('lci_top_tasks').insert({
          session_id: session.id,
          title: topTask.trim(),
          status: 'green',
          position: 0,
        });
        if (tErr) throw tErr;
      }
      next();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save top task');
    } finally {
      setBusy(false);
    }
  };

  const handleNudgesComplete = async (skip = false) => {
    setBusy(true);
    try {
      if (!skip && phone.trim() && user) {
        const { error } = await supabase.from('nudge_preferences').upsert(
          {
            user_id: user.id,
            phone_number: phone.trim(),
            preferred_hour: hour,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            nudge_enabled: true,
          },
          { onConflict: 'user_id' },
        );
        if (error) throw error;
      }
      await finish();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save preferences');
      setBusy(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ----- Step 1: Welcome -----
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
        <ProgressBar step={1} />
        <div className="w-full max-w-3xl">
          <HeroFrame
            image={heroSummit}
            height="lg"
            align="center"
            eyebrow={<SectionEyebrow>WELCOME TO BOUNDLESS</SectionEyebrow>}
            title={<>Your life. <span className="font-serif-italic text-primary">Your design.</span></>}
            subtitle="Let's take 3 minutes to map what matters most."
          >
            <Button size="lg" onClick={next} className="mt-4">
              Let's go <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </HeroFrame>
        </div>
      </div>
    );
  }

  // ----- Step 2: Your Life -----
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
        <ProgressBar step={2} />
        <CinematicCard className="w-full max-w-2xl p-6 md:p-10 space-y-6">
          <div className="space-y-2">
            <SectionEyebrow>10 YEARS FROM NOW</SectionEyebrow>
            <h1 className="h-display text-3xl md:text-4xl text-foreground">Your Life Vision</h1>
            <p className="text-sm text-muted-foreground">
              No pressure to perfect this — you can keep editing it any time from the Guide.
            </p>
          </div>
          <Textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Describe the life you're designing…"
            className="min-h-[240px] resize-y bg-background/40 border-border/60 text-base leading-relaxed"
          />
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={busy} onClick={() => handleVisionNext(true)}>
              Skip for now
            </Button>
            <Button onClick={() => handleVisionNext(false)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Next <ArrowRight className="ml-2 h-4 w-4" /></>)}
            </Button>
          </div>
        </CinematicCard>
      </div>
    );
  }

  // ----- Step 3: Your Now (Pulse) -----
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
        <ProgressBar step={3} />
        <CinematicCard className="w-full max-w-2xl p-6 md:p-10 space-y-6">
          <div className="space-y-2">
            <SectionEyebrow>THE 7 F'S</SectionEyebrow>
            <h1 className="h-display text-3xl md:text-4xl text-foreground">Take your first Pulse</h1>
            <p className="text-sm text-muted-foreground">
              Rate where each pillar of your life sits today, from 1 to 10.
            </p>
          </div>
          <div className="space-y-5">
            {PILLARS.map((p) => (
              <div key={p} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">{p}</span>
                  <span className="text-primary font-bold tabular-nums">{scores[p]}</span>
                </div>
                <Slider
                  value={[scores[p]]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(v) => setScores((s) => ({ ...s, [p]: v[0] }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePulseNext} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Next <ArrowRight className="ml-2 h-4 w-4" /></>)}
            </Button>
          </div>
        </CinematicCard>
      </div>
    );
  }

  // ----- Step 4: First Top Task -----
  if (step === 4) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
        <ProgressBar step={4} />
        <CinematicCard className="w-full max-w-2xl p-6 md:p-10 space-y-6">
          <div className="space-y-2">
            <SectionEyebrow>YOUR FIELD</SectionEyebrow>
            <h1 className="h-display text-3xl md:text-4xl text-foreground">What's your #1 focus right now?</h1>
            <p className="text-sm text-muted-foreground">
              Name the single priority that, if you nailed it, would move everything else.
            </p>
          </div>
          <Input
            value={topTask}
            onChange={(e) => setTopTask(e.target.value)}
            placeholder="The one thing that moves everything else…"
            className="h-12 text-base"
          />
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={busy} onClick={() => handleTopTaskNext(true)}>
              Skip for now
            </Button>
            <Button onClick={() => handleTopTaskNext(false)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Next <ArrowRight className="ml-2 h-4 w-4" /></>)}
            </Button>
          </div>
        </CinematicCard>
      </div>
    );
  }

  // ----- Step 5: Nudges -----
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:00 ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
      <ProgressBar step={5} />
      <CinematicCard className="w-full max-w-2xl p-6 md:p-10 space-y-6">
        <div className="space-y-2">
          <SectionEyebrow>DAILY NUDGES</SectionEyebrow>
          <h1 className="h-display text-3xl md:text-4xl text-foreground">Stay on track</h1>
          <p className="text-sm text-muted-foreground">
            Optional WhatsApp reminders so the work stays in front of you.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">
            WhatsApp Number
          </label>
          <Input
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Preferred time
            </label>
            <span className="text-primary font-bold tabular-nums">{formatHour(hour)}</span>
          </div>
          <Slider
            value={[hour]}
            min={0}
            max={23}
            step={1}
            onValueChange={(v) => setHour(v[0])}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="ghost" disabled={busy} onClick={() => handleNudgesComplete(true)}>
            Skip for now
          </Button>
          <Button onClick={() => handleNudgesComplete(false)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete →'}
          </Button>
        </div>
      </CinematicCard>
    </div>
  );
};

export default OnboardingPage;
