import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useLatestCheckin } from '@/hooks/useCheckins';
import { DEFAULT_HABITS } from '@/lib/types';
import { ArrowLeft, BarChart3, Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CorrelationsPage = () => {
  const navigate = useNavigate();
  const { data: entries = [] } = useJournalEntries();
  const { data: latestCheckIn } = useLatestCheckin();

  // Graph A: Daily Rating + Step Count
  const graphAData = entries.map((e) => ({
    date: e.date.slice(5),
    rating: e.dailyRating,
    steps: e.stepCount,
  }));

  // Habit completion per entry
  const habitPcts = entries.map((e) => {
    const vals = Object.values(e.bestSelfHabits);
    return vals.filter(Boolean).length / (vals.length || 1);
  });

  // Graph B: Scatter - habit completion % vs pillar scores
  const scatterData = latestCheckIn
    ? latestCheckIn.scores.map((s, i) => ({
        pillar: s.pillar,
        pillarScore: s.score,
        habitPct: Math.round((habitPcts[i % habitPcts.length] || 0) * 100),
      }))
    : [];

  // Insights
  const avgSteps = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.stepCount, 0) / entries.length)
    : 0;
  const highDays = entries.filter((e) => e.dailyRating >= 1);
  const highDayAvgSteps = highDays.length
    ? Math.round(highDays.reduce((s, e) => s + e.stepCount, 0) / highDays.length)
    : 0;
  const topHabit = DEFAULT_HABITS.reduce(
    (best, h) => {
      const count = entries.filter((e) => e.bestSelfHabits[h]).length;
      return count > best.count ? { name: h, count } : best;
    },
    { name: '', count: 0 }
  );

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Correlations</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">See what drives your best days.</p>

      {entries.length < 3 ? (
        <Card className="border-2 rounded-3xl bg-primary/5">
          <CardContent className="p-6 text-center space-y-3">
            <Sparkles className="h-6 w-6 text-primary mx-auto" />
            <h3 className="text-base font-extrabold uppercase tracking-[0.18em]">Not enough data yet</h3>
            <p className="text-sm text-muted-foreground">
              Log a few days in The Bridge to start seeing patterns between your habits, steps, and how you feel.
            </p>
            <Button
              variant="premium"
              className="rounded-full uppercase tracking-[0.18em] px-6 h-10 font-bold"
              onClick={() => navigate('/scanner')}
            >
              Open The Bridge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Graph A */}
      <Card className="border-2 rounded-3xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Daily Rating vs Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={graphAData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" domain={[-2, 2]} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '1rem',
                    fontSize: '12px',
                  }}
                />
                <Bar yAxisId="right" dataKey="steps" fill="hsl(var(--primary))" opacity={0.3} radius={[8, 8, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Graph B */}
      {scatterData.length > 0 && (
        <Card className="border-2 rounded-3xl mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Habits vs Pillar Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="habitPct" name="Habit %" unit="%" tick={{ fontSize: 10 }} />
                  <YAxis type="number" dataKey="pillarScore" name="Pillar Score" domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <ZAxis range={[80, 80]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--border))',
                      borderRadius: '1rem',
                      fontSize: '12px',
                    }}
                  />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insight Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-1">
          <Lightbulb className="h-4 w-4" /> Insights
        </h2>
        {highDayAvgSteps > avgSteps && (
          <Card className="border-2 rounded-3xl bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold">
                You feel more Boundless on days when your step count exceeds{' '}
                <span className="text-primary font-extrabold">{avgSteps.toLocaleString()}</span> steps.
              </p>
            </CardContent>
          </Card>
        )}
        {topHabit.name && (
          <Card className="border-2 rounded-3xl bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold">
                Your most consistent habit is{' '}
                <span className="text-primary font-extrabold">{topHabit.name}</span> — completed{' '}
                {Math.round((topHabit.count / entries.length) * 100)}% of the time.
              </p>
            </CardContent>
          </Card>
        )}
        <Card className="border-2 rounded-3xl bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">
              On +2 days, you averaged{' '}
              <span className="text-primary font-extrabold">{highDayAvgSteps.toLocaleString()}</span>{' '}
              steps vs your overall average of{' '}
              <span className="font-extrabold">{avgSteps.toLocaleString()}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
};

export default CorrelationsPage;
