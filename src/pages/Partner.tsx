import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Send, UserPlus, X, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import HeroFrame from '@/components/visual/HeroFrame';
import heroForest from '@/assets/hero-forest.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { PILLARS, type Pillar } from '@/lib/types';
import {
  useMyPartnerships,
  useAcceptedPartner,
  useSendPartnerRequest,
  useRespondToPartnerRequest,
  usePartnerProfile,
  usePartnerLatestWeeklyReset,
  usePartnerTopTasks,
  usePartnerTaskNotes,
  useCreatePartnerTaskNote,
  type Partnership,
  type PartnerTopTask,
  type PartnerWeeklyReset,
} from '@/hooks/usePartner';

const STATUS_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-destructive',
};

const initials = (name?: string | null, email?: string | null) => {
  const src = (name || email || '').trim();
  if (!src) return '·';
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const PILLAR_TO_COL: Record<Pillar, keyof PartnerWeeklyReset> = {
  Family: 'family_score',
  Finance: 'finance_score',
  Faith: 'faith_score',
  Fitness: 'fitness_score',
  Friends: 'friends_score',
  Fun: 'fun_score',
  Field: 'field_score',
};

// ---------- State A: No partner yet ----------

function FindPartner({
  incomingRequests,
}: {
  incomingRequests: Partnership[];
}) {
  const [email, setEmail] = useState('');
  const send = useSendPartnerRequest();
  const respond = useRespondToPartnerRequest();

  const submit = async () => {
    if (!email.trim()) return;
    try {
      await send.mutateAsync(email);
      toast.success('Invite sent');
      setEmail('');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send invite');
    }
  };

  return (
    <div className="space-y-6">
      <CinematicCard className="p-6 md:p-8 space-y-4">
        <div className="space-y-2">
          <SectionEyebrow>ACCOUNTABILITY</SectionEyebrow>
          <h2 className="h-display text-2xl md:text-3xl text-foreground">Find your partner</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Partners see each other's weekly scores and top tasks, and can leave notes that keep
            you both moving forward.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="partner@example.com"
            className="h-11 flex-1"
          />
          <Button onClick={submit} disabled={send.isPending || !email.trim()} className="h-11">
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" /> Send invite
              </>
            )}
          </Button>
        </div>
      </CinematicCard>

      {incomingRequests.length > 0 && (
        <CinematicCard className="p-6 md:p-8 space-y-4">
          <SectionEyebrow>INCOMING REQUESTS</SectionEyebrow>
          <div className="space-y-3">
            {incomingRequests.map((r) => (
              <IncomingRequestRow
                key={r.id}
                request={r}
                onRespond={(status) =>
                  respond
                    .mutateAsync({ id: r.id, status })
                    .then(() =>
                      toast.success(status === 'accepted' ? 'Partnership accepted' : 'Request declined'),
                    )
                    .catch((e) => toast.error(e?.message || 'Failed to respond'))
                }
              />
            ))}
          </div>
        </CinematicCard>
      )}
    </div>
  );
}

function IncomingRequestRow({
  request,
  onRespond,
}: {
  request: Partnership;
  onRespond: (status: 'accepted' | 'declined') => void;
}) {
  const { data: profile } = usePartnerProfile(request.requester_id);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/30">
      <Avatar className="h-10 w-10">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
        <AvatarFallback className="bg-card text-xs font-bold">
          {initials(profile?.display_name, null)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">
          {profile?.display_name || 'Unknown user'}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onRespond('declined')}>
        <X className="h-4 w-4" />
      </Button>
      <Button size="sm" onClick={() => onRespond('accepted')}>
        <Check className="h-4 w-4 mr-1" /> Accept
      </Button>
    </div>
  );
}

// ---------- State B: Pending sent ----------

function PendingSent({ partnership }: { partnership: Partnership }) {
  const { data: profile } = usePartnerProfile(partnership.recipient_id);
  const respond = useRespondToPartnerRequest();
  return (
    <CinematicCard className="p-6 md:p-8 space-y-4">
      <SectionEyebrow>INVITE SENT</SectionEyebrow>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="bg-card font-bold">
            {initials(profile?.display_name, null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {profile?.display_name || 'Pending partner'}
          </p>
          <p className="text-xs text-muted-foreground">Awaiting their response.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            respond
              .mutateAsync({ id: partnership.id, status: 'declined' })
              .then(() => toast.success('Invite cancelled'))
              .catch((e) => toast.error(e?.message || 'Failed to cancel'))
          }
        >
          Cancel
        </Button>
      </div>
    </CinematicCard>
  );
}

// ---------- State C: Active partner ----------

function ScoreBadge({ pillar, value }: { pillar: Pillar; value: number | null }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-center">
      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{pillar}</div>
      <div className="text-xl font-black text-primary tabular-nums">{value ?? '—'}</div>
    </div>
  );
}

