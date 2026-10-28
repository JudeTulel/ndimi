export type ModelTask = 'asr' | 'translation' | 'chat' | 'ocr';

export type CatalogModel = {
  /** Curated id, stable across revisions. */
  id: string;
  task: ModelTask;
  title: string;
  summary: string;
  /** Source URL: an https Hub artifact or a `registry://` QVAC registry entry. */
  url: string;
  /** Provenance for display; registry entries have no Hub revision. */
  repo?: string;
  revision?: string;
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
  /**
   * `registry://` artifacts are resolved by the QVAC runtime itself. They are only
   * marked `runtimeManaged` when the app cannot fetch them; the OCR pair uses the
   * HTTPS mirror of the same registry key so it downloads with real progress and
   * can be verified and resumed like any other artifact.
   */
  runtimeManaged?: boolean;
  /**
   * Companion projector for a multimodal model. The weights cannot see images on
   * their own, so this is downloaded alongside and passed as `projectionModelSrc` —
   * a vision model installed without it loads but is blind.
   */
  projection?: {
    url: string;
    filename: string;
    sizeBytes: number;
    sha256: string;
  };
  /**
   * Instruction sent with the image when this model reads a page. OCR-tuned models
   * like LightOnOCR transcribe from an empty prompt, so the wording is per model
   * rather than global. Absent means the generic transcribe-everything prompt.
   */
  ocrPrompt?: string;
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
    url: 'https://huggingface.co/malinali-app/whisper-swahili-small-ggml/resolve/403b03e660aa3635823c42e4589c57a9b2c26fe5/ggml-model-q8_0.bin',
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
    id: 'whisper-tiny-en-q5',
    task: 'asr',
    title: 'Whisper Tiny English',
    summary:
      'Fastest English transcription at 32 MB. Low accuracy but the quickest to finish, so it suits short utterances.',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.en-q5_1.bin',
    repo: 'ggerganov/whisper.cpp',
    revision: '5359861c739e955e79d9a303bcbc70fb988958b1',
    filename: 'ggml-tiny.en-q5_1.bin',
    sizeBytes: 32_166_155,
    sha256: 'c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b',
    licence: 'MIT',
    publisher: 'ggerganov',
    runtimePlugin: 'whispercpp-transcription',
    languages: ['en'],
    quantization: 'Q5_1',
  },
  {
    id: 'translatepsy-afrislm-0.8b-q4',
    task: 'translation',
    title: 'TranslatePsy-AfriSLM 0.8B',
    summary: 'English ↔ Swahili translation. Smallest variant, recommended first install.',
    url: 'https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B-Q4-GGUF/resolve/14d6fd1e24c9f94a5e40c2e91c066241aede0dce/TranslatePsy-AfriSLM-0.8B-Q4_K_M-imat.gguf',
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
    url: 'https://huggingface.co/qvac/TranslatePsy-AfriSLM-2B-Q4-GGUF/resolve/9bcceadebbcc5d36bba9f7f02141300a95ae8d04/TranslatePsy-AfriSLM-2B-Q4_K_M-imat.gguf',
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
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/067b946cf014b7c697f3654f621d577a3e3afd1c/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
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
    id: 'qwen2.5-0.5b-instruct-q4',
    task: 'chat',
    title: 'Qwen2.5 0.5B Instruct',
    summary:
      'Smallest general chat model at 469 MB, and the fastest to answer. Suits short questions and quick writing help.',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    revision: '9217f5db79a29953eb74d5343926648285ec7e67',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeBytes: 491_400_032,
    sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
    licence: 'Apache-2.0',
    publisher: 'Qwen',
    runtimePlugin: 'llamacpp-completion',
    languages: ['en', 'sw'],
    quantization: 'Q4_K_M',
  },
  {
    id: 'qwen2.5-1.5b-instruct-q4',
    task: 'chat',
    title: 'Qwen2.5 1.5B Instruct',
    summary:
      'Better reasoning and longer answers than the 0.5B at 1.04 GB. Good balance for everyday chat on a mid-range phone.',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/91cad51170dc346986eccefdc2dd33a9da36ead9/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    revision: '91cad51170dc346986eccefdc2dd33a9da36ead9',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    sizeBytes: 1_117_320_736,
    sha256: '6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e',
    licence: 'Apache-2.0',
    publisher: 'Qwen',
    runtimePlugin: 'llamacpp-completion',
    languages: ['en', 'sw'],
    quantization: 'Q4_K_M',
  },
  {
    id: 'qwen2.5-3b-instruct-q3',
    task: 'chat',
    title: 'Qwen2.5 3B Instruct',
    summary:
      'Strongest chat quality here at 1.61 GB. Quantized to Q3_K_M so it still fits under 2 GB; wants a phone with 6 GB RAM or more.',
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/7dabda4d13d513e3e842b20f0d435c732f172cbe/qwen2.5-3b-instruct-q3_k_m.gguf',
    repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF',
    revision: '7dabda4d13d513e3e842b20f0d435c732f172cbe',
    filename: 'qwen2.5-3b-instruct-q3_k_m.gguf',
    sizeBytes: 1_724_178_848,
    sha256: 'ba8627a48c2bddefac2f995caf7887551304f26a72137fb94b74449121d0df4e',
    licence: 'Qwen Research',
    publisher: 'Qwen',
    runtimePlugin: 'llamacpp-completion',
    languages: ['en', 'sw'],
    quantization: 'Q3_K_M',
  },
  {
    id: 'lightonocr-3-0.8b-q4',
    task: 'ocr',
    title: 'LightOnOCR 3 0.8B (read a page)',
    summary:
      'Purpose-built document reader at 505 MB. Transcribes pages, tables, receipts and forms as markdown text. Best accuracy per byte of the camera readers.',
    url: 'https://huggingface.co/Prathat/LightOnOCR-3-0.8B-GGUF/resolve/2c4134bf5b86940016f72fda0583609009cefa60/LightOnOCR-3-0.8B-Q4_K_M.gguf',
    repo: 'Prathat/LightOnOCR-3-0.8B-GGUF',
    revision: '2c4134bf5b86940016f72fda0583609009cefa60',
    filename: 'LightOnOCR-3-0.8B-Q4_K_M.gguf',
    sizeBytes: 529_297_472,
    sha256: '32eed216ffdd38254ecf6f1b7bc3360e74dae5b65873b7f1ce3590043315a658',
    licence: 'Apache-2.0',
    publisher: 'Prathat',
    runtimePlugin: 'llamacpp-completion',
    languages: ['en'],
    quantization: 'Q4_K_M',
    // Transcription mode is an empty prompt: the image alone is the instruction.
    ocrPrompt: '',
    projection: {
      url: 'https://huggingface.co/Prathat/LightOnOCR-3-0.8B-GGUF/resolve/2c4134bf5b86940016f72fda0583609009cefa60/LightOnOCR-3-0.8B-mmproj-f16.gguf',
      filename: 'LightOnOCR-3-0.8B-mmproj-f16.gguf',
      sizeBytes: 204_987_136,
      sha256: 'e77f2ebb738f5c7852e955f09440c407d9c54b56c6f6098900380706302e8742',
    },
  },
  {
    id: 'smolvlm-500m-q4',
    task: 'ocr',
    title: 'SmolVLM 500M (read a photo)',
    summary:
      'Vision model that reads a photo and answers about it. Slower than the Latin reader but handles mixed layouts and handwriting.',
    url: 'https://huggingface.co/mradermacher/SmolVLM-500M-Base-GGUF/resolve/feec39cd757b4b6ce015bc7fbd7bb27d131c17fd/SmolVLM-500M-Base.Q4_K_M.gguf',
    repo: 'mradermacher/SmolVLM-500M-Base-GGUF',
    revision: 'feec39cd757b4b6ce015bc7fbd7bb27d131c17fd',
    filename: 'SmolVLM-500M-Base.Q4_K_M.gguf',
    sizeBytes: 303_249_280,
    sha256: 'ea4fd9cd04c6336ceb90c7df7dc6ec473ae5af36ffe3fb8eff6e06d6731bbd0a',
    licence: 'Apache-2.0',
    publisher: 'mradermacher',
    runtimePlugin: 'llamacpp-completion',
    languages: ['en', 'sw'],
    quantization: 'Q4_K_M',
    projection: {
      url: 'https://huggingface.co/mradermacher/SmolVLM-500M-Base-GGUF/resolve/feec39cd757b4b6ce015bc7fbd7bb27d131c17fd/SmolVLM-500M-Base.mmproj-Q8_0.gguf',
      filename: 'SmolVLM-500M-Base.mmproj-Q8_0.gguf',
      sizeBytes: 108_782_176,
      sha256: '07088c0e7f9ea56c85453c01d2dbbb1a85e558ec41e989dd024710aa4b6b9c30',
    },
  },
  {
    id: 'ocr-latin-g2',
    runtimeManaged: true,
    task: 'ocr',
    title: 'OCR reader (Latin)',
    summary: 'Recognises Latin-script text — English and Swahili — from a photo.',
    url: 'registry://s3/qvac_models_compiled/ocr/gguf/easyocr/2026-05-14/latin_g2.gguf',
    filename: 'latin_g2.gguf',
    sizeBytes: 15_396_512,
    sha256: 'dd1c7a436e9175904e63683e939635892f45c8c6377d5e14e87cf8b175e10768',
    licence: 'Apache-2.0',
    publisher: 'qvac registry',
    runtimePlugin: 'ggml-ocr',
    languages: ['en', 'sw'],
    quantization: 'f16',
  },
  {
    id: 'ocr-craft-detector',
    runtimeManaged: true,
    task: 'ocr',
    title: 'OCR text detector',
    summary: 'Finds text regions for the OCR reader. Install alongside it.',
    url: 'registry://s3/qvac_models_compiled/ocr/gguf/easyocr/2026-05-14/craft_mlt_25k.gguf',
    filename: 'craft_mlt_25k.gguf',
    sizeBytes: 83_133_856,
    sha256: '74501993caf4581ce09b280f49a1b3d249c0f5a78496e047718b398457a875aa',
    licence: 'Apache-2.0',
    publisher: 'qvac registry',
    runtimePlugin: 'ggml-ocr',
    languages: ['*'],
    quantization: 'f32',
  },
];

export function downloadUrl(model: CatalogModel): string {
  if (model.url.startsWith('registry://')) return model.url;
  return model.url;
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
