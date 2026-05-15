import { Loader2, Mountain, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrentCycle, useStartCycle } from '@/hooks/useCurrentCycle';

interface Props {
  variant?: 'strip' | 'card';
  className?: string;
}

const CycleProgress = ({ variant = 'strip', className = '' }: Props) => {
  const { data, isLoading } = useCurrentCycle();
  const start = useStartCycle();

  const handleStart = () => {
    start.mutate(undefined, {
      onSuccess: () => toast.success('30-day cycle started'),
      onError: (e: any) => toast.error(e?.message || 'Could not start cycle'),
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.cycle) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/60 px-4 py-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mountain className="h-4 w-4 text-primary" />
          <span>No active 30-Day Cycle.</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleStart} disabled={start.isPending}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Start
        </Button>
      </div>
    );
  }

  const { dayNumber, completedDays, targetDays } = data;
  const pct = Math.min(100, Math.round((completedDays / targetDays) * 100));

  if (variant === 'card') {
    return (
      <div className={`rounded-xl border border-border/50 bg-card/70 p-5 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mountain className="h-4 w-4 text-primary" />
            <span className="eyebrow text-xs text-muted-foreground">30-DAY CYCLE</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Day {dayNumber} of {targetDays}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-foreground/80">
          <span className="font-semibold">{completedDays}</span>{' '}
          <span className="text-muted-foreground">of {targetDays} entries logged</span>
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border/40 bg-card/60 px-4 py-2.5 ${className}`}
    >
      <Mountain className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-foreground/80 font-medium tracking-wide uppercase">
            Day {dayNumber} of {targetDays}
          </span>
          <span className="text-muted-foreground">{completedDays} logged</span>
        </div>
        <div className="mt-1.5 h-1 w-full rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

export default CycleProgress;
