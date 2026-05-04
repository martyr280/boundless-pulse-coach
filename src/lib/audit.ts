import { supabase } from '@/integrations/supabase/client';

/**
 * Records an unauthorized access attempt to the audit log.
 * Best-effort: never throws — logging failures must not break UX.
 */
export async function logAccessDenied(params: {
  route: string;
  requiredRoles: string[];
  userRoles: string[];
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('access_audit_log').insert({
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      route: params.route,
      required_roles: params.requiredRoles,
      user_roles: params.userRoles,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch (e) {
    console.warn('[audit] failed to record access denial', e);
  }
}
