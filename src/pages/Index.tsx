import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, Footprints, Star } from 'lucide-react';
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
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          BOUNDLESS
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Shape your life, one day at a time.</p>
      </div>

      {/* Pulse Radar */}
      <Card className="border-2 rounded-3xl mb-6 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-extrabold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
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
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 600 }}
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
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-warning/15 text-warning"
                >
                  ⚡ {p}
                </span>
              ))}
            </div>
          )}
          <Button
            className="w-full mt-4 font-bold rounded-2xl"
            onClick={() => navigate('/checkin')}
          >
            Monthly Check-in
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-2 rounded-3xl text-center">
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-extrabold">{avgRating}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-3xl text-center">
          <CardContent className="p-4">
            <Footprints className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-extrabold">{avgSteps}</p>
            <p className="text-xs text-muted-foreground">Avg Steps</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-3xl text-center">
          <CardContent className="p-4">
            <Star className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-extrabold">{habitCompletion}%</p>
            <p className="text-xs text-muted-foreground">Best Self</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Entry */}
      {latestEntry && (
        <Card className="border-2 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">
              Latest Entry · {latestEntry.date}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Daily Rating</span>
              <span
                className={`text-lg font-extrabold ${
                  latestEntry.dailyRating >= 1
                    ? 'text-primary'
                    : latestEntry.dailyRating <= -1
                    ? 'text-warning'
                    : 'text-muted-foreground'
                }`}
              >
                {latestEntry.dailyRating > 0 ? '+' : ''}
                {latestEntry.dailyRating}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Steps</span>
              <span className="text-lg font-extrabold">{latestEntry.stepCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Priority</span>
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
