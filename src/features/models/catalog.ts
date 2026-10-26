export type ModelTask = 'asr' | 'translation' | 'chat' | 'ocr';

export type CatalogModel = {
  /** Curated id, stable across revisions. */
  id: string;
  task: ModelTask;
  title: string;
  summary: string;
  /** Hugging Face repository, pinned by revision. */
  repo: string;
  revision: string;
  filename: string;
  sizeBytes: number;
  /** SHA-256 of the artifact as published by the Hub (LFS oid). */
  sha256: string;
  licence: string;
  publisher: string;
  runtimePlugin: string;
  languages: string[];
  /** Surface label, e.g. Q4_K_M. */
  quantization: string;
};

const GB = 1024 * 1024 * 1024;
export const RECOMMENDED_MAX_BYTES = 3 * GB;

/**
 * Curated catalog. Every entry was resolved against the live Hub API — repository
 * revision, exact artifact path, byte size and LFS SHA-256 — rather than guessed.
 * Nothing outside this list is presented as compatible.
 */
export const CATALOG: CatalogModel[] = [
  {
    id: 'whisper-swahili-small-q8',
    task: 'asr',
    title: 'Whisper Swahili Small',
    summary: 'Swahili speech recognition. Converts recorded audio to text on device.',
    repo: 'malinali-app/whisper-swahili-small-ggml',
    revision: '403b03e660aa3635823c42e4589c57a9b2c26fe5',
    filename: 'ggml-model-q8_0.bin',
    sizeBytes: 264_464_624,
    sha256: '5d89c6ee07592a0c43fa560d592949635e7154cd716debda8d40919a772381a6',
    licence: 'Apache-2.0',
    publisher: 'malinali-app',
    runtimePlugin: 'whispercpp-transcription',
    languages: ['sw'],
    quantization: 'Q8_0',
  },
  {
    id: 'translatepsy-afrislm-0.8b-q4',
    task: 'translation',
    title: 'TranslatePsy-AfriSLM 0.8B',
    summary: 'English ↔ Swahili translation. Smallest variant, recommended first install.',
    repo: 'qvac/TranslatePsy-AfriSLM-0.8B-Q4-GGUF',
    revision: '14d6fd1e24c9f94a5e40c2e91c066241aede0dce',
    filename: 'TranslatePsy-AfriSLM-0.8B-Q4_K_M-imat.gguf',
    sizeBytes: 672_329_792,
    sha256: '4af8ee1df3ec9008f763ebe95e6f21df3acd8d42c541feeb13314ca22e560afc',
    licence: 'Apache-2.0',
    publisher: 'qvac',
    runtimePlugin: 'nmtcpp-translation',
    languages: ['en', 'sw'],
    quantization: 'Q4_K_M',
  },
  {
    id: 'translatepsy-afrislm-2b-q4',
    task: 'translation',
    title: 'TranslatePsy-AfriSLM 2B',
    summary: 'Higher quality translation at roughly twice the memory and disk cost.',
    repo: 'qvac/TranslatePsy-AfriSLM-2B-Q4-GGUF',
    revision: '9bcceadebbcc5d36bba9f7f02141300a95ae8d04',
    filename: 'TranslatePsy-AfriSLM-2B-Q4_K_M-imat.gguf',
    sizeBytes: 1_560_461_376,
    sha256: 'fc2a80532e58e0655efd9e68c5b7cb2c4373222e736bcc88de648502a4e30361',
    licence: 'Apache-2.0',
    publisher: 'qvac',
    runtimePlugin: 'nmtcpp-translation',
    languages: ['en', 'sw'],
    quantization: 'Q4_K_M',
  },
  {
    id: 'llama-3.2-1b-instruct-q4',
    task: 'chat',
    title: 'Llama 3.2 1B Instruct',
    summary: 'General on-device chat and writing help. Independent of translation.',
    repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    revision: '067b946cf014b7c697f3654f621d577a3e3afd1c',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    sizeBytes: 807_694_464,
    sha256: '6f85a640a97cf2bf5b8e764087b1e83da0fdb51d7c9fab7d0fece9385611df83',
    licence: 'Llama 3.2 Community',
    publisher: 'bartowski',
    runtimePlugin: 'llamacpp-completion',
    languages: ['en', 'sw'],
    quantization: 'Q4_K_M',
  },
  {
    id: 'glm-ocr-q8',
    task: 'ocr',
    title: 'GLM-OCR',
    summary: 'Reads printed text from a photo so it can be translated. Needs its vision projector.',
    repo: 'ggml-org/GLM-OCR-GGUF',
    revision: '65a42de1148dbed2297e922b5dbc7d9b70c36578',
    filename: 'GLM-OCR-Q8_0.gguf',
    sizeBytes: 950_433_408,
    sha256: '45bc244a6446aff850521dc41f18bc8d7105ad5f0c2c8c28af04e7cc4f4d50b1',
    licence: 'MIT',
    publisher: 'ggml-org',
    runtimePlugin: 'ggml-ocr',
    languages: ['en', 'sw'],
    quantization: 'Q8_0',
  },
  {
    id: 'glm-ocr-mmproj-q8',
    task: 'ocr',
    title: 'GLM-OCR vision projector',
    summary: 'Companion file for GLM-OCR. Install alongside it or the camera cannot read images.',
    repo: 'ggml-org/GLM-OCR-GGUF',
    revision: '65a42de1148dbed2297e922b5dbc7d9b70c36578',
    filename: 'mmproj-GLM-OCR-Q8_0.gguf',
    sizeBytes: 484_403_648,
    sha256: '9c4b58e33e316ed142eb5dcb41abec3844d3e6e5dc361ffb782c3fa9d175141f',
    licence: 'MIT',
    publisher: 'ggml-org',
    runtimePlugin: 'ggml-ocr',
    languages: ['*'],
    quantization: 'Q8_0',
  },
];

export function downloadUrl(model: CatalogModel): string {
  return `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.filename}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Both tasks need a ready model before the app can translate. */
export function missingTask(installed: Record<ModelTask, boolean>): ModelTask | null {
  if (!installed.asr) return 'asr';
  if (!installed.translation) return 'translation';
  return null;
}
