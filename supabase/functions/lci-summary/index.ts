import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Boundless Life Check-In (LCI) coaching assistant. You read a completed LCI worksheet and produce a tight, coach-ready briefing.

Return MARKDOWN with these sections (no preamble, no JSON):

### Themes
2–4 bullets pulling out the dominant themes across highs/lows and top tasks.

### Momentum & Wins
1–3 bullets highlighting green-status tasks and personal/business highs worth reinforcing.

### Blockers & Risks
1–3 bullets calling out red/yellow tasks, lows, and what's getting in the way.

### Suggested Coaching Questions
3 specific, open-ended questions the coach should ask in the next session — based on what's actually in the worksheet, not generic.

Keep it under 250 words. Be direct. No fluff.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: session }, { data: highsLows }, { data: topTasks }] = await Promise.all([
      supabase.from("lci_sessions").select("*").eq("id", session_id).maybeSingle(),
      supabase.from("lci_highs_lows").select("*").eq("session_id", session_id),
      supabase.from("lci_top_tasks").select("*").eq("session_id", session_id).order("position"),
    ]);

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      session_date: session.session_date,
      next_lci_date: session.next_lci_date,
      year_review: session.year_review,
      help_needed: session.help_needed,
      highs_lows: (highsLows ?? []).map((h: any) => ({ kind: h.kind, body: h.body })),
      top_tasks: (topTasks ?? []).map((t: any) => ({
        title: t.title, status: t.status, feel: t.feel,
        obstacles: t.obstacles, help_needed: t.help_needed,
      })),
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `LCI worksheet:\n${JSON.stringify(payload, null, 2)}` },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const briefing = data.choices?.[0]?.message?.content || "";

    await supabase.from("lci_sessions").update({ ai_briefing: briefing }).eq("id", session_id);

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lci-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
