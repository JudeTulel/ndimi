import { translateText, type TranslationLanguage } from '../../features/translate/translationService';
import { transcribeFile } from '../../features/voice/asrService';

/**
 * Recorded-audio → transcript → translation.
 *
 * Owns the stage transitions so a screen only renders them. Every stage checks
 * the shared cancel flag and the whole run is discarded once it flips, so a
 * cancelled session cannot write a stale result into the UI.
 */

export type VoiceStage = 'transcribing' | 'translating';

export type VoiceSession = {
  cancelled: boolean;
};

export type PipelineUpdate =
  | { stage: VoiceStage; partial?: string }
  | { stage: 'done'; transcript: string; translation: string };

export async function runVoiceTranslation(
  input: {
    audioUri: string;
    from: TranslationLanguage;
    to: TranslationLanguage;
  },
  onUpdate: (update: PipelineUpdate) => void,
  session: VoiceSession = { cancelled: false }
): Promise<{ transcript: string; translation: string } | null> {
  onUpdate({ stage: 'transcribing' });
  const transcript = await transcribeFile(input.audioUri, input.from, session);
  if (session.cancelled) return null;
  if (!transcript) throw new Error('No speech was recognised. Try again, closer to the mic.');

  onUpdate({ stage: 'translating' });
  const translation = await translateText(
    { text: transcript, from: input.from, to: input.to },
    (partial: string) => onUpdate({ stage: 'translating', partial }),
    session
  );
  if (session.cancelled) return null;

  onUpdate({ stage: 'done', transcript, translation });
  return { transcript, translation };
}
