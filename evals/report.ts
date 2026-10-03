import { formatUsd } from "../src/cost.js";
import type { RetrievalMode } from "../src/types.js";
import { isAnswerable, QUESTION_TYPES, type GoldenItem, type QuestionType } from "./golden.js";
import { mean, median, recallAtK, reciprocalRank } from "./metrics.js";

/** One question through one retrieval mode. */
export interface QuestionRun {
  id: string;
  /** Doc paths of the retrieved chunks, best first. */
  docs: string[];
  ms: number;
  /** The reranker failed and the fused order was used. */
  fallback?: boolean;
  error?: string;
}

export interface ModeRun {
  mode: RetrievalMode;
  /** Set when a TODO in this mode's path is still open, e.g. "P2-05". */
  notImplemented?: string;
  runs: QuestionRun[];
}

export interface TypeScore {
  n: number;
  recall: number | null;
  mrr: number | null;
}

export interface ModeScore {
  mode: RetrievalMode;
  notImplemented?: string;
  recall: number | null;
  mrr: number | null;
  p50Ms: number | null;
  errors: number;
  fallbacks: number;
  byType: Partial<Record<QuestionType, TypeScore>>;
  /** Rank (1-based) of the first relevant page per question id; null when none is in the results. */
  firstRelevantRank: Record<string, number | null>;
}

/** Scores one mode. Throws "Not implemented yet: P2-03" while the metrics TODO is open. */
export function scoreMode(run: ModeRun, golden: GoldenItem[], k: number): ModeScore {
  const byId = new Map(golden.map((g) => [g.id, g]));
  const ok = run.runs.filter((r) => !r.error);
  const rows = ok.map((r) => {
    const item = byId.get(r.id)!;
    return { item, recall: recallAtK(r.docs, item.relevant, k), rr: reciprocalRank(r.docs, item.relevant) };
  });
  const byType: ModeScore["byType"] = {};
  for (const type of QUESTION_TYPES) {
    const of = rows.filter((row) => row.item.type === type);
    if (of.length) byType[type] = { n: of.length, recall: mean(of.map((x) => x.recall)), mrr: mean(of.map((x) => x.rr)) };
  }
  const firstRelevantRank: Record<string, number | null> = {};
  for (const row of rows) {
    if (isAnswerable(row.item)) firstRelevantRank[row.item.id] = row.rr ? Math.round(1 / row.rr) : null;
  }
  return {
    mode: run.mode,
    notImplemented: run.notImplemented,
    recall: mean(rows.map((x) => x.recall)),
    mrr: mean(rows.map((x) => x.rr)),
    p50Ms: median(ok.map((r) => r.ms)),
    errors: run.runs.length - ok.length,
    fallbacks: run.runs.filter((r) => r.fallback).length,
    byType,
    firstRelevantRank,
  };
}

export interface AnswerRow {
  id: string;
  question: string;
  answerable: boolean;
  answer: string;
  /** The answer is the exact abstain phrase (checked in code). */
  abstainedByPhrase: boolean;
  cited: number[];
  invalidCitations: number[];
  costUsd: number | null;
  verdict?: { correct: boolean; faithful: boolean; abstained: boolean; reasoning: string };
  judgeCostUsd?: number | null;
  error?: string;
}

export interface AnswersRun {
  mode: RetrievalMode;
  model: string;
  judgeModel: string;
  rows: AnswerRow[];
  notImplemented?: string;
  judgeNotImplemented?: string;
}

export interface ReportInput {
  when: Date;
  commit: string;
  sourceLabel: string;
  pages: number;
  chunks: number;
  embedder: string;
  reranker: string;
  k: number;
  candidates: number;
  golden: GoldenItem[];
  goldenTarget: number;
  scores: ModeScore[];
  /** Set when scoring threw because P2-03 is open. */
  metricsNotImplemented?: string;
  /** Golden-set pages that are not in the index ("q03 path"). They can never be retrieved. */
  missingRelevant?: string[];
  answers?: AnswersRun;
}

