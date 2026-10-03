import type { Chunk, Doc } from "./types.js";
import { createSlugger, parseHeading } from "./slug.js";
import { todo } from "./todo.js";

export interface ChunkOptions {
  /** Upper bound on characters per chunk's content (roughly 4 characters per token in English). */
  maxChars: number;
  /** Characters of prose repeated from the end of one chunk at the start of the next, when a section is split. */
  overlap: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChars: 2000, overlap: 200 };

/**
 * TODO(P2-01) Week 4: split a page into chunks that respect headings and code blocks.
 *
 * Developer docs are half code. A chunk that ends in the middle of a code block, or
 * that has lost the heading telling you which API it is about, retrieves badly and
 * reads badly when the model cites it. tests/specs/chunk.test.ts pins the rules down:
 *
 * 1. Sections. Every markdown heading (# to ######) starts a new section, and text
 *    before the first heading is a section too. A chunk never spans two sections.
 *    - `headings` is the path of headings above the text: "### Options" under
 *      "## Usage" gives ["Usage", "Options"], and the next "## Returns" gives ["Returns"].
 *      parseHeading() in src/slug.ts turns a line into { level, text } or null.
 *    - `anchor` is the slug of the last heading in the path. Use ONE createSlugger()
 *      per document, so a second "Example" heading gets "example-1", as on the site.
 *      Text before the first heading has headings [] and anchor "".
 *    - The heading line itself is not part of `content`.
 *    - Lines inside fenced code blocks are never headings: "# install deps" in a
 *      bash block is a comment.
 * 2. A section with no text (two headings in a row) gives no chunk, but its heading
 *    still belongs to the path of the sections below it.
 * 3. A section of at most maxChars characters (trimmed) is one chunk.
 * 4. A longer section is split into blocks: paragraphs (separated by blank lines) and
 *    whole fenced code blocks (a blank line inside code does not end the block). Pack
 *    blocks greedily into chunks of at most maxChars, joined by a blank line.
 *    - A paragraph longer than maxChars is split at sentence ends, or else at spaces.
 *    - A code block longer than maxChars is split on line boundaries. Each piece gets
 *      the original opening fence line (language and filename included) and a closing
 *      fence, so every chunk's fences stay balanced.
 * 5. Overlap. Each later chunk of a split section starts with the end of the previous
 *    chunk's prose: its last sentences or words, at most `overlap` characters, cut at
 *    a boundary. Overlap is for prose only; if the previous chunk ended with code,
 *    start clean rather than leave half a fence behind. The overlap counts toward
 *    maxChars: when the overlap and the next block do not both fit, drop the overlap.
 * 6. Number chunks 0, 1, 2... per document, and copy docPath, docTitle and url from the doc.
 *
 * Hints:
 * - Walk the lines once and track whether you are inside a fence. A fence opens with
 *   ``` or ~~~ (possibly indented) and closes with the same character, at least as many
 *   times. Some pages use ```` fences around examples that contain ``` lines.
 *   splitFences() in src/clean.ts follows these rules for a whole page.
 * - Get the sections right first (the first describe block), then splitting, then overlap.
 *
 * Things to learn on the way:
 * - Read real chunks after `npm run ingest`, in psql:
 *   select headings, length(content), left(content, 80) from chunks order by random() limit 20;
 *   Would each one make sense to you without the rest of the page?
 * - Try maxChars 800, 2000 and 4000 (CHUNK_MAX_CHARS=800 npm run ingest) and compare
 *   recall@5 in `npm run eval`. Which question types move, and why?
 * - embeddingText() below puts the title and heading path in front of the content.
 *   Remove it, re-ingest and measure. Is the change what you expected?
 */
export function chunkDoc(doc: Doc, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): Chunk[] {
  void doc;
  void opts;
  void createSlugger;
  void parseHeading;
  todo("P2-01", "Implement chunkDoc() in src/chunk.ts");
}

/** The text that gets embedded and full-text indexed: page title and heading path, then the content. */
export function embeddingText(chunk: Chunk): string {
  return `${[chunk.docTitle, ...chunk.headings].join(" > ")}\n\n${chunk.content}`;
}
