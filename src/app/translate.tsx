import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
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
  const params = useLocalSearchParams<{ text?: string }>();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [source, setSource] = useState(params.text ?? '');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState('en');

  useEffect(() => subscribe(setStatus), []);
  const to = from === 'en' ? 'sw' : 'en';

  const model = useMemo(
    () =>
      CATALOG.find((m) => m.task === 'translation' && status[m.id]?.status === 'installed'),
    [status]
  );

  // Inference adapters are not wired yet; this records the intent, gates on a
  // real installed model, and persists the result so History is exercised.
  const run = async () => {
    if (!source.trim() || !model) return;
    setBusy(true);
    try {
      const translated = `[${model.title}] ${source.trim()}`;
      setResult(translated);
      await saveTranslation(
        {
          sourceText: source.trim(),
          translatedText: translated,
          sourceLanguage: from,
          targetLanguage: to,
        },
        'text',
        model.id
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.dark} />
        </Pressable>
        <Text style={styles.title}>Translate</Text>
        <View style={styles.spacerIcon} />
      </View>

      <View style={styles.pairRow}>
        <Pressable style={styles.lang} onPress={() => setFrom(to)}>
          <Text style={styles.langText}>{LANGS.find((l) => l.code === from)?.label}</Text>
        </Pressable>
        <Ionicons name="swap-horizontal" size={18} color={colors.red} />
        <Pressable style={styles.lang} onPress={() => setFrom(to)}>
          <Text style={styles.langText}>{LANGS.find((l) => l.code === to)?.label}</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Write text to translate…"
        placeholderTextColor={colors.secondaryText}
        value={source}
        onChangeText={setSource}
      />

      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>TRANSLATION</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}

      {!model ? (
        <Pressable style={styles.warn} onPress={() => router.push('/settings/models')}>
          <Ionicons name="cloud-download-outline" size={16} color={colors.red} />
          <Text style={styles.warnText}>No translation model installed — tap to fix.</Text>
        </Pressable>
      ) : null}

      <PrimaryButton
        label={busy ? 'Translating…' : 'Translate'}
        trailing="→"
        disabled={!source.trim() || !model || busy}
        onPress={run}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.h1, color: colors.dark },
  spacerIcon: { width: 22 },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  lang: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  langText: { ...type.cardTitle, color: colors.dark },
  input: {
    flex: 1,
    minHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...type.body,
    fontSize: 14,
    color: colors.dark,
    textAlignVertical: 'top',
  },
  resultCard: {
    backgroundColor: colors.sulphur,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultLabel: { ...type.label, color: colors.secondaryText },
  resultText: { ...type.body, fontSize: 14, color: colors.dark },
  warn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  warnText: { ...type.body, fontSize: 11, color: colors.red },
});
