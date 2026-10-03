export interface SourceDoc {
  path: string; // relative to the corpus dir, e.g. "billing.md"
  text: string;
}

export interface Chunk {
  docPath: string;
  heading: string; // heading path, e.g. "Billing and plans > Refunds"
  content: string;
  index: number; // position within the document, starting at 0
}

export interface RetrievedChunk extends Chunk {
  id: number;
  score: number; // higher is better; meaning depends on the retriever
}

export type RetrievalMode = "vector" | "keyword" | "hybrid";
