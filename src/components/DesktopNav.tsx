import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Target,
  ClipboardList,
  ListChecks,
  Brain,
  LogOut,
  CalendarDays,
  BookOpen,
  Users,
  Shield,
} from 'lucide-react';
import MountainMark from '@/components/visual/MountainMark';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useProfile';
import { useCurrentCycle } from '@/hooks/useCurrentCycle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Order follows the Boundless proposal cadence:
// daily loop → weekly → monthly LCI → execution → coaching → partnership.
const buildBaseTabs = (cycleActive: boolean) => [
  { to: '/', icon: MountainMark, label: 'Pulse' },
  { to: '/guide', icon: BookOpen, label: 'Guide' },
  { to: '/checkin', icon: Target, label: 'Your Now' },
  { to: '/weekly', icon: CalendarDays, label: cycleActive ? 'Daily' : 'Weekly' },
  { to: '/lci', icon: ClipboardList, label: 'Life Check In' },
  { to: '/actions', icon: ListChecks, label: 'Actions' },
  { to: '/coach', icon: Brain, label: 'Coach' },
  { to: '/partner', icon: Users, label: 'Partner' },
];

const DesktopNav = () => {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { data: role } = useUserRole();
  const { data: cycle } = useCurrentCycle();
  const cycleActive = !!cycle?.cycle;

  const baseTabs = buildBaseTabs(cycleActive);
  const tabs = role === 'admin'
    ? [...baseTabs, { to: '/admin', icon: Shield, label: 'Admin' }]
    : baseTabs;

  if (!session || location.pathname === '/auth' || location.pathname === '/onboarding')
    return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out');
      navigate('/auth', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Sign out failed');
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <aside
      aria-label="Primary"
      className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-card/95 backdrop-blur-md border-r border-border z-40"
    >
      {/* Brand */}
      <div className="px-6 py-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <MountainMark className="h-7 w-7 text-primary" />
          <div className="leading-tight">
            <div className="h-display text-lg text-foreground">Boundless</div>
            <div className="eyebrow text-[10px] text-muted-foreground">Live by Design</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                <span className="tracking-wide">{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border/60">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of Boundless?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll be returned to the sign-in screen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
};

export default DesktopNav;
