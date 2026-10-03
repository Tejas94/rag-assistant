import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { config } from "../src/config.js";
import { costOf, formatUsd } from "../src/cost.js";
import { errorMessage } from "../src/todo.js";
import { judge, type Verdict } from "./judge.js";
import { agreement, ANSWERS_FILE, FIELDS, LABELS_FILE, loadLabeledAnswers } from "./labels.js";

/**
 * npm run eval:calibrate
 *
 * Runs the judge on the answers you labelled in evals/labels.jsonl and reports how often
 * it agrees with you, field by field, plus every disagreement. Writes evals/calibration.md.
 * Commit both files: the agreement rate is what makes the judge's numbers believable.
 */
async function main() {
  if (!existsSync(LABELS_FILE)) {
    throw new Error(
      `No ${LABELS_FILE} yet. Run \`npm run eval -- --answers\`, copy 20 lines from ${ANSWERS_FILE} ` +
        `into ${LABELS_FILE}, and replace each "label": null with your own label.`,
    );
  }
  const labeled = (await loadLabeledAnswers()).filter((x) => x.label);
  if (!labeled.length) throw new Error(`${LABELS_FILE} has no labels yet: replace "label": null with your own label on each line.`);

  const pairs: { id: string; question: string; label: NonNullable<(typeof labeled)[number]["label"]>; verdict: Verdict }[] = [];
  let cost = 0;
  for (const item of labeled) {
    const result = await judge({
      question: item.question,
      reference: item.reference,
      answerable: item.answerable,
      sources: item.sources,
      answer: item.answer,
    });
    cost += costOf(result.model, result.usage) ?? 0;
    pairs.push({ id: item.id, question: item.question, label: item.label!, verdict: result.verdict });
    console.error(`[judge] ${item.id}`);
  }

  const a = agreement(pairs);
  const lines = [
    "# Judge calibration",
    "",
    `Judge: ${config.judgeModel} · ${a.n} labelled answers from ${LABELS_FILE} · judging cost ${formatUsd(cost)}`,
    "",
    `**Agrees with you on all three fields: ${a.all}/${a.n}**`,
    "",
    "| Field | Agreement |",
    "| --- | --- |",
    ...FIELDS.map((f) => `| ${f} | ${a.byField[f]}/${a.n} |`),
    "",
    "## Disagreements",
    "",
  ];
  const disagreements = pairs.filter((p) => FIELDS.some((f) => p.label[f] !== p.verdict[f]));
  if (!disagreements.length) lines.push("None.");
  for (const p of disagreements) {
    const fields = FIELDS.filter((f) => p.label[f] !== p.verdict[f])
      .map((f) => `${f}: you ${p.label[f]}, judge ${p.verdict[f]}`)
      .join("; ");
    lines.push(`- **${p.id}** ${p.question}`, `  - ${fields}`, `  - Judge's reasoning: ${p.verdict.reasoning.replace(/\n/g, " ")}`);
  }
  const report = lines.join("\n") + "\n";
  await writeFile("evals/calibration.md", report);
  console.log(report);
}

try {
  await main();
} catch (err) {
  console.error(errorMessage(err));
  process.exitCode = 1;
}
