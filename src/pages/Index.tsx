import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, Footprints, Star, Mountain } from 'lucide-react';
import { getLatestCheckIn, getEntries } from '@/lib/store';
import { PILLARS } from '@/lib/types';

const Index = () => {
  const navigate = useNavigate();
  const latestCheckIn = getLatestCheckIn();
  const entries = getEntries();
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  const radarData = latestCheckIn
    ? latestCheckIn.scores.map((s) => ({
        pillar: s.pillar,
        score: s.score,
        fullMark: 10,
      }))
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
          100
      )
    : 0;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Mountain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase text-foreground">
            Boundless
          </h1>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Live a Boundless Life</p>
        </div>
      </div>

      {/* Pulse Radar */}
      <Card className="border border-border rounded-3xl mb-6 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Your Pulse
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
                  fillOpacity={0.2}
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
                  className="text-xs font-bold px-3 py-1 rounded-full bg-primary/15 text-primary uppercase tracking-wide"
                >
                  ⚡ {p}
                </span>
              ))}
            </div>
          )}
          <Button
            className="w-full mt-4 font-bold rounded-2xl uppercase tracking-wider"
            onClick={() => navigate('/checkin')}
          >
            Monthly Check-in
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border border-border rounded-3xl text-center">
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-black">{avgRating}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-3xl text-center">
          <CardContent className="p-4">
            <Footprints className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-black">{avgSteps}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Avg Steps</p>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-3xl text-center">
          <CardContent className="p-4">
            <Star className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-black">{habitCompletion}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Best Self</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Entry */}
      {latestEntry && (
        <Card className="border border-border rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
        </Card>
      )}
    </div>
  );
};

export default Index;
