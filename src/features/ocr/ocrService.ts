import { completion, loadModel, ocr, unloadModel } from '@qvac/sdk';
import * as FileSystem from 'expo-file-system/legacy';
import { toRuntimePath } from '../../core/fs/paths';
import { getOfflineMode } from '../../core/db/settings';
import { CATALOG } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

type Loaded = { modelId: string };

let loaded: Loaded | null = null;
/** True when the loaded handle is a vision model, which answers instead of reading. */
let vision = false;

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

  // Whichever OCR-capable model is installed, preferring a downloaded one over the
  // registry fallback. A vision model wins when present because it is the more
  // capable reader; its projector is part of its install.
  const snapshot = getSnapshot();
  const installed = CATALOG.filter(
    (m) => m.task === 'ocr' && snapshot[m.id]?.status === 'installed'
  );
  const visionModel = installed.find((m) => m.projection);
  const chosen = visionModel
    ? snapshot[visionModel.id]
    : snapshot['ocr-latin-g2']?.status === 'installed'
      ? snapshot['ocr-latin-g2']
      : null;

  vision = !!visionModel;

  const modelSrc =
    chosen && chosen.status === 'installed' ? toRuntimePath(chosen.localPath) : RECOGNIZER;

  if (visionModel) {
    loaded = {
      modelId: await loadModel({
        modelSrc,
        modelType: 'llamacpp-completion',
        modelConfig: {
          ctx_size: 2048,
          ...(visionModel.projection
            ? {
                projectionModelSrc: toRuntimePath(
                  `${MODEL_DIR}${visionModel.projection.filename}`
                ),
              }
            : {}),
        },
      }),
    };
    vision = true;
    return loaded.modelId;
  }

  loaded = {
    modelId: await loadModel({
      modelSrc,
      modelType: 'ggml-ocr',
      modelConfig: {
        pipelineType: 'easyocr',
        langList: ['en'],
        // Mobile memory cannot hold the 2560 default detection canvas.
        canvasSize: 1280,
      },
    }),
  };
  vision = false;
  return loaded.modelId;
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
    // A vision model has no text-block API; it is asked in words and answers in words.
    // The prompt is deliberately extractive so it returns the page rather than a
    // description of the page.
    if (vision) {
      const run = completion({
        modelId,
        history: [
          {
            role: 'user',
            content:
              'Transcribe all the text in this image exactly as written, line by line. Return only the text, with no commentary.',
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
