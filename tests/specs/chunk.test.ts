// Spec for P2-01 (src/chunk.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.
import { describe, expect, it } from "vitest";
import { chunkDoc } from "../../src/chunk.js";
import type { Doc } from "../../src/types.js";

const doc = (content: string): Doc => ({
  path: "01-app/guide.mdx",
  url: "https://example.com/docs/app/guide",
  title: "Guide",
  description: "",
  content,
});

/** Lines that open or close a fence. An even count means every block is closed. */
const fenceLines = (text: string) => (text.match(/^\s*(```|~~~)/gm) ?? []).length;

const page = doc(`Intro text before any heading.

## Install

Run the installer.

### With npm

\`\`\`bash
# install deps
npm install example
\`\`\`

## Configure

### Advanced

Set the flag.

## Using \`defineConfig\` with [plugins](/docs/plugins)

Pass plugins in an array.
`);

describe("chunkDoc: sections and headings", () => {
  it("makes one chunk per non-empty section, in order, with its heading path", () => {
    const chunks = chunkDoc(page, { maxChars: 1000, overlap: 0 });
    expect(chunks.map((c) => c.headings)).toEqual([
      [],
      ["Install"],
      ["Install", "With npm"],
      ["Configure", "Advanced"],
      ["Using defineConfig with plugins"],
    ]);
  });

  it("keeps the section text without the heading line", () => {
    const chunks = chunkDoc(page, { maxChars: 1000, overlap: 0 });
    expect(chunks[0].content.trim()).toBe("Intro text before any heading.");
    expect(chunks[1].content.trim()).toBe("Run the installer.");
    expect(chunks[3].content.trim()).toBe("Set the flag.");
  });

  it("does not treat a # comment inside a code block as a heading", () => {
    const chunks = chunkDoc(page, { maxChars: 1000, overlap: 0 });
    expect(chunks[2].content).toContain("# install deps");
    expect(chunks[2].content).toContain("npm install example");
    expect(fenceLines(chunks[2].content)).toBe(2);
  });

  it("links each chunk to the slug of its nearest heading", () => {
    const chunks = chunkDoc(page, { maxChars: 1000, overlap: 0 });
    expect(chunks.map((c) => c.anchor)).toEqual(["", "install", "with-npm", "advanced", "using-defineconfig-with-plugins"]);
  });

  it("gives repeated headings unique anchors, as the docs site does", () => {
    const repeated = doc("## Pages Router\n\n### Example\n\nOne.\n\n## App Router\n\n### Example\n\nTwo.\n");
    const chunks = chunkDoc(repeated, { maxChars: 1000, overlap: 0 });
    expect(chunks.map((c) => c.anchor)).toEqual(["example", "example-1"]);
    expect(chunks.map((c) => c.headings)).toEqual([
      ["Pages Router", "Example"],
      ["App Router", "Example"],
    ]);
  });

  it("numbers chunks per document and copies the page fields", () => {
    const chunks = chunkDoc(page, { maxChars: 1000, overlap: 0 });
    expect(chunks.map((c) => c.index)).toEqual([0, 1, 2, 3, 4]);
    for (const c of chunks) {
      expect(c.docPath).toBe(page.path);
      expect(c.docTitle).toBe(page.title);
      expect(c.url).toBe(page.url);
    }
  });
});

describe("chunkDoc: long sections", () => {
  const paragraph = (n: number) => `Paragraph ${n} ${"word ".repeat(22).trim()}.`;
  const sentences = Array.from({ length: 60 }, (_, i) => `Sentence number ${i}.`).join(" ");

  it("packs whole paragraphs greedily up to maxChars", () => {
    const [p1, p2, p3] = [paragraph(1), paragraph(2), paragraph(3)];
    const chunks = chunkDoc(doc(`## Long\n\n${p1}\n\n${p2}\n\n${p3}\n`), { maxChars: 300, overlap: 0 });
    expect(chunks.map((c) => c.content.trim())).toEqual([`${p1}\n\n${p2}`, p3]);
    expect(chunks.every((c) => c.headings.join("/") === "Long" && c.anchor === "long")).toBe(true);
  });

  it("splits a paragraph longer than maxChars without losing or repeating text", () => {
    const chunks = chunkDoc(doc(`## Long\n\n${sentences}\n`), { maxChars: 200, overlap: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(6);
    expect(chunks.every((c) => c.content.length <= 200)).toBe(true);
    expect(chunks.map((c) => c.content.trim()).join(" ")).toBe(sentences);
  });

  it("starts each later piece with the end of the previous one (overlap)", () => {
    const chunks = chunkDoc(doc(`## Overlap\n\n${sentences}\n`), { maxChars: 200, overlap: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.content.length <= 200)).toBe(true);
    for (let i = 1; i < chunks.length; i++) {
      const tail = chunks[i - 1].content.trim().slice(-15);
      const at = chunks[i].content.indexOf(tail);
      expect(at, `chunk ${i} should repeat "${tail}" near its start`).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(40);
    }
  });
});

describe("chunkDoc: code blocks", () => {
  const code = ['```tsx filename="app/page.tsx"', "export default function Page() {", "", "  return <h1>Hello</h1>", "}", "```"].join("\n");
  const intro = `Intro ${"text ".repeat(40).trim()}.`;
  const outro = `Outro ${"text ".repeat(40).trim()}.`;

  it("keeps a code block whole when it fits, even with a blank line inside", () => {
    for (const overlap of [0, 50]) {
      const chunks = chunkDoc(doc(`## Code\n\n${intro}\n\n${code}\n\n${outro}\n`), { maxChars: 260, overlap });
      expect(chunks.some((c) => c.content.includes(code))).toBe(true);
      for (const c of chunks) {
        expect(fenceLines(c.content) % 2).toBe(0);
        expect(c.content.length).toBeLessThanOrEqual(260);
      }
    }
  });

  it("splits an oversized code block on line boundaries, re-opening the fence in every piece", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `  console.log("line ${i}")`);
    const big = ['```js filename="big.js"', ...lines, "```"].join("\n");
    const chunks = chunkDoc(doc(`## Big\n\n${big}\n`), { maxChars: 300, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(3);
    const inner: string[] = [];
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(300);
      const ls = c.content.trim().split("\n");
      expect(ls[0]).toBe('```js filename="big.js"');
      expect(ls.at(-1)).toBe("```");
      inner.push(...ls.slice(1, -1));
    }
    expect(inner).toEqual(lines);
  });

  it("keeps fences balanced in split code when overlap is on", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `  console.log("line ${i}")`);
    const big = ["Before the code.", "", '```js filename="big.js"', ...lines, "```", "", "After the code."].join("\n");
    const chunks = chunkDoc(doc(`## Big\n\n${big}\n`), { maxChars: 300, overlap: 50 });
    for (const c of chunks) {
      expect(fenceLines(c.content) % 2).toBe(0);
      expect(c.content.length).toBeLessThanOrEqual(300);
    }
    expect(chunks.map((c) => c.content).join("\n")).toContain("After the code.");
  });
});
