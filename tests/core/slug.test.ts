import { describe, expect, it } from "vitest";
import { createSlugger, headingText, parseHeading, slugify } from "../../src/slug.js";

describe("headingText", () => {
  it("strips links, emphasis, tags and code ticks but keeps the words", () => {
    expect(headingText("Using `revalidatePath` with [rewrites](/docs/rewrites)")).toBe("Using revalidatePath with rewrites");
    expect(headingText("**Bold** and *italic* and __strong__")).toBe("Bold and italic and strong");
    expect(headingText("Props <Badge>New</Badge>")).toBe("Props New");
  });

  it("keeps tags and underscores that are inside code", () => {
    expect(headingText("`<Link>` component")).toBe("<Link> component");
    expect(headingText("`unstable_cache` and snake_case_name")).toBe("unstable_cache and snake_case_name");
  });
});

describe("parseHeading", () => {
  it("reads ATX headings", () => {
    expect(parseHeading("## Usage")).toEqual({ level: 2, text: "Usage" });
    expect(parseHeading("### `params` (optional) ##")).toEqual({ level: 3, text: "params (optional)" });
    expect(parseHeading("   # Indented")).toEqual({ level: 1, text: "Indented" });
  });

  it("ignores lines that are not headings", () => {
    for (const line of ["#hashtag", "####### seven", "    # code by indent", "text # not", "##", "## "]) {
      expect(parseHeading(line), line).toBeNull();
    }
  });
});

describe("slugify", () => {
  it("follows GitHub's rules", () => {
    expect(slugify("Good to know")).toBe("good-to-know");
    expect(slugify("params (optional)")).toBe("params-optional");
    expect(slugify("Using next/image with a CDN")).toBe("using-nextimage-with-a-cdn");
    expect(slugify("unstable_cache")).toBe("unstable_cache");
    expect(slugify("Version 16.0.0")).toBe("version-1600");
    expect(slugify("A  -  B")).toBe("a-----b");
  });

  it("keeps non-ASCII letters", () => {
    expect(slugify("Café über")).toBe("café-über");
  });
});

describe("createSlugger", () => {
  it("numbers repeated headings per page", () => {
    const slug = createSlugger();
    expect(["Example", "Example", "Example", "Example 1"].map(slug)).toEqual(["example", "example-1", "example-2", "example-1-1"]);
    expect(createSlugger()("Example")).toBe("example");
  });
});
