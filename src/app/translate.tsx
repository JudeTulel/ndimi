import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { CircleButton } from '../components/CircleButton';
import { GlassCard } from '../components/GlassCard';
import { Screen } from '../components/Screen';
import { Orb } from '../components/Visuals';
import { colors, radius, spacing, type } from '../theme/tokens';
import { CATALOG } from '../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../features/models/modelStore';
import { saveTranslation } from '../features/history/historyStore';
import { getDirection } from '../core/db/settings';
import {
  cancelTranslation,
  translateText,
  type TranslationLanguage,
} from '../features/translate/translationService';

const LANGS: { code: TranslationLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Swahili' },
];

export default function Translate() {
  const router = useRouter();
  const params = useLocalSearchParams<{ text?: string; from?: string }>();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [source, setSource] = useState(params.text ?? '');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<TranslationLanguage>('en');
  const [copied, setCopied] = useState(false);
  const session = useRef({ cancelled: false });

  useEffect(() => subscribe(setStatus), []);

  // Start in the direction the user chose in Profile; a hand-off from Camera or
  // Voice overrides it below.
  useEffect(() => {
    void getDirection().then((preference) => setFrom(preference === 'sw-en' ? 'sw' : 'en'));
  }, []);

  // Camera and voice hand text over as a param; keep the field in sync when the
  // screen is reused rather than remounted.
  useEffect(() => {
    if (params.text) {
      setSource(params.text);
      setResult('');
      setError(null);
    }
    if (params.from === 'sw') setFrom('sw');
  }, [params.text, params.from]);

  useEffect(() => () => void cancelTranslation(), []);

  const to: TranslationLanguage = from === 'en' ? 'sw' : 'en';

  const model = useMemo(
    () => CATALOG.find((m) => m.task === 'translation' && status[m.id]?.status === 'installed'),
    [status]
  );

  const run = async () => {
    const text = source.trim();
    if (!text || !model || busy) return;

    setBusy(true);
    setError(null);
    setResult('');
    setCopied(false);
    session.current = { cancelled: false };

    try {
      const translated = await translateText(
        { text, from, to },
        (partial) => setResult(partial),
        session.current
      );
      if (session.current.cancelled) return;
      if (!translated) throw new Error('The model returned an empty translation.');
      setResult(translated);
      await saveTranslation(
        { sourceText: text, translatedText: translated, sourceLanguage: from, targetLanguage: to },
        // Camera scans are their own input type so History can icon them apart
        // from typed text and speech.
        params.from === 'camera' ? 'camera' : 'text',
        model.id
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed.');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    session.current.cancelled = true;
    await cancelTranslation();
    setBusy(false);
  };

  const copy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    setCopied(true);
  };

  const swap = () => {
    setFrom(to);
    // Swap the panes too, so an existing pair reads correctly in the new direction.
    if (result) {
      setSource(result);
      setResult(source);
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

      <Pressable style={styles.langRow} onPress={swap} accessibilityRole="button">
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
            disabled={!busy && (!source.trim() || !model)}
            onPress={busy ? stop : run}
            accessibilityLabel={busy ? 'Stop' : 'Translate'}>
            <Ionicons name={busy ? 'stop' : 'paper-plane-outline'} size={18} color="#FFFFFF" />
          </CircleButton>
        </View>
      </GlassCard>

      {result ? (
        <GlassCard style={styles.resultCard}>
          <View style={styles.resultHead}>
            <Text style={styles.resultLabel}>
              {to === 'sw' ? 'SWAHILI' : 'ENGLISH'}
              {busy ? ' · TRANSLATING' : ''}
            </Text>
            {!busy ? (
              <View style={styles.resultActions}>
                <Pressable onPress={copy} hitSlop={8}>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={colors.secondaryText}
                  />
                </Pressable>
                <Pressable
                  onPress={() => void Share.share({ message: result })}
                  hitSlop={8}
                  accessibilityLabel="Share">
                  <Ionicons name="share-outline" size={16} color={colors.secondaryText} />
                </Pressable>
              </View>
            ) : null}
          </View>
          <Text style={styles.resultText}>{result}</Text>
        </GlassCard>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
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
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultActions: { flexDirection: 'row', gap: spacing.md },
  resultLabel: { ...type.label, color: colors.secondaryText },
  resultText: { ...type.body, fontSize: 14, color: colors.text },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  errorText: { ...type.body, fontSize: 11, color: colors.red, flex: 1 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  warnText: { ...type.body, fontSize: 11, color: colors.red },
});
