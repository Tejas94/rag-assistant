import { readFile } from "node:fs/promises";
import { z } from "zod";

export const GOLDEN_FILE = "evals/golden.jsonl";

export const QUESTION_TYPES = ["lookup", "paraphrase", "multi_doc", "identifier", "follow_up", "unanswerable"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** A docs path relative to the source's docs folder: no leading slash, no "..", ends in .md or .mdx. */
export const DOC_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[\w.@-]+(?:\/[\w.@-]+)*\.mdx?$/;

export const GoldenItemSchema = z
  .object({
    id: z.string().regex(/^q\d{2,3}$/, "ids look like q01"),
    question: z.string().trim().min(1),
    /** Reference answer in your own words. The judge compares answers with it. */
    answer: z.string().trim().min(1),
    /** Pages that contain the answer. Empty only for unanswerable questions. */
    relevant: z.array(z.string().regex(DOC_PATH, "relevant paths are relative to the docs folder, like 01-app/.../page.mdx")),
    type: z.enum(QUESTION_TYPES),
    /** Earlier turns, for follow_up questions only. */
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }).strict())
      .optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.type === "unanswerable" && item.relevant.length > 0) {
      ctx.addIssue({ code: "custom", message: "an unanswerable question has no relevant pages", path: ["relevant"] });
    }
    if (item.type !== "unanswerable" && item.relevant.length === 0) {
      ctx.addIssue({ code: "custom", message: "list at least one page that answers it", path: ["relevant"] });
    }
    if ((item.type === "follow_up") !== Boolean(item.history?.length)) {
      ctx.addIssue({ code: "custom", message: "follow_up questions, and only they, carry a history", path: ["history"] });
    }
  });

export type GoldenItem = z.infer<typeof GoldenItemSchema>;

export const isAnswerable = (item: GoldenItem) => item.relevant.length > 0;

/** Parses JSONL, validating every line. Errors name the line, so a typo is quick to find. */
export function parseGolden(text: string, file = GOLDEN_FILE): GoldenItem[] {
  const items: GoldenItem[] = [];
  const problems: string[] = [];
  text.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      problems.push(`${file}:${i + 1}: not valid JSON`);
      return;
    }
    const parsed = GoldenItemSchema.safeParse(json);
    if (!parsed.success) {
      problems.push(...parsed.error.issues.map((issue) => `${file}:${i + 1}: ${issue.path.join(".") || "line"}: ${issue.message}`));
      return;
    }
    items.push(parsed.data);
  });
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) problems.push(`${file}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
  if (problems.length) throw new Error(`Invalid golden set:\n${problems.join("\n")}`);
  return items;
}

export async function loadGolden(file = GOLDEN_FILE): Promise<GoldenItem[]> {
  return parseGolden(await readFile(file, "utf8"), file);
}

/**
 * TODO(P2-09) Week 6: grow evals/golden.jsonl to 50 questions.
 *
 * The starter set has 15 questions about the pinned Next.js docs. Every number in the
 * README comes from this file, so it is the most important thing you write this week.
 * - Mix the types (the eval breaks scores down by type): about 40% lookup, 15%
 *   paraphrase (real user wording, typos, vague terms), 20% multi_doc (needs two pages),
 *   10% identifier (exact API names like revalidateTag or cacheLife), 10% unanswerable
 *   (plausible questions the docs do not cover), and a few follow_up questions with a
 *   history, for the query-rewriting stretch.
 * - Write the question before you look at the page. Questions written by copying a
 *   heading are easy for every retriever and tell you nothing.
 * - For each one, open the page and confirm the answer is there before you add its
 *   path to `relevant`. List the pages a complete answer needs. recall@k counts every
 *   listed page, so if five guides repeat one fact, list the one or two that own it.
 * - Good sources of real questions: GitHub Discussions on vercel/next.js, Stack Overflow,
 *   your own past searches.
 * - Keep 10 to 15 questions aside as a held-out set you only run at the end of week 6.
 *   If you tune on all 50, the score flatters you.
 *
 * `npm run eval` prints how many questions you have against this target. Switching
 * DOCS_SOURCE means writing a new golden set for that source.
 *
 * Things to learn on the way:
 * - Which question type fails most, and is it a retrieval or an answer failure?
 * - Do two people (you, and someone you ask) agree on which pages are relevant?
 */
export const GOLDEN_TARGET = 50;
