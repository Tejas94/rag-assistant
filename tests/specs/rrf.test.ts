// Spec for P2-06 (src/retrieve.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.
import { describe, expect, it } from "vitest";
import { reciprocalRankFusion } from "../../src/retrieve.js";
import type { RetrievedChunk } from "../../src/types.js";

const c = (id: number, score = 0): RetrievedChunk => ({
  id,
  score,
  docPath: `d${id}.mdx`,
  docTitle: `Doc ${id}`,
  url: `https://example.com/d${id}`,
  headings: ["Usage"],
  anchor: "usage",
  index: 0,
  content: `content ${id}`,
});

describe("reciprocalRankFusion", () => {
  it("ranks chunks that appear in both lists first", () => {
    const fused = reciprocalRankFusion([
      [c(1), c(2), c(3)],
      [c(3), c(4), c(1)],
    ]);
    expect(fused.map((x) => x.id).slice(0, 2).sort()).toEqual([1, 3]);
  });

  it("scores with the sum of 1 / (k + rank), rank starting at 1", () => {
    const fused = reciprocalRankFusion([[c(7)], [c(9), c(7)]], 60);
    expect(fused.map((x) => x.id)).toEqual([7, 9]);
    expect(fused[0].score).toBeCloseTo(1 / 61 + 1 / 62);
    expect(fused[1].score).toBeCloseTo(1 / 61);
  });

  it("uses the k you pass", () => {
    const fused = reciprocalRankFusion([[c(1), c(2)]], 1);
    expect(fused.map((x) => x.score)).toEqual([1 / 2, 1 / 3]);
  });

  it("returns each chunk once", () => {
    const fused = reciprocalRankFusion([
      [c(1), c(2)],
      [c(2), c(1)],
      [c(1), c(5)],
    ]);
    expect(fused.map((x) => x.id).sort()).toEqual([1, 2, 5]);
  });

  it("ignores the original scores, which are not comparable across retrievers", () => {
    const fused = reciprocalRankFusion([[c(1, 0.1), c(2, 999)]]);
    expect(fused.map((x) => x.id)).toEqual([1, 2]);
  });

  it("keeps every other field of the chunk", () => {
    const [first] = reciprocalRankFusion([[c(4, 0.9)]]);
    expect(first).toEqual({ ...c(4), score: 1 / 61 });
  });

  it("handles empty input", () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });
});
