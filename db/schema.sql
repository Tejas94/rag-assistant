-- Runs automatically the first time the container starts.
-- To re-run after editing: npm run db:reset (deletes the data volume, then starts fresh).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
  id          bigserial PRIMARY KEY,
  doc_path    text NOT NULL,          -- e.g. "billing.md"
  heading     text NOT NULL,          -- heading path, e.g. "Billing and plans > Refunds"
  content     text NOT NULL,
  chunk_index int  NOT NULL,          -- position within the document
  -- 1024 matches both voyage-3.5 and the fake embedder. Change it if your model differs.
  embedding   vector(1024) NOT NULL,
  -- Full-text search column for keyword retrieval (Postgres ranking, a stand-in for BM25).
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', heading || ' ' || content)) STORED
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv);
