import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Users, AlertTriangle, TrendingUp, TrendingDown,
  Info, Loader2, Sparkles, Mountain, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


const PILLARS = ['family', 'finance', 'faith', 'fitness', 'friends', 'fun', 'field'];
const PILLAR_LABELS: Record<string, string> = {
  family: 'Family', finance: 'Finance', faith: 'Faith',
  fitness: 'Fitness', friends: 'Friends', fun: 'Fun', field: 'Field',
};

interface MemberData {
  id: string;
  alias: string;
  display_name: string;
  avgScores: Record<string, number>;
  trend: Record<string, number>;
  avgRating: number;
  avgSteps: number;
}

interface Insight {
  title: string;
  body: string;
  severity: string;
}

const CoachDashboard = () => {
  const navigate = useNavigate();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [cohortRadar, setCohortRadar] = useState<any[]>([]);
  const [pillarTrends, setPillarTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [coachName, setCoachName] = useState('');

  const loadData = useCallback(async (cId: string) => {
    // Load members
    const { data: membersData } = await supabase
      .from('cohort_members')
      .select('id, display_name, alias')
      .eq('coach_id', cId);

    if (!membersData || membersData.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const memberIds = membersData.map((m) => m.id);
    const { data: checkins } = await supabase
      .from('cohort_checkins')
      .select('*')
      .in('member_id', memberIds)
      .order('date', { ascending: true });

    if (!checkins) {
      setLoading(false);
      return;
    }

    // Process member data
    const processed: MemberData[] = membersData.map((m) => {
      const mCheckins = checkins.filter((c) => c.member_id === m.id);
      const recent = mCheckins.slice(-7);
      const earlier = mCheckins.slice(0, Math.max(mCheckins.length - 7, 0));

      const avgScores: Record<string, number> = {};
      const trend: Record<string, number> = {};

      for (const p of PILLARS) {
        const recentAvg = recent.length ? recent.reduce((s, c) => s + ((c as any)[p] ?? 5), 0) / recent.length : 5;
        const earlierAvg = earlier.length ? earlier.reduce((s, c) => s + ((c as any)[p] ?? 5), 0) / earlier.length : recentAvg;
        avgScores[p] = Math.round(recentAvg * 10) / 10;
        trend[p] = Math.round((recentAvg - earlierAvg) * 10) / 10;
      }

      return {
        id: m.id,
        alias: m.alias,
        display_name: m.display_name,
        avgScores,
        trend,
        avgRating: recent.length ? Math.round((recent.reduce((s, c) => s + c.daily_rating, 0) / recent.length) * 10) / 10 : 0,
        avgSteps: recent.length ? Math.round(recent.reduce((s, c) => s + c.step_count, 0) / recent.length) : 0,
      };
    });

    setMembers(processed);

    // Cohort-wide radar (average across all members)
    const radarData = PILLARS.map((p) => ({
      pillar: PILLAR_LABELS[p],
      score: Math.round((processed.reduce((s, m) => s + m.avgScores[p], 0) / processed.length) * 10) / 10,
      fullMark: 10,
    }));
    setCohortRadar(radarData);

    // Pillar trends over time (aggregate daily averages)
    const dates = [...new Set(checkins.map((c) => c.date))].sort();
    const trendData = dates.map((date) => {
      const dayCheckins = checkins.filter((c) => c.date === date);
      const row: any = { date: date.slice(5) };
      for (const p of PILLARS) {
        row[p] = Math.round((dayCheckins.reduce((s, c) => s + ((c as any)[p] ?? 5), 0) / dayCheckins.length) * 10) / 10;
      }
      return row;
    });
    setPillarTrends(trendData);

    // Load existing insights
    const { data: insightData } = await supabase
      .from('coach_insights')
      .select('title, body, severity')
      .eq('coach_id', cId)
      .order('created_at', { ascending: false });

    if (insightData) setInsights(insightData);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: coach } = await supabase
        .from('coaches').select('id, name').maybeSingle();
      if (coach) {
        setCoachId(coach.id);
        setCoachName(coach.name);
        await loadData(coach.id);
      } else {
        try {
          const { data, error } = await supabase.functions.invoke('coach-analytics', {
            body: { mode: 'seed_demo' },
          });
          if (error || (data as any)?.error) {
            toast.error((data as any)?.error || 'Coach role required');
            setLoading(false);
            return;
          }
          if ((data as any).coach_id) {
            setCoachId((data as any).coach_id);
            setCoachName('Coach');
            await loadData((data as any).coach_id);
          }
        } catch (e) {
          console.error(e);
          toast.error('Failed to initialize');
          setLoading(false);
        }
      }
    };
    init();
  }, [loadData]);

  const runAnalysis = async () => {
    if (!coachId) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-analytics', {
        body: { mode: 'analyze' },
      });
      if (!error && (data as any)?.insights) {
        setInsights((data as any).insights);
        toast.success('AI analysis complete');
      } else {
        toast.error((data as any)?.error || 'Analysis failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const severityIcon = (s: string) => {
    if (s === 'alert') return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (s === 'positive') return <TrendingUp className="h-4 w-4 text-primary" />;
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  const severityBg = (s: string) => {
    if (s === 'alert') return 'bg-destructive/10 border-destructive/30';
    if (s === 'positive') return 'bg-primary/10 border-primary/30';
    return 'bg-secondary border-border';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="mb-6">
        <span className="eyebrow">Coaches Module</span>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="h-display text-3xl">Cohort <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">overview</span></h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
              {coachName} · {members.length} Members
            </p>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            variant="premium"
            size="sm"
            className="font-bold rounded-full uppercase tracking-[0.18em] text-xs"
          >
            {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Analyze
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights
          </h2>
          {insights.map((insight, i) => (
            <Card key={i} className={`rounded-2xl border ${severityBg(insight.severity)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  {severityIcon(insight.severity)}
                  <div>
                    <p className="text-sm font-bold">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.body}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cohort Radar */}
      <Card className="border border-border rounded-3xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cohort Average — 7 Pillars
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={cohortRadar} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="pillar"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  name="Cohort Avg"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pillar Trends Over Time */}
      {pillarTrends.length > 0 && (
        <Card className="border border-border rounded-3xl mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pillar Trends (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pillarTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                    }}
                  />
                  <Line type="monotone" dataKey="fitness" stroke="hsl(27, 88%, 48%)" strokeWidth={2} dot={false} name="Fitness" />
                  <Line type="monotone" dataKey="finance" stroke="hsl(200, 70%, 50%)" strokeWidth={2} dot={false} name="Finance" />
                  <Line type="monotone" dataKey="family" stroke="hsl(140, 60%, 45%)" strokeWidth={2} dot={false} name="Family" />
                  <Line type="monotone" dataKey="fun" stroke="hsl(280, 60%, 55%)" strokeWidth={2} dot={false} name="Fun" />
                  <Line type="monotone" dataKey="field" stroke="hsl(50, 80%, 50%)" strokeWidth={2} dot={false} name="Field" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Cards */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" />
        Individual Members
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {members.map((m) => {
          const lowestPillar = PILLARS.reduce((low, p) =>
            m.avgScores[p] < m.avgScores[low] ? p : low
          , PILLARS[0]);
          const biggestDrop = PILLARS.reduce((worst, p) =>
            m.trend[p] < m.trend[worst] ? p : worst
          , PILLARS[0]);

          return (
            <Card key={m.id} className="border border-border rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-black">{m.alias}</p>
                    <p className="text-[10px] text-muted-foreground">{m.display_name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${m.avgRating >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {m.avgRating > 0 ? '+' : ''}{m.avgRating}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Avg Rating</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Steps avg</span>
                  <span className="font-bold">{m.avgSteps.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Weakest pillar</span>
                  <span className="font-bold text-primary">{PILLAR_LABELS[lowestPillar]} ({m.avgScores[lowestPillar]})</span>
                </div>

                {m.trend[biggestDrop] < -0.5 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                    <TrendingDown className="h-3 w-3" />
                    <span className="font-bold">
                      {PILLAR_LABELS[biggestDrop]} declining ({m.trend[biggestDrop]})
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cohort Bar Chart */}
      <Card className="border border-border rounded-3xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Member Comparison — Daily Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={members.map((m) => ({ name: m.alias, rating: m.avgRating, steps: m.avgSteps / 1000 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis domain={[-2, 2]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="rating" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Avg Rating" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachDashboard;
