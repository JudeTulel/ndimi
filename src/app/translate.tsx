import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CircleButton } from '../components/CircleButton';
import { GlassCard } from '../components/GlassCard';
import { Screen } from '../components/Screen';
import { Orb } from '../components/Visuals';
import { colors, radius, spacing, type } from '../theme/tokens';
import { CATALOG } from '../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../features/models/modelStore';
import { saveTranslation } from '../features/history/historyStore';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Swahili' },
];

export default function Translate() {
  const router = useRouter();
  const params = useLocalSearchParams<{ text?: string; from?: string }>();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [source, setSource] = useState(params.text ?? '');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState('en');

  useEffect(() => subscribe(setStatus), []);
  const to = from === 'en' ? 'sw' : 'en';

  const model = useMemo(
    () => CATALOG.find((m) => m.task === 'translation' && status[m.id]?.status === 'installed'),
    [status]
  );

  // Inference adapters are not wired yet: gate on a real installed model, echo a
  // marked result and persist it so History is exercised for real.
  const run = async () => {
    if (!source.trim() || !model) return;
    setBusy(true);
    try {
      const translated = source.trim();
      setResult(translated);
      await saveTranslation(
        { sourceText: source.trim(), translatedText: translated, sourceLanguage: from, targetLanguage: to },
        params.from === 'camera' ? 'voice' : 'text',
        model.id
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <CircleButton onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </CircleButton>
        <Text style={styles.title}>Translate AI</Text>
        <CircleButton onPress={() => router.push('/settings/models')} accessibilityLabel="Settings">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
        </CircleButton>
      </View>

      <View style={styles.hero}>
        <Orb />
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>
          Your <Text style={styles.ai}>AI</Text> Translator
        </Text>
        <Text style={styles.heroSub}>
          Translate voice, text, and images instantly with powerful AI assistance.
        </Text>
      </View>

      <Pressable style={styles.langRow} onPress={() => setFrom(to)}>
        <View style={styles.langPill}>
          <Text style={styles.langText}>{LANGS.find((l) => l.code === from)?.label}</Text>
        </View>
        <Ionicons name="swap-horizontal" size={17} color={colors.red} />
        <View style={styles.langPill}>
          <Text style={styles.langText}>{LANGS.find((l) => l.code === to)?.label}</Text>
        </View>
        <Ionicons name="chevron-down" size={15} color={colors.secondaryText} />
      </Pressable>

      <GlassCard padded={false} style={styles.inputCard}>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Write text to translate…"
          placeholderTextColor={colors.secondaryText}
          value={source}
          onChangeText={setSource}
        />
        <View style={styles.actionBar}>
          <View style={styles.actions}>
            <CircleButton size={38} onPress={() => router.push('/camera')} accessibilityLabel="Camera">
              <Ionicons name="camera-outline" size={17} color={colors.text} />
            </CircleButton>
            <CircleButton size={38} onPress={() => router.push('/voice')} accessibilityLabel="Voice">
              <Ionicons name="mic-outline" size={17} color={colors.text} />
            </CircleButton>
          </View>
          <CircleButton
            size={44}
            tone="solid"
            disabled={!source.trim() || !model || busy}
            onPress={run}
            accessibilityLabel="Translate">
            <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          </CircleButton>
        </View>
      </GlassCard>

      {result ? (
        <GlassCard style={styles.resultCard}>
          <Text style={styles.resultLabel}>TRANSLATION</Text>
          <Text style={styles.resultText}>{result}</Text>
        </GlassCard>
      ) : null}

      {!model ? (
        <Pressable style={styles.warn} onPress={() => router.push('/settings/models')}>
          <Ionicons name="cloud-download-outline" size={15} color={colors.red} />
          <Text style={styles.warnText}>No translation model installed — tap to fix.</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const cardEdge = { borderWidth: 1, borderColor: colors.border };

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.h1, color: colors.text },
  hero: { alignItems: 'center', marginTop: spacing.sm },
  heroCopy: { alignItems: 'center', gap: spacing.xs },
  heroTitle: { ...type.hero, color: colors.text, textAlign: 'center' },
  ai: { color: colors.red },
  heroSub: { ...type.body, color: colors.secondaryText, textAlign: 'center', paddingHorizontal: spacing.md },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    ...cardEdge,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  langPill: { paddingHorizontal: spacing.xs },
  langText: { ...type.cardTitle, color: colors.text },
  inputCard: { gap: 0 },
  input: {
    minHeight: 108,
    padding: spacing.md,
    ...type.body,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  resultCard: { gap: spacing.xs },
  resultLabel: { ...type.label, color: colors.secondaryText },
  resultText: { ...type.body, fontSize: 14, color: colors.text },
  warn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  warnText: { ...type.body, fontSize: 11, color: colors.red },
});
