import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, type } from '../theme/tokens';
import { CATALOG } from '../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../features/models/modelStore';
import { saveTranslation } from '../features/history/historyStore';

type Phase = 'idle' | 'listening' | 'transcribing' | 'done';

const BAR_HEIGHTS = [10, 22, 34, 46, 34, 22, 10];

export default function Voice() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => subscribe(setStatus), []);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const asr = useMemo(
    () => CATALOG.find((m) => m.task === 'asr' && status[m.id]?.status === 'installed'),
    [status]
  );
  const nmt = useMemo(
    () => CATALOG.find((m) => m.task === 'translation' && status[m.id]?.status === 'installed'),
    [status]
  );
  const ready = !!asr && !!nmt;

  const start = () => {
    setPhase('listening');
    setSeconds(0);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const finish = async () => {
    if (timer.current) clearInterval(timer.current);
    setPhase('transcribing');
    // Capture/ASR adapters land next; simulate the two pipeline stages so the
    // state machine and History write are exercised end to end.
    setTimeout(async () => {
      const transcript = 'Habari, unaitwa nani?';
      await saveTranslation(
        {
          sourceText: transcript,
          translatedText: 'Hello, what is your name?',
          sourceLanguage: 'sw',
          targetLanguage: 'en',
        },
        'voice',
        nmt?.id
      );
      setPhase('done');
    }, 900);
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setPhase('idle');
    setSeconds(0);
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.dark} />
        </Pressable>
        <Text style={styles.title}>Voice Chat</Text>
        <View style={styles.spacerIcon} />
      </View>

      <Text style={styles.label}>Swahili → English</Text>

      <Text style={styles.state}>
        {phase === 'listening'
          ? 'Listening…'
          : phase === 'transcribing'
            ? 'Transcribing and translating…'
            : phase === 'done'
              ? 'Done'
              : 'Tap the microphone to begin'}
      </Text>

      <View style={styles.wave}>
        {BAR_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { height: phase === 'listening' ? h : h * 0.45 },
              phase === 'listening' && styles.barActive,
            ]}
          />
        ))}
      </View>

      {phase === 'done' ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>SWAHILI</Text>
          <Text style={styles.resultText}>Habari, unaitwa nani?</Text>
          <Text style={styles.resultLabel}>ENGLISH</Text>
          <Text style={styles.resultText}>Hello, what is your name?</Text>
        </View>
      ) : null}

      <View style={styles.controls}>
        {phase === 'listening' ? (
          <>
            <Pressable style={styles.sideBtn} onPress={reset}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </Pressable>
            <View style={styles.micWrap}>
              <Pressable style={styles.mic} onPress={finish}>
                <Ionicons name="checkmark" size={30} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.timer}>{format(seconds)}</Text>
            </View>
            <View style={styles.sideBtnGhost} />
          </>
        ) : phase === 'done' ? (
          <Pressable style={styles.wideBtn} onPress={reset}>
            <Ionicons name="refresh-outline" size={18} color={colors.red} />
            <Text style={styles.wideText}>Record again</Text>
          </Pressable>
        ) : (
          <View style={styles.micWrap}>
            <Pressable
              style={[styles.mic, !ready && styles.micDisabled]}
              disabled={!ready || phase === 'transcribing'}
              onPress={start}>
              <Ionicons name="mic" size={30} color="#FFFFFF" />
            </Pressable>
            {!ready ? <Text style={styles.hint}>Install a speech and translation model first.</Text> : null}
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
  title: { ...type.h1, color: colors.dark },
  spacerIcon: { width: 22 },
  label: { ...type.label, color: colors.secondaryText, textAlign: 'center' },
  state: { ...type.h1, fontSize: 21, color: colors.dark, textAlign: 'center' },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 60,
  },
  bar: { width: 12, borderRadius: radius.pill, backgroundColor: colors.track },
  barActive: { backgroundColor: colors.red },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultLabel: { ...type.label, color: colors.secondaryText },
  resultText: { ...type.body, fontSize: 14, color: colors.dark },
  controls: { alignItems: 'center', gap: spacing.sm },
  micWrap: { alignItems: 'center', gap: spacing.sm },
  mic: {
    width: 76,
    height: 76,
    borderRadius: radius.card,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micDisabled: { backgroundColor: colors.track },
  timer: { ...type.label, color: colors.secondaryText },
  hint: { ...type.body, fontSize: 11, color: colors.secondaryText, textAlign: 'center' },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnGhost: { width: 52 },
  wideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sulphur,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  wideText: { ...type.cardTitle, color: colors.red },
});
