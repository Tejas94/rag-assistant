// Spec for P2-07 (src/rerank.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.
import { describe, expect, it } from "vitest";
import { rerank, type Reranker } from "../../src/rerank.js";
import type { RetrievedChunk } from "../../src/types.js";

const c = (id: number): RetrievedChunk => ({
  id,
  score: 1 / (60 + id),
  docPath: `d${id}.mdx`,
  docTitle: `Doc ${id}`,
  url: `https://example.com/d${id}`,
  headings: ["Caching", `Part ${id}`],
  anchor: `part-${id}`,
  index: id,
  content: `How caching works, part ${id}.`,
});

/** A reranker that returns fixed scores (or throws) and records what it was asked. */
class ScriptedReranker implements Reranker {
  name = "scripted";
  calls: { query: string; documents: string[] }[] = [];
  constructor(private readonly result: number[] | Error) {}
  async score(query: string, documents: string[]): Promise<number[]> {
    this.calls.push({ query, documents });
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

describe("rerank", () => {
  it("orders the candidates by the reranker's scores, highest first", async () => {
    const result = await rerank("q", [c(1), c(2), c(3)], new ScriptedReranker([0.1, 0.9, 0.5]), 3);
    expect(result.fallback).toBe(false);
    expect(result.chunks.map((x) => x.id)).toEqual([2, 3, 1]);
    expect(result.chunks.map((x) => x.score)).toEqual([0.9, 0.5, 0.1]);
  });

  it("keeps every other field of each chunk", async () => {
    const result = await rerank("q", [c(1), c(2)], new ScriptedReranker([0.2, 0.7]), 2);
    expect(result.chunks[0]).toEqual({ ...c(2), score: 0.7 });
  });

  it("keeps only the top N", async () => {
    const result = await rerank("q", [c(1), c(2), c(3), c(4)], new ScriptedReranker([0.4, 0.1, 0.9, 0.3]), 2);
    expect(result.chunks.map((x) => x.id)).toEqual([3, 1]);
  });

  it("sends the query and each candidate's text, in order, in one call", async () => {
    const reranker = new ScriptedReranker([0.3, 0.2, 0.1]);
    await rerank("how do I cache a fetch", [c(1), c(2), c(3)], reranker, 3);
    expect(reranker.calls).toHaveLength(1);
    expect(reranker.calls[0].query).toBe("how do I cache a fetch");
    expect(reranker.calls[0].documents).toHaveLength(3);
    reranker.calls[0].documents.forEach((d, i) => expect(d).toContain(c(i + 1).content));
  });

  it("falls back to the incoming order when the reranker throws", async () => {
    const result = await rerank("q", [c(1), c(2), c(3)], new ScriptedReranker(new Error("429 rate limited")), 2);
    expect(result.fallback).toBe(true);
    expect(result.chunks).toEqual([c(1), c(2)]);
    expect(result.error).toMatch(/429 rate limited/);
  });

  it("treats the wrong number of scores as a failure too", async () => {
    const result = await rerank("q", [c(1), c(2), c(3)], new ScriptedReranker([0.9]), 3);
    expect(result.fallback).toBe(true);
    expect(result.chunks.map((x) => x.id)).toEqual([1, 2, 3]);
    expect(result.error).toBeTruthy();
  });

  it("does not call the reranker when there is nothing to rerank", async () => {
    const reranker = new ScriptedReranker([]);
    const result = await rerank("q", [], reranker, 5);
    expect(result).toMatchObject({ chunks: [], fallback: false });
    expect(reranker.calls).toHaveLength(0);
  });
});
