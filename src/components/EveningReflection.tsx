import { useEffect, useRef, useState } from 'react';
import { Loader2, Moon, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTodayJournal, useSaveEveningReflection } from '@/hooks/useTodayJournal';

const PROMPT = 'What worked today? What didn\u2019t? What\u2019s one thing you\u2019ll carry into tomorrow?';

const EveningReflection = () => {
  const { data: today, isLoading } = useTodayJournal();
  const save = useSaveEveningReflection();
  const [text, setText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const lastSavedRef = useRef('');

  useEffect(() => {
    if (!hydrated && today) {
      const initial = today.evening_reflection ?? '';
      setText(initial);
      lastSavedRef.current = initial;
      setHydrated(true);
    }
  }, [today, hydrated]);

  const completed = !!today?.evening_completed_at && !!today?.evening_reflection;

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Write a short reflection first.');
      return;
    }
    if (trimmed === lastSavedRef.current.trim()) return;
    try {
      await save.mutateAsync(trimmed);
      lastSavedRef.current = trimmed;
      toast.success('Evening reflection saved');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save reflection');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border/50 bg-card/70 p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" />
          <span className="eyebrow text-xs text-muted-foreground">EVENING RESET</span>
        </div>
        {completed && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <Check className="h-3 w-3" /> Logged
          </span>
        )}
      </div>

      <p className="h-quote text-base text-foreground/85 italic">{PROMPT}</p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tonight\u2019s reflection\u2026"
        className="min-h-[110px] resize-y bg-background/40 border-border/60 text-sm leading-relaxed"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{text.length.toLocaleString()} chars</span>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={save.isPending || !text.trim() || text.trim() === lastSavedRef.current.trim()}
        >
          {save.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving\u2026
            </>
          ) : completed ? (
            'Update reflection'
          ) : (
            'Save reflection'
          )}
        </Button>
      </div>
    </section>
  );
};

export default EveningReflection;
