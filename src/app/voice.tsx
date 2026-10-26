import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleButton } from '../components/CircleButton';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { VoiceWaveform } from '../components/Visuals';
import { colors, spacing, type } from '../theme/tokens';
import { CATALOG } from '../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../features/models/modelStore';
import { saveTranslation } from '../features/history/historyStore';

type Phase = 'idle' | 'listening' | 'processing' | 'result' | 'denied';

export default function Voice() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => subscribe(setStatus), []);
  useEffect(() => () => clear(), []);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const asr = useMemo(
    () => CATALOG.find((m) => m.task === 'asr' && status[m.id]?.status === 'installed'),
    [status]
  );
  const nmt = useMemo(
    () => CATALOG.find((m) => m.task === 'translation' && status[m.id]?.status === 'installed'),
    [status]
  );
  const ready = !!asr && !!nmt;

  const start = async () => {
    const existing = await getRecordingPermissionsAsync();
    let granted = existing.granted;
    if (!granted) granted = (await requestRecordingPermissionsAsync()).granted;
    if (!granted) {
      setPhase('denied');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    setPhase('listening');
    setSeconds(0);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const confirm = async () => {
    clear();
    setPhase('processing');
    // Capture/ASR adapters land next; hold the two pipeline stages so the state
    // machine and the History write are exercised end to end.
    setTimeout(async () => {
      await saveTranslation(
        {
          sourceText: 'Habari, unaitwa nani?',
          translatedText: 'Hello, what is your name?',
          sourceLanguage: 'sw',
          targetLanguage: 'en',
        },
        'voice',
        nmt?.id
      );
      setPhase('result');
    }, 1000);
  };

  const cancel = () => {
    clear();
    setSeconds(0);
    setPhase('idle');
  };

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

      <Text style={styles.status}>
        {phase === 'listening'
          ? 'Listening…'
          : phase === 'processing'
            ? 'Transcribing and translating…'
            : phase === 'result'
              ? 'Translated'
              : 'Swahili → English'}
      </Text>

      <VoiceWaveform active={phase === 'listening'} />

      <View style={styles.copy}>
        <Text style={styles.hero}>
          Talk freely <Text style={styles.ai}>AI</Text> translates instantly across languages
        </Text>
        <Text style={styles.sub}>Speak naturally and let the translator handle the rest.</Text>
      </View>

      {phase === 'result' ? (
        <GlassCard style={styles.result}>
          <Text style={styles.resultLabel}>SWAHILI</Text>
          <Text style={styles.resultText}>Habari, unaitwa nani?</Text>
          <Text style={styles.resultLabel}>ENGLISH</Text>
          <Text style={styles.resultText}>Hello, what is your name?</Text>
        </GlassCard>
      ) : null}

      {phase === 'denied' ? (
        <GlassCard style={styles.result}>
          <Text style={styles.resultLabel}>MICROPHONE BLOCKED</Text>
          <Text style={styles.resultText}>
            Enable microphone access in Settings › Apps › Ndimi › Permissions, then try again.
          </Text>
        </GlassCard>
      ) : null}

      <View style={styles.controls}>
        {phase === 'listening' ? (
          <>
            <CircleButton size={50} onPress={cancel} accessibilityLabel="Cancel">
              <Ionicons name="close" size={20} color={colors.text} />
            </CircleButton>
            <View style={styles.micWrap}>
              <CircleButton size={74} tone="solid" onPress={confirm} accessibilityLabel="Finish">
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </CircleButton>
              <Text style={styles.timer}>{format(seconds)}</Text>
            </View>
            <View style={{ width: 50 }} />
          </>
        ) : phase === 'result' || phase === 'denied' ? (
          <PrimaryButton
            label="Record again"
            variant="ghost"
            onPress={() => {
              cancel();
              void start();
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
              <Text style={styles.hint}>Install a speech and translation model first.</Text>
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
  status: { ...type.label, color: colors.secondaryText, textAlign: 'center' },
  copy: { alignItems: 'center', gap: spacing.sm },
  hero: { ...type.hero, color: colors.text, textAlign: 'center' },
  ai: { color: colors.red },
  sub: { ...type.body, color: colors.secondaryText, textAlign: 'center' },
  result: { gap: spacing.xs },
  resultLabel: { ...type.label, color: colors.secondaryText },
  resultText: { ...type.body, fontSize: 14, color: colors.text },
  controls: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  micWrap: { alignItems: 'center', gap: spacing.sm },
  timer: { ...type.label, color: colors.secondaryText },
  hint: { ...type.body, fontSize: 11, color: colors.secondaryText, textAlign: 'center' },
});
