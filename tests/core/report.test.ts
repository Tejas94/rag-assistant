import { describe, expect, it } from "vitest";
import type { GoldenItem } from "../../evals/golden.js";
import { renderReport, type ModeScore, type ReportInput } from "../../evals/report.js";

const golden: GoldenItem[] = [
  { id: "q01", question: "How do I revalidate | one page?", answer: "A.", relevant: ["a.mdx"], type: "lookup" },
  { id: "q02", question: "Python handlers?", answer: "No.", relevant: [], type: "unanswerable" },
];

const score = (over: Partial<ModeScore>): ModeScore => ({
  mode: "vector",
  recall: 0.5,
  mrr: 0.25,
  p50Ms: 12.4,
  errors: 0,
  fallbacks: 0,
  byType: { lookup: { n: 1, recall: 0.5, mrr: 0.25 } },
  firstRelevantRank: { q01: 4 },
  ...over,
});

const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  when: new Date("2026-10-01T09:30:00Z"),
  commit: "abc1234",
  sourceLabel: "Next.js docs (v16.3.8)",
  pages: 300,
  chunks: 4000,
  embedder: "fake-hash",
  reranker: "fake-overlap",
  k: 5,
  candidates: 30,
  golden,
  goldenTarget: 50,
  scores: [
    score({}),
    score({ mode: "keyword", notImplemented: "P2-05" }),
    score({ mode: "hybrid_rerank", fallbacks: 1, firstRelevantRank: { q01: null } }),
  ],
  ...over,
});

describe("renderReport", () => {
  it("shows the setup, a row per mode and 'not implemented' for open TODOs", () => {
    const md = renderReport(input());
    expect(md).toContain("- Docs: Next.js docs (v16.3.8), 300 pages, 4000 chunks");
    expect(md).toContain("- Golden set: 2 questions (1 answerable); target 50");
    expect(md).toContain("| vector | 0.500 | 0.250 | 12 ms |  |");
    expect(md).toContain("| keyword | not implemented (P2-05) | | | |");
    expect(md).toContain("reranker fell back on 1");
  });

  it("breaks scores down by type and lists the first relevant rank per question", () => {
    const md = renderReport(input());
    expect(md).toContain("| lookup | 1 | 0.500 / 0.250 | 0.500 / 0.250 |");
    expect(md).toContain("| q01 How do I revalidate \\| one page? | lookup | 4 | - |");
    expect(md).not.toContain("q02 Python");
  });

  it("flags golden-set pages that are not in the index", () => {
    expect(renderReport(input())).not.toContain("not in the index");
    expect(renderReport(input({ missingRelevant: ["q01 a.mdx"] }))).toContain("not in the index** (fix the golden set or re-ingest): q01 a.mdx");
  });

  it("says when the metrics are not implemented instead of printing numbers", () => {
    const md = renderReport(input({ metricsNotImplemented: "P2-03" }));
    expect(md).toContain("Metrics not implemented yet (P2-03)");
    expect(md).not.toContain("| Mode |");
  });

  it("adds the answers section with code checks and the judge's verdicts", () => {
    const md = renderReport(
      input({
        answers: {
          mode: "hybrid",
          model: "claude-opus-5-5",
          judgeModel: "claude-haiku-4-5",
          rows: [
            {
              id: "q01",
              question: "How do I revalidate | one page?",
              answerable: true,
              answer: "Call revalidatePath [1][7].",
              abstainedByPhrase: false,
              cited: [1],
              invalidCitations: [7],
              costUsd: 0.012,
              verdict: { correct: true, faithful: false, abstained: false, reasoning: "" },
              judgeCostUsd: 0.001,
            },
            { id: "q02", question: "Python handlers?", answerable: false, answer: "", abstainedByPhrase: false, cited: [], invalidCitations: [], costUsd: null, error: "timeout" },
          ],
        },
      }),
    );
    expect(md).toContain("## Answers (hybrid, answered by claude-opus-5-5, judged by claude-haiku-4-5)");
    expect(md).toContain("| yes | **no** | yes | [1] invalid: 7 | $0.012 |");
    expect(md).toContain("| q02 Python handlers? | error: timeout | | | | |");
    expect(md).toContain("Correct 1/1 · Faithful 0/1 · Abstained correctly 1/1 (judge)");
    expect(md).toContain("answers with invalid citations: 1");
  });

  it("reports an open answer TODO without a table", () => {
    const md = renderReport(
      input({ answers: { mode: "hybrid", model: "m", judgeModel: "j", rows: [], notImplemented: "P2-08" } }),
    );
    expect(md).toContain("Answers not implemented yet (P2-08).");
  });
});
