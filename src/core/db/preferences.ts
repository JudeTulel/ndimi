import { getDatabase } from './database';

/**
 * Tiny key/value preference store. Onboarding completion lives here so a
 * relaunch skips the wizard instead of replaying it.
 */
export async function getPref(key: string): Promise<string | null> {
  const db = await getDatabase();
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)'
  );
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setPref(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)'
  );
  await db.runAsync(
    'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export const ONBOARDING_COMPLETE = 'onboarding_complete';
