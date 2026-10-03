import { serve } from "@hono/node-server";
import { answerQuestion } from "./answer.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { describeIndexProblem, friendlyDbError, indexInfo } from "./db.js";
import { getEmbedder } from "./embed.js";
import { retrieve } from "./retrieve.js";
import { rewriteQuery } from "./rewrite.js";
import { getSource } from "./sources.js";

const source = getSource();
const app = createApp({
  retrieve,
  answer: answerQuestion,
  rewrite: rewriteQuery,
  sourceLabel: source.label,
  examples: source.examples,
});

serve({ fetch: app.fetch, port: config.port });
console.log(`Developer Docs Assistant on http://localhost:${config.port} (${source.label})`);

// Warn early, but keep serving: the page and its error messages still work without an index.
indexInfo()
  .then((info) => {
    const problem = describeIndexProblem(info, getEmbedder().name);
    console.log(problem ? `Warning: ${problem}` : `Index: ${info.docs} pages, ${info.chunks} chunks, embedder ${info.embedModels[0]}.`);
  })
  .catch((err) => console.log(`Warning: ${friendlyDbError(err)}`));
