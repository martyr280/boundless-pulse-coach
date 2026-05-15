import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  code: z.string().trim().regex(/^\d{6}$/),
});

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { email, code } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: rows, error: selErr } = await admin
      .from("email_verifications")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .ilike("email", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (selErr) throw selErr;
    const row = rows?.[0];
    if (!row) {
      return new Response(JSON.stringify({ error: "No active verification. Request a new code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired. Request a new one." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.attempts >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts. Request a new code." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await sha256(`${email}:${code}`);
    if (expected !== row.code_hash) {
      await admin.from("email_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Incorrect code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark used
    await admin.from("email_verifications").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    // Confirm the user
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error: confErr } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (confErr) throw confErr;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-email-otp]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
