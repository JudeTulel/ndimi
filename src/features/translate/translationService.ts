import { cancel, loadModel, translate, unloadModel } from '@qvac/sdk';
import { toRuntimePath } from '../../core/fs/paths';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

/**
 * On-device translation adapter.
 *
 * The catalog translation models are TranslatePsy-AfriSLM GGUFs: quantized LLMs
 * running on the llamacpp addon, not the nmt addon. The runtime recognises the
 * artifact by filename and swaps in the model card's exact prompt template and
 * greedy generation parameters, so the app only supplies text and a language
 * pair.
 */

export type TranslationLanguage = 'en' | 'sw';

type Loaded = { catalogId: string; path: string; installedAt: string; modelId: string };

let loaded: Loaded | null = null;

/** Cancellation state for the in-flight request, if any. */
let inFlight: { requestId: string; cancelled: boolean } | null = null;

export function installedTranslationModel(): CatalogModel | undefined {
  const snapshot = getSnapshot();
  return CATALOG.find((m) => m.task === 'translation' && snapshot[m.id]?.status === 'installed');
}

/**
 * Picks the installed translation model and keeps it warm. Safe to call on every
 * request: a warm model from the same install returns immediately, and a
 * reinstall (new `installedAt`, or a different artifact) forces a reload because
 * the old handle points at a file that was replaced underneath it.
 */
async function ensureModel(): Promise<Loaded> {
  const model = installedTranslationModel();
  if (!model) {
    throw new Error('No translation model installed. Install one in Settings › Models.');
  }

  const state = getSnapshot()[model.id];
  if (state?.status !== 'installed') {
    throw new Error('The translation model is not installed.');
  }

  if (
    loaded &&
    loaded.catalogId === model.id &&
    loaded.installedAt === state.installedAt
  ) {
    return loaded;
  }

  if (loaded) {
    await unloadModel({ modelId: loaded.modelId }).catch(() => {});
    loaded = null;
  }

  const path = toRuntimePath(state.localPath);
  const modelId = await loadModel({
    modelSrc: path,
    modelType: 'llamacpp-completion',
    modelConfig: {
      // A translation turn is a short system+user pair; 2048 leaves room for the
      // prompt plus a full paragraph of output.
      ctx_size: 2048,
      verbosity: 0,
    },
  });

  loaded = { catalogId: model.id, path, installedAt: state.installedAt, modelId };
  return loaded;
}

export async function unloadTranslationModel(): Promise<void> {
  if (!loaded) return;
  await unloadModel({ modelId: loaded.modelId }).catch(() => {});
  loaded = null;
}

/** Called when the installed model set changes so a stale handle is not reused. */
export function forgetTranslationModel(): void {
  loaded = null;
}

export type TranslateSignal = { cancelled: boolean };

/**
 * Streams a translation. `onDelta` receives the growing text so the caller can
 * render tokens as they decode. Resolves with the final text.
 */
export async function translateText(
  input: { text: string; from: TranslationLanguage; to: TranslationLanguage },
  onDelta: (partial: string) => void,
  signal: TranslateSignal = { cancelled: false }
): Promise<string> {
  const warm = await ensureModel();
  if (signal.cancelled) return '';

  const run = translate({
    modelId: warm.modelId,
    modelType: 'llamacpp-completion',
    text: input.text,
    from: input.from,
    to: input.to,
    stream: true,
  });

  inFlight = { requestId: run.requestId, cancelled: false };

  let full = '';
  try {
    for await (const token of run.tokenStream) {
      if (signal.cancelled) {
        await cancel({ requestId: run.requestId }).catch(() => {});
        break;
      }
      full += token;
      onDelta(full);
    }
  } finally {
    inFlight = null;
  }

  return full.trim();
}

/** Stops the in-flight translation, if any. */
export async function cancelTranslation(): Promise<void> {
  if (!inFlight) return;
  inFlight.cancelled = true;
  await cancel({ requestId: inFlight.requestId }).catch(() => {});
}
