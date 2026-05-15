// notify-coach-lci — emails the user's coach(es) when an LCI session is completed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Boundless <noreply@theboundless.app>";

const Body = z.object({
  session_id: z.string().uuid(),
});

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend failed [${res.status}]: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { session_id } = parsed.data;

    // Feature flag — set COACH_LCI_NOTIFICATIONS_ENABLED to "false" to disable.
    const flag = (Deno.env.get("COACH_LCI_NOTIFICATIONS_ENABLED") ?? "true").toLowerCase();
    if (flag === "false" || flag === "0" || flag === "off") {
      return new Response(JSON.stringify({ ok: true, skipped: "disabled_by_flag" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Load session + owner
    const { data: session, error: sErr } = await admin
      .from("lci_sessions")
      .select("id, user_id, session_date, year_review, help_needed, ai_briefing")
      .eq("id", session_id)
      .maybeSingle();
    if (sErr || !session) throw new Error("Session not found");

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, email")
      .eq("id", session.user_id)
      .maybeSingle();

    // Find coach(es) for this user via cohort_members
    const { data: members } = await admin
      .from("cohort_members")
      .select("coach_id")
      .eq("user_id", session.user_id);

    const coachIds = Array.from(new Set((members ?? []).map((m: any) => m.coach_id)));
    if (!coachIds.length) {
      return new Response(JSON.stringify({ ok: true, notified: 0, reason: "no_coach" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: coaches } = await admin
      .from("coaches")
      .select("id, name, email")
      .in("id", coachIds);

    const memberName = profile?.display_name || profile?.email || "A member";
    const dateStr = new Date(session.session_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const briefing = (session.ai_briefing ?? "").slice(0, 600);
    const help = (session.help_needed ?? "").trim();

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff;color:#111;">
        <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a0522d;margin:0 0 8px;font-weight:800;">Boundless · LCI Completed</p>
        <h1 style="font-size:22px;font-weight:800;margin:0 0 12px;">${memberName} just finished an LCI</h1>
        <p style="font-size:14px;color:#555;margin:0 0 20px;">${dateStr}</p>
        ${briefing ? `<div style="background:#f5f3ee;border-radius:12px;padding:16px 18px;margin:0 0 16px;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:0.18em;color:#888;margin:0 0 6px;font-weight:700;">Coach Briefing</p><p style="font-size:14px;line-height:1.55;margin:0;white-space:pre-wrap;">${briefing.replace(/</g, "&lt;")}</p></div>` : ""}
        ${help ? `<div style="border-left:3px solid #c2410c;padding:4px 14px;margin:0 0 16px;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:0.18em;color:#c2410c;margin:0 0 4px;font-weight:700;">Support Requested</p><p style="font-size:14px;line-height:1.55;margin:0;">${help.replace(/</g, "&lt;")}</p></div>` : ""}
        <p style="font-size:13px;color:#666;margin-top:24px;">Open your coach dashboard for the full session and trends.</p>
      </div>`;

    let sent = 0;
    for (const c of coaches ?? []) {
      if (!c.email) continue;
      try {
        await sendEmail(c.email, `${memberName} completed an LCI`, html);
        sent++;
      } catch (e) {
        console.error("[notify-coach-lci] send failed for", c.email, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, notified: sent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[notify-coach-lci]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
