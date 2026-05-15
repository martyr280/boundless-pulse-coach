// lci-guided-session — AI-led full Life Check-In walk-through.
// State machine across 6 steps. Persists messages + payload to lci_guided_runs.
// On completion, materializes into lci_sessions / lci_top_tasks / lci_highs_lows.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { retrieve, formatContext } from "../_shared/rag.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEPS = [
  "highs_lows",        // 1. Personal/business highs and lows
  "top_task_review",   // 2. Review last cycle's Top Tasks (R/Y/G)
  "your_now",          // 3. Re-rate the 7 F's
  "year_review",       // 4. Year-to-date review
  "new_top_tasks",     // 5. Define 5 new Top Tasks
  "help_needed",       // 6. What support is needed
] as const;
type Step = typeof STEPS[number];

const STEP_LABEL: Record<Step, string> = {
  highs_lows: "Highs & Lows",
  top_task_review: "Top Task Review",
  your_now: "(Y)our Now Re-Rate",
  year_review: "Year Review",
  new_top_tasks: "New Top Tasks",
  help_needed: "Support Needed",
};

const SYSTEM = (step: Step, payloadSoFar: any) => `You are the Boundless Guided LCI Coach — leading a structured Life Check-In conversation, not free chat.

You move the user through 6 steps in order:
1. **Highs & Lows** — capture personal high, personal low, business high, business low (1 sentence each).
2. **Top Task Review** — for each of the user's prior Top Tasks, ask R/Y/G status, what they feel, what got in the way.
3. **(Y)our Now** — get a 1-10 score for each of the 7 F's (Family, Finance, Faith, Fitness, Friends, Fun, Field).
4. **Year Review** — one paragraph reflecting on the year so far.
5. **New Top Tasks** — define 5 specific tasks for the next cycle.
6. **Support Needed** — what help / accountability they need.

CURRENT STEP: ${step.toUpperCase()} — ${STEP_LABEL[step]}.
Stay focused on this step. When the step is complete, output a single line at the very end:
\`STEP_COMPLETE: <one-line summary>\`
Then stop. The orchestrator will advance.

When you've gathered ALL data for the step, also emit a JSON block on its own line in this exact form:
\`STEP_DATA: {"key":"value", ...}\`
Schemas per step:
- highs_lows: {personal_high, personal_low, business_high, business_low}
- top_task_review: {prior_tasks:[{title, status:"R|Y|G", feel, obstacles}]} (empty array if none)
- your_now: {family,finance,faith,fitness,friends,fun,field} all numbers 1-10
- year_review: {year_review:"..."}
- new_top_tasks: {top_tasks:[{title, feel, obstacles, help_needed, status:"green"}]} length 1-5
- help_needed: {help_needed:"..."}

Be warm, direct, concise. Two sentences per turn max. Reference what they've shared:
${JSON.stringify(payloadSoFar).slice(0, 1500)}`;

const Body = z.object({
  run_id: z.string().uuid().optional(),
  user_message: z.string().trim().max(4000).optional(),
  start: z.boolean().optional(),
});

async function callAI(messages: any[], system: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function parseStepData(text: string): { data: any | null; complete: boolean; clean: string } {
  let data: any = null;
  const dataMatch = text.match(/STEP_DATA:\s*({[\s\S]*?})\s*$/m);
  if (dataMatch) {
    try { data = JSON.parse(dataMatch[1]); } catch { /* ignore */ }
  }
  const complete = /STEP_COMPLETE:/m.test(text);
  const clean = text
    .replace(/STEP_DATA:\s*{[\s\S]*?}\s*$/m, "")
    .replace(/STEP_COMPLETE:.*$/m, "")
    .trim();
  return { data, complete, clean };
}

async function materialize(admin: any, userId: string, payload: any) {
  const { data: session, error } = await admin.from("lci_sessions").insert({
    user_id: userId,
    year_review: payload.year_review ?? null,
    help_needed: payload.help_needed ?? null,
  }).select("id").single();
  if (error) throw error;
  const sessionId = session.id;

  const hl = payload.highs_lows ?? {};
  const hlRows = [
    { kind: "personal_high", body: hl.personal_high },
    { kind: "personal_low", body: hl.personal_low },
    { kind: "business_high", body: hl.business_high },
    { kind: "business_low", body: hl.business_low },
  ].filter((r) => r.body).map((r) => ({ session_id: sessionId, ...r }));
  if (hlRows.length) await admin.from("lci_highs_lows").insert(hlRows);

  const tasks = payload.new_top_tasks?.top_tasks ?? [];
  if (tasks.length) {
    await admin.from("lci_top_tasks").insert(tasks.map((t: any, i: number) => ({
      session_id: sessionId,
      title: t.title ?? `Task ${i + 1}`,
      feel: t.feel ?? "",
      obstacles: t.obstacles ?? "",
      help_needed: t.help_needed ?? "",
      status: t.status ?? "green",
      position: i,
    })));
  }
  return sessionId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = u.user.id;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { run_id, user_message, start } = parsed.data;

    // Start a new run
    if (start || !run_id) {
      const { data: created, error } = await admin.from("lci_guided_runs").insert({
        user_id: userId, step: "highs_lows", status: "in_progress",
      }).select("*").single();
      if (error) throw error;
      run_id = created.id;
    }

    const { data: run, error: rErr } = await admin
      .from("lci_guided_runs").select("*").eq("id", run_id).eq("user_id", userId).single();
    if (rErr || !run) throw new Error("Run not found");

    const messages = (run.messages ?? []) as any[];
    const payload = (run.payload ?? {}) as any;
    let step = run.step as Step;

    if (user_message) messages.push({ role: "user", content: user_message });

    // Pull RAG context once per turn based on current step + last user message
    const ragQ = `${STEP_LABEL[step]} ${user_message ?? ""}`.slice(0, 500);
    const chunks = await retrieve(ragQ, { k: 3 });
    const system = SYSTEM(step, payload) + formatContext(chunks);

    const aiText = await callAI(messages, system);
    const { data: stepData, complete, clean } = parseStepData(aiText);
    messages.push({ role: "assistant", content: clean });

    if (stepData) payload[step] = stepData;

    let nextStep: Step = step;
    let materializedId: string | null = run.materialized_session_id;
    let status = run.status;

    if (complete) {
      const idx = STEPS.indexOf(step);
      if (idx === STEPS.length - 1) {
        status = "complete";
        materializedId = await materialize(admin, userId, payload);
        // Notify coach(es) — fire-and-forget so the user's response isn't blocked.
        try {
          const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-coach-lci`;
          fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id: materializedId }),
          }).catch((e) => console.error("[notify-coach-lci invoke]", e));
        } catch (e) {
          console.error("[notify-coach-lci]", e);
        }
      } else {
        nextStep = STEPS[idx + 1];
      }
    }

    await admin.from("lci_guided_runs").update({
      step: nextStep, payload, messages, status, materialized_session_id: materializedId,
    }).eq("id", run_id);

    return new Response(JSON.stringify({
      run_id, step: nextStep, status, assistant: clean,
      step_complete: complete, materialized_session_id: materializedId,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[lci-guided-session]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
