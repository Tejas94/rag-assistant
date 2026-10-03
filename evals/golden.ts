import { readFile } from "node:fs/promises";

export interface GoldenItem {
  id: string;
  question: string;
  /** Reference answer, or "UNANSWERABLE" when the docs do not contain it. */
  answer: string;
  /** Documents that contain the answer. Empty for unanswerable questions. */
  sourceDocs: string[];
}

/**
 * TODO(P2-07) Week 6: grow evals/golden.jsonl to 50 questions.
 * - Mix: direct lookups, paraphrases ("get my money back"), multi-doc questions
 *   (needs two sources), exact identifiers ("lon-1"), and ~10% unanswerable.
 * - Write questions the way a real user would, before looking at the doc text.
 * - When you swap in a real corpus, rewrite the set for it.
 */
export async function loadGolden(file = "evals/golden.jsonl"): Promise<GoldenItem[]> {
  const text = await readFile(file, "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenItem);
}
