import { z } from "zod";
import { anthropic } from "../src/answer.js";
import { config } from "../src/config.js";
import { todo } from "../src/todo.js";

export const VerdictSchema = z.object({
  reasoning: z.string().describe("One or two sentences explaining the verdict"),
  correct: z.boolean().describe("The answer agrees with the reference answer"),
  faithful: z.boolean().describe("Every claim in the answer is supported by the sources"),
  abstainedCorrectly: z
    .boolean()
    .describe("For unanswerable questions: the answer says it does not know. Otherwise true."),
});
export type Verdict = z.infer<typeof VerdictSchema>;

/**
 * TODO(P2-09) Week 6: LLM-as-judge.
 *
 * Use config.judgeModel and structured output (messages.parse + zodOutputFormat,
 * as in Project 1) to fill VerdictSchema from: the question, the reference answer,
 * the sources the assistant saw, and the assistant's answer.
 *
 * Then calibrate it, which is the part most people skip:
 * 1. Label 20 answers yourself (correct? faithful?) before running the judge.
 * 2. Run the judge on the same 20 and count disagreements.
 * 3. Fix the judge prompt until it agrees with you on at least 18 of 20.
 * Put the agreement rate in your README. It is what makes the other numbers believable.
 */
export async function judge(input: {
  question: string;
  reference: string;
  sources: string;
  answer: string;
}): Promise<Verdict> {
  void input;
  void anthropic;
  void config;
  todo("P2-09", "Implement judge() in evals/judge.ts");
}
