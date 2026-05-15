import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import {
  Loader2, Users, ShieldCheck, UserCog, FileText, BookOpen,
  Activity, ListChecks, BookHeart, HeartHandshake, MessageSquare, Bell,
  ArrowRight, GraduationCap,
} from 'lucide-react';
import NudgesToggle from '@/components/admin/NudgesToggle';

interface Stats {
  users: {
    total: number; confirmed: number; signups_last_7d: number;
    active_last_30d: number; admins: number; coaches: number;
  };
  activity: {
    checkins: number; action_items: number; lci_sessions: number;
    journal_entries: number; partnerships: number; nudges_sent: number;
  };
  content: { framework_rows: number; rag_documents: number; coaches_records: number };
  recent_signups: { id: string; email: string | null; created_at: string }[];
}

export default function AdminDashboard() {
  const { session } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin_stats'],
    enabled: !!session?.access_token,
    staleTime: 60_000,
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await supabase.functions.invoke('admin-stats');
      if (error) throw error;
      return data as Stats;
    },
  });

  return (
    <div className="space-y-10 py-10">
      <header>
        <SectionEyebrow>Admin · Control Center</SectionEyebrow>
        <h1 className="h-display text-3xl mt-2">Boundless operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A live view of community activity, content, and the tools to manage them.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading metrics…
        </div>
      )}
      {error && (
        <Card className="rounded-3xl border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Could not load admin stats: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* People */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">People</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat icon={Users} label="Total members" value={data.users.total}
                hint={`${data.users.confirmed} confirmed`} />
              <Stat icon={Activity} label="Active (last 30d)" value={data.users.active_last_30d}
                hint={`${pct(data.users.active_last_30d, data.users.total)} of base`} />
              <Stat icon={Users} label="New (last 7d)" value={data.users.signups_last_7d} />
              <Stat icon={ShieldCheck} label="Admins" value={data.users.admins} />
              <Stat icon={GraduationCap} label="Coaches" value={data.users.coaches} />
              <Stat icon={HeartHandshake} label="Partnerships" value={data.activity.partnerships} />
            </div>
          </section>

          {/* Activity */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Activity</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat icon={Activity} label="Pulse check-ins" value={data.activity.checkins} />
              <Stat icon={ListChecks} label="Action items" value={data.activity.action_items} />
              <Stat icon={MessageSquare} label="Life Check-Ins" value={data.activity.lci_sessions} />
              <Stat icon={BookHeart} label="Journal entries" value={data.activity.journal_entries} />
              <Stat icon={Bell} label="Nudges sent" value={data.activity.nudges_sent} />
              <Stat icon={BookOpen} label="RAG documents" value={data.content.rag_documents} />
            </div>
          </section>

          {/* Tools */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tools</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ToolCard to="/admin/users" icon={UserCog} title="User & role management"
                desc="Search members, grant or revoke admin/coach access, audit sign-in." />
              <ToolCard to="/admin/cms" icon={FileText} title="Framework CMS & RAG corpus"
                desc={`Versioned framework copy (${data.content.framework_rows}) and AI grounding docs.`} />
              <ToolCard to="/coaches" icon={GraduationCap} title="Coach dashboard"
                desc="Cohorts, sentiment trends, AI-assisted insights." />
              <ToolCard to="/coaches/manage" icon={Users} title="Manage coachees"
                desc="Assign members to coaches and adjust cohort membership." />
              <ToolCard to="/nudges" icon={Bell} title="Nudge controls"
                desc="WhatsApp nudge cadence and predictive accountability triggers." />
              <ToolCard to="/correlations" icon={Activity} title="Correlations explorer"
                desc="Cross-pillar trends across the whole community." />
            </div>
          </section>

          {/* Controls */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Controls</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NudgesToggle />
            </div>
          </section>

          {/* Recent signups */}
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Recent signups</h2>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/admin/users">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <Card className="rounded-3xl">
              <CardContent className="p-0 divide-y divide-border/40">
                {data.recent_signups.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">No signups yet.</div>
                )}
                {data.recent_signups.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.email ?? '—'}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">new</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

function Stat({
  icon: Icon, label, value, hint,
}: { icon: any; label: string; value: number; hint?: string }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-display text-3xl">{value.toLocaleString()}</div>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ToolCard({
  to, icon: Icon, title, desc,
}: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="group block">
      <Card className="rounded-3xl h-full transition hover:border-primary/40 hover:shadow-lg">
        <CardContent className="py-5 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Icon className="h-4 w-4" />
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{desc}</p>
          <div className="text-xs text-primary/70 inline-flex items-center gap-1 pt-1 group-hover:gap-2 transition-all">
            Open <ArrowRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
