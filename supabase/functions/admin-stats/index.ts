import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: callerRoles } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(callerRoles ?? []).some((r) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

    // Count auth users via paged listing
    let totalUsers = 0;
    let activeLast30 = 0;
    let signupsLast7 = 0;
    let confirmedUsers = 0;
    const recent: { id: string; email: string | null; created_at: string }[] = [];
    const now = Date.now();
    const d30 = now - 30 * 86400_000;
    const d7 = now - 7 * 86400_000;
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      for (const u of data.users) {
        totalUsers++;
        if (u.email_confirmed_at) confirmedUsers++;
        const created = u.created_at ? new Date(u.created_at).getTime() : 0;
        if (created >= d7) signupsLast7++;
        const lastSign = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        if (lastSign >= d30) activeLast30++;
        recent.push({ id: u.id, email: u.email ?? null, created_at: u.created_at });
      }
      if (data.users.length < 200) break;
      page++;
      if (page > 25) break;
    }
    recent.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    // Counts from public tables
    const countQ = (t: string) => admin.from(t).select("*", { count: "exact", head: true });
    const [
      checkins, actions, lci, journals, partnerships, framework, docs, coaches, nudges,
      adminsRoles, coachesRoles,
    ] = await Promise.all([
      countQ("user_checkins"),
      countQ("action_items"),
      countQ("lci_sessions"),
      countQ("user_journal_entries"),
      countQ("user_partnerships"),
      countQ("framework_content"),
      countQ("boundless_documents"),
      countQ("coaches"),
      countQ("nudge_log"),
      admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "coach"),
    ]);

    return json({
      users: {
        total: totalUsers,
        confirmed: confirmedUsers,
        signups_last_7d: signupsLast7,
        active_last_30d: activeLast30,
        admins: adminsRoles.count ?? 0,
        coaches: coachesRoles.count ?? 0,
      },
      activity: {
        checkins: checkins.count ?? 0,
        action_items: actions.count ?? 0,
        lci_sessions: lci.count ?? 0,
        journal_entries: journals.count ?? 0,
        partnerships: partnerships.count ?? 0,
        nudges_sent: nudges.count ?? 0,
      },
      content: {
        framework_rows: framework.count ?? 0,
        rag_documents: docs.count ?? 0,
        coaches_records: coaches.count ?? 0,
      },
      recent_signups: recent.slice(0, 10),
    });
  } catch (err) {
    console.error("admin-stats error", err);
    return json({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});
