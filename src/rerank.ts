import { embeddingText } from "./chunk.js";
import { config } from "./config.js";
import { cosineSimilarity, FakeEmbedder } from "./embed.js";
import type { RetrievedChunk } from "./types.js";
import { todo } from "./todo.js";

export interface Reranker {
  name: string;
  /** One relevance score per document, in the same order as `documents`. Higher is more relevant. */
  score(query: string, documents: string[]): Promise<number[]>;
}

export interface RerankResult {
  /** At most topN chunks, best first. */
  chunks: RetrievedChunk[];
  /** True when the reranker failed and `chunks` is the incoming (fused) order instead. */
  fallback: boolean;
  /** What went wrong, when fallback is true. Shown in the debug panel. */
  error?: string;
}

/**
 * TODO(P2-07) Week 5: rerank the fused candidates, and fail safely.
 *
 * Embeddings compare a query vector with a chunk vector that were computed separately.
 * A reranker (a cross-encoder) reads the query and each chunk together, so it judges
 * relevance better, but it is too slow for the whole corpus. So: hybrid search finds
 * ~30 candidates cheaply, the reranker orders them, and the top few go to the model.
 *
 * rerank() (tests/specs/rerank.test.ts):
 * - Ask the reranker to score each candidate's text for the query. embeddingText() in
 *   src/chunk.ts gives the heading context too.
 * - Return the candidates ordered by those scores, highest first, at most topN, with
 *   `score` set to the reranker's score and every other field kept.
 * - Safe failure: the reranker is a network call to another company. If it throws, or
 *   returns a different number of scores than documents, return the candidates in their
 *   incoming order (cut to topN) with fallback: true and the error message. A slow or
 *   broken reranker must never take the whole answer down.
 * - Nothing to rerank: return an empty result without calling the reranker.
 *
 * VoyageReranker.score() below (no spec; check with RERANKER=voyage and the
 * hybrid_rerank row of `npm run eval`). Plain fetch() is enough:
 *   POST https://api.voyageai.com/v1/rerank
 *   Authorization: Bearer <config.voyageApiKey>
 *   body: { "query": string, "documents": string[], "model": config.voyageRerankModel }
 *   response: { "data": [{ "index": number, "relevance_score": number }, ...],
 *               "usage": { "total_tokens": number } }
 * `data` comes back sorted by relevance, not in input order: map it back by `index`.
 * Check the current model names and token limits in Voyage's reranker docs first.
 *
 * Things to learn on the way:
 * - How much latency does reranking add? The debug panel and the eval show each stage's time.
 * - Compare hybrid with hybrid_rerank by question type. Where does reranking help most?
 * - Optional: add a timeout (AbortSignal.timeout) so a slow reranker also falls back.
 */
export async function rerank(query: string, candidates: RetrievedChunk[], reranker: Reranker, topN: number): Promise<RerankResult> {
  void query;
  void candidates;
  void reranker;
  void topN;
  void embeddingText;
  todo("P2-07", "Implement rerank() in src/rerank.ts");
}

/** Part of P2-07: a cross-encoder reranker from Voyage AI. See the comment on rerank() above. */
export class VoyageReranker implements Reranker {
  name = `voyage:${config.voyageRerankModel}`;
  async score(query: string, documents: string[]): Promise<number[]> {
    void query;
    void documents;
    todo("P2-07", "Implement VoyageReranker.score() in src/rerank.ts");
  }
}

/**
 * Offline stand-in: scores word overlap through the fake embedder. It is not a
 * cross-encoder; it lets hybrid_rerank run end to end before you have a Voyage key.
 * With EMBEDDER=fake it computes the same similarity as vector search, so the
 * hybrid_rerank row of the eval matches the vector row. That is expected, not a bug.
 */
export class FakeReranker implements Reranker {
  name = "fake-overlap";
  private embedder = new FakeEmbedder();
  async score(query: string, documents: string[]): Promise<number[]> {
    const [q, ...docs] = await this.embedder.embed([query, ...documents], "document");
    return docs.map((d) => cosineSimilarity(q, d));
  }
}

export function getReranker(): Reranker {
  return config.reranker === "voyage" ? new VoyageReranker() : new FakeReranker();
}
