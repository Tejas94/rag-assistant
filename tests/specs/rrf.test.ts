import { describe, expect, it } from "vitest";
import { reciprocalRankFusion } from "../../src/retrieve.js";
import type { RetrievedChunk } from "../../src/types.js";

// Spec for P2-05 (src/retrieve.ts). Red until you finish it; once green, move this
// file to tests/core so CI guards it from then on.
const c = (id: number, score = 0): RetrievedChunk => ({ id, score, docPath: `d${id}.md`, heading: "h", content: "c", index: 0 });

describe("reciprocalRankFusion", () => {
  it("rewards chunks that appear in both lists", () => {
    const fused = reciprocalRankFusion([
      [c(1), c(2), c(3)],
      [c(3), c(4), c(1)],
    ]);
    expect(fused.map((x) => x.id).slice(0, 2).sort()).toEqual([1, 3]);
  });

  it("deduplicates and uses 1/(k+rank) scores", () => {
    const fused = reciprocalRankFusion([[c(7)], [c(7)]], 60);
    expect(fused).toHaveLength(1);
    expect(fused[0].score).toBeCloseTo(2 / 61);
  });

  it("ignores the original scores", () => {
    const fused = reciprocalRankFusion([[c(1, 0.1), c(2, 999)]]);
    expect(fused.map((x) => x.id)).toEqual([1, 2]);
  });
});
