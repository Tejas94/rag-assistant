import { describe, expect, it } from "vitest";
import { parseCitations } from "../../src/answer.js";
import { cosineSimilarity, FakeEmbedder } from "../../src/embed.js";
import { loadCorpus } from "../../src/corpus.js";
import type { RetrievedChunk } from "../../src/types.js";

// These cover code that ships finished, so they should pass from day one.
describe("scaffolding", () => {
  it("fake embedder puts similar text closer together", async () => {
    const [q, near, far] = await new FakeEmbedder().embed(
      ["how long are backups kept", "backups are kept for 30 days", "invoices are payable within 14 days"],
      "document",
    );
    expect(cosineSimilarity(q, near)).toBeGreaterThan(cosineSimilarity(q, far));
  });

  it("parses [n] citations in order without duplicates", () => {
    const chunks = [1, 2, 3].map((id) => ({ id }) as RetrievedChunk);
    expect(parseCitations("A [2]. B [1][2]. C [9].", chunks).map((c) => c.id)).toEqual([1, 2]);
  });

  it("loads the sample corpus without its README", async () => {
    const docs = await loadCorpus("corpus");
    expect(docs.map((d) => d.path)).toEqual(["backups.md", "billing.md", "regions.md", "security.md", "support.md"]);
  });
});
