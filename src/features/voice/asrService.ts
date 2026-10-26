import { cancel, loadModel, transcribe, unloadModel } from '@qvac/sdk';
import { toRuntimePath } from '../../core/fs/paths';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

/**
 * Whisper-on-device speech recognition adapter.
 *
 * The addon takes a file path and decodes it itself: `@qvac/decoder-audio` runs
 * FFmpeg to mono 16 kHz s16le, which is what whisper.cpp wants, so the app never
 * resamples. Anything other than a file path (base64/raw buffers) skips that
 * decode, so a file is always passed.
 */

type Loaded = { catalogId: string; path: string; installedAt: string; modelId: string };

let loaded: Loaded | null = null;

export function installedAsrModel(): CatalogModel | undefined {
  const snapshot = getSnapshot();
  return CATALOG.find((m) => m.task === 'asr' && snapshot[m.id]?.status === 'installed');
}

async function ensureModel(language: string): Promise<Loaded> {
  const model = installedAsrModel();
  if (!model) {
    throw new Error('No speech model installed. Install one in Settings › Models.');
  }
  const state = getSnapshot()[model.id];
  if (state?.status !== 'installed') {
    throw new Error('The speech model is not installed.');
  }

  if (loaded && loaded.catalogId === model.id && loaded.installedAt === state.installedAt) {
    return loaded;
  }
  if (loaded) {
    await unloadModel({ modelId: loaded.modelId }).catch(() => {});
    loaded = null;
  }

  const path = toRuntimePath(state.localPath);
  const modelId = await loadModel({
    modelSrc: path,
    modelType: 'whispercpp-transcription',
    modelConfig: {
      language,
      strategy: 'greedy',
      // Utterance-length recordings, no subtitle machinery needed.
      no_timestamps: true,
      print_progress: false,
      print_realtime: false,
      print_special: false,
      n_threads: 4,
    },
  });

  loaded = { catalogId: model.id, path, installedAt: state.installedAt, modelId };
  return loaded;
}

export async function unloadAsrModel(): Promise<void> {
  if (!loaded) return;
  await unloadModel({ modelId: loaded.modelId }).catch(() => {});
  loaded = null;
}

/** Drops the cached handle after the installed set changes. */
export function forgetAsrModel(): void {
  loaded = null;
}

/**
 * Transcribes a recorded file. `signal.cancelled` aborts the decode; the caller
 * discards the (possibly partial) result.
 */
export async function transcribeFile(
  uri: string,
  language: string,
  signal: { cancelled: boolean } = { cancelled: false }
): Promise<string> {
  const warm = await ensureModel(language);
  if (signal.cancelled) return '';

  const call = transcribe({ modelId: warm.modelId, audioChunk: toRuntimePath(uri) });
  const onAbort = () => {
    void cancel({ requestId: call.requestId }).catch(() => {});
  };
  if (signal.cancelled) onAbort();

  const text = await call;
  return text.trim();
}
