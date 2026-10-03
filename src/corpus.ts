import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { cleanMdx } from "./clean.js";
import { headingText } from "./slug.js";
import { docsPath, getSource, type DocSource, type Frontmatter } from "./sources.js";
import type { Doc } from "./types.js";

/** Splits a leading `---` YAML block from the body. No block means empty data. */
export function parseFrontmatter(text: string): { data: Frontmatter; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: {}, body: text };
  const parsed: unknown = parseYaml(m[1]);
  const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Frontmatter) : {};
  return { data, body: text.slice(m[0].length) };
}

const asText = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * One file -> one Doc, or null when the source says to skip it (partials, generated
 * copies) or nothing is left after cleaning. The title comes from the frontmatter,
 * else from a leading "# Heading" (which is then removed from the content), else the file name.
 */
export function toDoc(relativePath: string, raw: string, source: DocSource): Doc | null {
  const file = relativePath.split(path.sep).join("/");
  const { data, body } = parseFrontmatter(raw);
  if (source.skip(file, data)) return null;

  let content = cleanMdx(body);
  let title = asText(data.title);
  if (!title) {
    const h1 = content.match(/^# (.+)(?:\n|$)/);
    if (h1) {
      title = headingText(h1[1]);
      content = content.slice(h1[0].length).trim();
    }
  }
  if (!content) return null;
  return {
    path: file,
    url: source.urlFor(file, data),
    title: title || path.posix.basename(file).replace(/\.mdx?$/, ""),
    description: asText(data.description),
    content,
  };
}

export interface LoadResult {
  docs: Doc[];
  /** Markdown files found. */
  files: number;
  /** Files the source skips: partials and generated copies. */
  skipped: number;
  /** Files with no text left after cleaning. */
  empty: number;
}

/** Reads every page of a fetched source, sorted by path. */
export async function loadDocs(source: DocSource = getSource(), dir = docsPath(source)): Promise<LoadResult> {
  if (!existsSync(dir)) {
    throw new Error(`No docs found in ${dir}. Run \`npm run docs:fetch\` first (DOCS_SOURCE=${source.name}).`);
  }
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && source.extensions.includes(path.extname(e.name)))
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
    .sort();

  const result: LoadResult = { docs: [], files: files.length, skipped: 0, empty: 0 };
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf8");
    const { data } = parseFrontmatter(raw);
    if (source.skip(file.split(path.sep).join("/"), data)) {
      result.skipped++;
      continue;
    }
    const doc = toDoc(file, raw, source);
    if (doc) result.docs.push(doc);
    else result.empty++;
  }
  result.docs.sort((a, b) => a.path.localeCompare(b.path));
  return result;
}
