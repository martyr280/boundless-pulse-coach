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
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "scheduled"; // "scheduled" | "test" | "save_prefs"
    const fromNumber = body.from_number; // Twilio WhatsApp number

    // Save preferences mode
    if (mode === "save_prefs") {
      const { phone_number, display_name, nudge_enabled, gratitude_reminder, habit_reminder, step_reminder, preferred_hour, timezone } = body;

      if (!phone_number) {
        return new Response(JSON.stringify({ error: "Phone number is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert by phone number
      const { data: existing } = await supabase
        .from("nudge_preferences")
        .select("id")
        .eq("phone_number", phone_number)
        .maybeSingle();

      if (existing) {
        await supabase.from("nudge_preferences").update({
          display_name, nudge_enabled, gratitude_reminder, habit_reminder, step_reminder, preferred_hour, timezone, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("nudge_preferences").insert({
          phone_number, display_name, nudge_enabled, gratitude_reminder, habit_reminder, step_reminder, preferred_hour, timezone,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get preferences for active users
    const { data: prefs, error: prefsError } = await supabase
      .from("nudge_preferences")
      .select("*")
      .eq("nudge_enabled", true);

    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ message: "No active nudge subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const pref of prefs) {
      // Determine which nudges to send
      const nudgeTypes: string[] = [];
      if (pref.gratitude_reminder) nudgeTypes.push("gratitude");
      if (pref.habit_reminder) nudgeTypes.push("habit");
      if (pref.step_reminder) nudgeTypes.push("step");

      if (nudgeTypes.length === 0) continue;

      // Pick one nudge type (rotate based on day)
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const selectedType = nudgeTypes[dayOfYear % nudgeTypes.length];
      const message = pickRandom(NUDGE_MESSAGES[selectedType]);

      const personalizedMessage = pref.display_name
        ? `Hey ${pref.display_name}! ${message}`
        : message;

      try {
        // Send via Twilio WhatsApp through connector gateway
        const twilioResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: `whatsapp:${pref.phone_number}`,
            From: fromNumber ? `whatsapp:${fromNumber}` : "whatsapp:+14155238886", // Twilio sandbox default
            Body: personalizedMessage,
          }),
        });

        const twilioData = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error(`Twilio error for ${pref.phone_number}:`, twilioData);
          results.push({ phone: pref.phone_number, status: "failed", error: twilioData });
          continue;
        }

        // Log the nudge
        await supabase.from("nudge_log").insert({
          phone_number: pref.phone_number,
          nudge_type: selectedType,
          message: personalizedMessage,
          status: "sent",
        });

        results.push({ phone: pref.phone_number, status: "sent", type: selectedType, sid: twilioData.sid });
      } catch (sendError) {
        console.error(`Error sending to ${pref.phone_number}:`, sendError);
        results.push({ phone: pref.phone_number, status: "error", error: String(sendError) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nudge-engine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
