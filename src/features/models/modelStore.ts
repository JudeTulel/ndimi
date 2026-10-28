import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../../core/db/database';
import { unloadAsrModel } from '../voice/asrService';
import { unloadTranslationModel } from '../translate/translationService';
import { unloadChatModel } from '../chat/chatService';
import { unloadOcrModel } from '../ocr/ocrService';
import { toRuntimePath } from '../../core/fs/paths';
import { readFileBytes } from './bytes';
import { cancel, downloadAsset, loadModel, unloadModel } from '@qvac/sdk';
import {
  CATALOG,
  downloadUrl,
  type CatalogModel,
  type ModelTask,
} from './catalog';

export type ModelState =
  | { status: 'absent' }
  | {
      status: 'downloading';
      progress: number;
      bytesWritten: number;
      totalBytes: number;
    }
  /** Partial bytes on disk from an earlier run; `startDownload` continues them. */
  | { status: 'paused'; bytesWritten: number; totalBytes: number }
  | { status: 'verifying' }
  | { status: 'installed'; localPath: string; installedAt: string }
  | { status: 'failed'; message: string };

export type ModelStatusMap = Record<string, ModelState>;

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

/**
 * Installed artifacts keep their upstream filename.
 *
 * The QVAC runtime identifies TranslatePsy weights by artifact basename (matched
 * against `/^TranslatePsy-AfriSLM-…-imat\.gguf$/i`) and swaps in the model card's
 * prompt template when it matches. Naming the file after the catalog id would
 * quietly fall back to the generic LLM translate prompt, so the basename has to
 * survive the download.
 */
function partUri(model: CatalogModel): string {
  return `${MODEL_DIR}${model.filename}.part`;
}

function finalUri(model: CatalogModel): string {
  return `${MODEL_DIR}${model.filename}`;
}

/**
 * The projector sits beside the weights under its own published name. Deriving the
 * path rather than storing a column keeps the schema unchanged; there is no basename
 * detection to satisfy because the runtime is handed this path explicitly.
 */
function projectionUri(model: CatalogModel): string | null {
  return model.projection ? `${MODEL_DIR}${model.projection.filename}` : null;
}

const downloaders = new Map<string, FileSystem.DownloadResumable>();
/** Cancellers for SDK-driven (`registry://`) asset fetches, keyed by model id. */
const assetTasks = new Map<string, () => void>();
const listeners = new Set<(map: ModelStatusMap) => void>();
let snapshot: ModelStatusMap = {};

/**
 * Rebuilds a resumable for bytes already on disk.
 *
 * The native task that produced a `.part` file dies with the app, so resuming
 * after a restart needs a fresh resumable that continues from the file's current
 * length. `resumeData` is the offset: the native layer turns it into a `Range`
 * header *and* opens the file in append mode. Passing a Range header instead
 * would fetch the tail but truncate the file, so it has to be resumeData.
 * Returns null when the partial is already complete (e.g. the app died between
 * the last byte and verification) — the caller then verifies instead.
 */
async function resumableFrom(model: CatalogModel): Promise<FileSystem.DownloadResumable | null> {
  const info = await FileSystem.getInfoAsync(partUri(model));
  if (!info.exists) return null;
  const have = info.size ?? 0;
  if (have >= model.sizeBytes) return null;

  return FileSystem.createDownloadResumable(
    downloadUrl(model),
    partUri(model),
    {},
    () => onProgress(model),
    String(have)
  );
}

function onProgress(model: CatalogModel) {
  // The native counter is not reliable as a file position: in append mode it
  // already carries the resumed bytes and can run past the real length. The file
  // itself is the ground truth, so sample it — throttled, since progress
  // callbacks fire faster than a stat is worth.
  const now = Date.now();
  if (now - lastSampleAt < 400) return;
  lastSampleAt = now;

  void FileSystem.getInfoAsync(partUri(model)).then((info) => {
    if (!info.exists) return;
    const written = Math.min(info.size ?? 0, model.sizeBytes);
    setState(model.id, {
      status: 'downloading',
      progress: model.sizeBytes > 0 ? written / model.sizeBytes : 0,
      bytesWritten: written,
      totalBytes: model.sizeBytes,
    });
  });
}

let lastSampleAt = 0;

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

