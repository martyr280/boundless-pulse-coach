import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_HABITS, JournalEntry } from '@/lib/types';
import { addEntry } from '@/lib/store';
import { Camera, ArrowLeft, Check, Upload } from 'lucide-react';

type Phase = 'capture' | 'review';

const RATINGS = [-2, -1, 0, 1, 2];

const ScannerPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('capture');
  const [dailyRating, setDailyRating] = useState(0);
  const [stepCount, setStepCount] = useState('');
  const [topPriority, setTopPriority] = useState('');
  const [topPriorityDone, setTopPriorityDone] = useState(false);
  const [gratitude, setGratitude] = useState(['', '', '']);
  const [habits, setHabits] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_HABITS.map((h) => [h, false]))
  );

  const handleSave = () => {
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      dailyRating,
      stepCount: parseInt(stepCount) || 0,
      topPriority,
      topPriorityDone,
      gratitude: [gratitude[0], gratitude[1], gratitude[2]],
      bestSelfHabits: habits,
    };
    addEntry(entry);
    navigate('/');
  };

  if (phase === 'capture') {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-extrabold mb-1">The Bridge</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Scan your Boundless journal page or enter data manually.
        </p>

        <div className="flex flex-col items-center gap-6">
          <Card className="border-2 border-dashed rounded-3xl w-full">
            <CardContent className="p-12 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Tap to scan your journal page
              </p>
              <Button variant="outline" className="rounded-2xl font-bold" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <div className="w-full flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-semibold">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button className="w-full font-bold rounded-2xl h-12" onClick={() => setPhase('review')}>
            Enter Manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => setPhase('capture')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-extrabold mb-1">Review & Confirm</h1>
      <p className="text-muted-foreground text-sm mb-6">Edit any fields before saving.</p>

      <div className="space-y-4">
        {/* Daily Rating */}
        <Card className="border-2 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Daily Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  onClick={() => setDailyRating(r)}
                  className={`w-12 h-12 rounded-2xl font-extrabold text-lg border-2 transition-all ${
                    dailyRating === r
                      ? r >= 1
                        ? 'bg-primary text-primary-foreground border-primary'
                        : r <= -1
                        ? 'bg-warning text-warning-foreground border-warning'
                        : 'bg-foreground text-background border-foreground'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {r > 0 ? `+${r}` : r}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Count */}
        <Card className="border-2 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Step Count</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              placeholder="e.g. 8500"
              value={stepCount}
              onChange={(e) => setStepCount(e.target.value)}
              className="rounded-2xl"
            />
          </CardContent>
        </Card>

        {/* Top Priority */}
        <Card className="border-2 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Top Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="What was your #1 priority?"
              value={topPriority}
              onChange={(e) => setTopPriority(e.target.value)}
              className="rounded-2xl mb-3"
            />
            <div className="flex items-center gap-2">
              <Switch checked={topPriorityDone} onCheckedChange={setTopPriorityDone} />
              <span className="text-sm font-medium">Completed</span>
            </div>
          </CardContent>
        </Card>

        {/* Gratitude */}
        <Card className="border-2 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Gratitude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gratitude.map((g, i) => (
              <Input
                key={i}
                placeholder={`Gratitude ${i + 1}`}
                value={g}
                onChange={(e) => {
                  const next = [...gratitude];
                  next[i] = e.target.value;
                  setGratitude(next);
                }}
                className="rounded-2xl"
              />
            ))}
          </CardContent>
        </Card>

        {/* Best Self Habits */}
        <Card className="border-2 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Best Self Habits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEFAULT_HABITS.map((h) => (
              <div key={h} className="flex items-center justify-between">
                <span className="text-sm">{h}</span>
                <Switch
                  checked={habits[h]}
                  onCheckedChange={(v) => setHabits((prev) => ({ ...prev, [h]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Button className="w-full mt-6 font-bold rounded-2xl h-12 text-base" onClick={handleSave}>
        <Check className="h-5 w-5 mr-2" />
        Save Entry
      </Button>
    </div>
  );
};

export default ScannerPage;
