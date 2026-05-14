import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function authUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized" as const };
  const token = authHeader.replace("Bearer ", "");
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data?.user) return { error: "Unauthorized" as const };
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  return { userId: data.user.id, userClient };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authUser(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { userId, userClient } = auth;
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller has 'coach' or 'admin' role
    const { data: roles } = await service
      .from("user_roles").select("role").eq("user_id", userId);
    const isCoach = !!roles?.some((r: any) => r.role === "coach" || r.role === "admin");
    if (!isCoach) {
      return new Response(JSON.stringify({ error: "Coach role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;

    // Resolve / create coach record for this user
    let coach: { id: string; name: string } | null = null;
    {
      const { data } = await userClient.from("coaches").select("id, name").eq("user_id", userId).maybeSingle();
      coach = data;
    }
    if (!coach) {
      const { data: newCoach, error: insErr } = await userClient.from("coaches").insert({
        user_id: userId,
        name: body?.coach_name || "Coach",
        email: body?.coach_email || `coach-${userId.slice(0,8)}@boundless.local`,
      }).select("id, name").single();
      if (insErr) throw insErr;
      coach = newCoach;
    }
    const coachId = coach!.id;

    // === seed_demo: populate THIS coach's cohort if empty ===
    if (mode === "seed_demo") {
      const { data: existing } = await userClient
        .from("cohort_members").select("id").eq("coach_id", coachId).limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ coach_id: coachId, message: "Already seeded" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const memberNames = [
        { display_name: "Alex Johnson", alias: "AJ" },
        { display_name: "Sarah Chen", alias: "SC" },
        { display_name: "Marcus Williams", alias: "MW" },
        { display_name: "Emily Rodriguez", alias: "ER" },
        { display_name: "David Kim", alias: "DK" },
        { display_name: "Rachel Foster", alias: "RF" },
      ];
      const { data: members, error: mErr } = await userClient
        .from("cohort_members").insert(memberNames.map((m) => ({ ...m, coach_id: coachId })))
        .select("id, alias");
      if (mErr || !members) throw mErr ?? new Error("members insert failed");

      const checkins: any[] = [];
      const today = new Date();
      for (const m of members) {
        const base = {
          family: 5 + Math.floor(Math.random() * 4),
          finance: 4 + Math.floor(Math.random() * 5),
          faith: 3 + Math.floor(Math.random() * 6),
          fitness: 4 + Math.floor(Math.random() * 5),
          friends: 5 + Math.floor(Math.random() * 4),
          fun: 3 + Math.floor(Math.random() * 5),
          field: 4 + Math.floor(Math.random() * 5),
        };
        for (let d = 13; d >= 0; d--) {
          const date = new Date(today); date.setDate(date.getDate() - d);
          const dateStr = date.toISOString().split("T")[0];
          const trend = (m.alias === "MW" || m.alias === "DK") ? -0.2 * (14 - d) : 0;
          const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)));
          const vary = () => Math.floor(Math.random() * 5) - 2;
          checkins.push({
            member_id: m.id, date: dateStr,
            family: clamp(base.family + vary() + trend),
            finance: clamp(base.finance + vary() + trend),
            faith: clamp(base.faith + vary()),
            fitness: clamp(base.fitness + vary() + trend * 1.5),
            friends: clamp(base.friends + vary()),
            fun: clamp(base.fun + vary() + trend),
            field: clamp(base.field + vary()),
            daily_rating: Math.max(-2, Math.min(2, Math.round(vary() * 0.6 + trend * 0.3))),
            step_count: Math.max(1000, Math.round(7000 + Math.random() * 6000 + trend * 500)),
          });
        }
      }
      await userClient.from("cohort_checkins").insert(checkins);
      return new Response(JSON.stringify({ coach_id: coachId, members: members.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === analyze ===
    if (mode === "analyze") {
      const { data: members } = await userClient
        .from("cohort_members").select("id, display_name, alias").eq("coach_id", coachId);
      if (!members?.length) {
        return new Response(JSON.stringify({ insights: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const memberIds = members.map((m: any) => m.id);
      const { data: checkins } = await userClient
        .from("cohort_checkins").select("*").in("member_id", memberIds).order("date", { ascending: true });
      if (!checkins?.length) {
        return new Response(JSON.stringify({ insights: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const pillars = ["family", "finance", "faith", "fitness", "friends", "fun", "field"];
      const summaries = members.map((m: any) => {
        const mc = checkins.filter((c: any) => c.member_id === m.id);
        if (mc.length < 2) return null;
        const recent = mc.slice(-7);
        const earlier = mc.slice(0, 7);
        const r: Record<string, number> = {}, e: Record<string, number> = {};
        for (const p of pillars) {
          r[p] = recent.reduce((s: number, c: any) => s + c[p], 0) / recent.length;
          e[p] = earlier.reduce((s: number, c: any) => s + c[p], 0) / Math.max(earlier.length, 1);
        }
        return {
          name: m.alias, recentAvg: r, earlierAvg: e,
          recentRating: recent.reduce((s: number, c: any) => s + c.daily_rating, 0) / recent.length,
          recentSteps: Math.round(recent.reduce((s: number, c: any) => s + c.step_count, 0) / recent.length),
        };
      }).filter(Boolean);

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a Boundless.me coaching analytics AI. Analyze cohort data and generate exactly 4 actionable insights for the coach. Each insight is JSON with: title, body, severity ("alert"|"positive"|"info"). Return ONLY a JSON array of 4 insight objects, no markdown.` },
            { role: "user", content: `Cohort (last 7 vs prior 7 days):\n${JSON.stringify(summaries, null, 2)}` },
          ],
        }),
      });
      if (aiResp.status === 429 || aiResp.status === 402) {
        return new Response(JSON.stringify({ error: aiResp.status === 429 ? "Rate limit" : "AI credits exhausted" }), {
          status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content || "[]";
      let insights: any[] = [];
      try {
        insights = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch {
        insights = [{ title: "Analysis Complete", body: content.slice(0, 200), severity: "info" }];
      }
      if (insights.length) {
        await userClient.from("coach_insights").delete().eq("coach_id", coachId);
        await userClient.from("coach_insights").insert(
          insights.map((i: any) => ({
            coach_id: coachId,
            title: i.title || "Insight", body: i.body || "",
            severity: i.severity || "info", insight_type: "trend",
          }))
        );
      }
      return new Response(JSON.stringify({ insights, coach_id: coachId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coach-analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
