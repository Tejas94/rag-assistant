import { createHash } from "node:crypto";
import { chunkDoc, DEFAULT_CHUNK_OPTIONS, embeddingText, type ChunkOptions } from "./chunk.js";
import { config } from "./config.js";
import { loadDocs } from "./corpus.js";
import { closeDb, friendlyDbError, replaceIndex } from "./db.js";
import { EMBEDDING_DIMS, getEmbedder } from "./embed.js";
import { docsPath, getSource } from "./sources.js";
import { errorMessage, todoIdOf } from "./todo.js";

/** npm run ingest: load the fetched docs, chunk, embed, and replace the index. Safe to re-run. */
async function main() {
  const started = performance.now();
  const secs = (since: number) => `${((performance.now() - since) / 1000).toFixed(1)}s`;
  const source = getSource();

  let t = performance.now();
  const { docs, files, skipped, empty } = await loadDocs(source);
  console.log(
    `Loaded ${docs.length} pages from ${docsPath(source)} in ${secs(t)} ` +
      `(${files} files; ${skipped} skipped as partials or generated copies; ${empty} empty).`,
  );

  t = performance.now();
  const opts: ChunkOptions = {
    maxChars: config.chunkMaxChars ?? DEFAULT_CHUNK_OPTIONS.maxChars,
    overlap: config.chunkOverlap ?? DEFAULT_CHUNK_OPTIONS.overlap,
  };
  const chunks = docs.flatMap((d) => chunkDoc(d, opts));
  const sizes = chunks.map((c) => c.content.length);
  const avg = Math.round(sizes.reduce((a, b) => a + b, 0) / (sizes.length || 1));
  console.log(
    `Chunked into ${chunks.length} chunks in ${secs(t)} with maxChars ${opts.maxChars}, overlap ${opts.overlap} ` +
      `(average ${avg} characters, largest ${Math.max(0, ...sizes)}).`,
  );
  if (chunks.length === 0) throw new Error("No chunks to index. Does chunkDoc() return anything?");

  t = performance.now();
  const embedder = getEmbedder();
  const texts = chunks.map(embeddingText);
  console.log(`Embedding ${texts.length} chunks with ${embedder.name} ...`);
  const embeddings = await embedder.embed(texts, "document");
  if (embeddings.length !== chunks.length) {
    throw new Error(`The embedder returned ${embeddings.length} vectors for ${chunks.length} chunks.`);
  }
  const wrong = embeddings.findIndex((e) => e.length !== EMBEDDING_DIMS);
  if (wrong !== -1) {
    throw new Error(
      `Vector ${wrong} has ${embeddings[wrong].length} dimensions, but db/schema.sql stores vector(${EMBEDDING_DIMS}).`,
    );
  }
  console.log(`Embedded in ${secs(t)}.`);

  t = performance.now();
  await replaceIndex(
    chunks.map((chunk, i) => ({
      chunk,
      text: texts[i],
      embedding: embeddings[i],
      contentHash: createHash("sha256").update(texts[i]).digest("hex"),
    })),
    embedder.name,
  );
  console.log(`Stored in ${secs(t)}. Index rebuilt: ${docs.length} pages, ${chunks.length} chunks, ${secs(started)} in total.`);
}

try {
  await main();
} catch (err) {
  console.error(todoIdOf(err) ? errorMessage(err) : friendlyDbError(err));
  process.exitCode = 1;
} finally {
  await closeDb();
}
