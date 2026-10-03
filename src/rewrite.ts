import type { Turn } from "./types.js";

/**
 * Turns a follow-up question into a standalone one before retrieval, using the
 * conversation so far: after "How do I use generateStaticParams?", the follow-up
 * "and what if a param is missing?" should search for "generateStaticParams with a
 * param that was not generated (dynamicParams)".
 *
 * Week 5 stretch (docs/LEARNING_PATH.md). For now it returns the question unchanged, so
 * follow-ups retrieve poorly; the golden set's follow_up questions show by how much.
 * A small, fast model is the usual choice here, because it adds a call before every search.
 */
export async function rewriteQuery(question: string, history: Turn[]): Promise<string> {
  void history;
  return question;
}
