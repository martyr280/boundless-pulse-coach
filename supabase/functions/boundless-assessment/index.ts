import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Boundless Assessment Engine — a strategic life coach powered by Andy Bailey's Boundless methodology. You analyze a user's self-rated scores across the 7 Pillars of Life (Family, Finance, Faith, Fitness, Faculty, Fun, Freedom) and produce an actionable, personalized report.

You will receive the user's pillar scores (1-10) as JSON. Produce a report in the following JSON structure:

{
  "overall_score": <number 1-10 weighted average>,
  "life_shape": "<one of: 'Balanced Circle', 'Growth Diamond', 'Lopsided Star', 'Foundation Triangle'>",
  "life_shape_description": "<1 sentence describing their shape>",
  "strengths": [{"pillar": "<name>", "insight": "<1 sentence>"}],
  "priority_opportunities": [{"pillar": "<name>", "score": <number>, "insight": "<1 sentence explaining why this matters>"}],
  "cross_references": [{"observation": "<1 sentence connecting two pillars, e.g. low Fitness + high Finance stress>"}],
  "priority_ideas": [
    {"title": "<actionable 30-day priority>", "pillar": "<target pillar>", "description": "<2 sentences explaining the action and expected impact>"},
    {"title": "...", "pillar": "...", "description": "..."},
    {"title": "...", "pillar": "...", "description": "..."}
  ],
  "motivational_close": "<1-2 sentences of encouragement in the Boundless 'No Try, Only Do' voice>"
}

RULES:
- Strengths = pillars scoring 7+
- Priority Opportunities = pillars scoring below 5
- Always produce exactly 3 priority_ideas targeting the lowest-scoring areas
- Cross-references should intelligently connect related pillars (e.g., low Fitness often impacts Faculty/energy)
- Be warm, direct, and action-oriented. No fluff.
- Return ONLY valid JSON, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scores } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Here are my pillar scores: ${JSON.stringify(scores)}` },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the AI response
    let report;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      report = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI report:", content);
      return new Response(JSON.stringify({ error: "Failed to generate report. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assessment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
