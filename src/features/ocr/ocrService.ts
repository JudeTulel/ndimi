import { completion, loadModel, ocr, unloadModel } from '@qvac/sdk';
import * as FileSystem from 'expo-file-system/legacy';
import { toRuntimePath } from '../../core/fs/paths';
import { getOfflineMode } from '../../core/db/settings';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

type Loaded = { modelId: string };

let loaded: Loaded | null = null;
/** The entry behind the warm handle; decides how a read is worded. */
let loadedModel: CatalogModel | null = null;

/**
 * OCR runs the ggml-ocr easyocr pipeline: a CRAFT detector plus a CRNN Latin
 * recognizer, both GGUF. Passing the recognizer's `registry://` source lets the
 * runtime derive the matching CRAFT detector and SHA-256-verify both itself, so
 * the app never pre-downloads them.
 */
const RECOGNIZER = 'registry://s3/qvac_models_compiled/ocr/gguf/easyocr/2026-05-14/latin_g2.gguf';

const LATIN_SCRIPTS = new Set(['latin']);

/** Prompt for a general vision model, which describes unless told to transcribe. */
const GENERIC_PROMPT =
  'Transcribe all the text in this image exactly as written, line by line. Return only the text, with no commentary.';

/**
 * The recognizer only covers Latin script. Reads better as a capability check on
 * the artifact than as a hardcoded `true`.
 */
export function ocrReady(): boolean {
  const file = RECOGNIZER.split('/').pop() ?? '';
  return LATIN_SCRIPTS.has(file.split('_')[0]);
}

/**
 * True once this run has successfully loaded an OCR model. The runtime caches the
 * registry weights after the first load, so a cold first run needs connectivity
 * and offline mode has to refuse rather than hang on a fetch.
 */
export function ocrWarm(): boolean {
  return loaded !== null;
}

/**
 * Which installed reader to use.
 *
 * A purpose-built document reader (one carrying an `ocrPrompt`) wins over a
 * general vision model, and a downloaded vision install wins over the registry
 * fallback pair — the fallback needs connectivity on its first run.
 */
async function chooseModel(): Promise<CatalogModel | null> {
  const snapshot = getSnapshot();
  const installed = CATALOG.filter(
    (m) => m.task === 'ocr' && !m.runtimeManaged && snapshot[m.id]?.status === 'installed'
  );
  return installed.find((m) => m.ocrPrompt !== undefined) ?? installed[0] ?? null;
}

async function ensureModel(): Promise<string> {
  if (loaded) return loaded.modelId;

  const chosen = await chooseModel();
  loadedModel = chosen;

  if (!chosen) {
    // Neither an installed reader nor the registry pair is available: let the
    // runtime fetch its own easyocr pair.
    loaded = {
      modelId: await loadModel({
        modelSrc: RECOGNIZER,
        modelType: 'ggml-ocr',
        modelConfig: {
          pipelineType: 'easyocr',
          langList: ['en'],
          // Mobile memory cannot hold the 2560 default detection canvas.
          canvasSize: 1280,
        },
      }),
    };
    return loaded.modelId;
  }

  const state = getSnapshot()[chosen.id];
  if (state?.status !== 'installed') throw new Error('The OCR model is not installed.');

  // A vision entry is a completion model with a projector, not an OCR pipeline: it
  // answers free-form prompts about the image rather than returning text blocks.
  loaded = {
    modelId: await loadModel({
      modelSrc: toRuntimePath(state.localPath),
      modelType: 'llamacpp-completion',
      modelConfig: {
        ctx_size: 2048,
        ...(chosen.projection
          ? { projectionModelSrc: toRuntimePath(`${MODEL_DIR}${chosen.projection.filename}`) }
          : {}),
      },
    }),
  };
  return loaded.modelId;
}

export async function unloadOcrModel(): Promise<void> {
  if (!loaded) return;
  await unloadModel({ modelId: loaded.modelId }).catch(() => {});
  loaded = null;
  loadedModel = null;
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
    // A vision model has no text-block API; it is asked in words and answers in words.
    // An empty prompt is meaningful — OCR-trained models transcribe from the image
    // alone, so the generic wording would change their output.
    if (loadedModel) {
      const run = completion({
        modelId,
        history: [
          {
            role: 'user',
            content: loadedModel.ocrPrompt ?? GENERIC_PROMPT,
            attachments: [{ path: toRuntimePath(tempUri) }],
          },
        ],
        stream: false,
      });
      const final = await run.final;
      return (final.contentText ?? '').trim();
    }

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
