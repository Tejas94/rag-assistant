import type { Chunk, SourceDoc } from "./types.js";
import { todo } from "./todo.js";

export interface ChunkOptions {
  /** Upper bound on characters per chunk (roughly 4 characters per token in English). */
  maxChars: number;
  /** Characters repeated from the end of one chunk at the start of the next, when a section is split. */
  overlap: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChars: 1200, overlap: 150 };

/**
 * TODO(P2-01) Week 4: split a markdown document into chunks.
 *
 * Strategy (tests/specs/chunk.test.ts pins the behaviour down):
 * 1. Split on markdown headings (#, ##, ###). Each chunk's `heading` is the heading
 *    path, e.g. "Billing and plans > Refunds", so a chunk keeps its context.
 * 2. A section longer than maxChars is split further into pieces of at most maxChars,
 *    each piece starting with the last `overlap` characters of the previous one.
 *    Prefer splitting at a paragraph or sentence boundary when one is close.
 * 3. Skip sections with no body text. Number chunks 0, 1, 2... per document.
 *
 * Then experiment: try maxChars 300 vs 1200 vs whole-section and compare
 * recall@5 in `npm run eval`. Write down what you see; it is a great interview story.
 */
export function chunkMarkdown(doc: SourceDoc, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): Chunk[] {
  void doc;
  void opts;
  todo("P2-01", "Implement chunkMarkdown() in src/chunk.ts");
}

/** The text that gets embedded. Including the heading path usually helps retrieval. */
export function embeddingText(chunk: Chunk): string {
  return `${chunk.heading}\n\n${chunk.content}`;
}
