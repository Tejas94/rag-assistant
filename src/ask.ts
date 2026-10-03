import { answerQuestion } from "./answer.js";
import { pool } from "./db.js";
import { retrieve } from "./retrieve.js";
import type { RetrievalMode } from "./types.js";

// Usage: npm run ask -- "How long are backups kept on Team?" [vector|keyword|hybrid]
async function main() {
  const [question, mode = "hybrid"] = process.argv.slice(2);
  if (!question) throw new Error('Usage: npm run ask -- "your question" [vector|keyword|hybrid]');

  const chunks = await retrieve(question, mode as RetrievalMode, 5);
  console.log("Retrieved:");
  chunks.forEach((c, i) => console.log(`  [${i + 1}] ${c.docPath} > ${c.heading} (score ${c.score.toFixed(3)})`));

  const answer = await answerQuestion(question, chunks);
  console.log(`\n${answer.text}\n`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await pool.end();
  process.exit(1);
});
