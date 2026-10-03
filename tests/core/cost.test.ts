import { describe, expect, it } from "vitest";
import { costOf, formatUsd, PRICES_PER_MTOK } from "../../src/cost.js";

describe("costOf", () => {
  it("prices input and output per million tokens", () => {
    expect(costOf("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(4);
    expect(costOf("claude-opus-5-5", { input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(20);
    expect(costOf("claude-haiku-4-5", { input_tokens: 2000, output_tokens: 400 })).toBeCloseTo(0.002 + 0.002);
  });

  it("bills cache reads at a fraction and cache writes at 1.25x the input price", () => {
    const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 };
    expect(costOf("claude-sonnet-5-5", usage)).toBeCloseTo(2 * 0.1 + 2 * 1.25);
  });

  it("is null for an unknown model or missing usage", () => {
    expect(costOf("some-other-model", { input_tokens: 1, output_tokens: 1 })).toBeNull();
    expect(costOf("claude-opus-5-5", null)).toBeNull();
  });

  it("has a price for the default models", () => {
    expect(Object.keys(PRICES_PER_MTOK)).toEqual(expect.arrayContaining(["claude-opus-5-5", "claude-haiku-4-5"]));
  });
});

describe("formatUsd", () => {
  it("shows small amounts with more digits", () => {
    expect(formatUsd(0.0042)).toBe("$0.0042");
    expect(formatUsd(0.125)).toBe("$0.125");
    expect(formatUsd(null)).toBe("n/a");
  });
});
