import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

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
  const { session, loading, rolesLoading, hasRole, isAdmin } = useAuth();
  const location = useLocation();

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

  // 5. Enforce role.
  if (required.length > 0 && !hasRole(required) && !isAdmin) {
    if (unauthorizedRedirect) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
        <h1 className="text-xl font-black uppercase tracking-widest mb-1">
          Access denied
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have permission to view this page. If you think this is a
          mistake, contact your coach or an administrator.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
