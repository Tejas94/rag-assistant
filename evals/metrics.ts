import { todo } from "../src/todo.js";

/**
 * Retrieval metrics. `retrieved` is the ranked list of doc paths the retriever returned,
 * one entry per chunk, so the same page can appear more than once. `relevant` lists the
 * pages that contain the answer (the golden set's `relevant` field).
 *
 * Labels are pages, not chunk ids, so the golden set survives re-chunking: you can change
 * maxChars and compare runs without relabelling anything.
 */

/**
 * TODO(P2-03) Week 4: recall@k and reciprocal rank.
 *
 * recallAtK: the share of relevant pages that appear in the top k results. A page
 * retrieved twice still counts once. With two relevant pages and one of them in the top
 * k, recall is 0.5.
 *
 * reciprocalRank: 1 / (rank of the first relevant result), ranks starting at 1, so rank 1
 * gives 1, rank 2 gives 0.5, and nothing relevant gives 0. Averaged over all questions
 * this is MRR, which rewards putting the right page at the top.
 *
 * Both return null when `relevant` is empty (an unanswerable question): the metric is
 * undefined there, and averaging in a made-up 0 or 1 would skew the report. mean() below
 * skips nulls. tests/specs/metrics.test.ts pins down the edge cases.
 *
 * Done when the spec is green and `npm run eval` prints numbers for the modes you have.
 *
 * Things to learn on the way:
 * - Work out recall@5 and MRR by hand for three questions from the debug panel first.
 * - Recall@5 can be 1 while MRR is 0.2. What does that look like in the UI, and does
 *   the answer model care?
 * - Precision@k and hit rate@k are one line each. Which one would you show a product manager?
 */
export function recallAtK(retrieved: string[], relevant: string[], k: number): number | null {
  void retrieved;
  void relevant;
  void k;
  todo("P2-03", "Implement recallAtK() in evals/metrics.ts");
}

export function reciprocalRank(retrieved: string[], relevant: string[]): number | null {
  void retrieved;
  void relevant;
  todo("P2-03", "Implement reciprocalRank() in evals/metrics.ts");
}

/** Mean of the non-null values; null if there are none. */
export function mean(values: (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Median, for latency. Null for an empty list. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
