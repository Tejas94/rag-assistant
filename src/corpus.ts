import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SourceDoc } from "./types.js";

/** Reads every .md and .txt file under dir (recursively), skipping README.md. */
export async function loadCorpus(dir: string): Promise<SourceDoc[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const docs: SourceDoc[] = [];
  for (const e of entries) {
    if (!e.isFile() || !/\.(md|txt)$/i.test(e.name) || e.name === "README.md") continue;
    const full = path.join(e.parentPath, e.name);
    docs.push({ path: path.relative(dir, full), text: await readFile(full, "utf8") });
  }
  return docs.sort((a, b) => a.path.localeCompare(b.path));
}
