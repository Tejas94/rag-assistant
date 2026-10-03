import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { Verdict } from "./judge.js";

export const LABELS_FILE = "evals/labels.jsonl";
/** Written by `npm run eval -- --answers`; copy lines from here into labels.jsonl. Gitignored. */
export const ANSWERS_FILE = "evals/answers-latest.jsonl";

export const LabelSchema = z.object({ correct: z.boolean(), faithful: z.boolean(), abstained: z.boolean() }).strict();
export type Label = z.infer<typeof LabelSchema>;

/** One answer exactly as the answer model wrote it, with your label once you add one. */
export const LabeledAnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  reference: z.string(),
  answerable: z.boolean(),
  sources: z.string(),
  answer: z.string(),
  label: LabelSchema.nullable(),
});
export type LabeledAnswer = z.infer<typeof LabeledAnswerSchema>;

export function parseLabeledAnswers(text: string, file = LABELS_FILE): LabeledAnswer[] {
  return text
    .split("\n")
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => line.trim())
    .map(({ line, i }) => {
      let json: unknown;
      try {
        json = JSON.parse(line);
      } catch {
        throw new Error(`${file}:${i + 1}: not valid JSON`);
      }
      const parsed = LabeledAnswerSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`${file}:${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
      }
      return parsed.data;
    });
}

export async function loadLabeledAnswers(file = LABELS_FILE): Promise<LabeledAnswer[]> {
  return parseLabeledAnswers(await readFile(file, "utf8"), file);
}

export const FIELDS = ["correct", "faithful", "abstained"] as const;

export interface Agreement {
  n: number;
  /** Answers where the judge matches you on every field. */
  all: number;
  byField: Record<(typeof FIELDS)[number], number>;
}

/** How often the judge's verdict matches your label, overall and per field. */
export function agreement(pairs: { label: Label; verdict: Pick<Verdict, "correct" | "faithful" | "abstained"> }[]): Agreement {
  const result: Agreement = { n: pairs.length, all: 0, byField: { correct: 0, faithful: 0, abstained: 0 } };
  for (const { label, verdict } of pairs) {
    let allMatch = true;
    for (const field of FIELDS) {
      if (label[field] === verdict[field]) result.byField[field]++;
      else allMatch = false;
    }
    if (allMatch) result.all++;
  }
  return result;
}
