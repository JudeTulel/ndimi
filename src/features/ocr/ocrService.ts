import { loadModel, ocr, unloadModel } from '@qvac/sdk';
import { getSnapshot } from '../models/modelStore';

type Loaded = { modelId: string };

let loaded: Loaded | null = null;

/**
 * OCR runs the ggml-ocr easyocr pipeline: a CRAFT detector plus a CRNN Latin
 * recognizer, both GGUF. Sources are `registry://` entries, so the QVAC runtime
 * fetches and SHA-256-verifies them itself and derives the detector from the
 * recognizer source — the app does not pre-download them.
 */
const RECOGNIZER = 'registry://s3/qvac_models_compiled/ocr/gguf/easyocr/2026-05-14/latin_g2.gguf';

export function ocrReady(): boolean {
  // Registry artifacts are fetched on demand, so OCR is always attemptable once
  // the user is online at least once.
  return true;
}

export function ocrInstalled(): boolean {
  return Object.values(getSnapshot()).some((state) => state.status === 'installed');
}

async function ensureModel(): Promise<string> {
  if (loaded) return loaded.modelId;
  const modelId = await loadModel({
    modelSrc: RECOGNIZER,
    modelType: 'ggml-ocr',
    modelConfig: {
      pipelineType: 'easyocr',
      langList: ['en'],
      // Lower the detection canvas: mobile memory cannot hold the 2560 default.
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
 * Reads text from a base64 JPEG. Returns the recognised text, or an empty string
 * when the image held no text.
 */
export async function readText(base64Jpeg: string): Promise<string> {
  const modelId = await ensureModel();
  const run = ocr({
    modelId,
    image: `data:image/jpeg;base64,${base64Jpeg}`,
    options: { paragraph: true },
  });
  const blocks = await run.blocks;
  return blocks
    .map((block) => block.text)
    .join('\n')
    .trim();
}
