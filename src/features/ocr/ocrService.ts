import { loadModel, ocr, unloadModel } from '@qvac/sdk';
import * as FileSystem from 'expo-file-system/legacy';
import { toRuntimePath } from '../../core/fs/paths';
import { getOfflineMode } from '../../core/db/settings';
import { getSnapshot } from '../models/modelStore';

type Loaded = { modelId: string };

let loaded: Loaded | null = null;

/**
 * OCR runs the ggml-ocr easyocr pipeline: a CRAFT detector plus a CRNN Latin
 * recognizer, both GGUF. Passing the recognizer's `registry://` source lets the
 * runtime derive the matching CRAFT detector and SHA-256-verify both itself, so
 * the app never pre-downloads them.
 */
const RECOGNIZER = 'registry://s3/qvac_models_compiled/ocr/gguf/easyocr/2026-05-14/latin_g2.gguf';

const LATIN_SCRIPTS = new Set(['latin']);

/**
 * The recognizer only covers Latin script. Reads better as a capability check on
 * the artifact than as a hardcoded `true`.
 */
export function ocrReady(): boolean {
  const file = RECOGNIZER.split('/').pop() ?? '';
  return LATIN_SCRIPTS.has(file.split('_')[0]);
}

/**
 * True once this run has successfully loaded the OCR pair. The runtime caches the
 * registry weights after the first load, so a cold first run needs connectivity
 * and offline mode has to refuse rather than hang on a fetch.
 */
export function ocrWarm(): boolean {
  return loaded !== null;
}

async function ensureModel(): Promise<string> {
  if (loaded) return loaded.modelId;

  // Prefer the installed, checksummed local copy. Falling back to the
  // `registry://` source is what made a cold run a silent multi-minute download
  // with no progress: the runtime fetched both artifacts itself. Now that the
  // catalog downloads them, the normal path is a plain local file.
  const state = getSnapshot()['ocr-latin-g2'];
  const modelSrc =
    state?.status === 'installed' ? toRuntimePath(state.localPath) : RECOGNIZER;

  const modelId = await loadModel({
    modelSrc,
    modelType: 'ggml-ocr',
    modelConfig: {
      pipelineType: 'easyocr',
      langList: ['en'],
      // Mobile memory cannot hold the 2560 default detection canvas.
      canvasSize: 1280,
    },
  });
  loaded = { modelId };
  return modelId;
}

export async function unloadOcrModel(): Promise<void> {
  if (!loaded) return;
  await unloadModel({ modelId: loaded.modelId }).catch(() => {});
  loaded = null;
}

/**
 * Reads text from a JPEG given as base64.
 *
 * `ocr()` sends any string down the runtime's `filePath` branch, which stats the
 * path — so the capture has to be materialised on disk first rather than handed
 * over as a `data:` URL. Returns '' when the image held no text.
 */
export async function readText(base64Jpeg: string): Promise<string> {
  const cold = !loaded;
  if (cold && (await getOfflineMode())) {
    throw new Error(
      'OCR needs one online run to fetch its weights. Turn offline mode off and try again.'
    );
  }

  const modelId = await ensureModel();
  const tempUri = `${FileSystem.cacheDirectory}ocr-${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(tempUri, base64Jpeg, {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    const run = ocr({
      modelId,
      image: toRuntimePath(tempUri),
      options: { paragraph: true },
    });
    const blocks = await run.blocks;
    return blocks
      .map((block) => block.text)
      .join('\n')
      .trim();
  } finally {
    await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
  }
}
