import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().max(120).optional(),
});

const FROM = "Boundless <noreply@theboundless.app>";

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

async function sendEmail(to: string, code: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;color:#111;">
      <h1 style="font-size:20px;letter-spacing:0.18em;text-transform:uppercase;font-weight:900;margin:0 0 8px;">Boundless</h1>
      <p style="font-size:14px;color:#555;margin:0 0 24px;">Confirm your email to begin.</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:0.4em;background:#f5f3ee;border-radius:12px;padding:20px;text-align:center;color:#111;">${code}</div>
      <p style="font-size:13px;color:#666;margin-top:24px;">This code expires in 15 minutes. If you didn't request it, ignore this email.</p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: "Your Boundless verification code", html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed [${res.status}]: ${text}`);
  }
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
    const { email, password, display_name } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Look up existing user by email
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);

    if (existing && existing.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "An account with this email already exists. Please sign in." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existing) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { display_name: display_name || email.split("@")[0] },
      });
      if (createErr) throw createErr;
    } else {
      // Update password in case user is retrying with new password
      await admin.auth.admin.updateUserById(existing.id, { password });
    }

    // Generate + store OTP
    const code = genCode();
    const code_hash = await sha256(`${email}:${code}`);
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("email_verifications").insert({
      email, code_hash, expires_at,
    });
    if (insErr) throw insErr;

    await sendEmail(email, code);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[signup-with-verification]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
