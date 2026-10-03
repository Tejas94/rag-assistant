import { config } from "./config.js";
import { todo } from "./todo.js";

/** Must match vector(1024) in db/schema.sql. */
export const EMBEDDING_DIMS = 1024;

export interface Embedder {
  /** Stored with every chunk, so a query never compares vectors from two different models. */
  name: string;
  /** "document" when indexing, "query" when searching. Some models embed them differently. */
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
}

/**
 * Offline stand-in: hashes words into a fixed-size vector. It only captures word
 * overlap, not meaning, so it behaves like a weak keyword search. Use it to wire the
 * pipeline up and get baseline numbers, then compare against a real model.
 */
export class FakeEmbedder implements Embedder {
  name = "fake-hash";
  async embed(texts: string[], _kind?: "document" | "query"): Promise<number[][]> {
    return texts.map((t) => {
      const v = new Array<number>(EMBEDDING_DIMS).fill(0);
      for (const word of t.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
        let h = 2166136261;
        for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
        v[Math.abs(h) % EMBEDDING_DIMS] += 1;
      }
      const norm = Math.hypot(...v) || 1;
      return v.map((x) => x / norm);
    });
  }
}

/**
 * TODO(P2-04) Week 4: real embeddings with Voyage AI, with batching and retries.
 *
 * Anthropic does not host embedding models; its docs point to Voyage AI. Plain fetch()
 * is enough, no SDK needed:
 *   POST https://api.voyageai.com/v1/embeddings
 *   Authorization: Bearer <config.voyageApiKey>
 *   body: { "input": string[], "model": config.voyageEmbedModel,
 *           "input_type": "document" | "query", "output_dimension": 1024 }
 *   response: { "data": [{ "embedding": number[], "index": number }, ...],
 *               "usage": { "total_tokens": number } }
 * Check the current models and limits in Voyage's docs first
 * (https://docs.voyageai.com/docs/embeddings). When this was written: up to 1,000 texts
 * per request, and a cap on the total tokens per request (320K for voyage-3.5). Count
 * about 4 characters per token for English prose; code packs more tokens per character.
 *
 * What to handle:
 * - Batching: split `texts` into requests that stay under both limits. Ingest passes
 *   every chunk in one call (a few thousand), so this matters on the first run.
 * - Retries: 429 and 5xx deserve a retry with exponential backoff and jitter (honour a
 *   Retry-After header if there is one). 400 and 401 do not: fail at once and put the
 *   response body in the error message.
 * - Order: place each vector by its `index`, not by its position in `data`.
 * - Shape: every vector needs EMBEDDING_DIMS numbers, or the INSERT fails later with a
 *   less helpful error.
 * - A missing VOYAGE_API_KEY should fail with a message that says exactly that.
 *
 * Done when `EMBEDDER=voyage npm run ingest` and then `npm run eval` work, and the vector
 * row beats the fake embedder. Log both rows in docs/EXPERIMENTS.md.
 *
 * Things to learn on the way:
 * - Why does `input_type` exist? Embed "how do I cache a fetch" as a query and as a
 *   document and compare the cosine similarity of each with a chunk about caching.
 * - How many tokens does the whole corpus take, and what does one ingest cost?
 * - The Next.js docs are code-heavy. Try VOYAGE_EMBED_MODEL=voyage-code-3 (1024
 *   dimensions by default too), re-ingest and compare the vector row.
 */
export class VoyageEmbedder implements Embedder {
  name = `voyage:${config.voyageEmbedModel}`;
  async embed(texts: string[], kind: "document" | "query"): Promise<number[][]> {
    void texts;
    void kind;
    todo("P2-04", "Implement VoyageEmbedder.embed() in src/embed.ts");
  }
}

export function getEmbedder(): Embedder {
  return config.embedder === "voyage" ? new VoyageEmbedder() : new FakeEmbedder();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