/**
 * Records an adopted (user-supplied) file as an install of a catalog entry.
 *
 * The row id is the catalog id, so every existing lookup — the task pickers, the
 * model list, the inference adapters — resolves an adopted file exactly like a
 * downloaded one. A previously installed copy of the same entry is unloaded and
 * deleted first: two rows cannot share the primary key, and silently leaving the old
 * file behind would keep two copies of a 641 MB artifact on disk.
 */
export async function adoptInstalled(
  model: CatalogModel,
  localPath: string,
  sha256: string
): Promise<void> {
  if (model.task === 'translation') await unloadTranslationModel();
  if (model.task === 'asr') await unloadAsrModel();
  if (model.task === 'chat') await unloadChatModel();
  if (model.task === 'ocr') await unloadOcrModel();

  await ensureSchema();
  const db = await getDatabase();
  const previous = await db.getFirstAsync<{ local_path: string }>(
    'SELECT local_path FROM models WHERE id = ?',
    model.id
  );
  if (previous?.local_path && previous.local_path !== localPath) {
    if (!previous.local_path.startsWith('registry://')) {
      await FileSystem.deleteAsync(previous.local_path, { idempotent: true }).catch(() => {});
    }
  }

  const installedAt = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO models (id, task, local_path, sha256, installed_at) VALUES (?, ?, ?, ?, ?)',
    model.id,
    model.task,
    localPath,
    sha256,
    installedAt
  );

  setState(model.id, { status: 'installed', localPath, installedAt });
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
  // `registry://` artifacts live in the runtime's own cache, not on a path
  // expo-file-system can stat, so treat a recorded row as the proof of presence.
  if (uri.startsWith('registry://')) return true;
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
  // A `.part` file with no row is an interrupted download. Report it as paused
  // with its real length so the UI offers resume and the progress bar restarts
  // where it left off instead of at zero.
  for (const model of CATALOG) {
    if (next[model.id]) continue;
    if (model.runtimeManaged) continue;
    const info = await FileSystem.getInfoAsync(partUri(model));
    if (!info.exists) continue;
    next[model.id] = {
      status: 'paused',
      bytesWritten: info.size ?? 0,
      totalBytes: model.sizeBytes,
    };
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

  // `registry://` artifacts are fetched by the QVAC runtime itself (expo-file-system
  // cannot resolve the scheme) and it keeps them in its own cache, so there is no
  // part file here: hand the load over, then record the install.
  if (model.runtimeManaged) {
    await installRuntimeManaged(model);
    return;
  }

  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true }).catch(() => {});

  // Keep a stale final file from shadowing the download, but never delete the
  // `.part`: those bytes are what makes a retry a resume rather than a restart.
  if (await fileExists(finalUri(model))) {
    await FileSystem.deleteAsync(finalUri(model), { idempotent: true });
  }

  const info = await FileSystem.getInfoAsync(partUri(model));
  if (info.exists && (info.size ?? 0) >= model.sizeBytes) {
    // Everything arrived but the app stopped before verification.
    downloaders.delete(model.id);
    await verifyAndInstall(model);
    return;
  }

  const existing = info.exists ? (info.size ?? 0) : 0;

  setState(model.id, {
    status: 'downloading',
    progress: existing / model.sizeBytes,
    bytesWritten: existing,
    totalBytes: model.sizeBytes,
  });

  const resumable = await resumableFrom(model);
  if (!resumable) {
    setState(model.id, {
      status: 'downloading',
      progress: 0,
      bytesWritten: 0,
      totalBytes: model.sizeBytes,
    });
  }
  downloaders.set(
    model.id,
    resumable ??
      FileSystem.createDownloadResumable(
        downloadUrl(model),
        partUri(model),
        {},
        () => onProgress(model)
      )
  );

  try {
    const result = await downloaders.get(model.id)!.downloadAsync();
    if (!result) {
      // pauseAsync() resolves downloadAsync with undefined; the partial file is
      // kept and reported as paused so the same node resumes.
      const bytes = await sizeOf(partUri(model));
      setState(model.id, {
        status: 'paused',
        bytesWritten: bytes,
        totalBytes: model.sizeBytes,
      });
      return;
    }
    downloaders.delete(model.id);
    await verifyAndInstall(model);

    // The projector is what makes an image reach the weights, so it is part of the
    // install rather than an optional extra. Fetched after the main artifact to keep
    // one transfer at a time; the total is shown as a single figure.
    if (model.projection) {
      await fetchProjection(model);
    }
  } catch (error) {
    downloaders.delete(model.id);
    // Bytes fetched so far are still good, so report a resumable pause instead of
    // a plain failure whenever something is on disk.
    const bytes = await sizeOf(partUri(model));
    if (bytes > 0) {
      setState(model.id, {
        status: 'paused',
        bytesWritten: bytes,
        totalBytes: model.sizeBytes,
      });
      return;
    }
    setState(model.id, {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Download failed.',
    });
  }
}

