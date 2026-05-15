// Shared RAG utility — embed + retrieve top-k Boundless corpus chunks.
// Used by boundless-coach, boundless-assessment, lci-summary, lci-guided-session.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const EMBED_MODEL = "google/text-embedding-004";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

export async function embed(text: string): Promise<number[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed [${res.status}]: ${t}`);
  }
  const json = await res.json();
  return json.data?.[0]?.embedding ?? [];
}

export type RagChunk = {
  id: string;
  title: string;
  source: string;
  content: string;
  similarity: number;
};

export async function retrieve(
  query: string,
  opts: { k?: number; threshold?: number; client?: SupabaseClient } = {},
): Promise<RagChunk[]> {
  const k = opts.k ?? 5;
  const threshold = opts.threshold ?? 0.3;
  try {
    const vec = await embed(query);
    if (!vec.length) return [];
    const client = opts.client ?? createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await client.rpc("match_boundless_documents", {
      query_embedding: vec,
      match_count: k,
      similarity_threshold: threshold,
    });
    if (error) {
      console.error("[rag.retrieve]", error.message);
      return [];
    }
    return (data ?? []) as RagChunk[];
  } catch (err) {
    console.error("[rag.retrieve]", err instanceof Error ? err.message : err);
    return [];
  }
}

export function formatContext(chunks: RagChunk[]): string {
  if (!chunks.length) return "";
  const blocks = chunks.map((c, i) =>
    `[${i + 1}] ${c.title} (${c.source})\n${c.content.trim()}`
  ).join("\n\n---\n\n");
  return `\n\nGROUNDING CONTEXT — Boundless source materials. Cite implicitly; never quote verbatim more than 1 sentence:\n${blocks}\n`;
}
