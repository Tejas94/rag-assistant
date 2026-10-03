import { describe, expect, it } from "vitest";
import { ABSTAIN_PHRASE, formatSources, isAbstention, parseCitations, sourceUrl } from "../../src/answer.js";
import type { RetrievedChunk } from "../../src/types.js";

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: 1,
  score: 0.5,
  docPath: "01-app/caching.mdx",
  docTitle: "Caching",
  url: "https://nextjs.org/docs/app/caching",
  headings: ["Usage", "Options"],
  anchor: "options",
  index: 0,
  content: "Set `revalidate` in seconds.",
  ...over,
});

describe("parseCitations", () => {
  it("finds [n], [n][m] and [n, m], sorted and unique", () => {
    expect(parseCitations("A [2]. B [1][2]. C [3, 1].", 3)).toEqual({ cited: [1, 2, 3], invalid: [] });
  });

  it("reports numbers that point at no source", () => {
    expect(parseCitations("A [1]. B [9]. C [0].", 3)).toEqual({ cited: [1], invalid: [0, 9] });
  });

  it("ignores brackets that are not citations", () => {
    expect(parseCitations("Use params[0] or [slug] or [...slug] or [1a] or fn()[2].", 3)).toEqual({ cited: [], invalid: [] });
  });

  it("ignores numbers in brackets inside code", () => {
    const text = "Read the first item [1]: `const [a] = rows[0]` and\n```js\nconst x = [2]\n```\nDone [2].";
    expect(parseCitations(text, 3)).toEqual({ cited: [1, 2], invalid: [] });
    expect(parseCitations("Inline `[3]` is code, [3] is a citation.", 3)).toEqual({ cited: [3], invalid: [] });
  });

  it("finds nothing in an abstention", () => {
    expect(parseCitations(ABSTAIN_PHRASE, 5)).toEqual({ cited: [], invalid: [] });
  });
});

describe("isAbstention", () => {
  it("matches the phrase with straight or curly apostrophes and any case", () => {
    expect(isAbstention(ABSTAIN_PHRASE)).toBe(true);
    expect(isAbstention("I couldn’t find that in the documentation.")).toBe(true);
    expect(isAbstention("  i COULDN'T find that in the   documentation.  ")).toBe(true);
  });

  it("does not match an answer", () => {
    expect(isAbstention("Use revalidatePath [1].")).toBe(false);
    expect(isAbstention("I couldn't find a config option, but [1] shows a workaround.")).toBe(false);
  });
});

describe("sourceUrl", () => {
  it("adds the section anchor when there is one", () => {
    expect(sourceUrl(chunk())).toBe("https://nextjs.org/docs/app/caching#options");
    expect(sourceUrl(chunk({ anchor: "" }))).toBe("https://nextjs.org/docs/app/caching");
  });
});

describe("formatSources", () => {
  it("numbers the chunks from 1 with title, section and link", () => {
    const text = formatSources([chunk(), chunk({ id: 2, headings: [], anchor: "", content: "Intro." })]);
    expect(text).toBe(
      '<source id="1" title="Caching" section="Usage > Options" url="https://nextjs.org/docs/app/caching#options">\n' +
        "Set `revalidate` in seconds.\n</source>\n\n" +
        '<source id="2" title="Caching" section="(introduction)" url="https://nextjs.org/docs/app/caching">\nIntro.\n</source>',
    );
  });

  it("escapes quotes in attributes", () => {
    expect(formatSources([chunk({ docTitle: 'The "use cache" directive' })])).toContain('title="The &quot;use cache&quot; directive"');
  });
});