async function sizeOf(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

/**
 * Fetches and verifies the projector companion.
 *
 * A checksum mismatch deletes both halves: weights without their projector load fine
 * but silently see nothing, and that is worse than a clean failure the user can retry.
 */
async function fetchProjection(model: CatalogModel): Promise<void> {
  const projection = model.projection;
  const target = projectionUri(model);
  if (!projection || !target) return;

  setState(model.id, {
    status: 'downloading',
    progress: 0,
    bytesWritten: 0,
    totalBytes: projection.sizeBytes,
  });

  const part = `${target}.part`;
  await FileSystem.deleteAsync(part, { idempotent: true }).catch(() => {});

  try {
    const task = FileSystem.createDownloadResumable(
      projection.url,
      part,
      {},
      (data) => {
        const total = data.totalBytesExpectedToWrite || projection.sizeBytes;
        setState(model.id, {
          status: 'downloading',
          progress: total > 0 ? data.totalBytesWritten / total : 0,
          bytesWritten: data.totalBytesWritten,
          totalBytes: total,
        });
      }
    );
    downloaders.set(model.id, task);
    const result = await task.downloadAsync();
    downloaders.delete(model.id);
    if (!result) return;

    const actual = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      (await readFileBytes(part)) as unknown as BufferSource
    );
    const hex = Array.from(new Uint8Array(actual))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hex !== projection.sha256) {
      await FileSystem.deleteAsync(part, { idempotent: true }).catch(() => {});
      await FileSystem.deleteAsync(finalUri(model), { idempotent: true }).catch(() => {});
      setState(model.id, {
        status: 'failed',
        message: 'The image projector failed its checksum, so the model was removed.',
      });
      return;
    }

    await FileSystem.moveAsync({ from: part, to: target });
    const state = snapshot[model.id];
    if (state?.status !== 'installed') return;
    setState(model.id, state);
  } catch (error) {
    downloaders.delete(model.id);
    setState(model.id, {
      status: 'failed',
      message: `The weights are installed but the image projector failed: ${
        error instanceof Error ? error.message : 'download failed'
      }`,
    });
  }
}

/**
 * Installs optimistically.
 *
 * Hashing a 641 MB file through expo-crypto is slow: the whole artifact has to be
 * marshalled into JS in 4 MB base64 chunks and digested there, which is the long
 * "Verifying SHA-256…" stall. So the mandatory gates are the cheap ones — the byte
 * count must match and the runtime must accept the load — and the model goes Ready
 * on those. The checksum then runs in the background and demotes the model if it
 * disagrees, which is the only case that can.
 */
async function verifyAndInstall(model: CatalogModel): Promise<void> {
  setState(model.id, { status: 'verifying' });

  const info = await FileSystem.getInfoAsync(partUri(model));
  if (!info.exists) {
    setState(model.id, { status: 'failed', message: 'Downloaded file is missing.' });
    return;
  }
  const size = info.size;
  if (typeof size === 'number' && size !== model.sizeBytes) {
    // Short means the transfer ended early; keep the bytes so the next attempt
    // resumes from here instead of starting over.
    if (size < model.sizeBytes) {
      setState(model.id, {
        status: 'paused',
        bytesWritten: size,
        totalBytes: model.sizeBytes,
      });
      return;
    }
    await FileSystem.deleteAsync(partUri(model), { idempotent: true });
    setState(model.id, {
      status: 'failed',
      message: `Size mismatch: expected ${model.sizeBytes} bytes, got ${size}.`,
    });
    return;
  }

  // Atomic-ish install: move the part file into its final name, then record it. A
  // crash between the two leaves a file the next hydrate deletes.
  await FileSystem.moveAsync({ from: partUri(model), to: finalUri(model) });

  // A matching byte count is not proof of integrity, but a file can also match and
  // still fail to open in the addon — so the load is the gate that has to happen
  // now. The checksum is the slow one and runs after.
  try {
    const probeId = await loadRuntimeModel(model);
    await unloadModel({ modelId: probeId }).catch(() => {});
  } catch (error) {
    await FileSystem.deleteAsync(finalUri(model), { idempotent: true });
    setState(model.id, {
      status: 'failed',
      message: `Downloaded, but the runtime rejected it: ${
        error instanceof Error ? error.message : 'load failed'
      }`,
    });
    return;
  }

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

  void verifyChecksum(model, installedAt);
}

