import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { answerQuestion, formatSources, isAbstention, parseCitations } from "../src/answer.js";
import { config } from "../src/config.js";
import { costOf } from "../src/cost.js";
import { closeDb, describeIndexProblem, friendlyDbError, indexedDocPaths, indexInfo, missingRelevant } from "../src/db.js";
import { getEmbedder } from "../src/embed.js";
import { getReranker } from "../src/rerank.js";
import { DEFAULT_CANDIDATES, DEFAULT_K, retrieve } from "../src/retrieve.js";
import { rewriteQuery } from "../src/rewrite.js";
import { getSource } from "../src/sources.js";
import { errorMessage, todoIdOf } from "../src/todo.js";
import { RETRIEVAL_MODES, type RetrievalMode } from "../src/types.js";
import { GOLDEN_FILE, GOLDEN_TARGET, isAnswerable, loadGolden, type GoldenItem } from "./golden.js";
import { judge } from "./judge.js";
import { ANSWERS_FILE, type LabeledAnswer } from "./labels.js";
import { renderReport, scoreMode, type AnswerRow, type AnswersRun, type ModeRun, type ModeScore } from "./report.js";

/**
 * npm run eval                                 retrieval metrics for every mode (no LLM calls;
 *                                              with EMBEDDER=voyage it embeds the questions)
 * npm run eval -- --answers                    also answer and judge every question (costs money)
 * npm run eval -- --answers --mode hybrid_rerank --limit 5
 *
 * Writes evals/report.md (commit it with the change that produced it) and
 * evals/results-<time>.json with every retrieved page and answer (gitignored).
 * A mode whose TODO is still open is reported as "not implemented", not as a crash.
 */
const { values: args } = parseArgs({
  options: {
    answers: { type: "boolean", default: false },
    mode: { type: "string", default: "hybrid" },
    limit: { type: "string" },
    k: { type: "string" },
  },
});

function gitCommit(): string {
  try {
    const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return dirty ? `${sha} with uncommitted changes` : sha;
  } catch {
    return "unknown";
  }
}

/** Follow-up questions are rewritten first, exactly as POST /ask does. */
const searchText = (item: GoldenItem) => rewriteQuery(item.question, item.history ?? []);

async function runRetrieval(golden: GoldenItem[], k: number): Promise<ModeRun[]> {
  const reranker = getReranker();
  const runs: ModeRun[] = [];
  for (const mode of RETRIEVAL_MODES) {
    const run: ModeRun = { mode, runs: [] };
    for (const item of golden) {
      try {
        const result = await retrieve(await searchText(item), mode, { k, reranker });
        run.runs.push({
          id: item.id,
          docs: result.chunks.map((c) => c.docPath),
          ms: result.ms,
          fallback: result.stages.some((s) => s.fallback),
        });
      } catch (err) {
        const todo = todoIdOf(err);
        if (todo) {
          run.notImplemented = todo;
          run.runs = [];
          break;
        }
        run.runs.push({ id: item.id, docs: [], ms: 0, error: friendlyDbError(err) });
      }
    }
    const status = run.notImplemented ? `not implemented (${run.notImplemented})` : `${run.runs.length} questions`;
    console.error(`[${mode}] ${status}`);
    runs.push(run);
  }
  return runs;
}

