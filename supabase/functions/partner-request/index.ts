import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401);
    const requester = userData.user;

    const { email } = await req.json();
    const cleaned = (email ?? '').toString().trim().toLowerCase();
    if (!cleaned) return json({ error: 'Enter an email.' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Lookup target by email in profiles (service-role bypasses RLS)
    const { data: target, error: lookupErr } = await admin
      .from('profiles')
      .select('id, email')
      .ilike('email', cleaned)
      .maybeSingle();
    if (lookupErr) return json({ error: lookupErr.message }, 500);
    if (!target) return json({ error: 'No Boundless account found for that email.' }, 404);
    if (target.id === requester.id) return json({ error: 'You cannot partner with yourself.' }, 400);

    // Prevent duplicate in either direction
    const { data: existing } = await admin
      .from('user_partnerships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${requester.id},recipient_id.eq.${target.id}),and(requester_id.eq.${target.id},recipient_id.eq.${requester.id})`
      )
      .maybeSingle();
    if (existing) return json({ error: 'You already have a partnership with that user.' }, 409);

    const { error: insertErr } = await admin.from('user_partnerships').insert({
      requester_id: requester.id,
      recipient_id: target.id,
      status: 'pending',
    });
    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
