
-- Vector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.boundless_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX boundless_documents_embedding_idx
  ON public.boundless_documents
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX boundless_documents_source_idx ON public.boundless_documents(source);

ALTER TABLE public.boundless_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY boundless_documents_read_authenticated
  ON public.boundless_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY boundless_documents_admin_insert
  ON public.boundless_documents FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY boundless_documents_admin_update
  ON public.boundless_documents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY boundless_documents_admin_delete
  ON public.boundless_documents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Similarity match function
CREATE OR REPLACE FUNCTION public.match_boundless_documents(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  title text,
  source text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    d.id, d.title, d.source, d.content, d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.boundless_documents d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

REVOKE EXECUTE ON FUNCTION public.match_boundless_documents(vector, int, float) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_boundless_documents(vector, int, float) TO authenticated, service_role;

-- Private storage bucket for raw source files
INSERT INTO storage.buckets (id, name, public) VALUES ('boundless-corpus', 'boundless-corpus', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY boundless_corpus_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'boundless-corpus' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY boundless_corpus_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'boundless-corpus' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY boundless_corpus_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'boundless-corpus' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY boundless_corpus_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'boundless-corpus' AND has_role(auth.uid(), 'admin'::app_role));
