/**
 * Heading helpers shared by the chunker, the loader and the UI.
 *
 * Anchors follow GitHub's rules (the `github-slugger` package): lowercase, drop
 * punctuation except "-" and "_", turn each space into "-", and add "-1", "-2"...
 * to repeated headings on the same page. The site itself could not be checked from
 * here, so the evidence is the docs' own links, which are written for the live site:
 * of the 1,441 "#anchor" links inside the Next.js v16.3.8 docs, all resolve with this
 * slugger except "#top" (a browser built-in). Docusaurus (reactnative.dev) uses the
 * same slugger; there 283 of 305 relative anchor links resolve, and the rest point at
 * renamed headings or use different capitals. Docusaurus also allows
 * "## Title {#custom-id}", which this does not handle (the pinned React Native docs
 * do not use it). If a link from the UI lands on the right page but the wrong spot,
 * this file is the first place to look.
 */

const PLACEHOLDER = "\u0000";

/** Markdown heading source -> the plain text a reader sees. "Using `revalidatePath` with [rewrites](/x)" -> "Using revalidatePath with rewrites". */
export function headingText(raw: string): string {
  const code: string[] = [];
  let text = raw.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _ticks: string, inner: string) => {
    code.push(inner.trim());
    return `${PLACEHOLDER}${code.length - 1}${PLACEHOLDER}`;
  });
  text = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/<\/?[A-Za-z][^>]*>/g, "") // HTML or JSX tags outside code
    .replace(/(\*\*|\*)(\S(?:.*?\S)?)\1/g, "$2") // **bold**, *italic*
    .replace(/(^|\W)(__|_)(\S(?:.*?\S)?)\2(?=\W|$)/g, "$1$3"); // __bold__, _italic_ (not snake_case)
  text = text.replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g"), (_m, i: string) => code[Number(i)]);
  return text.trim();
}

/** A markdown ATX heading line ("## Usage") -> its level and plain text. Null for any other line. */
export function parseHeading(line: string): { level: number; text: string } | null {
  const m = line.match(/^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/);
  if (!m || !m[2].trim()) return null;
  return { level: m[1].length, text: headingText(m[2]) };
}

/** GitHub-style slug for one heading's plain text. Does not handle repeats; use createSlugger() per page. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Returns a slug function with memory, for one page: the first "Example" heading
 * gets "example", the second "example-1", and so on. Create a new one per document.
 */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugify(text);
    let slug = base;
    while (seen.has(slug)) {
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      slug = `${base}-${n}`;
    }
    seen.set(slug, 0);
    return slug;
  };
}
