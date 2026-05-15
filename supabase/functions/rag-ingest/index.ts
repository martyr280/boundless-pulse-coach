// rag-ingest — admin-only ingestion of Boundless corpus documents.
// Accepts plain text or pulls a file from the boundless-corpus storage bucket,
// chunks it, embeds via Lovable AI Gateway, and inserts into boundless_documents.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { embed } from "../_shared/rag.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  title: z.string().trim().min(1).max(300),
  source: z.string().trim().min(1).max(300),
  content: z.string().trim().min(20).max(500_000).optional(),
  storage_path: z.string().trim().max(500).optional(),
  metadata: z.record(z.any()).optional(),
  replace: z.boolean().optional(), // delete prior chunks for this source first
}).refine((d) => d.content || d.storage_path, { message: "content or storage_path required" });

function chunk(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    out.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = end - overlap;
  }
  return out;
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
    if (uErr || !u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0].message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { title, source, metadata = {}, replace } = parsed.data;
    let content = parsed.data.content ?? "";
    if (!content && parsed.data.storage_path) {
      const { data: file, error: fErr } = await admin.storage
        .from("boundless-corpus").download(parsed.data.storage_path);
      if (fErr || !file) throw new Error(`Storage read failed: ${fErr?.message ?? "no file"}`);
      content = await file.text();
    }

    if (replace) {
      await admin.from("boundless_documents").delete().eq("source", source);
    }

    const chunks = chunk(content);
    const rows: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embed(chunks[i]);
      rows.push({
        title, source, chunk_index: i, content: chunks[i],
        embedding: vec, metadata, created_by: u.user.id,
      });
    }
    const { error: insErr } = await admin.from("boundless_documents").insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, chunks: rows.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[rag-ingest]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
