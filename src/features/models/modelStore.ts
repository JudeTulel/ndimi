import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../../core/db/database';
import {
  CATALOG,
  downloadUrl,
  type CatalogModel,
  type ModelTask,
} from './catalog';

export type ModelState =
  | { status: 'absent' }
  | { status: 'downloading'; progress: number; bytesWritten: number; totalBytes: number }
  | { status: 'verifying' }
  | { status: 'installed'; localPath: string; installedAt: string }
  | { status: 'failed'; message: string };

export type ModelStatusMap = Record<string, ModelState>;

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

function partUri(model: CatalogModel): string {
  return `${MODEL_DIR}${model.id}.part`;
}

function finalUri(model: CatalogModel): string {
  return `${MODEL_DIR}${model.id}`;
}

const downloaders = new Map<string, FileSystem.DownloadResumable>();
const listeners = new Set<(map: ModelStatusMap) => void>();
let snapshot: ModelStatusMap = {};

function emit() {
  listeners.forEach((fn) => fn({ ...snapshot }));
}

function setState(id: string, state: ModelState) {
  snapshot = { ...snapshot, [id]: state };
  emit();
}

export function subscribe(fn: (map: ModelStatusMap) => void): () => void {
  listeners.add(fn);
  fn({ ...snapshot });
  return () => {
    listeners.delete(fn);
  };
}

export function getSnapshot(): ModelStatusMap {
  return { ...snapshot };
}

async function ensureSchema() {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY NOT NULL,
      task TEXT NOT NULL,
      local_path TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      installed_at TEXT NOT NULL
    );
  `);
}

async function fileExists(uri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

/**
 * Restore installed state from SQLite and reconcile it against disk, so a row
 * left behind by a failed atomic move does not present a phantom install.
 */
export async function hydrate(): Promise<void> {
  await ensureSchema();
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    local_path: string;
    installed_at: string;
  }>('SELECT id, local_path, installed_at FROM models');

  const next: ModelStatusMap = {};
  for (const row of rows) {
    if (await fileExists(row.local_path)) {
      next[row.id] = {
        status: 'installed',
        localPath: row.local_path,
        installedAt: row.installed_at,
      };
    } else {
      await db.runAsync('DELETE FROM models WHERE id = ?', row.id);
    }
  }
  // A `.part` file with no row is an interrupted download; report it as failed
  // so the UI offers retry rather than silently showing nothing.
  for (const model of CATALOG) {
    if (next[model.id]) continue;
    if (await fileExists(partUri(model))) {
      next[model.id] = { status: 'failed', message: 'Download was interrupted.' };
    }
  }
  snapshot = next;
  emit();
}

export function hasInstalledTask(map: ModelStatusMap, task: ModelTask): boolean {
  return CATALOG.some((m) => m.task === task && map[m.id]?.status === 'installed');
}

export async function freeDiskBytes(): Promise<number> {
  return FileSystem.getFreeDiskStorageAsync();
}

export async function startDownload(model: CatalogModel): Promise<void> {
  if (snapshot[model.id]?.status === 'downloading') return;
  if (snapshot[model.id]?.status === 'installed') return;

  await ensureSchema();
  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true }).catch(() => {});
  if (await fileExists(partUri(model))) {
    await FileSystem.deleteAsync(partUri(model), { idempotent: true });
  }
  if (await fileExists(finalUri(model))) {
    await FileSystem.deleteAsync(finalUri(model), { idempotent: true });
  }

  setState(model.id, {
    status: 'downloading',
    progress: 0,
    bytesWritten: 0,
    totalBytes: model.sizeBytes,
  });

  const resumable = FileSystem.createDownloadResumable(
    downloadUrl(model),
    partUri(model),
    {},
    (data) => {
      const total = data.totalBytesExpectedToWrite || model.sizeBytes;
      setState(model.id, {
        status: 'downloading',
        progress: total > 0 ? data.totalBytesWritten / total : 0,
        bytesWritten: data.totalBytesWritten,
        totalBytes: total,
      });
    }
  );
  downloaders.set(model.id, resumable);

  try {
    const result = await resumable.downloadAsync();
    if (!result) {
      // pauseAsync() resolves downloadAsync with undefined; leave state alone.
      if (snapshot[model.id]?.status === 'downloading') {
        setState(model.id, { status: 'failed', message: 'Download paused.' });
      }
      return;
    }
    downloaders.delete(model.id);
    await verifyAndInstall(model);
  } catch (error) {
    downloaders.delete(model.id);
    setState(model.id, {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Download failed.',
    });
  }
}

async function verifyAndInstall(model: CatalogModel): Promise<void> {
  setState(model.id, { status: 'verifying' });

  const info = await FileSystem.getInfoAsync(partUri(model));
  if (!info.exists) {
    setState(model.id, { status: 'failed', message: 'Downloaded file is missing.' });
    return;
  }
  if (typeof info.size === 'number' && info.size !== model.sizeBytes) {
    await FileSystem.deleteAsync(partUri(model), { idempotent: true });
    setState(model.id, {
      status: 'failed',
      message: `Size mismatch: expected ${model.sizeBytes} bytes, got ${info.size}.`,
    });
    return;
  }

  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    await readFileBytes(partUri(model))
  );
  const actual = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (actual !== model.sha256) {
    await FileSystem.deleteAsync(partUri(model), { idempotent: true });
    setState(model.id, { status: 'failed', message: 'SHA-256 verification failed.' });
    return;
  }

  // Atomic-ish install: move the verified part file into its final name, then
  // record it. A crash between the two leaves a file the next hydrate deletes.
  await FileSystem.moveAsync({ from: partUri(model), to: finalUri(model) });
  const installedAt = new Date().toISOString();

  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO models (id, task, local_path, sha256, installed_at) VALUES (?, ?, ?, ?, ?)',
    model.id,
    model.task,
    finalUri(model),
    model.sha256,
    installedAt
  );

  setState(model.id, {
    status: 'installed',
    localPath: finalUri(model),
    installedAt,
  });
}

/**
 * Reading the whole artifact into one array gives expo-crypto a single digest
 * input; model files are hundreds of MB, which stays inside RN's array limits.
 */
async function readFileBytes(uri: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const info = await FileSystem.getInfoAsync(uri);
  const total = typeof info.size === 'number' ? info.size : 0;
  const chunkSize = 4 * 1024 * 1024;

  for (let offset = 0; offset < total; offset += chunkSize) {
    const chunk = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length: Math.min(chunkSize, total - offset),
    });
    chunks.push(base64ToBytes(chunk));
  }

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let acc = 0;
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    acc = (acc << 6) | alphabet.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, index);
}

export async function cancelDownload(id: string): Promise<void> {
  const downloader = downloaders.get(id);
  if (!downloader) return;
  downloaders.delete(id);
  try {
    await downloader.pauseAsync();
  } catch {
    // ignore — state is set below regardless
  }
  const model = CATALOG.find((m) => m.id === id);
  setState(id, { status: 'failed', message: 'Download cancelled.' });
  if (model && (await fileExists(partUri(model)))) {
    await FileSystem.deleteAsync(partUri(model), { idempotent: true });
  }
}

export async function remove(model: CatalogModel): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM models WHERE id = ?', model.id);
  await FileSystem.deleteAsync(finalUri(model), { idempotent: true });
  await FileSystem.deleteAsync(partUri(model), { idempotent: true });
  setState(model.id, { status: 'absent' });
}
