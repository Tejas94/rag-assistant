import path from "node:path";
import { config } from "./config.js";

export type Frontmatter = Record<string, unknown>;

/**
 * A documentation set you can fetch, ingest and cite. Both presets are pinned to an
 * exact git ref, so the eval numbers and the golden set stay comparable over time.
 */
export interface DocSource {
  name: string;
  label: string;
  /** Git repository that holds the docs. */
  repo: string;
  /** Tag or commit SHA. Bump it on purpose, then re-ingest and re-check the golden set. */
  ref: string;
  /** Folder inside the repo with the markdown files. */
  docsDir: string;
  extensions: string[];
  /** Questions the web UI offers as one-click examples. */
  examples: string[];
  /** Maps a file path relative to docsDir to its public page URL (no anchor). */
  urlFor(relativePath: string, frontmatter?: Frontmatter): string;
  /** Files that are not pages on their own (partials, generated copies). */
  skip(relativePath: string, frontmatter: Frontmatter): boolean;
}

const posix = path.posix;

/**
 * Next.js docs at the v16.3.8 tag. Paths map to URLs by dropping the numeric order
 * prefixes ("01-app" -> "app") and the extension, and an index.mdx stands for its folder:
 *   01-app/03-api-reference/04-functions/revalidatePath.mdx -> /docs/app/api-reference/functions/revalidatePath
 *   01-app/index.mdx -> /docs/app
 * Checked against the internal links in these files: all 2,863 "/docs/..." links to a
 * page in docs/ resolve. (71 more point at /docs/messages/..., which lives in errors/.)
 *
 * Pages Router files with a `source:` field are generated copies of an App Router page
 * (their body is a comment). The loader skips them, so the index holds no near-duplicates.
 */
export const nextjs: DocSource = {
  name: "nextjs",
  label: "Next.js docs (v16.3.8)",
  repo: "https://github.com/vercel/next.js",
  ref: "v16.3.8",
  docsDir: "docs",
  extensions: [".mdx", ".md"],
  examples: [
    "How do I revalidate a single page on demand?",
    "How do I run code before every request in Next.js 16?",
    "What does generateStaticParams do?",
  ],
  urlFor(relativePath) {
    const parts = relativePath
      .replace(/\.mdx?$/, "")
      .split(/[\\/]/)
      .map((segment) => segment.replace(/^\d+-/, ""));
    if (parts.at(-1) === "index") parts.pop();
    return `https://nextjs.org/docs${parts.length ? `/${parts.join("/")}` : ""}`;
  },
  skip(_relativePath, frontmatter) {
    return typeof frontmatter.source === "string";
  },
};

/**
 * React Native docs from the react-native-website repo, pinned to a commit. The repo's
 * top-level docs/ folder is the unreleased "next" version (reactnative.dev/docs/next/...);
 * the released version that reactnative.dev/docs/<id> serves lives in
 * website/versioned_docs/version-<latest>. At this commit that is 0.87.
 *   flatlist.md (id: flatlist) -> /docs/flatlist
 *   getting-started.md (id: environment-setup) -> /docs/environment-setup
 *   the-new-architecture/codegen-cli.md (no id) -> /docs/the-new-architecture/codegen-cli
 * Files starting with "_" are partials included by other pages. Checked against the
 * 691 relative links between pages in that folder; all resolve.
 */
export const reactNative: DocSource = {
  name: "react-native",
  label: "React Native docs (0.87)",
  repo: "https://github.com/facebook/react-native-website",
  ref: "f5d7ce02ff602fd91ceec28a17dd390d0e3e06df",
  docsDir: "website/versioned_docs/version-0.87",
  extensions: [".md", ".mdx"],
  examples: [
    "How do I render a long list without slowing the app down?",
    "How do I make a custom button work with screen readers?",
    "How do I stop the keyboard from covering a text input?",
  ],
  urlFor(relativePath, frontmatter = {}) {
    const file = relativePath.split(/[\\/]/).join("/");
    const dir = posix.dirname(file);
    const slug = typeof frontmatter.slug === "string" ? frontmatter.slug : undefined;
    if (slug?.startsWith("/")) return `https://reactnative.dev/docs${slug}`;
    const id = slug ?? (typeof frontmatter.id === "string" ? frontmatter.id : posix.basename(file).replace(/\.mdx?$/, ""));
    return `https://reactnative.dev/docs/${dir === "." ? "" : `${dir}/`}${id}`;
  },
  skip(relativePath) {
    return posix.basename(relativePath.split(/[\\/]/).join("/")).startsWith("_");
  },
};

export const SOURCES: Record<string, DocSource> = { nextjs, "react-native": reactNative };

/** The preset picked by DOCS_SOURCE (default nextjs). */
export function getSource(name = config.docsSource): DocSource {
  const source = SOURCES[name];
  if (!source) throw new Error(`Unknown DOCS_SOURCE "${name}". Use one of: ${Object.keys(SOURCES).join(", ")}.`);
  return source;
}

/** Where `npm run docs:fetch` puts the clone, e.g. corpus/nextjs. */
export function checkoutDir(source: DocSource, root = config.corpusRoot): string {
  return path.join(root, source.name);
}

/** The folder with the markdown files, e.g. corpus/nextjs/docs. */
export function docsPath(source: DocSource, root = config.corpusRoot): string {
  return path.join(checkoutDir(source, root), source.docsDir);
}
