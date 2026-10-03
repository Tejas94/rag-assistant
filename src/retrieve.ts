import { CHUNK_COLUMNS, pool, rowToChunk, toSqlVector } from "./db.js";
import { getEmbedder } from "./embed.js";
import { getReranker, rerank, type Reranker } from "./rerank.js";
import type { RetrievalMode, RetrievedChunk } from "./types.js";
import { todo } from "./todo.js";

/**
 * TODO(P2-02) Week 4: semantic search with pgvector.
 *
 * Embed the query with getEmbedder() (kind "query"; it must be the same model that built
 * the index, which ingest recorded in the embed_model column), then fetch the k nearest
 * chunks:
 * - `embedding <=> $1` is cosine DISTANCE: 0 means same direction, 2 opposite. Report
 *   1 - distance as the score, so higher is better in every stage of the pipeline.
 * - Pass the vector as text with toSqlVector(); pgvector parses "[0.1,0.2,...]".
 * - Select CHUNK_COLUMNS plus your score AS score, and map the rows with rowToChunk().
 *
 * Done when the vector row of `npm run eval` shows numbers instead of "not implemented".
 *
 * Things to learn on the way:
 * - Why ORDER BY the distance expression and not the score alias? Run EXPLAIN on both
 *   and look for chunks_embedding_idx (HNSW) in the plan.
 * - HNSW is approximate. With a few thousand chunks, does exact search
 *   (SET enable_indexscan = off) change any top-5 result? How much slower is it?
 * - Print the top score for a question the docs answer and for an unanswerable one
 *   from the golden set. Could a threshold tell them apart?
 */
export async function vectorSearch(query: string, k: number): Promise<RetrievedChunk[]> {
  void query;
  void k;
  void pool;
  void rowToChunk;
  void toSqlVector;
  void getEmbedder;
  void CHUNK_COLUMNS;
  todo("P2-02", "Implement vectorSearch() in src/retrieve.ts");
}

/**
 * TODO(P2-05) Week 5: keyword search with Postgres full-text search.
 *
 * The `tsv` column holds to_tsvector('english', title + headings + content) for every
 * chunk (see replaceIndex() in src/db.ts), with a GIN index. A first version:
 *   WHERE tsv @@ websearch_to_tsquery('english', $1)
 *   ORDER BY ts_rank_cd(tsv, <the same query>) DESC LIMIT $2
 * with CHUNK_COLUMNS, the rank AS score, and rowToChunk(), as in vectorSearch().
 *
 * Run `npm run eval` straight after: the keyword row will be poor. websearch_to_tsquery
 * (like plainto_tsquery) joins the words with AND, so "how do I revalidate a path on
 * demand" only matches chunks that contain every remaining word after stemming, and
 * real questions rarely do. Fix that, then measure again:
 * - In psql: select plainto_tsquery('english', 'how do I revalidate a path on demand');
 *   The stopwords are gone already. What would OR-ing the remaining terms do to recall,
 *   and what does the ranking then have to do?
 * - Keep identifiers searchable: "generateStaticParams" and "next.config.js" must still match.
 *
 * Postgres ranking is not BM25 (no inverse document frequency, different length
 * normalisation). Say so in the README; a BM25 extension such as ParadeDB's pg_search is
 * the upgrade path.
 *
 * Things to learn on the way:
 * - Find a question where keyword search beats vectors (an exact identifier) and one
 *   where it loses (a paraphrase that shares no words with the doc). Add both to the
 *   golden set.
 * - Compare the keyword column by question type in evals/report.md.
 */
export async function keywordSearch(query: string, k: number): Promise<RetrievedChunk[]> {
  void query;
  void k;
  todo("P2-05", "Implement keywordSearch() in src/retrieve.ts");
}

/**
 * TODO(P2-06) Week 5: Reciprocal Rank Fusion.
 *
 * Merge several ranked lists into one. A chunk scores the sum of 1 / (k + rank) over the
 * lists it appears in, with rank starting at 1 and k = 60 by convention. Return each
 * chunk once (by id), sorted by fused score, highest first, with `score` set to the fused
 * score and every other field kept. tests/specs/rrf.test.ts has the details.
 *
 * Things to learn on the way:
 * - Why ranks and not the raw scores? Print a vector score and a ts_rank_cd score for
 *   the same chunk and compare their ranges.
 * - What does k do? Try k = 1 and k = 600 and watch the hybrid row of the eval.
 * - Where does a chunk end up that is first in one list and missing from the other?
 */
