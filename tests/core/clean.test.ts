import { describe, expect, it } from "vitest";
import { cleanMdx, splitFences } from "../../src/clean.js";

describe("cleanMdx", () => {
  it("drops MDX import and export lines, including multi-line exports", () => {
    const out = cleanMdx("import A from './a'\nexport const meta = {\n  title: 'x',\n}\n\nKeep this.");
    expect(out).toBe("Keep this.");
  });

  it("drops MDX and HTML comments", () => {
    expect(cleanMdx("Before.\n\n{/* hidden */}\n\n<!-- also hidden -->\n\nAfter.")).toBe("Before.\n\nAfter.");
  });

  it("removes component tags but keeps the text inside them", () => {
    expect(cleanMdx("<AppOnly>\n\nServer first.\n\n</AppOnly>")).toBe("Server first.");
    expect(cleanMdx("Click <kbd>Enter</kbd> to run.")).toBe("Click Enter to run.");
  });

  it("replaces a tag that has alt, label or title text with that text", () => {
    expect(cleanMdx('<Image\n  alt="Streaming diagram"\n  src="/a.png"\n  width={1600}\n/>')).toBe("Streaming diagram");
    expect(cleanMdx("<TabItem label='iOS' value=\"ios\">")).toBe("iOS");
  });

  it("handles attribute values that contain > or braces", () => {
    expect(cleanMdx('<Check when={a > b} note="x > y">Inside</Check>')).toBe("Inside");
  });

  it("leaves a lone < in prose alone", () => {
    expect(cleanMdx("Use a < b when b <c> wins.")).toBe("Use a < b when b  wins.");
    expect(cleanMdx("Values < 10 are fine.")).toBe("Values < 10 are fine.");
  });

  it("never touches inline code", () => {
    const line = "Wrap it in `<Suspense>` and keep `import x from 'y'` as is.";
    expect(cleanMdx(line)).toBe(line);
  });

  it("keeps fenced code blocks byte for byte", () => {
    const code = ['```tsx filename="app/page.tsx"', "import { Widget } from 'w'", "", "export default () => <Widget />", "```"].join("\n");
    expect(cleanMdx(`Intro.\n\n${code}\n\nOutro.`)).toBe(`Intro.\n\n${code}\n\nOutro.`);
  });

  it("turns Docusaurus admonitions into a bold label", () => {
    expect(cleanMdx(":::note\nRead this first.\n:::")).toBe("**Note:**\nRead this first.");
    expect(cleanMdx(":::tip Fast lists\nUse a key.\n:::")).toBe("**Tip:** Fast lists\nUse a key.");
  });

  it("keeps autolinks as plain URLs", () => {
    expect(cleanMdx("See <https://example.com/a>.")).toBe("See https://example.com/a.");
  });

  it("collapses the blank lines that removed tags leave behind", () => {
    expect(cleanMdx("One.\n\n<Tabs>\n\n\n</Tabs>\n\nTwo.")).toBe("One.\n\nTwo.");
  });
});

describe("splitFences", () => {
  it("separates prose from code", () => {
    const segments = splitFences("a\n```js\nx\n```\nb");
    expect(segments).toEqual([
      { code: false, text: "a" },
      { code: true, text: "```js\nx\n```" },
      { code: false, text: "b" },
    ]);
  });

  it("closes a fence only with the same character, at least as many times", () => {
    const text = ["````md", "```js", "inner", "```", "````", "after"].join("\n");
    const segments = splitFences(text);
    expect(segments[0]).toEqual({ code: true, text: text.split("\nafter")[0] });
    expect(segments[1]).toEqual({ code: false, text: "after" });
    expect(splitFences("~~~\n```\n~~~").map((s) => s.code)).toEqual([true]);
  });

  it("treats indented fences as fences", () => {
    expect(splitFences("- step\n\n  ```bash\n  npm i\n  ```\n").map((s) => s.code)).toEqual([false, true, false]);
  });

  it("does not open a fence on a line of inline code", () => {
    expect(splitFences("```js``` is not a fence").map((s) => s.code)).toEqual([false]);
  });

  it("runs an unclosed fence to the end", () => {
    expect(splitFences("a\n```\nno end").at(-1)).toEqual({ code: true, text: "```\nno end" });
  });
});
