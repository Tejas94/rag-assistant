export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://rag:rag@localhost:5433/rag",
  model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  judgeModel: process.env.JUDGE_MODEL ?? "claude-haiku-4-5",
  embedder: (process.env.EMBEDDER ?? "fake") as "fake" | "voyage",
  voyageApiKey: process.env.VOYAGE_API_KEY ?? "",
  corpusDir: process.env.CORPUS_DIR ?? "corpus",
};
