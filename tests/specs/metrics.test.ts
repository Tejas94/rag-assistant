// Spec for P2-03 (evals/metrics.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.
import { describe, expect, it } from "vitest";
import { recallAtK, reciprocalRank } from "../../evals/metrics.js";

describe("recallAtK", () => {
  it("is the share of relevant pages found in the top k", () => {
    expect(recallAtK(["a.mdx", "b.mdx", "c.mdx"], ["a.mdx", "c.mdx"], 3)).toBe(1);
    expect(recallAtK(["a.mdx", "b.mdx", "c.mdx"], ["a.mdx", "c.mdx"], 2)).toBe(0.5);
    expect(recallAtK(["x.mdx", "y.mdx"], ["a.mdx"], 2)).toBe(0);
  });

  it("only looks at the top k", () => {
    expect(recallAtK(["x.mdx", "y.mdx", "a.mdx"], ["a.mdx"], 2)).toBe(0);
  });

  it("counts a page retrieved twice only once", () => {
    expect(recallAtK(["a.mdx", "a.mdx", "b.mdx"], ["a.mdx", "z.mdx"], 3)).toBe(0.5);
  });

  it("is undefined (null) for an unanswerable question", () => {
    expect(recallAtK(["a.mdx"], [], 5)).toBeNull();
  });
});

describe("reciprocalRank", () => {
  it("is 1 / rank of the first relevant page", () => {
    expect(reciprocalRank(["a.mdx", "b.mdx"], ["a.mdx"])).toBe(1);
    expect(reciprocalRank(["x.mdx", "a.mdx", "b.mdx"], ["a.mdx", "b.mdx"])).toBe(0.5);
    expect(reciprocalRank(["x.mdx", "y.mdx", "x.mdx", "z.mdx", "b.mdx"], ["b.mdx"])).toBe(0.2);
  });

  it("is 0 when nothing relevant is retrieved", () => {
    expect(reciprocalRank(["x.mdx", "y.mdx"], ["a.mdx"])).toBe(0);
  });

  it("is undefined (null) for an unanswerable question", () => {
    expect(reciprocalRank(["x.mdx"], [])).toBeNull();
  });
});
