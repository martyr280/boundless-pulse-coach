import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const NUDGE_MESSAGES: Record<string, string[]> = {
  gratitude: [
    "🙏 What are you grateful for today? Reply with 3 things and we'll log them in your Boundless journal.",
    "🌅 Take a moment — name 3 good things in your life right now. Reply to log them.",
    "✨ Gratitude check: What made you smile today? Reply with your 3 items.",
  ],
  habit: [
    "💪 Time to check in on your Best Self habits. Have you completed your morning routine today?",
    "🔥 No Try, Only Do. Which of your Best Self habits have you crushed today?",
    "⚡ Quick check: How's your Best Self streak going? Remember — consistency beats perfection.",
  ],
  step: [
    "🚶 How are your steps looking today? Your best days average 8,000+. Keep moving!",
    "👟 Movement = momentum. Are you on track for your step goal today?",
    "🏔️ Every step counts. Get outside and add to your Boundless day!",
  ],
  lci_prep: [
    "📋 Your next LCI is in 3 days. Take a few minutes today to start your worksheet — Highs/Lows, Top Tasks, and what you need help with.",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || "scheduled";
    

    // Modes that require auth
    const userModes = new Set(["save_prefs", "test"]);
    let userId: string | null = null;

    if (userModes.has(mode)) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (error || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claims.claims.sub;
    }

    // === SAVE PREFS ===
    if (mode === "save_prefs") {
      const phone_number = String(body.phone_number ?? "").trim();
      if (!PHONE_RE.test(phone_number)) {
        return new Response(JSON.stringify({ error: "Phone must be E.164, e.g. +15551234567" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const display_name = String(body.display_name ?? "").slice(0, 80);
      const preferred_hour = Math.max(0, Math.min(23, Number(body.preferred_hour) || 9));
      const tz = String(body.timezone ?? "America/Chicago").slice(0, 64);

      const { data: existing } = await serviceClient
        .from("nudge_preferences").select("id").eq("user_id", userId!).maybeSingle();

      const payload = {
        user_id: userId!, phone_number, display_name,
        nudge_enabled: !!body.nudge_enabled,
        gratitude_reminder: !!body.gratitude_reminder,
        habit_reminder: !!body.habit_reminder,
        step_reminder: !!body.step_reminder,
        preferred_hour, timezone: tz,
      };

      if (existing) {
        await serviceClient.from("nudge_preferences").update({
          ...payload, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await serviceClient.from("nudge_preferences").insert(payload);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === TEST NUDGE (sends to caller's saved number) ===
    if (mode === "test") {
      const { data: pref } = await serviceClient
        .from("nudge_preferences").select("*").eq("user_id", userId!).maybeSingle();
      if (!pref?.phone_number) {
        return new Response(JSON.stringify({ error: "No phone number on file" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const message = pickRandom(NUDGE_MESSAGES.gratitude);
      const personalized = pref.display_name ? `Hey ${pref.display_name}! ${message}` : message;
      const r = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${pref.phone_number}`,
          From: "whatsapp:+14155238886",
          Body: personalized,
        }),
      });
      const d = await r.json();
      await serviceClient.from("nudge_log").insert({
        user_id: userId, phone_number: pref.phone_number,
        nudge_type: "test", message: personalized,
        status: r.ok ? "sent" : "failed",
      });
      return new Response(JSON.stringify({ success: r.ok, sid: d.sid, error: r.ok ? null : d }), {
        status: r.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === SCHEDULED (cron / service-only) ===
    // Restrict scheduled mode to service role calls
    const callerKey = req.headers.get("apikey") || req.headers.get("Authorization")?.replace("Bearer ", "");
    if (callerKey !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Global kill-switch — admins can toggle nudges off without touching cron
    const { data: setting } = await serviceClient
      .from("app_settings").select("value").eq("key", "nudges_enabled").maybeSingle();
    if (setting?.value !== true) {
      return new Response(JSON.stringify({ success: true, skipped: "nudges disabled by admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prefs } = await serviceClient
      .from("nudge_preferences").select("*").eq("nudge_enabled", true);

    const results: any[] = [];
    const { data: scheduled } = await serviceClient
      .from("scheduled_lci").select("*").eq("prep_sent", false);
    const now = Date.now();
    for (const sch of scheduled ?? []) {
      const diffDays = (new Date(sch.scheduled_at).getTime() - now) / 86400000;
      if (diffDays < 2.5 || diffDays > 3.5) continue;
      const message = NUDGE_MESSAGES.lci_prep[0];
      const personalized = sch.display_name ? `Hey ${sch.display_name}! ${message}` : message;
      const r = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${sch.phone_number}`,
          From: "whatsapp:+14155238886",
          Body: personalized,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        await serviceClient.from("scheduled_lci").update({ prep_sent: true }).eq("id", sch.id);
        await serviceClient.from("nudge_log").insert({
          user_id: sch.user_id, phone_number: sch.phone_number,
          nudge_type: "lci_prep", message: personalized, status: "sent",
        });
      }
      results.push({ phone: sch.phone_number, status: r.ok ? "sent" : "failed", sid: d.sid });
    }

    for (const pref of prefs ?? []) {
      const types: string[] = [];
      if (pref.gratitude_reminder) types.push("gratitude");
      if (pref.habit_reminder) types.push("habit");
      if (pref.step_reminder) types.push("step");
      if (!types.length) continue;
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const selected = types[dayOfYear % types.length];
      const message = pickRandom(NUDGE_MESSAGES[selected]);
      const personalized = pref.display_name ? `Hey ${pref.display_name}! ${message}` : message;

      const r = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${pref.phone_number}`,
          From: "whatsapp:+14155238886",
          Body: personalized,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        await serviceClient.from("nudge_log").insert({
          user_id: pref.user_id, phone_number: pref.phone_number,
          nudge_type: selected, message: personalized, status: "sent",
        });
      }
      results.push({ phone: pref.phone_number, status: r.ok ? "sent" : "failed", sid: d.sid });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nudge-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
