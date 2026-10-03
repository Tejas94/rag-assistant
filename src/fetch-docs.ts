import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkoutDir, docsPath, getSource } from "./sources.js";

/**
 * npm run docs:fetch              shallow, sparse clone of the pinned docs into corpus/<source>/
 * npm run docs:fetch -- --force   fetch again even if the ref has not changed
 *
 * Only the docs folder is downloaded. Re-running is cheap: it does nothing unless the
 * preset's repo, ref or folder changed. The docs are not committed (corpus/ is gitignored).
 */
function main() {
  const source = getSource();
  const dir = checkoutDir(source);
  const marker = path.join(dir, ".fetched.json");
  const want = { repo: source.repo, ref: source.ref, docsDir: source.docsDir };

  if (!process.argv.includes("--force") && existsSync(marker) && existsSync(docsPath(source))) {
    const have = JSON.parse(readFileSync(marker, "utf8")) as typeof want;
    if (have.repo === want.repo && have.ref === want.ref && have.docsDir === want.docsDir) {
      console.log(`${source.label} is already in ${dir} at ${source.ref}. Nothing to do (--force to fetch again).`);
      return;
    }
  }

  console.log(`Fetching ${source.repo} at ${source.ref} (only ${source.docsDir}/) into ${dir} ...`);
  const started = performance.now();
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
  git("init", "-q");
  git("remote", "add", "origin", source.repo);
  git("sparse-checkout", "set", "--no-cone", `/${source.docsDir}/`);
  git("fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", source.ref);
  git("-c", "advice.detachedHead=false", "checkout", "-q", "FETCH_HEAD");
  const sha = git("rev-parse", "HEAD");
  writeFileSync(marker, JSON.stringify({ ...want, sha, fetchedAt: new Date().toISOString() }, null, 2) + "\n");

  const files = readdirSync(docsPath(source), { recursive: true }).filter((f) =>
    source.extensions.includes(path.extname(String(f))),
  ).length;
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Done in ${seconds}s: ${files} files at ${sha.slice(0, 12)}. Next: npm run ingest`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error("docs:fetch needs git and access to github.com.");
  process.exit(1);
}
