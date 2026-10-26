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
`;

export type HistoryEntry = TranslationResult & {
  id: string;
  inputType: 'text' | 'voice';
  createdAt: string;
};

async function ensure() {
  const db = await getDatabase();
  await db.execAsync(SCHEMA);
}

export async function saveTranslation(
  result: TranslationResult,
  inputType: 'text' | 'voice',
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

export async function listHistory(limit = 20): Promise<HistoryEntry[]> {
  await ensure();
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    source_language: string;
    target_language: string;
    source_text: string;
    translated_text: string;
    input_type: string;
    created_at: string;
  }>('SELECT * FROM translations ORDER BY created_at DESC LIMIT ?', limit);

  return rows.map((row) => ({
    id: row.id,
    sourceLanguage: row.source_language,
    targetLanguage: row.target_language,
    sourceText: row.source_text,
    translatedText: row.translated_text,
    inputType: row.input_type === 'voice' ? 'voice' : 'text',
    createdAt: row.created_at,
  }));
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM translations WHERE id = ?', id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM translations');
}
