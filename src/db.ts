import { readFile } from "node:fs/promises";
import pg from "pg";
import { config } from "./config.js";
import type { Chunk, RetrievedChunk } from "./types.js";

/** Connects lazily: nothing touches the database until the first query. */
export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function closeDb(): Promise<void> {
  await pool.end();
}

/** pgvector accepts vectors as text like "[0.1,0.2,...]". */
export function toSqlVector(v: number[]): string {
  return `[${v.join(",")}]`;
}

/** The columns rowToChunk() needs. Use as `SELECT ${CHUNK_COLUMNS}, <score expression> AS score FROM chunks ...`. */
export const CHUNK_COLUMNS = "id, doc_path, doc_title, url, headings, anchor, chunk_index, content";

export interface ChunkRow {
  id: string | number;
  doc_path: string;
  doc_title: string;
  url: string;
  headings: string[];
  anchor: string;
  chunk_index: number;
  content: string;
  score: string | number;
}

/** Maps a row selected with CHUNK_COLUMNS plus a `score` column to a RetrievedChunk. */
export function rowToChunk(row: ChunkRow): RetrievedChunk {
  return {
    id: Number(row.id),
    docPath: row.doc_path,
    docTitle: row.doc_title,
    url: row.url,
    headings: row.headings,
    anchor: row.anchor,
    index: row.chunk_index,
    content: row.content,
    score: Number(row.score),
  };
}

export interface IndexedChunk {
  chunk: Chunk;
  /** The text that was embedded; also indexed for full-text search. */
  text: string;
  embedding: number[];
  contentHash: string;
}

/**
 * Replaces the whole index in one transaction, so a failed ingest leaves the old
 * index in place. Incremental ingestion (only changed pages) is in the roadmap.
 */
export async function replaceIndex(items: IndexedChunk[], embedModel: string, batchSize = 200): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE chunks RESTART IDENTITY");
    for (let start = 0; start < items.length; start += batchSize) {
      const batch = items.slice(start, start + batchSize);
      const values: unknown[] = [];
      const rows = batch.map((item, i) => {
        const c = item.chunk;
        values.push(c.docPath, c.docTitle, c.url, c.headings, c.anchor, c.index, c.content);
        values.push(item.contentHash, embedModel, toSqlVector(item.embedding), item.text);
        const p = (n: number) => `$${i * 11 + n}`;
        return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, to_tsvector('english', ${p(11)}))`;
      });
      await client.query(
        `INSERT INTO chunks (doc_path, doc_title, url, headings, anchor, chunk_index, content,
           content_hash, embed_model, embedding, tsv) VALUES ${rows.join(", ")}`,
        values,
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface IndexInfo {
  chunks: number;
  docs: number;
  embedModels: string[];
}

export async function indexInfo(): Promise<IndexInfo> {
  try {
    const { rows } = await pool.query<{ chunks: string; docs: string; models: string[] | null }>(
      "SELECT count(*) AS chunks, count(DISTINCT doc_path) AS docs, array_agg(DISTINCT embed_model) AS models FROM chunks",
    );
    return { chunks: Number(rows[0].chunks), docs: Number(rows[0].docs), embedModels: (rows[0].models ?? []).filter(Boolean) };
  } catch (err) {
    throw new Error(friendlyDbError(err));
  }
}

/** Every doc path in the index, for checking that the golden set points at real pages. */
export async function indexedDocPaths(): Promise<Set<string>> {
  const { rows } = await pool.query<{ doc_path: string }>("SELECT DISTINCT doc_path FROM chunks");
  return new Set(rows.map((r) => r.doc_path));
}

/** Golden-set pages that are not in the index, as "q03 01-app/.../page.mdx". A typo, or a page the loader skipped. */
export function missingRelevant(golden: { id: string; relevant: string[] }[], indexed: Set<string>): string[] {
  return golden.flatMap((g) => g.relevant.filter((p) => !indexed.has(p)).map((p) => `${g.id} ${p}`));
}

/** A sentence explaining why the index cannot serve queries for this embedder, or null if it can. */
export function describeIndexProblem(info: IndexInfo, embedderName: string): string | null {
  if (info.chunks === 0) return "The index is empty. Run `npm run docs:fetch` and `npm run ingest` first.";
  if (info.embedModels.length !== 1 || info.embedModels[0] !== embedderName) {
    return (
      `The index was built with ${info.embedModels.join(", ")} but the current embedder is ${embedderName}. ` +
      "Vectors from different models are not comparable: re-run `npm run ingest` or change EMBEDDER."
    );
  }
  return null;
}

/** Turns the usual first-run database errors into a next step. */
export function friendlyDbError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e.code === "ECONNREFUSED") {
    return `Cannot reach Postgres at ${redact(config.databaseUrl)}. Start it with \`npm run db:up\` or set DATABASE_URL.`;
  }
  if (e.code === "42P01") return "Table `chunks` does not exist. Run `npm run db:schema` (or `npm run db:reset` with Docker).";
  if (e.code === "22000" && /dimensions/.test(e.message ?? "")) {
    return `${e.message}. The embedding size must match vector(1024) in db/schema.sql.`;
  }
  return e.message ?? String(err);
}

function redact(url: string): string {
  return url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@");
}

/** Applies db/schema.sql. Safe to re-run: everything in it is IF NOT EXISTS. */
export async function applySchema(file = "db/schema.sql"): Promise<void> {
  await pool.query(await readFile(file, "utf8"));
}
