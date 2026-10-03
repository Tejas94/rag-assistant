import { describe, expect, it } from "vitest";
import { describeIndexProblem, friendlyDbError, missingRelevant, rowToChunk, toSqlVector } from "../../src/db.js";

// Pure helpers only. Nothing here opens a connection.
describe("db helpers", () => {
  it("formats a vector the way pgvector reads it", () => {
    expect(toSqlVector([0.5, -1, 0])).toBe("[0.5,-1,0]");
  });

  it("maps a row to a RetrievedChunk with numeric id and score", () => {
    const chunk = rowToChunk({
      id: "42",
      doc_path: "01-app/a.mdx",
      doc_title: "A",
      url: "https://nextjs.org/docs/app/a",
      headings: ["Usage"],
      anchor: "usage",
      chunk_index: 3,
      content: "Text.",
      score: "0.25",
    });
    expect(chunk).toEqual({
      id: 42,
      docPath: "01-app/a.mdx",
      docTitle: "A",
      url: "https://nextjs.org/docs/app/a",
      headings: ["Usage"],
      anchor: "usage",
      index: 3,
      content: "Text.",
      score: 0.25,
    });
  });

  it("explains an empty index or a mismatched embedder", () => {
    expect(describeIndexProblem({ chunks: 0, docs: 0, embedModels: [] }, "fake-hash")).toMatch(/npm run ingest/);
    expect(describeIndexProblem({ chunks: 10, docs: 2, embedModels: ["fake-hash"] }, "voyage:voyage-3.5")).toMatch(
      /built with fake-hash but the current embedder is voyage:voyage-3.5/,
    );
    expect(describeIndexProblem({ chunks: 10, docs: 2, embedModels: ["fake-hash"] }, "fake-hash")).toBeNull();
  });

  it("lists golden-set pages that are not in the index", () => {
    const golden = [
      { id: "q01", relevant: ["01-app/a.mdx", "01-app/typo.mdx"] },
      { id: "q02", relevant: [] },
    ];
    expect(missingRelevant(golden, new Set(["01-app/a.mdx"]))).toEqual(["q01 01-app/typo.mdx"]);
  });

  it("turns common first-run errors into a next step", () => {
    expect(friendlyDbError({ code: "ECONNREFUSED" })).toMatch(/npm run db:up/);
    expect(friendlyDbError({ code: "ECONNREFUSED" })).not.toMatch(/rag:rag@/);
    expect(friendlyDbError({ code: "42P01" })).toMatch(/npm run db:schema/);
    expect(friendlyDbError({ code: "22000", message: "expected 1024 dimensions, not 512" })).toMatch(/vector\(1024\)/);
    expect(friendlyDbError(new Error("something else"))).toBe("something else");
  });
});
