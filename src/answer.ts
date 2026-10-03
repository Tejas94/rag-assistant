import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { RetrievedChunk } from "./types.js";
import { todo } from "./todo.js";

export const anthropic = new Anthropic();

export interface Answer {
  text: string;
  /** The chunks the answer cites, in citation-number order. */
  citations: RetrievedChunk[];
  usage?: Anthropic.Usage;
}

/** Formats retrieved chunks as numbered sources the model can cite as [1], [2]... */
export function formatSources(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `<source id="${i + 1}" doc="${c.docPath}" section="${c.heading}">\n${c.content}\n</source>`)
    .join("\n\n");
}

/** Pulls [n] markers out of an answer and maps them back to chunks. */
export function parseCitations(text: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\[(\d+)\]/g)) nums.add(Number(m[1]));
  return [...nums]
    .sort((a, b) => a - b)
    .map((n) => chunks[n - 1])
    .filter((c): c is RetrievedChunk => Boolean(c));
}

export const ANSWER_SYSTEM_PROMPT = `TODO(P2-06): write me`;

/**
 * TODO(P2-06) Week 5: answer a question from retrieved chunks, with citations.
 *
 * - Put formatSources(chunks) and the question in the user turn.
 * - In ANSWER_SYSTEM_PROMPT: answer only from the sources, cite every claim as [n],
 *   and say exactly "I don't know based on the documents." when the sources do not
 *   contain the answer. (The golden set includes unanswerable questions to check this.)
 * - Return parseCitations(text, chunks) as `citations`.
 *
 * Stretch: the API has a native citations feature (document content blocks with
 * citations enabled). Try it and compare with the [n] approach.
 */
export async function answerQuestion(question: string, chunks: RetrievedChunk[]): Promise<Answer> {
  void question;
  void chunks;
  void config;
  todo("P2-06", "Implement answerQuestion() in src/answer.ts");
}
