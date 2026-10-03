import { writeFile } from "node:fs/promises";
import { answerQuestion, formatSources } from "../src/answer.js";
import { config } from "../src/config.js";
import { pool } from "../src/db.js";
import { retrieve } from "../src/retrieve.js";
import type { RetrievalMode } from "../src/types.js";
import { loadGolden } from "./golden.js";
import { judge } from "./judge.js";
import { mean, recallAtK, reciprocalRank } from "./metrics.js";

/**
 * npm run eval                 retrieval metrics for every mode (cheap: no LLM calls
 *                              beyond embedding the questions)
 * npm run eval -- --answers    also generate answers and judge them (costs money)
 *
 * Writes evals/report.md. Commit a report for each meaningful change (chunk size,
 * embedder, hybrid on/off) so your README can show before and after numbers.
 */
const K = 5;
const MODES: RetrievalMode[] = ["vector", "keyword", "hybrid"];

async function main() {
  const withAnswers = process.argv.includes("--answers");
  const golden = await loadGolden();
  const lines: string[] = [
    `# Eval report`,
    ``,
    `${new Date().toISOString()} · ${golden.length} questions · embedder ${config.embedder} · k=${K}`,
    ``,
    `| Mode | Recall@${K} | MRR |`,
    `| --- | --- | --- |`,
  ];

  for (const mode of MODES) {
    const recalls: (number | null)[] = [];
    const rrs: (number | null)[] = [];
    for (const item of golden) {
      try {
        const docs = (await retrieve(item.question, mode, K)).map((c) => c.docPath);
        recalls.push(recallAtK(docs, item.sourceDocs, K));
        rrs.push(reciprocalRank(docs, item.sourceDocs));
      } catch (err) {
        console.error(`[${mode}] ${item.id}: ${err instanceof Error ? err.message : err}`);
        recalls.push(null);
        rrs.push(null);
      }
    }
    const fmt = (x: number | null) => (x == null ? "n/a" : x.toFixed(3));
    lines.push(`| ${mode} | ${fmt(mean(recalls))} | ${fmt(mean(rrs))} |`);
  }

  if (withAnswers) {
    lines.push(``, `## Answers (hybrid)`, ``, `| Question | Correct | Faithful | Abstained correctly |`, `| --- | --- | --- | --- |`);
    let correct = 0;
    let faithful = 0;
    let abstained = 0;
    for (const item of golden) {
      const chunks = await retrieve(item.question, "hybrid", K);
      const answer = await answerQuestion(item.question, chunks);
      const v = await judge({
        question: item.question,
        reference: item.answer,
        sources: formatSources(chunks),
        answer: answer.text,
      });
      correct += Number(v.correct);
      faithful += Number(v.faithful);
      abstained += Number(v.abstainedCorrectly);
      const mark = (b: boolean) => (b ? "yes" : "**no**");
      lines.push(`| ${item.question} | ${mark(v.correct)} | ${mark(v.faithful)} | ${mark(v.abstainedCorrectly)} |`);
    }
    const n = golden.length;
    lines.push(``, `Correct ${correct}/${n} · Faithful ${faithful}/${n} · Abstained correctly ${abstained}/${n}`);
  }

  const report = lines.join("\n") + "\n";
  await writeFile("evals/report.md", report);
  console.log(report);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
