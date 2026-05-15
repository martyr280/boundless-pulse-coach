import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionEyebrow } from '@/components/visual/SectionEyebrow';
import { toast } from 'sonner';
import { Loader2, Plus, FileText, BookOpen, CheckCircle2, Trash2 } from 'lucide-react';

type Kind = 'vision' | 'year_priority' | 'prompt' | 'general';

interface FrameworkRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  kind: Kind;
  version: number;
  is_active: boolean;
  notes: string | null;
  updated_at: string;
}

interface DocumentRow {
  id: string;
  title: string;
  source: string;
  content: string;
  chunk_index: number;
  created_at: string;
}

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'vision', label: 'Vision exercise' },
  { value: 'year_priority', label: 'Year-priority template' },
  { value: 'prompt', label: 'AI prompt fragment' },
  { value: 'general', label: 'General copy' },
];

export default function Admin() {
  return (
    <div className="space-y-8 py-10">
      <header>
        <SectionEyebrow>Admin · Framework CMS</SectionEyebrow>
        <h1 className="h-display text-3xl mt-2">Manage Boundless Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Versioned framework copy and the RAG corpus that grounds every AI response.
        </p>
      </header>

      <Tabs defaultValue="framework">
        <TabsList>
          <TabsTrigger value="framework"><FileText className="h-4 w-4 mr-2" /> Framework Content</TabsTrigger>
          <TabsTrigger value="corpus"><BookOpen className="h-4 w-4 mr-2" /> RAG Corpus</TabsTrigger>
        </TabsList>
        <TabsContent value="framework" className="mt-6">
          <FrameworkPanel />
        </TabsContent>
        <TabsContent value="corpus" className="mt-6">
          <CorpusPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Framework content ----------------

function FrameworkPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState({ slug: '', title: '', body: '', kind: 'general' as Kind, notes: '' });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin_framework_content'],
    queryFn: async (): Promise<FrameworkRow[]> => {
      const { data, error } = await supabase
        .from('framework_content')
        .select('*')
        .order('slug', { ascending: true })
        .order('version', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as FrameworkRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!draft.slug.trim() || !draft.title.trim()) throw new Error('Slug and title are required.');
      const slug = draft.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      // Determine next version for this slug
      const { data: existing } = await supabase
        .from('framework_content').select('version').eq('slug', slug)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      const nextVersion = (existing?.version ?? 0) + 1;
      const { error } = await supabase.from('framework_content').insert({
        slug, title: draft.title.trim(), body: draft.body, kind: draft.kind,
        notes: draft.notes || null, version: nextVersion, is_active: false,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Draft created');
      setDraft({ slug: '', title: '', body: '', kind: 'general', notes: '' });
      qc.invalidateQueries({ queryKey: ['admin_framework_content'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });

  const activate = useMutation({
    mutationFn: async (row: FrameworkRow) => {
      // Atomic flip: deactivate every other version of this slug, then activate this one.
      const { error: e1 } = await supabase
        .from('framework_content').update({ is_active: false })
        .eq('slug', row.slug).neq('id', row.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('framework_content').update({ is_active: true }).eq('id', row.id);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success('Activated'); qc.invalidateQueries({ queryKey: ['admin_framework_content'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Could not activate'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('framework_content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin_framework_content'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Could not delete'),
  });

  // Group rows by slug
  const grouped = rows.reduce<Record<string, FrameworkRow[]>>((acc, r) => {
    (acc[r.slug] ??= []).push(r); return acc;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && Object.keys(grouped).length === 0 && (
          <Card className="rounded-3xl"><CardContent className="py-10 text-center text-sm text-muted-foreground">
            No framework content yet. Create your first draft on the right.
          </CardContent></Card>
        )}
        {Object.entries(grouped).map(([slug, versions]) => (
          <Card key={slug} className="rounded-3xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-mono">{slug}</CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">{versions[0].kind}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-start gap-3 rounded-xl border border-border/40 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">v{v.version}</span>
                      {v.is_active && (
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] uppercase tracking-[0.18em]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate">{v.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap mt-1">{v.body}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!v.is_active && (
                      <Button size="sm" variant="outline" disabled={activate.isPending} onClick={() => activate.mutate(v)}>
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={remove.isPending}
                      onClick={() => { if (confirm(`Delete v${v.version} of ${slug}?`)) remove.mutate(v.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl h-fit lg:sticky lg:top-6">
        <CardHeader><CardTitle className="text-base">New version</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Slug</Label>
            <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="vision.intro" />
          </div>
          <div>
            <Label>Kind</Label>
            <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as Kind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={8} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
          <div>
            <Label>Notes (internal)</Label>
            <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <Button variant="premium" className="w-full rounded-full uppercase tracking-[0.18em] font-bold"
            disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Save draft
          </Button>
          <p className="text-[11px] text-muted-foreground">Drafts are inactive until you press Activate.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- RAG corpus ----------------

function CorpusPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ title: '', source: '', content: '' });
  const [busy, setBusy] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['admin_boundless_documents'],
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from('boundless_documents')
        .select('id, title, source, content, chunk_index, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });

  async function ingest() {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error('Title and content are required.'); return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('rag-ingest', {
        body: {
          title: draft.title.trim(),
          source: draft.source.trim() || 'manual',
          content: draft.content,
        },
      });
      if (error) throw error;
      toast.success('Ingested into corpus');
      setDraft({ title: '', source: '', content: '' });
      qc.invalidateQueries({ queryKey: ['admin_boundless_documents'] });
    } catch (e: any) {
      toast.error(e.message ?? 'Ingestion failed');
    } finally {
      setBusy(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boundless_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin_boundless_documents'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Could not delete'),
  });

  // Group chunks by title+source
  const grouped = docs.reduce<Record<string, DocumentRow[]>>((acc, d) => {
    (acc[`${d.title} · ${d.source}`] ??= []).push(d); return acc;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && Object.keys(grouped).length === 0 && (
          <Card className="rounded-3xl"><CardContent className="py-10 text-center text-sm text-muted-foreground">
            No documents in the corpus yet.
          </CardContent></Card>
        )}
        {Object.entries(grouped).map(([key, chunks]) => (
          <Card key={key} className="rounded-3xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{key}</CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">{chunks.length} chunk{chunks.length === 1 ? '' : 's'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {chunks.slice(0, 3).map((c) => (
                <div key={c.id} className="rounded-xl border border-border/40 p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">chunk #{c.chunk_index}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{c.content}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={remove.isPending}
                    onClick={() => { if (confirm('Delete this chunk?')) remove.mutate(c.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {chunks.length > 3 && (
                <p className="text-xs text-muted-foreground">+ {chunks.length - 3} more chunks</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl h-fit lg:sticky lg:top-6">
        <CardHeader><CardTitle className="text-base">Ingest document</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <Label>Source</Label>
            <Input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="book / proposal / pdf-name.pdf" />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea rows={10} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Paste full text. It will be chunked and embedded automatically." />
          </div>
          <Button variant="premium" className="w-full rounded-full uppercase tracking-[0.18em] font-bold"
            disabled={busy} onClick={ingest}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Ingest
          </Button>
          <p className="text-[11px] text-muted-foreground">Embeddings via Lovable AI; chunks ~800 tokens.</p>
        </CardContent>
      </Card>
    </div>
  );
}
