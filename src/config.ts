/** A positive integer from the environment, or undefined when unset. */
function positiveInt(name: string, value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name}=${value} is not valid. Use a whole number.`);
  return n;
}

function oneOf<T extends string>(name: string, value: string | undefined, allowed: readonly T[], fallback: T): T {
  if (value === undefined || value === "") return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${name}=${value} is not valid. Use one of: ${allowed.join(", ")}.`);
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://rag:rag@localhost:5433/rag",
  /** Answer model. */
  model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  /** LLM-as-judge model for `npm run eval -- --answers`. */
  judgeModel: process.env.JUDGE_MODEL || "claude-haiku-4-5",
  embedder: oneOf("EMBEDDER", process.env.EMBEDDER, ["fake", "voyage"] as const, "fake"),
  reranker: oneOf("RERANKER", process.env.RERANKER, ["fake", "voyage"] as const, "fake"),
  voyageApiKey: process.env.VOYAGE_API_KEY ?? "",
  voyageEmbedModel: process.env.VOYAGE_EMBED_MODEL || "voyage-3.5",
  voyageRerankModel: process.env.VOYAGE_RERANK_MODEL || "rerank-2.5",
  /** Chunking experiments: override DEFAULT_CHUNK_OPTIONS in src/chunk.ts at ingest time. */
  chunkMaxChars: positiveInt("CHUNK_MAX_CHARS", process.env.CHUNK_MAX_CHARS),
  chunkOverlap: positiveInt("CHUNK_OVERLAP", process.env.CHUNK_OVERLAP),
  /** Which preset in src/sources.ts to fetch, ingest and link to. */
  docsSource: process.env.DOCS_SOURCE || "nextjs",
  /** Fetched docs live in <corpusRoot>/<source name>. Gitignored. */
  corpusRoot: process.env.CORPUS_DIR || "corpus",
  port: Number(process.env.PORT ?? 3000),
};
