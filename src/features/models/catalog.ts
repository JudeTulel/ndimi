export type ModelTask = 'asr' | 'translation';

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
