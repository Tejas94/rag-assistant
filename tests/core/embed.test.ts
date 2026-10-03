import { describe, expect, it } from "vitest";
import { cosineSimilarity, EMBEDDING_DIMS, FakeEmbedder } from "../../src/embed.js";

describe("FakeEmbedder", () => {
  const embedder = new FakeEmbedder();

  it("returns one unit vector of EMBEDDING_DIMS numbers per text", async () => {
    const vectors = await embedder.embed(["revalidate a page", "configure images"], "document");
    expect(vectors).toHaveLength(2);
    for (const v of vectors) {
      expect(v).toHaveLength(EMBEDDING_DIMS);
      expect(Math.hypot(...v)).toBeCloseTo(1);
    }
  });

  it("is deterministic and ignores case and punctuation", async () => {
    const [a, b] = await embedder.embed(["Revalidate, a page!", "revalidate a page"], "query");
    expect(a).toEqual(b);
  });

  it("puts text with shared words closer together", async () => {
    const [q, near, far] = await embedder.embed(
      ["how do I revalidate a page", "call revalidatePath to revalidate a page on demand", "remote images need remotePatterns"],
      "document",
    );
    expect(cosineSimilarity(q, near)).toBeGreaterThan(cosineSimilarity(q, far));
  });

  it("gives empty text a zero vector instead of NaN", async () => {
    const [v] = await embedder.embed([""], "query");
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for the same direction, 0 for orthogonal and -1 for opposite", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 3])).toBe(0);
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1);
  });

  it("is 0 rather than NaN for a zero vector", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
