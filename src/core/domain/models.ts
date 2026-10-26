export type Language = {
  code: string;
  label: string;
};

export type TranslationResult = {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export type AudioArtifact = {
  uri: string;
  sampleRateHz: number;
  channels: number;
  encoding: 'pcm_s16le' | 'pcm_f32le';
  durationMs: number;
};

export type ModelManifest = {
  id: string;
  task: 'asr' | 'translation';
  source: 'bundled' | 'huggingface' | 'qvac-registry';
  format: 'ggml' | 'gguf' | 'other';
  languages: string[];
  localPath?: string;
  expectedBytes?: number;
  sha256?: string;
  licence?: string;
  runtimePlugin: string;
  verifiedOnDevice: boolean;
};
