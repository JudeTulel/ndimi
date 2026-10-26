import type { AudioArtifact, ModelManifest, TranslationResult } from '../domain/models';

export interface IAudioRecorder {
  start(): Promise<void>;
  stop(): Promise<AudioArtifact>;
  cancel(): Promise<void>;
}

export interface ITranscriber {
  transcribe(input: { audio: AudioArtifact; language?: string }): Promise<{ text: string; language?: string }>;
}

export interface ITranslator {
  translate(input: { text: string; sourceLanguage: string; targetLanguage: string }): Promise<{ text: string }>;
}

export interface IModelRuntime {
  load(modelId: string): Promise<void>;
  unload(modelId: string): Promise<void>;
  isLoaded(modelId: string): boolean;
}

export interface IFileSystem {
  writeTempFile(prefix: string, data: ArrayBuffer): Promise<string>;
  removeFile(path: string): Promise<void>;
}

export interface IHistoryRepository {
  saveTranslation(result: TranslationResult, inputType: 'text' | 'voice', modelId?: string): Promise<void>;
  listTranslations(query?: { sourceLanguage?: string; targetLanguage?: string; q?: string }): Promise<TranslationResult[]>;
  deleteTranslation(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IModelRepository {
  getManifest(modelId: string): Promise<ModelManifest | null>;
  listInstalled(): Promise<ModelManifest[]>;
}
