import { todo } from "../src/todo.js";

/**
 * Retrieval metrics. `retrieved` is the ranked list of doc paths the retriever
 * returned (one entry per chunk, so the same doc can appear twice); `relevant`
 * is the set of doc paths that contain the answer.
 * tests/specs/metrics.test.ts pins down the edge cases.
 */

/**
 * TODO(P2-08) Week 4: recall@k = share of relevant docs that appear in the top k.
 * Return null when there are no relevant docs (unanswerable question): the metric
 * is undefined there, and averaging a fake 0 or 1 would skew the report.
 */
export function recallAtK(retrieved: string[], relevant: string[], k: number): number | null {
  void retrieved;
  void relevant;
  void k;
  todo("P2-08", "Implement recallAtK() in evals/metrics.ts");
}

/**
 * TODO(P2-08) Week 4: reciprocal rank = 1 / (rank of the first relevant result),
 * rank starting at 1; 0 if none is retrieved; null when nothing is relevant.
 * The mean of this over all questions is MRR.
 */
export function reciprocalRank(retrieved: string[], relevant: string[]): number | null {
  void retrieved;
  void relevant;
  todo("P2-08", "Implement reciprocalRank() in evals/metrics.ts");
}

/** Mean of the non-null values; null if there are none. */
export function mean(values: (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
