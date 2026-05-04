import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { logAccessDenied } from '@/lib/audit';

interface Props {
  children: React.ReactNode;
  /** Convenience: require coach OR admin. */
  requireCoach?: boolean;
  /** Convenience: require admin only. */
  requireAdmin?: boolean;
  /** Explicit allow-list of roles. User must have at least one. */
  allowedRoles?: AppRole[];
  /** Where to send unauthorized (logged-in but wrong role) users. */
  unauthorizedRedirect?: string;
}

const ProtectedRoute = ({
  children,
  requireCoach = false,
  requireAdmin = false,
  allowedRoles,
  unauthorizedRedirect,
}: Props) => {
  const { session, loading, rolesLoading, hasRole, isAdmin, roles } = useAuth();
  const location = useLocation();
  const loggedRef = useRef<string | null>(null);

  // 1. Wait for initial auth check.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Not signed in → /auth (preserve target).
  if (!session) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // 3. Build effective required roles.
  const required: AppRole[] = allowedRoles
    ? [...allowedRoles]
    : requireAdmin
      ? ['admin']
      : requireCoach
        ? ['coach', 'admin']
        : [];

  // 4. If a role check is required, wait for roles to load before deciding.
  if (required.length > 0 && rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 5. Enforce role → redirect to dedicated /access-denied page.
  const denied = required.length > 0 && !hasRole(required) && !isAdmin;

  useEffect(() => {
    if (!denied) return;
    const key = `${location.pathname}|${required.join(',')}`;
    if (loggedRef.current === key) return; // dedupe per mount
    loggedRef.current = key;
    logAccessDenied({
      route: location.pathname,
      requiredRoles: required,
      userRoles: roles,
    });
  }, [denied, location.pathname, required, roles]);

  if (denied) {
    return (
      <Navigate
        to={unauthorizedRedirect ?? '/access-denied'}
        replace
        state={{ from: location.pathname, required }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