function WeeklySection({ partnerId }: { partnerId: string }) {
  const { data: weekly, isLoading } = usePartnerLatestWeeklyReset(partnerId);
  return (
    <CinematicCard className="p-6 md:p-8 space-y-4">
      <SectionEyebrow>WEEKLY PULSE</SectionEyebrow>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : !weekly ? (
        <p className="text-sm text-muted-foreground">No weekly resets yet.</p>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Week of {weekly.week_start_date}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PILLARS.map((p) => (
              <ScoreBadge key={p} pillar={p} value={weekly[PILLAR_TO_COL[p]] as number | null} />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {(['personal_high', 'personal_low', 'business_high', 'business_low'] as const).map(
              (k) =>
                weekly[k] && (
                  <div key={k} className="rounded-lg border border-border/40 bg-background/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      {k.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-foreground/90 leading-snug">{weekly[k]}</p>
                  </div>
                ),
            )}
          </div>
        </>
      )}
    </CinematicCard>
  );
}

function TaskNoteList({ task, partnershipId }: { task: PartnerTopTask; partnershipId: string }) {
  const { data: notes = [] } = usePartnerTaskNotes(task.id);
  const create = useCreatePartnerTaskNote();
  const [draft, setDraft] = useState('');

  const submit = async () => {
    if (!draft.trim()) return;
    try {
      await create.mutateAsync({
        partnership_id: partnershipId,
        lci_top_task_id: task.id,
        note_text: draft,
      });
      setDraft('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add note');
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[task.status] ?? 'bg-muted'}`}
        />
        <p className="text-sm font-bold text-foreground leading-snug flex-1">{task.title}</p>
      </div>
      {notes.length > 0 && (
        <ul className="space-y-1.5 pl-5">
          {notes.map((n) => (
            <li key={n.id} className="text-xs text-foreground/80">
              <span className="text-muted-foreground tabular-nums mr-2">
                {new Date(n.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {n.note_text}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 pl-5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a note…"
          className="h-8 text-sm bg-transparent"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={submit}
          disabled={!draft.trim() || create.isPending}
          aria-label="Send note"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TasksSection({ partnerId, partnershipId }: { partnerId: string; partnershipId: string }) {
  const { data: tasks = [], isLoading } = usePartnerTopTasks(partnerId);
  return (
    <CinematicCard className="p-6 md:p-8 space-y-4">
      <SectionEyebrow>TOP TASKS</SectionEyebrow>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No top tasks logged yet.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskNoteList key={t.id} task={t} partnershipId={partnershipId} />
          ))}
        </div>
      )}
    </CinematicCard>
  );
}

function ConnectionSection({
  partnership,
  partnerId,
}: {
  partnership: Partnership;
  partnerId: string;
}) {
  const { data: profile } = usePartnerProfile(partnerId);
  const respond = useRespondToPartnerRequest();
  return (
    <CinematicCard className="p-6 md:p-8 space-y-4">
      <SectionEyebrow>CONNECTION</SectionEyebrow>
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="bg-card font-bold">
            {initials(profile?.display_name, null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground truncate">
            {profile?.display_name || 'Your partner'}
          </p>
          
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!confirm('Remove this accountability partner?')) return;
            respond
              .mutateAsync({ id: partnership.id, status: 'declined' })
              .then(() => toast.success('Partner removed'))
              .catch((e) => toast.error(e?.message || 'Failed to remove partner'));
          }}
        >
          Remove
        </Button>
      </div>
    </CinematicCard>
  );
}

// ---------- Page ----------

const PartnerPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: partnerships = [], isLoading } = useMyPartnerships();
  const { partnership: accepted, partnerId } = useAcceptedPartner();

  const sentPending = useMemo(
    () =>
      partnerships.find(
        (p) => p.status === 'pending' && p.requester_id === user?.id,
      ) ?? null,
    [partnerships, user?.id],
  );

  const incoming = useMemo(
    () =>
      partnerships.filter(
        (p) => p.status === 'pending' && p.recipient_id === user?.id,
      ),
    [partnerships, user?.id],
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <HeroFrame
          image={heroForest}
          height="sm"
          align="left"
          eyebrow={<SectionEyebrow>YOUR PARTNER</SectionEyebrow>}
          title={<>Walk it together.</>}
          subtitle="Mutual accountability so the work doesn't drift."
        />

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : accepted && partnerId ? (
          <>
            <ConnectionSection partnership={accepted} partnerId={partnerId} />
            <WeeklySection partnerId={partnerId} />
            <TasksSection partnerId={partnerId} partnershipId={accepted.id} />
          </>
        ) : sentPending ? (
          <>
            <PendingSent partnership={sentPending} />
            {incoming.length > 0 && <FindPartner incomingRequests={incoming} />}
          </>
        ) : (
          <FindPartner incomingRequests={incoming} />
        )}
      </div>
    </div>
  );
};

export default PartnerPage;
