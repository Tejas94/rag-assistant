import pg from "pg";
import { config } from "./config.js";
import type { Chunk } from "./types.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/** pgvector accepts vectors as text like "[0.1,0.2,...]". */
export function toSqlVector(v: number[]): string {
  return `[${v.join(",")}]`;
}

export async function clearChunks(): Promise<void> {
  await pool.query("TRUNCATE chunks RESTART IDENTITY");
}

export async function insertChunks(chunks: Chunk[], embeddings: number[][]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      await client.query(
        "INSERT INTO chunks (doc_path, heading, content, chunk_index, embedding) VALUES ($1, $2, $3, $4, $5)",
        [c.docPath, c.heading, c.content, c.index, toSqlVector(embeddings[i])],
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

/** Maps a database row to a RetrievedChunk. Use it in your retrieval queries. */
export function rowToChunk(row: {
  id: string | number;
  doc_path: string;
  heading: string;
  content: string;
  chunk_index: number;
  score: string | number;
}) {
  return {
    id: Number(row.id),
    docPath: row.doc_path,
    heading: row.heading,
    content: row.content,
    index: row.chunk_index,
    score: Number(row.score),
  };
}
