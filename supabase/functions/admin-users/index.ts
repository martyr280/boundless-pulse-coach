import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLES = ["member", "coach", "admin"] as const;
type Role = (typeof ROLES)[number];

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

    const { data: claimsData, error: userErr } = await admin.auth.getClaims(token);
    if (userErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    // Verify caller is admin
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (callerRoles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? (req.method === "POST" ? "mutate" : "list");

    if (req.method === "GET" || action === "list") {
      // Page through all auth users
      const allUsers: any[] = [];
      let page = 1;
      const perPage = 200;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        allUsers.push(...data.users);
        if (data.users.length < perPage) break;
        page++;
        if (page > 25) break; // safety
      }

      const ids = allUsers.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("id, display_name, email, created_at").in("id", ids).limit(5000),
        admin.from("user_roles").select("user_id, role").in("user_id", ids).limit(10000),
      ]);

      const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const rolesById = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const arr = rolesById.get((r as any).user_id) ?? [];
        arr.push((r as any).role);
        rolesById.set((r as any).user_id, arr);
      }

      const users = allUsers.map((u) => ({
        id: u.id,
        email: u.email ?? profileById.get(u.id)?.email ?? null,
        display_name: profileById.get(u.id)?.display_name ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        roles: rolesById.get(u.id) ?? [],
      }));

      users.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return json({ users });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { op, user_id, role } = body as { op: string; user_id: string; role: Role };
      if (!user_id || !ROLES.includes(role)) return json({ error: "Invalid input" }, 400);

      if (op === "add_role") {
        const { error } = await admin
          .from("user_roles")
          .insert({ user_id, role })
          .select()
          .maybeSingle();
        if (error && !`${error.message}`.includes("duplicate")) throw error;
        return json({ ok: true });
      }
      if (op === "remove_role") {
        if (user_id === callerId && role === "admin") {
          return json({ error: "You cannot remove your own admin role." }, 400);
        }
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", role);
        if (error) throw error;
        return json({ ok: true });
      }
      return json({ error: "Unknown op" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    console.error("admin-users error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
