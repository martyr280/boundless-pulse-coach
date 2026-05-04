import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Textarea } from '@/components/ui/textarea';
import { PILLARS, PILLAR_SUBTOPICS, PillarScore, CheckIn } from '@/lib/types';
import { addCheckIn } from '@/lib/store';
import { ArrowLeft, Check, Loader2, Sparkles, Target, TrendingUp, Lightbulb, Link2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReportData {
  overall_score: number;
  life_shape: string;
  life_shape_description: string;
  strengths: { pillar: string; insight: string }[];
  priority_opportunities: { pillar: string; score: number; insight: string }[];
  cross_references: { observation: string }[];
  priority_ideas: { title: string; pillar: string; description: string }[];
  motivational_close: string;
}



const CheckInPage = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(PILLARS.map((p) => [p, 5]))
  );
  const [whats, setWhats] = useState<Record<string, string>>(
    Object.fromEntries(PILLARS.map((p) => [p, '']))
  );
  const [feels, setFeels] = useState<Record<string, string>>(
    Object.fromEntries(PILLARS.map((p) => [p, '']))
  );
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase, setPhase] = useState<'rating' | 'report'>('rating');

  const handleSubmit = async () => {
    const pillarScores: PillarScore[] = PILLARS.map((p) => ({
      pillar: p,
      score: scores[p],
      whats_happening: whats[p],
      how_it_feels: feels[p],
    }));
    const checkin: CheckIn = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      scores: pillarScores,
    };
    addCheckIn(checkin);

    // Generate AI report
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('boundless-assessment', {
        body: { scores: pillarScores },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || (error as any)?.message || 'Failed to generate report');
        navigate('/');
        return;
      }
      setReport(data as any);
      setPhase('report');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
      navigate('/');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-extrabold mb-2">Analyzing Your Life Balance</h2>
          <p className="text-muted-foreground text-sm">
            The Boundless AI is cross-referencing your scores and generating personalized insights...
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'report' && report) {
    const radarData = PILLARS.map((p) => ({
      pillar: p,
      score: scores[p],
      fullMark: 10,
    }));

    return (
      <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
        <button
          onClick={() => { setPhase('rating'); setReport(null); }}
          className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Ratings
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-3">
            <Sparkles className="h-4 w-4" />
            AI Assessment Report
          </div>
          <h1 className="text-2xl font-extrabold">{report.life_shape}</h1>
          <p className="text-muted-foreground text-sm mt-1">{report.life_shape_description}</p>
        </div>

        {/* Radar + Overall Score */}
        <Card className="border-2 rounded-3xl mb-6 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-primary">{report.overall_score}</p>
                <p className="text-xs text-muted-foreground font-semibold">Overall</p>
              </div>
            </div>
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Strengths */}
        {report.strengths.length > 0 && (
          <Card className="border-2 rounded-3xl mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Your Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-primary font-extrabold text-sm mt-0.5">✓</span>
                  <div>
                    <span className="font-bold text-sm">{s.pillar}: </span>
                    <span className="text-sm text-muted-foreground">{s.insight}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Priority Opportunities */}
        {report.priority_opportunities.length > 0 && (
          <Card className="border-2 border-warning/30 rounded-3xl mb-4 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-warning">
                <Target className="h-4 w-4" />
                Priority Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.priority_opportunities.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-warning font-extrabold text-sm mt-0.5">⚡</span>
                  <div>
                    <span className="font-bold text-sm">{p.pillar} ({p.score}/10): </span>
                    <span className="text-sm text-muted-foreground">{p.insight}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Cross-References */}
        {report.cross_references.length > 0 && (
          <Card className="border-2 rounded-3xl mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Cross-Pillar Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.cross_references.map((c, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  🔗 {c.observation}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 30-Day Priority Ideas */}
        <Card className="border-2 rounded-3xl mb-6 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Your 30-Day Priority Ideas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.priority_ideas.map((idea, i) => (
              <div key={i} className="border-2 border-border rounded-2xl p-4 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {idea.pillar}
                  </span>
                </div>
                <h3 className="font-bold text-sm mb-1">{idea.title}</h3>
                <p className="text-xs text-muted-foreground">{idea.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Motivational Close */}
        <Card className="border-2 rounded-3xl mb-6 bg-primary/10">
          <CardContent className="p-5 text-center">
            <p className="text-sm font-semibold italic text-foreground">
              "{report.motivational_close}"
            </p>
          </CardContent>
        </Card>

        <Button className="w-full font-bold rounded-2xl h-12 text-base" onClick={() => navigate('/')}>
          <ArrowRight className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Rating phase
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-extrabold mb-1">(Y)our Now</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Rate each F from 1–10. Add a note on what's happening and how it feels — the AI report uses both.
      </p>

      <div className="space-y-4">
        {PILLARS.map((pillar) => {
          const score = scores[pillar];
          const isLow = score < 5;
          return (
            <Card key={pillar} className={`border-2 rounded-3xl transition-colors ${isLow ? 'border-warning/50 bg-warning/5' : ''}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{pillar}</span>
                  <span className={`text-2xl font-extrabold ${isLow ? 'text-warning' : 'text-primary'}`}>
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
                  className="w-full"
                />
                {isLow && (
                  <p className="text-xs text-warning font-semibold">
                    ⚡ Priority Opportunity
                  </p>
                )}
                <Textarea
                  placeholder="What's happening / not happening that's causing your score?"
                  value={whats[pillar]}
                  onChange={(e) => setWhats((p) => ({ ...p, [pillar]: e.target.value }))}
                  className="text-sm rounded-2xl"
                  rows={2}
                />
                <Textarea
                  placeholder="How does it feel?"
                  value={feels[pillar]}
                  onChange={(e) => setFeels((p) => ({ ...p, [pillar]: e.target.value }))}
                  className="text-sm rounded-2xl"
                  rows={2}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button className="w-full mt-6 font-bold rounded-2xl h-12 text-base" onClick={handleSubmit}>
        <Sparkles className="h-5 w-5 mr-2" />
        Generate AI Report
      </Button>
    </div>
  );
};

export default CheckInPage;
