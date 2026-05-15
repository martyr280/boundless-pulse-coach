import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, TrendingUp, Footprints, Star, Sparkles, Settings, LineChart as LineChartIcon } from 'lucide-react';
import { useCheckins, useLatestCheckin } from '@/hooks/useCheckins';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PILLARS, type Pillar } from '@/lib/types';
import HeroFrame from '@/components/visual/HeroFrame';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import MountainMark from '@/components/visual/MountainMark';
import heroForest from '@/assets/hero-forest.jpg';
import CycleProgress from '@/components/CycleProgress';
import EveningReflection from '@/components/EveningReflection';

const PILLAR_COLORS: Record<Pillar, string> = {
  Family: 'hsl(var(--primary))',
  Finance: '#6366f1',
  Faith: '#10b981',
  Fitness: '#f59e0b',
  Friends: '#f43f5e',
  Fun: '#8b5cf6',
  Field: '#0ea5e9',
};

const Index = () => {
  const navigate = useNavigate();
  const { data: latestCheckIn } = useLatestCheckin();
  const { data: allCheckIns = [] } = useCheckins();
  const { data: entries = [] } = useJournalEntries();
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  // Build chronological history rows: one per check-in with all 7 pillar scores
  const historyData = [...allCheckIns]
    .reverse()
    .map((c) => {
      const d = new Date(c.date);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const row: Record<string, number | string> = { date: label };
      for (const s of c.scores) row[s.pillar] = s.score;
      return row;
    });

  const radarData = latestCheckIn
    ? latestCheckIn.scores.map((s) => ({ pillar: s.pillar, score: s.score, fullMark: 10 }))
    : PILLARS.map((p) => ({ pillar: p, score: 0, fullMark: 10 }));

  const priorityPillars = latestCheckIn
    ? latestCheckIn.scores.filter((s) => s.score < 5).map((s) => s.pillar)
    : [];

  const avgRating = entries.length
    ? (entries.reduce((sum, e) => sum + e.dailyRating, 0) / entries.length).toFixed(1)
    : '—';

  const avgSteps = entries.length
    ? Math.round(entries.reduce((sum, e) => sum + e.stepCount, 0) / entries.length).toLocaleString()
    : '—';

  const habitCompletion = entries.length
    ? Math.round(
        (entries.reduce((sum, e) => {
          const habits = Object.values(e.bestSelfHabits);
          return sum + habits.filter(Boolean).length / (habits.length || 1);
        }, 0) /
          entries.length) *
          100,
      )
    : 0;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Brand bar */}
      <div className="mb-5 flex items-center gap-3">
        <MountainMark className="h-9 w-9" />
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-[0.22em] uppercase text-foreground leading-none">
            Boundless
          </h1>
          <p className="text-muted-foreground text-[10px] tracking-[0.28em] uppercase mt-1">
            Live a life that feels like yours
          </p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Open profile and settings"
          className="h-10 w-10 rounded-full border border-border/60 bg-card/60 hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors flex items-center justify-center"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Cinematic hero */}
      <HeroFrame
        image={heroForest}
        eyebrow={<SectionEyebrow>Your Monthly Pulse</SectionEyebrow>}
        title={<>Pursue a life <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">that feels like yours</span></>}
        subtitle="Track the seven pillars. Notice the gaps. Take one intentional step."
        height="md"
        align="left"
        className="mb-6"
      >
        <Button
          variant="premium"
          className="w-fit font-bold rounded-full uppercase tracking-[0.18em] px-6 h-11"
          onClick={() => navigate('/checkin')}
        >
          Monthly Check-in
        </Button>
      </HeroFrame>

      <CycleProgress className="mb-4" />

      <Tabs defaultValue="pulse" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4 bg-card/60 border border-border/60 rounded-full h-11 p-1">
          <TabsTrigger
            value="pulse"
            className="rounded-full text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Pulse
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-full text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <LineChartIcon className="h-3.5 w-3.5 mr-1.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pulse" className="mt-0">
          {/* Pulse Radar or empty state */}
          {latestCheckIn ? (
            <CinematicCard className="mb-6 -mt-4 relative z-20 mx-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.18em] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Pulse Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="pillar"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar
                        name="Life Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {priorityPillars.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {priorityPillars.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-bold px-3 py-1 rounded-full bg-primary/15 text-primary uppercase tracking-[0.18em]"
                      >
                        ⚡ {p}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </CinematicCard>
          ) : (
            <CinematicCard className="mb-6 -mt-4 relative z-20 mx-2">
              <CardContent className="p-6 text-center space-y-3">
                <Sparkles className="h-6 w-6 text-primary mx-auto" />
                <h3 className="h-display text-base">Take your first check-in</h3>
                <p className="text-sm text-muted-foreground">
                  Rate the seven pillars to see your life balance and unlock the AI report.
                </p>
                <Button
                  variant="premium"
                  className="rounded-full uppercase tracking-[0.18em] px-6 h-10 font-bold"
                  onClick={() => navigate('/checkin')}
                >
                  Start Check-in
                </Button>
              </CardContent>
            </CinematicCard>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { Icon: TrendingUp, value: avgRating, label: 'Avg Rating' },
              { Icon: Footprints, value: avgSteps, label: 'Avg Steps' },
              { Icon: Star, value: `${habitCompletion}%`, label: 'Best Self' },
            ].map(({ Icon, value, label }) => (
              <CinematicCard key={label} className="text-center">
                <div className="p-4">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-1">
                    {label}
                  </p>
                </div>
              </CinematicCard>
            ))}
          </div>

          {/* Latest Entry */}
          {latestEntry && (
            <CinematicCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  Latest Entry · {latestEntry.date}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold uppercase tracking-wide">Daily Rating</span>
                  <span
                    className={`text-lg font-black ${
                      latestEntry.dailyRating >= 1
                        ? 'text-primary'
                        : latestEntry.dailyRating <= -1
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {latestEntry.dailyRating > 0 ? '+' : ''}
                    {latestEntry.dailyRating}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold uppercase tracking-wide">Steps</span>
                  <span className="text-lg font-black">{latestEntry.stepCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-wide">Priority</span>
                  <span className={`text-sm font-medium ${latestEntry.topPriorityDone ? 'text-primary line-through' : ''}`}>
                    {latestEntry.topPriority}
                  </span>
                </div>
              </CardContent>
            </CinematicCard>
          )}

          <div className="mt-6">
            <EveningReflection />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          {historyData.length >= 2 ? (
            <CinematicCard className="mb-6 -mt-4 relative z-20 mx-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.18em] flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-primary" />
                  Pillar Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        stroke="hsl(var(--border))"
                      />
                      <YAxis
                        domain={[1, 10]}
                        ticks={[1, 3, 5, 7, 10]}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        stroke="hsl(var(--border))"
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      {PILLARS.map((p) => (
                        <Line
                          key={p}
                          type="monotone"
                          dataKey={p}
                          stroke={PILLAR_COLORS[p]}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </CinematicCard>
          ) : (
            <CinematicCard className="mb-6 -mt-4 relative z-20 mx-2">
              <CardContent className="p-6 text-center space-y-3">
                <Sparkles className="h-6 w-6 text-primary mx-auto" />
                <h3 className="h-display text-base">Take your first check-in</h3>
                <p className="text-sm text-muted-foreground">
                  We need at least two check-ins to chart your trends.
                </p>
                <Button
                  variant="premium"
                  className="rounded-full uppercase tracking-[0.18em] px-6 h-10 font-bold"
                  onClick={() => navigate('/checkin')}
                >
                  Start Check-in
                </Button>
              </CardContent>
            </CinematicCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
