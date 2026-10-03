import { describe, expect, it } from "vitest";
import { checkoutDir, docsPath, getSource, nextjs, reactNative, SOURCES } from "../../src/sources.js";

describe("nextjs.urlFor", () => {
  it("drops numeric prefixes and the extension", () => {
    expect(nextjs.urlFor("01-app/03-api-reference/04-functions/revalidatePath.mdx")).toBe(
      "https://nextjs.org/docs/app/api-reference/functions/revalidatePath",
    );
    expect(nextjs.urlFor("01-app/02-guides/upgrading/version-16.mdx")).toBe("https://nextjs.org/docs/app/guides/upgrading/version-16");
  });

  it("maps index.mdx to its folder", () => {
    expect(nextjs.urlFor("01-app/index.mdx")).toBe("https://nextjs.org/docs/app");
    expect(nextjs.urlFor("01-app/03-api-reference/03-file-conventions/index.mdx")).toBe(
      "https://nextjs.org/docs/app/api-reference/file-conventions",
    );
    expect(nextjs.urlFor("index.mdx")).toBe("https://nextjs.org/docs");
  });

  it("keeps numbers that are part of a name", () => {
    expect(nextjs.urlFor("01-app/02-guides/upgrading/version-15.mdx")).toBe("https://nextjs.org/docs/app/guides/upgrading/version-15");
    expect(nextjs.urlFor("02-pages/04-api-reference/01-components/404.mdx")).toBe("https://nextjs.org/docs/pages/api-reference/components/404");
  });

  it("accepts Windows separators", () => {
    expect(nextjs.urlFor("01-app\\01-getting-started\\09-revalidating.mdx")).toBe("https://nextjs.org/docs/app/getting-started/revalidating");
  });

  it("skips generated copies", () => {
    expect(nextjs.skip("02-pages/x.mdx", { source: "app/x" })).toBe(true);
    expect(nextjs.skip("01-app/x.mdx", { title: "X" })).toBe(false);
  });
});

describe("reactNative.urlFor", () => {
  it("uses the frontmatter id when there is one", () => {
    expect(reactNative.urlFor("getting-started.md", { id: "environment-setup" })).toBe("https://reactnative.dev/docs/environment-setup");
  });

  it("uses the file name without an id, keeping folders", () => {
    expect(reactNative.urlFor("flatlist.md")).toBe("https://reactnative.dev/docs/flatlist");
    expect(reactNative.urlFor("the-new-architecture/codegen-cli.md", {})).toBe(
      "https://reactnative.dev/docs/the-new-architecture/codegen-cli",
    );
  });

  it("honours a slug, relative or absolute", () => {
    expect(reactNative.urlFor("legacy/a.md", { id: "a", slug: "b" })).toBe("https://reactnative.dev/docs/legacy/b");
    expect(reactNative.urlFor("legacy/a.md", { slug: "/c" })).toBe("https://reactnative.dev/docs/c");
  });

  it("skips partials", () => {
    expect(reactNative.skip("_steps.md", {})).toBe(true);
    expect(reactNative.skip("guides/_steps.md", {})).toBe(true);
    expect(reactNative.skip("flatlist.md", {})).toBe(false);
  });
});

describe("presets", () => {
  it("are pinned to an exact ref", () => {
    expect(nextjs.ref).toBe("v16.3.8");
    expect(reactNative.ref).toMatch(/^[0-9a-f]{40}$/);
  });

  it("are picked by name", () => {
    expect(getSource("nextjs")).toBe(nextjs);
    expect(getSource("react-native")).toBe(reactNative);
    expect(() => getSource("vue")).toThrow(/Unknown DOCS_SOURCE "vue"/);
    expect(Object.keys(SOURCES)).toEqual(["nextjs", "react-native"]);
  });

  it("put the clone under the corpus folder", () => {
    expect(checkoutDir(nextjs, "corpus")).toBe("corpus/nextjs");
    expect(docsPath(nextjs, "corpus")).toBe("corpus/nextjs/docs");
    expect(docsPath(reactNative, "corpus")).toBe("corpus/react-native/website/versioned_docs/version-0.87");
  });
});
