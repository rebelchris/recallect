import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "recallect.db");

declare global {
  var _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var _sqlite: InstanceType<typeof Database> | undefined;
}

function getDb() {
  if (global._db) return global._db;

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  global._sqlite = sqlite;
  global._db = drizzle(sqlite, { schema });

  return global._db;
}

export const db = getDb();
