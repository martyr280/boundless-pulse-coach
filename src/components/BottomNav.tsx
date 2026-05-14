import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Target, ClipboardList, ListChecks, Brain, LogOut } from 'lucide-react';
import MountainMark from '@/components/visual/MountainMark';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
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

const tabs = [
  { to: '/', icon: MountainMark, label: 'Pulse' },
  { to: '/checkin', icon: Target, label: 'Your Now' },
  { to: '/lci', icon: ClipboardList, label: 'LCI' },
  { to: '/actions', icon: ListChecks, label: 'Actions' },
  { to: '/coach', icon: Brain, label: 'Coach' },
];

const BottomNav = () => {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!session || location.pathname === '/auth') return null;

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
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex-1 flex flex-col items-center py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary shadow-glow" />
                )}
                <Icon className="h-5 w-5 mb-0.5" />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label="Sign out"
              className="flex-1 flex flex-col items-center py-3 text-[10px] font-semibold text-destructive hover:text-destructive/80 transition-colors"
            >
              <LogOut className="h-5 w-5 mb-0.5" />
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
    </nav>
  );
};

export default BottomNav;
