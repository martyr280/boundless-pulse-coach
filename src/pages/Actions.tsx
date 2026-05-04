import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Check, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ActionItem {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}
interface Update { id: string; action_item_id: string; note: string; created_at: string }

type Filter = 'open' | 'done' | 'all';

const ActionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [newTitle, setNewTitle] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: i } = await supabase.from('action_items').select('*').order('created_at', { ascending: false });
    const { data: u } = await supabase.from('action_item_updates').select('*').order('created_at', { ascending: false });
    setItems((i ?? []) as ActionItem[]);
    setUpdates((u ?? []) as Update[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = async () => {
    if (!newTitle.trim() || !user) return;
    const { error } = await supabase.from('action_items').insert({ title: newTitle.trim(), user_id: user.id });
    if (error) { toast.error('Failed to add'); return; }
    setNewTitle('');
    load();
  };

  const toggleDone = async (item: ActionItem) => {
    const completed_at = item.completed_at ? null : new Date().toISOString();
    await supabase.from('action_items').update({ completed_at }).eq('id', item.id);
    load();
  };

  const addNote = async (id: string) => {
    const note = (noteDrafts[id] || '').trim();
    if (!note) return;
    await supabase.from('action_item_updates').insert({ action_item_id: id, note });
    setNoteDrafts((d) => ({ ...d, [id]: '' }));
    load();
  };

  const filtered = items.filter((i) =>
    filter === 'all' ? true : filter === 'open' ? !i.completed_at : !!i.completed_at
  );

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-extrabold mb-1">Action Items</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Pulled from your LCIs. Add status notes to track follow-ups over time.
      </p>

      {/* Add new */}
      <Card className="border-2 rounded-3xl mb-4">
        <CardContent className="p-3 flex gap-2">
          <Input
            placeholder="New action item…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="rounded-2xl text-sm"
          />
          <Button onClick={addItem} className="rounded-2xl font-bold">
            <Plus className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['open', 'done', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 text-xs font-bold py-2 rounded-full border-2 uppercase tracking-wide transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No action items.</p>
      )}

      <div className="space-y-3">
        {filtered.map((item) => {
          const itemUpdates = updates.filter((u) => u.action_item_id === item.id);
          const done = !!item.completed_at;
          return (
            <Card key={item.id} className={`border-2 rounded-3xl ${done ? 'opacity-70' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={done} onCheckedChange={() => toggleDone(item)} className="mt-1" />
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Created {item.created_at.slice(0, 10)}
                      {done && ` · Completed ${item.completed_at!.slice(0, 10)}`}
                    </p>
                  </div>
                </div>

                {itemUpdates.length > 0 && (
                  <div className="mt-3 pl-7 space-y-1.5 border-l-2 border-border ml-1">
                    {itemUpdates.map((u) => (
                      <div key={u.id} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{u.created_at.slice(0, 10)}:</span> {u.note}
                      </div>
                    ))}
                  </div>
                )}

                {!done && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      rows={1}
                      placeholder="Status update…"
                      value={noteDrafts[item.id] || ''}
                      onChange={(e) => setNoteDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                      className="text-xs rounded-xl"
                    />
                    <Button size="sm" onClick={() => addNote(item.id)} variant="outline" className="rounded-xl">
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ActionsPage;
