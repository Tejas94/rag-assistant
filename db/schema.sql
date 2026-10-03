-- Docker runs this the first time the container starts (npm run db:up).
-- For any other Postgres with pgvector (Neon, Supabase, Railway): npm run db:schema.
-- After editing it: npm run db:reset (Docker; deletes the data), or drop the table and run db:schema.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
  id           bigserial PRIMARY KEY,
  doc_path     text   NOT NULL,  -- relative to the source's docs folder, e.g. "01-app/.../revalidatePath.mdx"
  doc_title    text   NOT NULL,
  url          text   NOT NULL,  -- page URL; add '#' || anchor to link to the section
  headings     text[] NOT NULL,  -- heading path inside the page, e.g. {Parameters,type}
  anchor       text   NOT NULL,  -- slug of the last heading, '' before the first heading
  chunk_index  int    NOT NULL,  -- position within the page
  content      text   NOT NULL,
  content_hash text   NOT NULL,  -- sha256 of the embedded text; for incremental ingestion later
  embed_model  text   NOT NULL,  -- which embedder made the vector; queries must use the same one
  -- 1024 matches voyage-3.5 (default output) and the fake embedder. Change both together.
  embedding    vector(1024) NOT NULL,
  -- Full-text search over the same text that gets embedded (title, headings, content).
  -- Postgres ranking (ts_rank_cd) is a stand-in for BM25, not the real thing.
  tsv          tsvector NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_doc_path_idx ON chunks (doc_path);
