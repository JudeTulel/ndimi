import * as SQLite from 'expo-sqlite';

/**
 * Process-wide database handle.
 *
 * expo-sqlite caches open databases by path, but the cached entry survives after
 * its JS wrapper is garbage collected where the native handle is already closed.
 * Reopening the same path then returns a dead handle whose calls fail with
 * `NullPointerException` from `sqlite3_exec`. Keeping one module-level handle
 * (never dropped, never closed mid-session) avoids the whole class of failure.
 */
let handle: Promise<SQLite.SQLiteDatabase> | null = null;

export const DB_NAME = 'ndimi.db';

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!handle) {
    handle = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL');
      await db.execAsync('PRAGMA foreign_keys = ON');
      return db;
    });
    handle.catch(() => {
      handle = null;
    });
  }
  return handle;
}
