import { chunkMarkdown, embeddingText } from "./chunk.js";
import { config } from "./config.js";
import { loadCorpus } from "./corpus.js";
import { clearChunks, insertChunks, pool } from "./db.js";
import { getEmbedder } from "./embed.js";

/** Rebuilds the index from scratch: load docs, chunk, embed, store. */
async function main() {
  const docs = await loadCorpus(config.corpusDir);
  const chunks = docs.flatMap((d) => chunkMarkdown(d));
  const embedder = getEmbedder();
  console.log(`${docs.length} docs -> ${chunks.length} chunks, embedding with ${embedder.name}`);

  const embeddings = await embedder.embed(chunks.map(embeddingText), "document");
  await clearChunks();
  await insertChunks(chunks, embeddings);
  console.log("Index rebuilt.");
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
