import { describe, expect, it } from "vitest";
import { loadDocs, parseFrontmatter, toDoc } from "../../src/corpus.js";
import { nextjs, reactNative } from "../../src/sources.js";

const NEXT = "tests/fixtures/nextjs";
const RN = "tests/fixtures/react-native";

describe("parseFrontmatter", () => {
  it("splits YAML frontmatter from the body", () => {
    const { data, body } = parseFrontmatter("---\ntitle: Caching\ndescription: How it works.\n---\n\nBody.");
    expect(data).toEqual({ title: "Caching", description: "How it works." });
    expect(body).toBe("\nBody.");
  });

  it("returns empty data when there is no frontmatter", () => {
    expect(parseFrontmatter("# Title\n\nBody.")).toEqual({ data: {}, body: "# Title\n\nBody." });
  });

  it("handles Windows line endings", () => {
    expect(parseFrontmatter("---\r\ntitle: A\r\n---\r\nBody").data).toEqual({ title: "A" });
  });
});

describe("toDoc", () => {
  it("takes the title from a leading H1 when the frontmatter has none, and removes the H1", () => {
    const doc = toDoc("guide.md", "# Using `fetch` with [caching](/x)\n\nText.", nextjs);
    expect(doc).toMatchObject({ title: "Using fetch with caching", content: "Text." });
  });

  it("falls back to the file name", () => {
    expect(toDoc("01-app/caching.mdx", "Just text.", nextjs)?.title).toBe("caching");
  });

  it("returns null for a skipped or empty page", () => {
    expect(toDoc("a.mdx", "---\ntitle: A\nsource: app/a\n---\n", nextjs)).toBeNull();
    expect(toDoc("_partial.md", "Text.", reactNative)).toBeNull();
    expect(toDoc("a.mdx", "---\ntitle: A\n---\nimport X from './x'\n", nextjs)).toBeNull();
  });
});

describe("loadDocs: Next.js fixtures", () => {
  it("reads .md and .mdx pages, skips generated copies and counts empty pages", async () => {
    const result = await loadDocs(nextjs, NEXT);
    expect(result).toMatchObject({ files: 5, skipped: 1, empty: 1 });
    expect(result.docs.map((d) => d.path)).toEqual([
      "01-app/02-guides/widgets.mdx",
      "01-app/index.mdx",
      "03-architecture/build-notes.md",
    ]);
  });

  it("produces the Doc fields with real URLs", async () => {
    const { docs } = await loadDocs(nextjs, NEXT);
    const widgets = docs.find((d) => d.path.endsWith("widgets.mdx"))!;
    expect(widgets).toMatchObject({
      url: "https://nextjs.org/docs/app/guides/widgets",
      title: "Widgets",
      description: "Add a widget to any page.",
    });
    expect(docs.find((d) => d.path === "01-app/index.mdx")?.url).toBe("https://nextjs.org/docs/app");
    expect(docs.find((d) => d.path.endsWith("build-notes.md"))).toMatchObject({ title: "Build notes", description: "" });
  });

  it("cleans MDX but keeps the text, the headings and the code", async () => {
    const { docs } = await loadDocs(nextjs, NEXT);
    const content = docs.find((d) => d.path.endsWith("widgets.mdx"))!.content;
    // Gone: imports and exports outside code, comments, tags.
    expect(content).not.toContain("@/components/widget");
    expect(content).not.toContain("section: 'guides'");
    expect(content).not.toContain("Internal note");
    expect(content).not.toMatch(/<\/?(AppOnly|PagesOnly|Image)\b/);
    // Kept: text inside components, alt text, inline code, headings, code blocks.
    expect(content.startsWith("Widgets render on the server by default. Wrap slow ones in `<Suspense>`.")).toBe(true);
    expect(content).toContain("load widget data with `getStaticProps`");
    expect(content).toContain("A widget on a dashboard");
    expect(content).toContain("## Usage with forms");
    expect(content).toContain(
      ['```tsx filename="app/page.tsx" switcher', "import { Widget } from 'widgets'", "", "export default function Page() {"].join("\n"),
    );
    expect(content).toContain('  return <Widget size="small" />');
    expect(content).toContain("```bash filename=\"Terminal\"\n# add the package\nnpm install widgets\n```");
  });

  it("tells you to fetch the docs when the folder is missing", async () => {
    await expect(loadDocs(nextjs, "tests/fixtures/missing")).rejects.toThrow(/npm run docs:fetch/);
  });
});

describe("loadDocs: React Native fixtures", () => {
  it("skips partials and maps URLs by frontmatter id", async () => {
    const result = await loadDocs(reactNative, RN);
    expect(result).toMatchObject({ files: 4, skipped: 1, empty: 0 });
    expect(result.docs.map((d) => [d.path, d.url])).toEqual([
      ["flatlist.md", "https://reactnative.dev/docs/flatlist"],
      ["getting-started.md", "https://reactnative.dev/docs/environment-setup"],
      ["guides/debugging.md", "https://reactnative.dev/docs/guides/debugging"],
    ]);
  });

  it("keeps admonition text and code inside tabs", async () => {
    const { docs } = await loadDocs(reactNative, RN);
    const content = docs[0].content;
    expect(content).toContain("**Tip:** Large lists\nGive each row a stable `keyExtractor`.");
    expect(content).toContain("```jsx\n<FlatList data={rows} renderItem={renderRow} />\n```");
    expect(content).not.toMatch(/<\/?(Tabs|TabItem)\b/);
    expect(content).toContain("### `data`");
  });
});
