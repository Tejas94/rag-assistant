import { describe, expect, it } from "vitest";
import { agreement, parseLabeledAnswers } from "../../evals/labels.js";

const row = (label: unknown) =>
  JSON.stringify({ id: "q01", question: "Q?", reference: "R.", answerable: true, sources: "<source/>", answer: "A [1].", label });

describe("parseLabeledAnswers", () => {
  it("accepts labelled and unlabelled rows", () => {
    const rows = parseLabeledAnswers(`${row({ correct: true, faithful: true, abstained: false })}\n${row(null)}\n`);
    expect(rows.map((r) => r.label)).toEqual([{ correct: true, faithful: true, abstained: false }, null]);
  });

  it("names the line of a bad row", () => {
    expect(() => parseLabeledAnswers(`${row(null)}\n${row({ correct: "yes" })}`, "l.jsonl")).toThrow(/l\.jsonl:2: label/);
  });
});

describe("agreement", () => {
  it("counts matches per field and on all fields at once", () => {
    const yes = { correct: true, faithful: true, abstained: false };
    const result = agreement([
      { label: yes, verdict: yes },
      { label: yes, verdict: { ...yes, faithful: false } },
      { label: { ...yes, correct: false }, verdict: { correct: false, faithful: true, abstained: true } },
    ]);
    expect(result).toEqual({ n: 3, all: 1, byField: { correct: 3, faithful: 2, abstained: 2 } });
  });
});
