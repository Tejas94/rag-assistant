import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "../src/config.js";
import { getAnthropic } from "../src/llm.js";
import { todo } from "../src/todo.js";

/** The judge's output. `reasoning` comes first so the model explains before it decides. */
export const VerdictSchema = z.object({
  reasoning: z.string().describe("Two or three sentences: what the answer claims and how it compares with the reference and the sources"),
  correct: z.boolean().describe("The answer agrees with the reference answer on the facts that matter"),
  faithful: z.boolean().describe("Every claim in the answer is supported by the sources"),
  abstained: z.boolean().describe("The answer declines, saying the documentation does not cover the question"),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export interface JudgeInput {
  question: string;
  /** The golden set's reference answer. */
  reference: string;
  /** False for unanswerable questions: then abstaining is the right answer. */
  answerable: boolean;
  /** formatSources() of the chunks the answer model saw. */
  sources: string;
  answer: string;
}

export interface JudgeResult {
  verdict: Verdict;
  model: string;
  usage: Anthropic.Usage | null;
}

export const JUDGE_SYSTEM_PROMPT = "P2-10: write the judge's instructions here.";

/**
 * TODO(P2-10) Week 6: an LLM-as-judge, calibrated against your own labels.
 *
 * Correct, faithful and abstained need judgement, so a model grades them. A judge you
 * have not checked is just another unverified model, so the calibration is the point.
 *
 * Build it:
 * - getAnthropic().messages.parse() with config.judgeModel (JUDGE_MODEL, default
 *   claude-haiku-4-5) and output_config: { format: zodOutputFormat(VerdictSchema) },
 *   imported from "@anthropic-ai/sdk/helpers/zod". response.parsed_output holds the
 *   verdict, or null when parsing failed; treat null as an error.
 * - Put the question, reference, sources and answer in clearly tagged sections. Define
 *   each field in JUDGE_SYSTEM_PROMPT the way you would for a human grader, including the
 *   unanswerable case: there, abstaining is correct and anything else is not.
 * - claude-haiku-4-5 supports structured outputs but not `effort` or adaptive thinking,
 *   so leave those out unless you switch JUDGE_MODEL to a model that has them.
 * - Return usage too: the eval reports what judging costs.
 *
 * Calibrate it (week 6 step 2):
 * 1. Run `npm run eval -- --answers`. It writes evals/answers-latest.jsonl, one answer
 *    per line with "label": null.
 * 2. Copy 20 lines into evals/labels.jsonl and fill in your own label on each line, for
 *    example "label": { "correct": true, "faithful": true, "abstained": false }, before
 *    you look at what the judge thinks. Include a few wrong answers and abstentions.
 * 3. Run `npm run eval:calibrate`. It judges those exact answers and prints where the
 *    judge disagrees with you. Fix the prompt until it agrees on at least 18 of 20,
 *    then put the rate in the README.
 *
 * Things to learn on the way:
 * - Judges like long answers. Do you see that in the disagreements?
 * - Is one call with three fields as good as three calls with one criterion each?
 *   Measure agreement and cost both ways.
 * - Does a cheaper judge agree with you as often as a bigger one?
 */
export async function judge(input: JudgeInput): Promise<JudgeResult> {
  void input;
  void config;
  void getAnthropic;
  todo("P2-10", "Implement judge() in evals/judge.ts");
}
