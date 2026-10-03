import { describe, expect, it } from "vitest";
import { DOC_PATH, loadGolden, parseGolden, QUESTION_TYPES } from "../../evals/golden.js";

const line = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ id: "q01", question: "Q?", answer: "A.", relevant: ["01-app/a.mdx"], type: "lookup", ...over });

describe("evals/golden.jsonl", () => {
  it("is valid: every line parses, ids are unique, relevant paths are well formed", async () => {
    const golden = await loadGolden();
    expect(golden.length).toBeGreaterThanOrEqual(15);
    for (const item of golden) for (const p of item.relevant) expect(p).toMatch(DOC_PATH);
  });

  it("mixes question types and keeps some unanswerable ones", async () => {
    const golden = await loadGolden();
    const types = new Set(golden.map((g) => g.type));
    for (const type of QUESTION_TYPES) expect(types, `no ${type} question`).toContain(type);
    expect(golden.filter((g) => g.type === "unanswerable").length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseGolden", () => {
  it("parses JSONL and skips blank lines", () => {
    const items = parseGolden(`${line()}\n\n${line({ id: "q02", relevant: [], type: "unanswerable" })}\n`);
    expect(items.map((i) => i.id)).toEqual(["q01", "q02"]);
  });

  it("names the line and the field of each problem", () => {
    const text = [line(), "{not json", line({ id: "q03", relevant: ["/abs/path.mdx"] }), line({ id: "q04", type: "trivia" })].join("\n");
    expect(() => parseGolden(text, "g.jsonl")).toThrow(/g\.jsonl:2: not valid JSON/);
    expect(() => parseGolden(text, "g.jsonl")).toThrow(/g\.jsonl:3: relevant\.0: relevant paths are relative/);
    expect(() => parseGolden(text, "g.jsonl")).toThrow(/g\.jsonl:4: type:/);
  });

  it("rejects malformed relevant paths", () => {
    for (const bad of ["../secret.mdx", "01-app/../a.mdx", "a.txt", "01-app/", "https://nextjs.org/docs/app"]) {
      expect(() => parseGolden(line({ relevant: [bad] })), bad).toThrow(/relevant/);
    }
    expect(() => parseGolden(line({ relevant: ["01-app/02-guides/upgrading/version-16.mdx", "flatlist.md"] }))).not.toThrow();
  });

  it("ties unanswerable to an empty relevant list", () => {
    expect(() => parseGolden(line({ type: "unanswerable" }))).toThrow(/no relevant pages/);
    expect(() => parseGolden(line({ relevant: [] }))).toThrow(/at least one page/);
  });

  it("ties history to follow_up questions", () => {
    const history = [{ role: "user", content: "How do I cache?" }];
    expect(() => parseGolden(line({ type: "follow_up" }))).toThrow(/history/);
    expect(() => parseGolden(line({ history }))).toThrow(/history/);
    expect(() => parseGolden(line({ type: "follow_up", history }))).not.toThrow();
  });

  it("rejects unknown fields and duplicate ids", () => {
    expect(() => parseGolden(line({ sourceDocs: ["a.md"] }))).toThrow(/sourceDocs/);
    expect(() => parseGolden(`${line()}\n${line()}`)).toThrow(/duplicate id q01/);
  });
});
