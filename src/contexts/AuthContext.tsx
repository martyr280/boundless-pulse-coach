import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'member' | 'coach' | 'admin';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;        // initial session check
  rolesLoading: boolean;   // role lookup in flight
  roles: AppRole[];
  isCoach: boolean;        // coach OR admin
  isAdmin: boolean;
  hasRole: (role: AppRole | AppRole[]) => boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  rolesLoading: true,
  roles: [],
  isCoach: false,
  isAdmin: false,
  hasRole: () => false,
  refreshRoles: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const loadRoles = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw error;
      setRoles(((data ?? []).map((r: any) => r.role as AppRole)));
    } catch (e) {
      console.error('[Auth] Failed to load user_roles:', e);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listener first (recommended pattern), then initial session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Defer the role fetch so we don't deadlock the auth callback.
      setTimeout(() => loadRoles(s?.user?.id), 0);
      // Log successful sign-ins from OAuth / magic link redirects.
      if (event === 'SIGNED_IN' && s?.user) {
        setTimeout(() => {
          import('@/lib/activity').then(({ logLoginAttempt }) =>
            logLoginAttempt({
              email: s.user.email ?? 'unknown',
              success: true,
              method: (s.user.app_metadata?.provider as any) ?? 'session',
              userId: s.user.id,
            }),
          );
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      loadRoles(data.session?.user?.id);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadRoles]);

  const isAdmin = roles.includes('admin');
  const isCoach = isAdmin || roles.includes('coach');

  const hasRole = useCallback(
    (role: AppRole | AppRole[]) => {
      const list = Array.isArray(role) ? role : [role];
      return list.some((r) => roles.includes(r));
    },
    [roles],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        rolesLoading,
        roles,
        isCoach,
        isAdmin,
        hasRole,
        refreshRoles: () => loadRoles(session?.user?.id),
        signOut: async () => {
          await supabase.auth.signOut();
          setRoles([]);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