export function reciprocalRankFusion(lists: RetrievedChunk[][], k = 60): RetrievedChunk[] {
  void lists;
  void k;
  todo("P2-06", "Implement reciprocalRankFusion() in src/retrieve.ts");
}

// ---------------------------------------------------------------------------------
// The pipeline below is plumbing: it runs the stages for a mode and records what each
// stage returned and how long it took, for the debug panel and the eval.

export const DEFAULT_K = 5;
/** How many candidates each retriever returns before fusion and reranking. */
export const DEFAULT_CANDIDATES = 30;
const DEBUG_HITS = 10;

export type StageName = "vector" | "keyword" | "fused" | "reranked" | "final";

/** One chunk as the debug panel shows it: where it came from and its score, no content. */
export type StageHit = Omit<RetrievedChunk, "content">;

export interface Stage {
  name: StageName;
  ms: number;
  /** Top hits of this stage (at most 10), best first. */
  hits: StageHit[];
  /** Total hits before trimming for display. */
  total: number;
  note?: string;
  /** Set on the "reranked" stage when the reranker failed and the fused order was kept. */
  fallback?: boolean;
}

export interface RetrievalResult {
  query: string;
  mode: RetrievalMode;
  /** The final chunks, best first: what the answer model sees. */
  chunks: RetrievedChunk[];
  stages: Stage[];
  ms: number;
}

export interface RetrieveOptions {
  k?: number;
  candidates?: number;
  reranker?: Reranker;
}

const toHit = ({ content: _content, ...hit }: RetrievedChunk): StageHit => hit;

/**
 * vector and keyword: one retriever, top k.
 * hybrid: both retrievers (top `candidates` each), fused with RRF, top k.
 * hybrid_rerank: hybrid's fused candidates, reranked, top k.
 * Errors (including "Not implemented yet") propagate to the caller.
 */
export async function retrieve(query: string, mode: RetrievalMode, opts: RetrieveOptions = {}): Promise<RetrievalResult> {
  const k = opts.k ?? DEFAULT_K;
  const candidates = Math.max(opts.candidates ?? DEFAULT_CANDIDATES, k);
  const stages: Stage[] = [];
  const start = performance.now();

  async function stage(name: StageName, run: () => Promise<RetrievedChunk[]> | RetrievedChunk[], extra?: () => Partial<Stage>) {
    const t = performance.now();
    const hits = await run();
    const ms = Math.round(performance.now() - t);
    stages.push({ name, ms, hits: hits.slice(0, DEBUG_HITS).map(toHit), total: hits.length, ...extra?.() });
    return hits;
  }

  let chunks: RetrievedChunk[];
  if (mode === "vector") {
    chunks = await stage("vector", () => vectorSearch(query, k));
  } else if (mode === "keyword") {
    chunks = await stage("keyword", () => keywordSearch(query, k));
  } else {
    const [v, kw] = await Promise.all([
      stage("vector", () => vectorSearch(query, candidates)),
      stage("keyword", () => keywordSearch(query, candidates)),
    ]);
    stages.sort((a, b) => (a.name === "vector" ? -1 : b.name === "vector" ? 1 : 0));
    const fused = await stage("fused", () => reciprocalRankFusion([v, kw]));
    if (mode === "hybrid") {
      chunks = fused.slice(0, k);
    } else {
      const reranker = opts.reranker ?? getReranker();
      let info: Partial<Stage> = {};
      chunks = await stage(
        "reranked",
        async () => {
          const result = await rerank(query, fused.slice(0, candidates), reranker, k);
          info = result.fallback
            ? { fallback: true, note: `Reranker ${reranker.name} failed, kept the fused order: ${result.error ?? "unknown error"}` }
            : { note: `Reranked ${Math.min(fused.length, candidates)} candidates with ${reranker.name}` };
          return result.chunks;
        },
        () => info,
      );
    }
  }
  stages.push({ name: "final", ms: 0, hits: chunks.map(toHit), total: chunks.length });
  return { query, mode, chunks, stages, ms: Math.round(performance.now() - start) };
}
