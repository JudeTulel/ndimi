import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../core/db/database';
import type { TranslationResult } from '../../core/domain/models';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    input_type TEXT NOT NULL,
    model_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_translations_created_at ON translations(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_translations_languages ON translations(source_language, target_language);
`;

export type InputType = 'text' | 'voice' | 'camera';

export type HistoryEntry = TranslationResult & {
  id: string;
  inputType: InputType;
  createdAt: string;
};

export type HistoryQuery = {
  q?: string;
  pair?: { from: string; to: string };
  limit?: number;
};

async function ensure() {
  const db = await getDatabase();
  await db.execAsync(SCHEMA);
}

function toInputType(value: string): InputType {
  return value === 'voice' || value === 'camera' ? value : 'text';
}

export async function saveTranslation(
  result: TranslationResult,
  inputType: InputType,
  modelId?: string
): Promise<void> {
  await ensure();
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO translations (id, source_language, target_language, source_text, translated_text, input_type, model_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    Crypto.randomUUID(),
    result.sourceLanguage,
    result.targetLanguage,
    result.sourceText,
    result.translatedText,
    inputType,
    modelId ?? null,
    new Date().toISOString()
  );
}

export async function listHistory(query: HistoryQuery = {}): Promise<HistoryEntry[]> {
  await ensure();
  const db = await getDatabase();

  const where: string[] = [];
  const args: (string | number)[] = [];

  const q = query.q?.trim();
  if (q) {
    where.push('(source_text LIKE ? OR translated_text LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like);
  }
  if (query.pair) {
    where.push('source_language = ? AND target_language = ?');
    args.push(query.pair.from, query.pair.to);
  }

  const rows = await db.getAllAsync<{
    id: string;
    source_language: string;
    target_language: string;
    source_text: string;
    translated_text: string;
    input_type: string;
    created_at: string;
  }>(
    `SELECT * FROM translations${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`,
    ...args,
    query.limit ?? 100
  );

  return rows.map((row) => ({
    id: row.id,
    sourceLanguage: row.source_language,
    targetLanguage: row.target_language,
    sourceText: row.source_text,
    translatedText: row.translated_text,
    inputType: toInputType(row.input_type),
    createdAt: row.created_at,
  }));
}

/** Distinct language pairs present in history, for the filter row. */
export async function listPairs(): Promise<{ from: string; to: string }[]> {
  await ensure();
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ source_language: string; target_language: string }>(
    'SELECT DISTINCT source_language, target_language FROM translations'
  );
  return rows.map((row) => ({ from: row.source_language, to: row.target_language }));
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM translations WHERE id = ?', id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM translations');
}