async function runAnswers(golden: GoldenItem[], mode: RetrievalMode, k: number): Promise<{ run: AnswersRun; labeled: LabeledAnswer[] }> {
  const run: AnswersRun = { mode, model: config.model, judgeModel: config.judgeModel, rows: [] };
  const labeled: LabeledAnswer[] = [];
  const reranker = getReranker();
  for (const item of golden) {
    const answerable = isAnswerable(item);
    let row: AnswerRow;
    let sources = "";
    try {
      const question = await searchText(item);
      const retrieval = await retrieve(question, mode, { k, reranker });
      sources = formatSources(retrieval.chunks);
      const answer = await answerQuestion(question, retrieval.chunks);
      const { cited, invalid } = parseCitations(answer.text, retrieval.chunks.length);
      row = {
        id: item.id,
        question: item.question,
        answerable,
        answer: answer.text,
        abstainedByPhrase: isAbstention(answer.text),
        cited,
        invalidCitations: invalid,
        costUsd: costOf(answer.model, answer.usage),
      };
    } catch (err) {
      const todo = todoIdOf(err);
      if (todo) {
        run.notImplemented = todo;
        break;
      }
      run.rows.push({ id: item.id, question: item.question, answerable, answer: "", abstainedByPhrase: false, cited: [], invalidCitations: [], costUsd: null, error: errorMessage(err) });
      continue;
    }

    if (!run.judgeNotImplemented) {
      try {
        const judged = await judge({ question: item.question, reference: item.answer, answerable, sources, answer: row.answer });
        row.verdict = judged.verdict;
        row.judgeCostUsd = costOf(judged.model, judged.usage);
      } catch (err) {
        const todo = todoIdOf(err);
        if (todo) run.judgeNotImplemented = todo;
        else row.error = `judge: ${errorMessage(err)}`;
      }
    }
    run.rows.push(row);
    labeled.push({ id: item.id, question: item.question, reference: item.answer, answerable, sources, answer: row.answer, label: null });
    console.error(`[answers] ${item.id} ${row.verdict ? `correct=${row.verdict.correct} faithful=${row.verdict.faithful}` : "answered"}`);
  }
  return { run, labeled };
}

async function main() {
  const source = getSource();
  const k = Number(args.k ?? DEFAULT_K);
  let golden = await loadGolden();
  if (args.limit) golden = golden.slice(0, Number(args.limit));
  const answerMode = args.mode as RetrievalMode;
  if (!(RETRIEVAL_MODES as readonly string[]).includes(answerMode)) {
    throw new Error(`--mode must be one of ${RETRIEVAL_MODES.join(", ")}`);
  }

  const info = await indexInfo();
  const embedder = getEmbedder();
  const problem = describeIndexProblem(info, embedder.name);
  if (problem) throw new Error(problem);
  const missing = missingRelevant(golden, await indexedDocPaths());
  for (const m of missing) console.error(`Not in the index: ${m}. Check the path in ${GOLDEN_FILE}.`);

  const modeRuns = await runRetrieval(golden, k);
  let scores: ModeScore[] = [];
  let metricsNotImplemented: string | undefined;
  try {
    scores = modeRuns.map((run) => scoreMode(run, golden, k));
  } catch (err) {
    metricsNotImplemented = todoIdOf(err) ?? undefined;
    if (!metricsNotImplemented) throw err;
  }

  const answers = args.answers ? await runAnswers(golden, answerMode, k) : undefined;

  const when = new Date();
  const report = renderReport({
    when,
    commit: gitCommit(),
    sourceLabel: source.label,
    pages: info.docs,
    chunks: info.chunks,
    embedder: embedder.name,
    reranker: getReranker().name,
    k,
    candidates: DEFAULT_CANDIDATES,
    golden,
    goldenTarget: GOLDEN_TARGET,
    scores,
    metricsNotImplemented,
    missingRelevant: missing,
    answers: answers?.run,
  });
  await writeFile("evals/report.md", report);
  const stamp = when.toISOString().replace(/[:.]/g, "-");
  const resultsFile = `evals/results-${stamp}.json`;
  await writeFile(resultsFile, JSON.stringify({ when, config: { ...config, voyageApiKey: undefined, databaseUrl: undefined }, k, modeRuns, scores, answers: answers?.run }, null, 2));
  if (answers?.labeled.length) {
    await writeFile(ANSWERS_FILE, answers.labeled.map((x) => JSON.stringify(x)).join("\n") + "\n");
  }

  console.log(report);
  console.error(`Wrote evals/report.md and ${resultsFile}${answers?.labeled.length ? ` and ${ANSWERS_FILE}` : ""}.`);
  if (golden.length < GOLDEN_TARGET && !args.limit) {
    console.error(`The golden set has ${golden.length} of ${GOLDEN_TARGET} questions (P2-09).`);
  }
}

try {
  await main();
} catch (err) {
  console.error(todoIdOf(err) ? errorMessage(err) : friendlyDbError(err));
  process.exitCode = 1;
} finally {
  await closeDb();
}
