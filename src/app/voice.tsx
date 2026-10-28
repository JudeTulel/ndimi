import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { CircleButton } from '../components/CircleButton';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { VoiceWaveform } from '../components/Visuals';
import { colors, spacing, type } from '../theme/tokens';
import { CATALOG } from '../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../features/models/modelStore';
import { saveTranslation } from '../features/history/historyStore';
import { useVoiceRecorder } from '../features/voice/useVoiceRecorder';
import { installedAsrModel } from '../features/voice/asrService';
import {
  runVoiceTranslation,
  type PipelineUpdate,
  type VoiceSession,
} from '../core/pipeline/voicePipeline';
import type { TranslationLanguage } from '../features/translate/translationService';
import { toRuntimePath } from '../core/fs/paths';
import { getDirection } from '../core/db/settings';

type Phase = 'idle' | 'listening' | 'processing' | 'result' | 'denied' | 'error';

export default function Voice() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [stage, setStage] = useState<PipelineUpdate['stage'] | null>(null);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<TranslationLanguage>('sw');
  const session = useRef<VoiceSession>({ cancelled: false });
  const recorder = useVoiceRecorder();

  useEffect(() => subscribe(setStatus), []);

  // Follow the Profile preference, defaulting to Swahili speech as the product
  // intends (the user is usually the one being translated for).
  useEffect(() => {
    void getDirection().then((preference) => setFrom(preference === 'en-sw' ? 'en' : 'sw'));
  }, []);

  // `useVoiceRecorder` returns a fresh object each render, so capture the cancel
  // function rather than the whole handle.
  const cancelRecording = recorder.cancel;
  useEffect(() => () => void cancelRecording(), [cancelRecording]);

  const to: TranslationLanguage = from === 'en' ? 'sw' : 'en';

  const asr = useMemo(
    () => installedAsrModel(from),
    [status, from] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const nmt = useMemo(
    () => CATALOG.find((m) => m.task === 'translation' && status[m.id]?.status === 'installed'),
    [status]
  );
  const ready = !!asr && !!nmt;

  // `phase` cannot guard this on its own: it only updates after the awaits below, so a
  // second tap lands while the first `prepareToRecordAsync` is still running and the
  // recorder throws "already been prepared". A ref flips synchronously.
  const startingRef = useRef(false);

  const start = async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    setError(null);
    setTranscript('');
    setTranslation('');
    setStage(null);

    try {
      const existing = await getRecordingPermissionsAsync();
      let granted = existing.granted;
      if (!granted) granted = (await requestRecordingPermissionsAsync()).granted;
      if (!granted) {
        setPhase('denied');
        return;
      }

      try {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        await recorder.start();
        session.current = { cancelled: false };
        setPhase('listening');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start the microphone.');
        setPhase('error');
      }
    } finally {
      // Released on every path so a denied permission or a failed start can be retried.
      // Once listening, the button is a different control anyway, so a stale guard here
      // would only bite the "Record again" flow.
      startingRef.current = false;
    }
  };

  const confirm = async () => {
    setPhase('processing');
    let uri: string | null = null;
    try {
      uri = await recorder.stop();
      const outcome = await runVoiceTranslation({ audioUri: uri, from, to }, (update) => {
        if (update.stage === 'done') {
          setTranscript(update.transcript);
          setTranslation(update.translation);
        } else {
          setStage(update.stage);
          if (update.partial) setTranslation(update.partial);
        }
      }, session.current);

      if (!outcome) return;
      setPhase('result');
      await saveTranslation(
        {
          sourceText: outcome.transcript,
          translatedText: outcome.translation,
          sourceLanguage: from,
          targetLanguage: to,
        },
        'voice',
        nmt?.id
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not transcribe that recording.');
      setPhase('error');
    } finally {
      // The transcript and translation are kept, the audio is not: the doc's
      // retention policy is "delete temporary audio after processing".
      if (uri) await FileSystem.deleteAsync(toRuntimePath(uri), { idempotent: true }).catch(() => {});
    }
  };

  const discard = async () => {
    session.current.cancelled = true;
    await recorder.cancel();
    setTranscript('');
    setTranslation('');
    setStage(null);
    setError(null);
    setPhase('idle');
  };

  const swap = () => setFrom(to);

  const statusLine =
    phase === 'listening'
      ? 'Listening…'
      : stage === 'transcribing' || stage === 'translating'
        ? stage === 'transcribing'
          ? 'Transcribing on device…'
          : 'Translating on device…'
        : phase === 'result'
          ? 'Translated'
          : `${from === 'sw' ? 'Swahili' : 'English'} → ${to === 'sw' ? 'Swahili' : 'English'}`;

  return (
    <Screen fixed contentStyle={styles.content}>
      <View style={styles.header}>
        <CircleButton onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </CircleButton>
        <Text style={styles.title}>Voice Chat</Text>
        <CircleButton onPress={() => router.push('/settings/models')} accessibilityLabel="Settings">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
        </CircleButton>
      </View>

      <Pressable onPress={swap} style={styles.pair} accessibilityRole="button">
        <Text style={styles.pairText}>{from === 'sw' ? 'Swahili' : 'English'}</Text>
        <Ionicons name="swap-horizontal" size={15} color={colors.red} />
        <Text style={styles.pairText}>{to === 'sw' ? 'Swahili' : 'English'}</Text>
      </Pressable>

      <Text style={styles.status}>{statusLine}</Text>

      <VoiceWaveform active={phase === 'listening'} />

      <View style={styles.copy}>
        {/* The promo copy is the first thing to give up room once a phase needs it:
            this screen is `fixed`, so overflow would push the controls off-screen. */}
        {phase === 'idle' ? (
          <>
            <Text style={styles.hero}>
              Talk freely <Text style={styles.ai}>AI</Text> translates instantly across languages
            </Text>
            <Text style={styles.sub}>Speak naturally and let the translator handle the rest.</Text>
          </>
        ) : null}
        {/* Model state, not a generic hint. The stage is opaque enough already
            without hiding which model is about to run over the audio. */}
        <Text style={styles.note} numberOfLines={2}>
          {!asr
            ? 'No speech model installed. Use Settings › Models to add one.'
            : !ready
              ? `${asr.title} is ready; a translation model is still missing.`
              : phase === 'processing'
                ? `Transcribing with ${asr.title} on device… translation follows.`
                : phase === 'listening'
                  ? `Recording for ${asr.title} (${asr.languages.map((l) => l.toUpperCase()).join('/')}). Speech runs once you stop.`
                  : `Speech model: ${asr.title} · ${asr.quantization} · ${asr.languages.map((l) => l.toUpperCase()).join('/')}.`}
        </Text>
      </View>

      {phase === 'result' ? (
        <GlassCard style={styles.result}>
          <View style={styles.resultHead}>
            <Text style={styles.resultLabel}>{from === 'sw' ? 'SWAHILI' : 'ENGLISH'}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => void Clipboard.setStringAsync(translation)}
              accessibilityLabel="Copy translation">
              <Ionicons name="copy-outline" size={15} color={colors.secondaryText} />
            </Pressable>
          </View>
          <Text style={styles.transcript}>{transcript}</Text>
          <Text style={styles.resultLabel}>{to === 'sw' ? 'SWAHILI' : 'ENGLISH'}</Text>
          <View style={styles.resultHead}>
            <Text style={[styles.translation, styles.grow]}>{translation}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => void Share.share({ message: translation })}
              accessibilityLabel="Share translation">
              <Ionicons name="share-outline" size={15} color={colors.secondaryText} />
            </Pressable>
          </View>
        </GlassCard>
      ) : null}

      {phase === 'processing' && transcript ? (
        <GlassCard style={styles.result}>
          <Text style={styles.resultLabel}>HEARD</Text>
          <Text style={styles.transcript}>{transcript}</Text>
        </GlassCard>
      ) : null}

      {phase === 'denied' ? (
        <GlassCard style={styles.result}>
          <Text style={styles.resultLabel}>MICROPHONE BLOCKED</Text>
          <Text style={styles.transcript}>
            Enable microphone access in Settings › Apps › Ndimi › Permissions, then try again.
          </Text>
        </GlassCard>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.controls}>
        {phase === 'listening' ? (
          <>
            <CircleButton size={50} onPress={discard} accessibilityLabel="Cancel">
              <Ionicons name="close" size={20} color={colors.text} />
            </CircleButton>
            <View style={styles.micWrap}>
              <CircleButton size={74} tone="solid" onPress={confirm} accessibilityLabel="Finish">
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </CircleButton>
              <Text style={styles.timer}>{format(recorder.seconds)}</Text>
            </View>
            <View style={{ width: 50 }} />
          </>
        ) : phase === 'result' || phase === 'denied' || phase === 'error' ? (
          <PrimaryButton
            label="Record again"
            variant="ghost"
            onPress={() => {
              void (async () => {
                await discard();
                await start();
              })();
            }}
          />
        ) : (
          <View style={styles.micWrap}>
            <CircleButton
              size={74}
              tone="solid"
              disabled={!ready || phase === 'processing'}
              onPress={start}
              accessibilityLabel="Start recording">
              <Ionicons name="mic" size={28} color="#FFFFFF" />
            </CircleButton>
            {!ready ? (
              <Text style={styles.hint}>
                {!asr
                  ? 'Install a speech model in Settings › Models.'
                  : 'Install a translation model in Settings › Models.'}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

function format(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.h1, color: colors.text },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  pairText: { ...type.label, color: colors.greenInk },
  status: { ...type.label, color: colors.green, textAlign: 'center' },
  // `flex: 1` so this block absorbs the slack instead of growing the column past the
  // screen and pushing the mic out of reach.
  copy: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flex: 1 },
  hero: { ...type.hero, color: colors.text, textAlign: 'center' },
  ai: { color: colors.red },
  sub: { ...type.body, color: colors.secondaryText, textAlign: 'center' },
  note: { ...type.body, fontSize: 11, color: colors.secondaryText, textAlign: 'center' },
  result: { gap: spacing.xs },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  resultLabel: { ...type.label, color: colors.secondaryText },
  transcript: { ...type.body, fontSize: 14, color: colors.text },
  translation: { ...type.body, fontSize: 14, color: colors.text },
  grow: { flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  errorText: { ...type.body, fontSize: 11, color: colors.red, flex: 1 },
  // Never shrink the controls; let the copy block above absorb the pressure.
  controls: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm, flexShrink: 0 },
  micWrap: { alignItems: 'center', gap: spacing.sm },
  timer: { ...type.label, color: colors.secondaryText },
  hint: { ...type.body, fontSize: 11, color: colors.secondaryText, textAlign: 'center' },
});
