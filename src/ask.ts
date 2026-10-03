import { answerQuestion, isAbstention, parseCitations, sourceUrl } from "./answer.js";
import { costOf, formatUsd } from "./cost.js";
import { closeDb, describeIndexProblem, friendlyDbError, indexInfo } from "./db.js";
import { getEmbedder } from "./embed.js";
import { retrieve } from "./retrieve.js";
import { errorMessage, todoIdOf } from "./todo.js";
import { RETRIEVAL_MODES, type RetrievalMode } from "./types.js";

const USAGE = `Usage: npm run ask -- "your question" [${RETRIEVAL_MODES.join("|")}]`;

async function main() {
  const [question, modeArg = "hybrid"] = process.argv.slice(2);
  if (!question) throw new Error(USAGE);
  if (!(RETRIEVAL_MODES as readonly string[]).includes(modeArg)) throw new Error(`Unknown mode "${modeArg}". ${USAGE}`);
  const mode = modeArg as RetrievalMode;

  const problem = describeIndexProblem(await indexInfo(), getEmbedder().name);
  if (problem) throw new Error(problem);

  const result = await retrieve(question, mode);
  console.log(`\nRetrieval (${mode}, ${result.ms} ms):`);
  for (const stage of result.stages.filter((s) => s.name !== "final")) {
    console.log(`  ${stage.name}: ${stage.total} hits in ${stage.ms} ms${stage.note ? ` (${stage.note})` : ""}`);
  }
  console.log("\nSources:");
  result.chunks.forEach((c, i) => {
    const where = [c.docTitle, ...c.headings].join(" > ");
    console.log(`  [${i + 1}] ${where}  (score ${c.score.toFixed(4)})\n      ${sourceUrl(c)}`);
  });

  const answer = await answerQuestion(question, result.chunks);
  const { cited, invalid } = parseCitations(answer.text, result.chunks.length);
  console.log(`\n${answer.text}\n`);
  console.log(`Cited: ${cited.map((n) => `[${n}]`).join(" ") || "none"}${isAbstention(answer.text) ? " (abstained)" : ""}`);
  if (invalid.length) console.log(`Warning: the answer cites sources that do not exist: ${invalid.map((n) => `[${n}]`).join(" ")}`);
  if (answer.usage) {
    const cost = costOf(answer.model, answer.usage);
    console.log(`${answer.model}: ${answer.usage.input_tokens} in, ${answer.usage.output_tokens} out, ${formatUsd(cost)}`);
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
