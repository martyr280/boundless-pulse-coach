import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PILLARS, PillarScore, CheckIn } from '@/lib/types';
import { addCheckIn } from '@/lib/store';
import { ArrowLeft, Check } from 'lucide-react';

const CheckInPage = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(PILLARS.map((p) => [p, 5]))
  );

  const handleSubmit = () => {
    const pillarScores: PillarScore[] = PILLARS.map((p) => ({
      pillar: p,
      score: scores[p],
    }));
    const checkin: CheckIn = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      scores: pillarScores,
    };
    addCheckIn(checkin);
    navigate('/');
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-extrabold mb-1">Monthly Check-in</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Rate each pillar of your life from 1–10.
      </p>

      <div className="space-y-4">
        {PILLARS.map((pillar) => {
          const score = scores[pillar];
          const isLow = score < 5;
          return (
            <Card key={pillar} className={`border-2 rounded-3xl transition-colors ${isLow ? 'border-warning/50 bg-warning/5' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm">{pillar}</span>
                  <span className={`text-2xl font-extrabold ${isLow ? 'text-warning' : 'text-primary'}`}>
                    {score}
                  </span>
                </div>
                <Slider
                  value={[score]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([v]) => setScores((prev) => ({ ...prev, [pillar]: v }))}
                  className="w-full"
                />
                {isLow && (
                  <p className="text-xs text-warning font-semibold mt-2">
                    ⚡ Priority Opportunity
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button className="w-full mt-6 font-bold rounded-2xl h-12 text-base" onClick={handleSubmit}>
        <Check className="h-5 w-5 mr-2" />
        Save Check-in
      </Button>
    </div>
  );
};

export default CheckInPage;
