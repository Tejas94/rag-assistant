import { config } from "./config.js";
import { applySchema, closeDb, friendlyDbError } from "./db.js";

/** npm run db:schema: applies db/schema.sql to DATABASE_URL (for Postgres outside Docker, such as Neon or Supabase). */
try {
  await applySchema();
  console.log(`Schema applied to ${config.databaseUrl.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@")}.`);
} catch (err) {
  console.error(friendlyDbError(err));
  process.exitCode = 1;
} finally {
  await closeDb();
}
