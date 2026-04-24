import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { mode, coach_id } = body;

    // Mode: seed_demo — create demo coach with sample cohort data
    if (mode === "seed_demo") {
      // Create or get demo coach
      const { data: existing } = await supabase
        .from("coaches")
        .select("id")
        .eq("email", "demo@boundless.me")
        .maybeSingle();

      let coachId = existing?.id;

      if (!coachId) {
        const { data: newCoach } = await supabase
          .from("coaches")
          .insert({ name: "Demo Coach", email: "demo@boundless.me", organization: "Boundless Corp" })
          .select("id")
          .single();
        coachId = newCoach!.id;
      }

      // Check if members exist
      const { data: existingMembers } = await supabase
        .from("cohort_members")
        .select("id")
        .eq("coach_id", coachId)
        .limit(1);

      if (existingMembers && existingMembers.length > 0) {
        return new Response(JSON.stringify({ coach_id: coachId, message: "Demo data already exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create 6 demo members
      const memberNames = [
        { display_name: "Alex Johnson", alias: "AJ" },
        { display_name: "Sarah Chen", alias: "SC" },
        { display_name: "Marcus Williams", alias: "MW" },
        { display_name: "Emily Rodriguez", alias: "ER" },
        { display_name: "David Kim", alias: "DK" },
        { display_name: "Rachel Foster", alias: "RF" },
      ];

      const { data: members } = await supabase
        .from("cohort_members")
        .insert(memberNames.map((m) => ({ ...m, coach_id: coachId })))
        .select("id, alias");

      if (!members) throw new Error("Failed to create members");

      // Generate 14 days of check-in data per member
      const checkins: any[] = [];
      const today = new Date();

      for (const member of members) {
        // Each member gets a "personality" — base scores + variance
        const baseScores = {
          family: 5 + Math.floor(Math.random() * 4),
          finance: 4 + Math.floor(Math.random() * 5),
          faith: 3 + Math.floor(Math.random() * 6),
          fitness: 4 + Math.floor(Math.random() * 5),
          friends: 5 + Math.floor(Math.random() * 4),
          fun: 3 + Math.floor(Math.random() * 5),
          field: 4 + Math.floor(Math.random() * 5),
        };

        for (let d = 13; d >= 0; d--) {
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          const dateStr = date.toISOString().split("T")[0];

          // Add daily variance (-2 to +2) with a trend (some members declining)
          const trend = member.alias === "MW" || member.alias === "DK" ? -0.2 * (14 - d) : 0;
          const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)));
          const vary = () => Math.floor(Math.random() * 5) - 2;

          checkins.push({
            member_id: member.id,
            date: dateStr,
            family: clamp(baseScores.family + vary() + trend),
            finance: clamp(baseScores.finance + vary() + trend),
            faith: clamp(baseScores.faith + vary()),
            fitness: clamp(baseScores.fitness + vary() + trend * 1.5),
            friends: clamp(baseScores.friends + vary()),
            fun: clamp(baseScores.fun + vary() + trend),
            field: clamp(baseScores.field + vary()),
            daily_rating: Math.max(-2, Math.min(2, Math.round(vary() * 0.6 + trend * 0.3))),
            step_count: Math.max(1000, Math.round(7000 + Math.random() * 6000 + trend * 500)),
          });
        }
      }

      await supabase.from("cohort_checkins").insert(checkins);

      return new Response(JSON.stringify({ coach_id: coachId, members: members.length, checkins: checkins.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: analyze — AI-powered trend analysis
    if (mode === "analyze" && coach_id) {
      // Fetch all check-ins for this coach's cohort
      const { data: members } = await supabase
        .from("cohort_members")
        .select("id, display_name, alias")
        .eq("coach_id", coach_id);

      if (!members || members.length === 0) {
        return new Response(JSON.stringify({ insights: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const memberIds = members.map((m) => m.id);
      const { data: checkins } = await supabase
        .from("cohort_checkins")
        .select("*")
        .in("member_id", memberIds)
        .order("date", { ascending: true });

      if (!checkins || checkins.length === 0) {
        return new Response(JSON.stringify({ insights: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build a summary for AI analysis
      const pillars = ["family", "finance", "faith", "fitness", "friends", "fun", "field"];
      const memberSummaries = members.map((m) => {
        const mCheckins = checkins.filter((c) => c.member_id === m.id).sort((a, b) => a.date.localeCompare(b.date));
        if (mCheckins.length < 2) return null;

        const recent = mCheckins.slice(-7);
        const earlier = mCheckins.slice(0, 7);

        const avgRecent: Record<string, number> = {};
        const avgEarlier: Record<string, number> = {};
        for (const p of pillars) {
          avgRecent[p] = recent.reduce((s, c) => s + (c as any)[p], 0) / recent.length;
          avgEarlier[p] = earlier.reduce((s, c) => s + (c as any)[p], 0) / Math.max(earlier.length, 1);
        }

        return {
          name: m.alias,
          recentAvg: avgRecent,
          earlierAvg: avgEarlier,
          recentRating: recent.reduce((s, c) => s + c.daily_rating, 0) / recent.length,
          recentSteps: Math.round(recent.reduce((s, c) => s + c.step_count, 0) / recent.length),
        };
      }).filter(Boolean);

      // Call Lovable AI for trend analysis
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a Boundless.me coaching analytics AI. Analyze cohort data and generate exactly 4 actionable insights for the coach. Each insight should be a JSON object with: title (short headline), body (1-2 sentence recommendation), severity ("alert" for concerning trends, "positive" for good trends, "info" for neutral observations). Return ONLY a JSON array of 4 insight objects, no markdown.

The 7 pillars (Boundless "Your Now") are: Family, Finance, Faith, Fitness, Friends, Fun, Field (scored 1-10).
Daily rating is -2 to +2. Focus on: declining trends, outliers, cohort-wide patterns, and actionable coaching opportunities.`,
            },
            {
              role: "user",
              content: `Analyze this cohort data (comparing last 7 days vs prior 7 days):\n${JSON.stringify(memberSummaries, null, 2)}`,
            },
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "[]";

      let insights: any[] = [];
      try {
        // Strip markdown code fences if present
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        insights = JSON.parse(cleaned);
      } catch {
        insights = [{ title: "Analysis Complete", body: content.slice(0, 200), severity: "info" }];
      }

      // Save insights to DB
      if (insights.length > 0) {
        // Clear old insights for this coach
        await supabase.from("coach_insights").delete().eq("coach_id", coach_id);
        await supabase.from("coach_insights").insert(
          insights.map((i: any) => ({
            coach_id,
            title: i.title || "Insight",
            body: i.body || "",
            severity: i.severity || "info",
            insight_type: "trend",
          }))
        );
      }

      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use 'seed_demo' or 'analyze'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coach-analytics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