/**
 * Background integrity check against the catalog's published digest. Runs after
 * the model is already usable; a mismatch unloads, deletes and demotes it so the
 * next run cannot use corrupted weights.
 */
export async function verifyChecksum(model: CatalogModel, installedAt: string): Promise<boolean> {
  let actual: string;
  try {
    if (!(await fileExists(finalUri(model)))) return false;
    const digest = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      (await readFileBytes(finalUri(model))) as unknown as BufferSource
    );
    actual = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    setState(model.id, {
      status: 'failed',
      message: `Could not checksum the download: ${
        error instanceof Error ? error.message : 'read failed'
      }`,
    });
    return false;
  }

  if (actual === model.sha256) {
    setState(model.id, { status: 'installed', localPath: finalUri(model), installedAt });
    return true;
  }

  // Demote only if the same install is still the current one — a reinstall in the
  // meantime has already replaced the file and its own check decides.
  const current = getSnapshot()[model.id];
  if (current?.status === 'installed' && current.installedAt !== installedAt) return false;

  if (model.task === 'translation') await unloadTranslationModel();
  if (model.task === 'asr') await unloadAsrModel();
  if (model.task === 'chat') await unloadChatModel();
  if (model.task === 'ocr') await unloadOcrModel();

  await FileSystem.deleteAsync(finalUri(model), { idempotent: true });
  const db = await getDatabase();
  await db.runAsync('DELETE FROM models WHERE id = ?', model.id);
  setState(model.id, { status: 'failed', message: 'SHA-256 verification failed.' });
  return false;
}

/**
 * Installs a `registry://` artifact.
 *
 * A plain `loadModel` was the whole bug here: the runtime fetched both OCR
 * artifacts inside the load, so a cold install was a silent multi-minute wait with
 * no progress, no cancel and no resume. `downloadAsset` separates the fetch, and it
 * reports real byte counts for registry sources. The load afterwards is then local.
 */
async function installRuntimeManaged(model: CatalogModel): Promise<void> {
  // OCR is a pair: the CRNN recognizer is useless without the CRAFT detector, and
  // the load resolves the partner itself. Fetch both here so neither is left to
  // happen inside a load.
  const sources =
    model.task === 'ocr'
      ? CATALOG.filter((m) => m.task === 'ocr').map((m) => m.url)
      : [model.url];
  const total = CATALOG.filter((m) => m.task === model.task)
    .filter((m) => sources.includes(m.url))
    .reduce((sum, m) => sum + m.sizeBytes, 0);

  setState(model.id, { status: 'downloading', progress: 0, bytesWritten: 0, totalBytes: total });

  const done = new Map<string, number>();
  try {
    const tasks = sources.map((src) =>
      downloadAsset({
        assetSrc: src,
        onProgress: (update) => {
          done.set(src, update.downloaded);
          const written = [...done.values()].reduce((a, b) => a + b, 0);
          setState(model.id, {
            status: 'downloading',
            progress: total > 0 ? Math.min(written / total, 1) : 0,
            bytesWritten: written,
            totalBytes: total,
          });
        },
      })
    );
    assetTasks.set(model.id, () => tasks.forEach((t) => cancel({ requestId: t.requestId })));
    await Promise.all(tasks);
    assetTasks.delete(model.id);
  } catch (error) {
    assetTasks.delete(model.id);
    const current = getSnapshot()[model.id];
    if (current?.status !== 'downloading') return; // cancelled; state already set
    setState(model.id, {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Could not fetch the model.',
    });
    return;
  }

  setState(model.id, { status: 'verifying' });
  try {
    const modelId = await loadRuntimeModel(model);
    await unloadModel({ modelId }).catch(() => {});
  } catch (error) {
    setState(model.id, {
      status: 'failed',
      message: `Fetched, but the runtime rejected it: ${
        error instanceof Error ? error.message : 'load failed'
      }`,
    });
    return;
  }

  const installedAt = new Date().toISOString();
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO models (id, task, local_path, sha256, installed_at) VALUES (?, ?, ?, ?, ?)',
    model.id,
    model.task,
    model.url,
    model.sha256,
    installedAt
  );

  setState(model.id, { status: 'installed', localPath: model.url, installedAt });
}

