import { config } from "./config.js";
import { todo } from "./todo.js";

export const EMBEDDING_DIMS = 1024;

export interface Embedder {
  name: string;
  /** "document" when indexing, "query" when searching. Some models embed them differently. */
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
}

/**
 * Offline stand-in: hashes words into a fixed-size vector. It only captures word
 * overlap, not meaning, so it behaves like a weak keyword search. Use it to wire
 * the pipeline up, then compare its eval numbers against a real model.
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
 * TODO(P2-02) Week 4: a real embedding model.
 *
 * Anthropic does not host embedding models; its docs recommend Voyage AI.
 *   POST https://api.voyageai.com/v1/embeddings
 *   headers: Authorization: Bearer $VOYAGE_API_KEY
 *   body: { "input": [...texts], "model": "voyage-3.5", "input_type": "document" | "query" }
 *   response: { "data": [{ "embedding": number[] , "index": 0 }, ...] }
 * Check the current model names and limits in Voyage's docs before you start.
 *
 * Handle: batching (the API caps inputs per request), rate limits (retry with
 * backoff on 429), and sort results by `index`. OpenAI's text-embedding-3-small
 * (dimensions: 1024) is a fine alternative if you prefer.
 */
export class VoyageEmbedder implements Embedder {
  name = "voyage-3.5";
  async embed(texts: string[], kind: "document" | "query"): Promise<number[][]> {
    void texts;
    void kind;
    todo("P2-02", "Implement VoyageEmbedder.embed() in src/embed.ts");
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
