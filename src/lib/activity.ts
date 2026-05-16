import { supabase } from '@/integrations/supabase/client';

/** Best-effort logging helpers — never throw. */

export async function logLoginAttempt(params: {
  email: string;
  success: boolean;
  reason?: string;
  method?: 'password' | 'google' | 'magic_link' | 'otp';
  userId?: string | null;
}) {
  try {
    await supabase.from('activity_login_events').insert({
      user_id: params.userId ?? null,
      email: params.email?.toLowerCase() ?? null,
      success: params.success,
      reason: params.reason ?? null,
      method: params.method ?? null,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch (e) {
    console.warn('[activity] login log failed', e);
  }
}

export async function logPageView(path: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // only log signed-in navigation
    await supabase.from('activity_page_views').insert({
      user_id: user.id,
      email: user.email ?? null,
      path: path.slice(0, 300),
    });
  } catch (e) {
    console.warn('[activity] page view log failed', e);
  }
}