const num = (x: number | null) => (x == null ? "n/a" : x.toFixed(3));
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderReport(input: ReportInput): string {
  const answerable = input.golden.filter(isAnswerable).length;
  const lines: string[] = [
    "# Eval report",
    "",
    `- Run: ${input.when.toISOString().slice(0, 16).replace("T", " ")} UTC, commit ${input.commit}`,
    `- Docs: ${input.sourceLabel}, ${input.pages} pages, ${input.chunks} chunks`,
    `- Embedder: ${input.embedder}; reranker: ${input.reranker}; k = ${input.k}; candidates per retriever = ${input.candidates}`,
    `- Golden set: ${input.golden.length} questions (${answerable} answerable); target ${input.goldenTarget}`,
  ];
  if (input.missingRelevant?.length) {
    lines.push(`- **Relevant pages not in the index** (fix the golden set or re-ingest): ${input.missingRelevant.join(", ")}`);
  }
  lines.push("", "## Retrieval", "");

  if (input.metricsNotImplemented) {
    lines.push(`Metrics not implemented yet (${input.metricsNotImplemented}). Retrieval ran; finish evals/metrics.ts to score it.`, "");
  } else {
    lines.push(`| Mode | Recall@${input.k} | MRR | p50 latency | Notes |`, "| --- | --- | --- | --- | --- |");
    for (const s of input.scores) {
      if (s.notImplemented) {
        lines.push(`| ${s.mode} | not implemented (${s.notImplemented}) | | | |`);
        continue;
      }
      const notes = [s.errors ? `${s.errors} errors` : "", s.fallbacks ? `reranker fell back on ${s.fallbacks}` : ""].filter(Boolean).join("; ");
      lines.push(`| ${s.mode} | ${num(s.recall)} | ${num(s.mrr)} | ${s.p50Ms == null ? "n/a" : `${Math.round(s.p50Ms)} ms`} | ${notes} |`);
    }
    lines.push("", "Averages cover answerable questions only: an unanswerable question has no relevant page to find.", "");

    const scored = input.scores.filter((s) => !s.notImplemented);
    if (scored.length) {
      lines.push(`### By question type (Recall@${input.k} / MRR)`, "");
      lines.push(`| Type | Questions | ${scored.map((s) => s.mode).join(" | ")} |`, `| --- | --- | ${scored.map(() => "---").join(" | ")} |`);
      for (const type of QUESTION_TYPES) {
        if (type === "unanswerable") continue;
        const n = input.golden.filter((g) => g.type === type).length;
        if (!n) continue;
        const cells = scored.map((s) => {
          const t = s.byType[type];
          return t ? `${num(t.recall)} / ${num(t.mrr)}` : "n/a";
        });
        lines.push(`| ${type} | ${n} | ${cells.join(" | ")} |`);
      }
      lines.push("", `### Rank of the first relevant page ("-" = not in the top ${input.k})`, "");
      lines.push(`| Question | Type | ${scored.map((s) => s.mode).join(" | ")} |`, `| --- | --- | ${scored.map(() => "---").join(" | ")} |`);
      for (const g of input.golden.filter(isAnswerable)) {
        const cells = scored.map((s) => (g.id in s.firstRelevantRank ? (s.firstRelevantRank[g.id] ?? "-") : "error"));
        lines.push(`| ${g.id} ${cell(g.question)} | ${g.type} | ${cells.join(" | ")} |`);
      }
      lines.push("");
    }
  }

  const a = input.answers;
  if (a) {
    lines.push(`## Answers (${a.mode}, answered by ${a.model}, judged by ${a.judgeModel})`, "");
    if (a.notImplemented) {
      lines.push(`Answers not implemented yet (${a.notImplemented}).`, "");
    } else {
      if (a.judgeNotImplemented) lines.push(`The judge is not implemented yet (${a.judgeNotImplemented}); only code checks below.`, "");
      const yes = (b: boolean | undefined) => (b == null ? "n/a" : b ? "yes" : "**no**");
      lines.push("| Question | Correct | Faithful | Abstained correctly | Cited | Cost |", "| --- | --- | --- | --- | --- | --- |");
      for (const r of a.rows) {
        if (r.error) {
          lines.push(`| ${r.id} ${cell(r.question)} | error: ${cell(r.error)} | | | | |`);
          continue;
        }
        const abstainedOk = r.verdict ? r.verdict.abstained === !r.answerable : r.abstainedByPhrase === !r.answerable;
        const cited = r.cited.map((n) => `[${n}]`).join("") + (r.invalidCitations.length ? ` invalid: ${r.invalidCitations.join(",")}` : "");
        lines.push(`| ${r.id} ${cell(r.question)} | ${yes(r.verdict?.correct)} | ${yes(r.verdict?.faithful)} | ${yes(abstainedOk)} | ${cited || "none"} | ${formatUsd(r.costUsd)} |`);
      }
      const ok = a.rows.filter((r) => !r.error);
      const judged = ok.filter((r) => r.verdict);
      const count = (f: (r: AnswerRow) => boolean) => ok.filter(f).length;
      const costs = ok.map((r) => r.costUsd).filter((c): c is number => c != null);
      const judgeCosts = judged.map((r) => r.judgeCostUsd).filter((c): c is number => c != null);
      lines.push("");
      if (judged.length) {
        lines.push(
          `Correct ${count((r) => Boolean(r.verdict?.correct))}/${judged.length} · ` +
            `Faithful ${count((r) => Boolean(r.verdict?.faithful))}/${judged.length} · ` +
            `Abstained correctly ${count((r) => r.verdict?.abstained === !r.answerable)}/${judged.length} (judge)`,
        );
      }
      lines.push(
        `Abstain phrase used correctly ${count((r) => r.abstainedByPhrase === !r.answerable)}/${ok.length} (code check) · ` +
          `answers with invalid citations: ${count((r) => r.invalidCitations.length > 0)}`,
        `Cost per answer: ${formatUsd(mean(costs))} on average, ${formatUsd(costs.reduce((x, y) => x + y, 0))} in total` +
          (judgeCosts.length ? ` · judging: ${formatUsd(judgeCosts.reduce((x, y) => x + y, 0))} in total` : ""),
        "",
      );
    }
  }
  return lines.join("\n");
}
