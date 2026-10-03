import { pool, rowToChunk, toSqlVector } from "./db.js";
import { getEmbedder } from "./embed.js";
import type { RetrievalMode, RetrievedChunk } from "./types.js";
import { todo } from "./todo.js";

/**
 * TODO(P2-03) Week 4: semantic search with pgvector.
 *
 * Embed the query (kind "query"), then:
 *   SELECT id, doc_path, heading, content, chunk_index,
 *          1 - (embedding <=> $1) AS score        -- <=> is cosine DISTANCE
 *   FROM chunks ORDER BY embedding <=> $1 LIMIT $2
 * Pass the vector with toSqlVector() and map rows with rowToChunk().
 * Question to answer for yourself: why ORDER BY the distance and not the score?
 * (Hint: which one can the HNSW index use?)
 */
export async function vectorSearch(query: string, k: number): Promise<RetrievedChunk[]> {
  void query;
  void k;
  void pool;
  void rowToChunk;
  void toSqlVector;
  void getEmbedder;
  todo("P2-03", "Implement vectorSearch() in src/retrieve.ts");
}

/**
 * TODO(P2-04) Week 5: keyword search with Postgres full-text search.
 *
 *   SELECT ..., ts_rank_cd(tsv, q) AS score
 *   FROM chunks, websearch_to_tsquery('english', $1) q
 *   WHERE tsv @@ q ORDER BY score DESC LIMIT $2
 *
 * Run `npm run eval` straight after: recall will be poor, because websearch_to_tsquery
 * requires EVERY word to match and full questions rarely do. Fixing that (OR the
 * terms, drop stopwords) is part of the exercise.
 * Postgres ranking is not true BM25; note that in your README. Find a query where
 * keyword search beats vectors (exact names like "nw keys rotate" or "lon-1") and
 * one where it loses (paraphrases like "get my money back"). Add both to the golden set.
 */
export async function keywordSearch(query: string, k: number): Promise<RetrievedChunk[]> {
  void query;
  void k;
  todo("P2-04", "Implement keywordSearch() in src/retrieve.ts");
}

/**
 * TODO(P2-05) Week 5: Reciprocal Rank Fusion.
 *
 * Merge several ranked lists into one. Each chunk scores sum(1 / (k + rank)) over
 * the lists it appears in, with rank starting at 1 and k = 60 by convention.
 * Return chunks (deduplicated by id) sorted by that fused score, highest first,
 * with `score` set to the fused score. tests/specs/rrf.test.ts has the details.
 * Why rank-based? Vector and keyword scores live on different scales.
 */
export function reciprocalRankFusion(lists: RetrievedChunk[][], k = 60): RetrievedChunk[] {
  void lists;
  void k;
  todo("P2-05", "Implement reciprocalRankFusion() in src/retrieve.ts");
}

export async function retrieve(query: string, mode: RetrievalMode, k = 5): Promise<RetrievedChunk[]> {
  if (mode === "vector") return vectorSearch(query, k);
  if (mode === "keyword") return keywordSearch(query, k);
  // Fetch more candidates from each retriever than you return, then fuse.
  const [v, kw] = await Promise.all([vectorSearch(query, k * 4), keywordSearch(query, k * 4)]);
  return reciprocalRankFusion([v, kw]).slice(0, k);
}
