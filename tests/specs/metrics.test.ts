import { describe, expect, it } from "vitest";
import { mean, recallAtK, reciprocalRank } from "../../evals/metrics.js";

// Spec for P2-08 (evals/metrics.ts). Red until you finish it; once green, move this
// file to tests/core so CI guards it from then on.
describe("recallAtK", () => {
  it("counts relevant docs found in the top k", () => {
    expect(recallAtK(["a", "b", "c"], ["a", "c"], 3)).toBe(1);
    expect(recallAtK(["a", "b", "c"], ["a", "c"], 2)).toBe(0.5);
  });
  it("does not double count a doc retrieved twice", () => {
    expect(recallAtK(["a", "a", "b"], ["a", "z"], 3)).toBe(0.5);
  });
  it("is undefined (null) with no relevant docs", () => {
    expect(recallAtK(["a"], [], 5)).toBeNull();
  });
});

describe("reciprocalRank", () => {
  it("uses the first relevant hit", () => {
    expect(reciprocalRank(["x", "a", "b"], ["a", "b"])).toBe(0.5);
  });
  it("is 0 when nothing relevant is retrieved", () => {
    expect(reciprocalRank(["x", "y"], ["a"])).toBe(0);
  });
  it("is null with no relevant docs", () => {
    expect(reciprocalRank(["x"], [])).toBeNull();
  });
});

describe("mean", () => {
  it("skips nulls", () => {
    expect(mean([1, null, 0])).toBe(0.5);
  });
});
