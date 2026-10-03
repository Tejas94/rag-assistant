/** One page of documentation, cleaned and ready to chunk. */
export interface Doc {
  /** Path relative to the source's docs folder, e.g. "01-app/03-api-reference/04-functions/revalidatePath.mdx". */
  path: string;
  /** Public page URL without an anchor, e.g. "https://nextjs.org/docs/app/api-reference/functions/revalidatePath". */
  url: string;
  title: string;
  description: string;
  /** Markdown body: frontmatter, MDX imports and JSX tags removed, code blocks intact. */
  content: string;
}

export interface Chunk {
  docPath: string;
  docTitle: string;
  /** The page URL (Doc.url). Add `#${anchor}` to link to the section. */
  url: string;
  /** Position within the document, starting at 0. */
  index: number;
  /** Heading path inside the page, e.g. ["Parameters", "type"]. Empty for text before the first heading. */
  headings: string[];
  /** GitHub-style slug of the last heading in `headings`, e.g. "parameters". "" when `headings` is empty. */
  anchor: string;
  content: string;
}

export interface RetrievedChunk extends Chunk {
  /** Database id; stable until the next ingest. */
  id: number;
  /** Higher is better. What it means depends on the stage: cosine similarity, ts_rank, RRF or reranker score. */
  score: number;
}

export const RETRIEVAL_MODES = ["vector", "keyword", "hybrid", "hybrid_rerank"] as const;
export type RetrievalMode = (typeof RETRIEVAL_MODES)[number];

/** One turn of an earlier conversation, sent by the UI for follow-up questions. */
export interface Turn {
  role: "user" | "assistant";
  content: string;
}
