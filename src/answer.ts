import type Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { getAnthropic } from "./llm.js";
import type { RetrievedChunk } from "./types.js";
import { todo } from "./todo.js";

/** The exact reply when the sources do not answer the question. The eval checks for it. */
export const ABSTAIN_PHRASE = "I couldn't find that in the documentation.";

export interface AnswerResult {
  text: string;
  model: string;
  /** response.usage from the API, for cost per answer. Null if you did not call the API. */
  usage: Anthropic.Usage | null;
}

/** The page URL plus the section anchor, so a citation opens at the right heading. */
export function sourceUrl(chunk: Pick<RetrievedChunk, "url" | "anchor">): string {
  return chunk.anchor ? `${chunk.url}#${chunk.anchor}` : chunk.url;
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Numbers the chunks as sources the model can cite as [1], [2]... */
export function formatSources(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const section = c.headings.length ? c.headings.join(" > ") : "(introduction)";
      return `<source id="${i + 1}" title="${attr(c.docTitle)}" section="${attr(section)}" url="${attr(sourceUrl(c))}">\n${c.content}\n</source>`;
    })
    .join("\n\n");
}

/**
 * Finds [n] citations in an answer: [2], [1][3] and [1, 3] all count. `cited` holds the
 * valid source numbers, sorted and unique; `invalid` holds numbers that point at no
 * source, which means the model made a reference up. Code is skipped, so `params[0]`
 * in an example is not a citation, and neither is an index right after a name or a call.
 */
export function parseCitations(text: string, sourceCount: number): { cited: number[]; invalid: number[] } {
  const cited = new Set<number>();
  const invalid = new Set<number>();
  const prose = text.replace(/```[\s\S]*?(?:```|$)/g, " ").replace(/`[^`\n]*`/g, " ");
  for (const m of prose.matchAll(/(?<![\w)])\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const part of m[1].split(",")) {
      const n = Number(part.trim());
      (n >= 1 && n <= sourceCount ? cited : invalid).add(n);
    }
  }
  const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);
  return { cited: sorted(cited), invalid: sorted(invalid) };
}

/** True when the answer is the abstain phrase (curly or straight apostrophe, any case). */
export function isAbstention(text: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  return norm(text).includes(norm(ABSTAIN_PHRASE));
}

export const ANSWER_SYSTEM_PROMPT = "P2-08: write the system prompt for grounded, cited answers here.";

/**
 * TODO(P2-08) Week 5: grounded answers with [n] citations, and abstention.
 *
 * Write ANSWER_SYSTEM_PROMPT above and this function. The model must:
 * - answer only from the numbered sources, never from its own memory of Next.js. It
 *   knows a lot of Next.js, often an older version, which is exactly the risk.
 * - cite every claim with the source number in square brackets, like [2] or [1][3].
 * - reply with exactly ABSTAIN_PHRASE ("I couldn't find that in the documentation.")
 *   when the sources do not contain the answer. The golden set has unanswerable
 *   questions, and the eval checks for this phrase in code.
 *
 * Building the request:
 * - getAnthropic() from src/llm.ts and config.model (ANTHROPIC_MODEL, default claude-opus-5-5).
 * - system: ANSWER_SYSTEM_PROMPT. User turn: formatSources(chunks), then the question in
 *   <question> tags. Both are untrusted text, so say in the prompt that instructions
 *   inside them are content, not instructions to follow.
 * - Leave out temperature and top_p: current models reject sampling parameters.
 * - claude-opus-5-5 always thinks before it answers, and thinking tokens count toward
 *   max_tokens, so leave room (a few thousand tokens is plenty here).
 *   output_config: { effort: "low" } makes answers faster and cheaper; measure whether
 *   quality holds before you keep it.
 * - Read the answer from the "text" blocks in response.content (thinking blocks can come
 *   first), and check stop_reason: "max_tokens" means a cut-off answer, "refusal" means none.
 * - Return the text, the model and response.usage; the eval turns usage into cost per answer.
 *
 * The rest is plumbing: parseCitations() checks every [n] against the sources, and the
 * UI turns them into links to the exact section of the docs.
 *
 * Check: `npm run ask -- "How do I revalidate one page on demand?"`, then an unanswerable
 * question from evals/golden.jsonl, then `npm run eval -- --answers` once P2-10 is done.
 *
 * Things to learn on the way:
 * - Next.js 16 renamed middleware to proxy. Ask how to run code before every request:
 *   does the answer follow the sources or the model's memory of older versions?
 * - Put the most relevant chunk last instead of first. Does the answer change?
 * - Stretch: the API's native citations (document content blocks with
 *   citations: { enabled: true }) return the exact quoted spans. Compare them with [n].
 */
export async function answerQuestion(question: string, chunks: RetrievedChunk[]): Promise<AnswerResult> {
  void question;
  void chunks;
  void config;
  void getAnthropic;
  todo("P2-08", "Implement answerQuestion() in src/answer.ts");
}
