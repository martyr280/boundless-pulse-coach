import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const RECIPIENT = 'marty.reed01@gmail.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: logins }, { data: views }] = await Promise.all([
      supabase
        .from('activity_login_events')
        .select('created_at,email,success,reason,method,ip')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      supabase
        .from('activity_page_views')
        .select('created_at,email,path,user_id')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
    ]);

    const loginRows = logins ?? [];
    const viewRows = views ?? [];
    const successes = loginRows.filter((l) => l.success);
    const failures = loginRows.filter((l) => !l.success);

    const esc = (s: unknown) =>
      String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
      );
    const fmt = (d: string) => new Date(d).toLocaleString('en-US', { timeZone: 'America/Chicago' });

    const loginTable = (rows: any[]) =>
      rows.length === 0
        ? '<p style="color:#888">None</p>'
        : `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-size:13px;width:100%"><tr style="background:#f5f0e8"><th>Time</th><th>Email</th><th>Reason</th><th>Method</th><th>IP</th></tr>${rows
            .map(
              (r) =>
                `<tr><td>${esc(fmt(r.created_at))}</td><td>${esc(r.email)}</td><td>${esc(r.reason ?? '')}</td><td>${esc(r.method ?? '')}</td><td>${esc(r.ip ?? '')}</td></tr>`,
            )
            .join('')}</table>`;

    const viewsByUser = new Map<string, { email: string; count: number; paths: string[] }>();
    for (const v of viewRows) {
      const k = v.email || v.user_id;
      const cur = viewsByUser.get(k) ?? { email: v.email || v.user_id, count: 0, paths: [] };
      cur.count += 1;
      if (cur.paths.length < 20) cur.paths.push(v.path);
      viewsByUser.set(k, cur);
    }
    const viewsTable =
      viewsByUser.size === 0
        ? '<p style="color:#888">None</p>'
        : `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-size:13px;width:100%"><tr style="background:#f5f0e8"><th>User</th><th>Page views</th><th>Recent paths</th></tr>${[...viewsByUser.values()]
            .sort((a, b) => b.count - a.count)
            .map(
              (u) =>
                `<tr><td>${esc(u.email)}</td><td>${u.count}</td><td style="font-family:monospace;font-size:12px">${esc(u.paths.join(' · '))}</td></tr>`,
            )
            .join('')}</table>`;

    const dateLabel = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:760px;margin:0 auto;color:#222">
        <h2 style="font-family:Georgia,serif;color:#3a2a1a">Boundless — Daily Activity (${esc(dateLabel)})</h2>
        <p>Window: last 24h.</p>
        <h3>Successful sign-ins (${successes.length})</h3>
        ${loginTable(successes)}
        <h3 style="color:#a3422a">Failed sign-ins (${failures.length})</h3>
        ${loginTable(failures)}
        <h3>Page navigation (${viewRows.length} views, ${viewsByUser.size} users)</h3>
        ${viewsTable}
        <p style="color:#888;font-size:12px;margin-top:24px">Sent automatically by Boundless.</p>
      </div>`;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY missing');

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Boundless <onboarding@resend.dev>',
        to: [RECIPIENT],
        subject: `Boundless daily activity — ${dateLabel} (${successes.length} logins, ${failures.length} failures, ${viewRows.length} views)`,
        html,
      }),
    });
    const sendBody = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) throw new Error(`Resend ${sendRes.status}: ${JSON.stringify(sendBody)}`);

    return new Response(
      JSON.stringify({ ok: true, logins: successes.length, failures: failures.length, views: viewRows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[daily-activity-digest] error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
