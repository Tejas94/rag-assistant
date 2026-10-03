import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "../../src/chunk.js";

// Spec for P2-01 (src/chunk.ts). Red until you finish it; once green, move this
// file to tests/core so CI guards it from then on.
const doc = {
  path: "guide.md",
  text: `# Guide

Intro paragraph.

## Install

Run the installer.

## Configure

### Advanced

Set the flag.

## Empty section
`,
};

describe("chunkMarkdown", () => {
  it("creates one chunk per non-empty section with a heading path", () => {
    const chunks = chunkMarkdown(doc, { maxChars: 1000, overlap: 0 });
    expect(chunks.map((c) => c.heading)).toEqual(["Guide", "Guide > Install", "Guide > Configure > Advanced"]);
    expect(chunks[1].content.trim()).toBe("Run the installer.");
  });

  it("numbers chunks per document and records the doc path", () => {
    const chunks = chunkMarkdown(doc, { maxChars: 1000, overlap: 0 });
    expect(chunks.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(chunks.every((c) => c.docPath === "guide.md")).toBe(true);
  });

  it("splits long sections and respects maxChars", () => {
    const long = { path: "long.md", text: `# Long\n\n${"This is a sentence. ".repeat(100)}` };
    const chunks = chunkMarkdown(long, { maxChars: 300, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.content.length <= 300)).toBe(true);
    expect(chunks.every((c) => c.heading === "Long")).toBe(true);
  });

  it("repeats the overlap between consecutive pieces of a split section", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i}.`).join(" ");
    const chunks = chunkMarkdown({ path: "o.md", text: `# O\n\n${text}` }, { maxChars: 200, overlap: 40 });
    for (let i = 1; i < chunks.length; i++) {
      const tail = chunks[i - 1].content.slice(-20);
      expect(chunks[i].content).toContain(tail.trim());
    }
  });
});
