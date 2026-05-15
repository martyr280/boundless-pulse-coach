import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Plus, Trash2, Users, Pencil, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Coachee {
  id: string;
  display_name: string;
  alias: string;
  user_id: string | null;
  created_at: string;
}

export default function CoachManageCoachees() {
  const navigate = useNavigate();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachees, setCoachees] = useState<Coachee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newAlias, setNewAlias] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlias, setEditAlias] = useState('');

  const load = useCallback(async (cId: string) => {
    const { data, error } = await supabase
      .from('cohort_members')
      .select('id, display_name, alias, user_id, created_at')
      .eq('coach_id', cId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast.error('Failed to load coachees');
    } else {
      setCoachees((data ?? []) as Coachee[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: coach, error } = await supabase
        .from('coaches')
        .select('id')
        .maybeSingle();
      if (error || !coach) {
        toast.error('Coach profile not found');
        setLoading(false);
        return;
      }
      setCoachId(coach.id);
      await load(coach.id);
    })();
  }, [load]);

  const addCoachee = async () => {
    if (!coachId) return;
    if (!newName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('cohort_members').insert({
      coach_id: coachId,
      display_name: newName.trim(),
      alias: newAlias.trim() || 'Member',
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Failed to add coachee');
      return;
    }
    setNewName('');
    setNewAlias('');
    toast.success('Coachee added');
    await load(coachId);
  };

  const startEdit = (c: Coachee) => {
    setEditingId(c.id);
    setEditName(c.display_name);
    setEditAlias(c.alias);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditAlias('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    const { error } = await supabase
      .from('cohort_members')
      .update({ display_name: editName.trim(), alias: editAlias.trim() || 'Member' })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update');
      return;
    }
    toast.success('Updated');
    cancelEdit();
    if (coachId) await load(coachId);
  };

  const removeCoachee = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? This will also remove their check-in history under your cohort.`)) return;
    const { error } = await supabase.from('cohort_members').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove');
      return;
    }
    toast.success('Removed');
    if (coachId) await load(coachId);
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
        onClick={() => navigate('/coaches')}
        className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="mb-6">
        <span className="eyebrow">Coaches Module</span>
        <h1 className="h-display text-3xl mt-2">
          Manage <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">coachees</span>
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
          {coachees.length} {coachees.length === 1 ? 'Coachee' : 'Coachees'}
        </p>
      </div>

      {/* Add new */}
      <Card className="border border-border rounded-3xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add a coachee
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-name" className="text-xs uppercase tracking-wider">Display name</Label>
            <Input
              id="new-name"
              placeholder="e.g. Jordan Smith"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-alias" className="text-xs uppercase tracking-wider">Alias / cohort label</Label>
            <Input
              id="new-alias"
              placeholder="e.g. Member, Founder, Operator"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <Button
            onClick={addCoachee}
            disabled={saving || !newName.trim()}
            variant="premium"
            className="w-full rounded-2xl font-bold uppercase tracking-[0.18em] text-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add coachee
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border border-border rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Your coachees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {coachees.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No coachees yet — add your first above.</p>
          )}
          {coachees.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <div
                key={c.id}
                className="px-3 py-3 rounded-2xl border border-border bg-card/50"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Display name"
                      className="rounded-xl text-sm"
                    />
                    <Input
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="Alias"
                      className="rounded-xl text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(c.id)} className="rounded-xl flex-1">
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="rounded-xl">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{c.display_name}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        {c.alias}
                        {!c.user_id && <span className="ml-2 italic normal-case tracking-normal opacity-70">· not linked</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(c)}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeCoachee(c.id, c.display_name)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