/**
 * Loads an installed artifact through the same config the inference path uses, so
 * the smoke test proves the real path rather than a permissive one.
 */
async function loadRuntimeModel(model: CatalogModel): Promise<string> {
  return loadRuntimeModelAt(model, finalUri(model));
}

/**
 * Loads an arbitrary file through the config its task uses. Exposed so an adopted
 * (user-supplied) copy is probed exactly like a downloaded one instead of through a
 * second, subtly different load.
 */
export async function loadRuntimeModelAt(model: CatalogModel, path: string): Promise<string> {
  // A multimodal entry is a completion model with a projector, not an OCR pipeline:
  // it answers free-form prompts about the image rather than returning text blocks.
  if (model.projection) {
    const projector = projectionUri(model);
    return loadModel({
      modelSrc: toRuntimePath(path),
      modelType: 'llamacpp-completion',
      modelConfig: {
        ctx_size: 2048,
        ...(projector && (await fileExists(projector))
          ? { projectionModelSrc: toRuntimePath(projector) }
          : {}),
      },
    });
  }

  switch (model.task) {
    case 'ocr':
      return loadModel({
        modelSrc: model.runtimeManaged ? model.url : toRuntimePath(path),
        modelType: 'ggml-ocr',
        modelConfig: { pipelineType: 'easyocr', langList: ['en'], canvasSize: 1280 },
      });
    case 'translation':
      return loadModel({
        modelSrc: toRuntimePath(path),
        modelType: 'llamacpp-completion',
        modelConfig: { ctx_size: 2048, verbosity: 0 },
      });
    case 'chat':
      return loadModel({
        modelSrc: toRuntimePath(path),
        modelType: 'llamacpp-completion',
        modelConfig: { ctx_size: 2048 },
      });
    case 'asr':
      return loadModel({
        modelSrc: toRuntimePath(path),
        modelType: 'whispercpp-transcription',
        modelConfig: { strategy: 'greedy', no_timestamps: true, n_threads: 4 },
      });
  }
}

/**
 * Cancelling parks the download instead of discarding it: the bytes on disk are
 * kept and the node offers Resume. `remove()` is the way to reclaim the space.
 */
export async function cancelDownload(id: string): Promise<void> {
  const model = CATALOG.find((m) => m.id === id);
  if (!model) return;

  // Registry fetches are owned by the SDK: cancel the request and stop there. The
  // runtime keeps its own cache, so there is no partial file for the app to keep.
  const assetCancel = assetTasks.get(id);
  if (assetCancel) {
    assetTasks.delete(id);
    assetCancel();
    setState(id, { status: 'absent' });
    return;
  }

  const downloader = downloaders.get(id);
  downloaders.delete(id);
  if (downloader) {
    try {
      await downloader.pauseAsync();
    } catch {
      // ignore — the state below is what the UI reads
    }
  }

  const bytes = await sizeOf(partUri(model));
  if (bytes > 0) {
    setState(id, { status: 'paused', bytesWritten: bytes, totalBytes: model.sizeBytes });
  } else {
    setState(id, { status: 'absent' });
  }
}

export async function remove(model: CatalogModel): Promise<void> {
  // Drop any warm runtime handle first: unloading after the file is gone leaves
  // the addon holding a descriptor to a deleted path.
  if (model.task === 'translation') await unloadTranslationModel();
  if (model.task === 'asr') await unloadAsrModel();
  if (model.task === 'chat') await unloadChatModel();
  if (model.task === 'ocr') await unloadOcrModel();

  const db = await getDatabase();
  await db.runAsync('DELETE FROM models WHERE id = ?', model.id);

  // Registry weights stay in the runtime's shared cache — another catalog entry
  // may depend on the same artifact — so only the app-managed files are deleted.
  if (!model.runtimeManaged) {
    await FileSystem.deleteAsync(finalUri(model), { idempotent: true });
    await FileSystem.deleteAsync(partUri(model), { idempotent: true });
  }

  // The projector is only useful to this model, and would otherwise be stranded.
  const projector = projectionUri(model);
  if (projector) {
    await FileSystem.deleteAsync(projector, { idempotent: true });
    await FileSystem.deleteAsync(`${projector}.part`, { idempotent: true });
  }
  setState(model.id, { status: 'absent' });
}
