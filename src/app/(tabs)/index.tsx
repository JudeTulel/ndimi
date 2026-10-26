import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing, type } from '../../theme/tokens';
import { CATALOG } from '../../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../../features/models/modelStore';
import { listHistory, type HistoryEntry } from '../../features/history/historyStore';

const ACTIONS = [
  { icon: 'camera-outline' as const, title: 'Camera', caption: 'Snap your text.', route: '/translate' },
  { icon: 'mic-outline' as const, title: 'Voice', caption: 'Speak and translate.', route: '/voice' },
  { icon: 'language-outline' as const, title: 'Translate', caption: 'Type to translate.', route: '/translate' },
  { icon: 'scan-outline' as const, title: 'History', caption: 'Past translations.', route: '/history' },
];

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [recent, setRecent] = useState<HistoryEntry[]>([]);

  useEffect(() => subscribe(setStatus), []);
  useEffect(() => {
    void listHistory(3).then(setRecent);
  }, []);

  const readyTasks = (['asr', 'translation'] as const).filter((task) =>
    CATALOG.some((m) => m.task === task && status[m.id]?.status === 'installed')
  );
  const modelsReady = readyTasks.length === 2;

  return (
    <Screen footerGap={spacing.sm}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>Ndimi</Text>
        <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={10}>
          <Ionicons name="person-circle-outline" size={26} color={colors.dark} />
        </Pressable>
      </View>

      <Pressable style={styles.inputCard} onPress={() => router.push('/translate')}>
        <Text style={styles.inputPlaceholder}>Write text to translate…</Text>
        <View style={styles.inputRow}>
          <Text style={styles.pair}>English → Swahili</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.red} />
        </View>
      </Pressable>

      <Pressable
        style={[styles.banner, !modelsReady && styles.bannerWarn]}
        onPress={() => router.push(modelsReady ? '/onboarding/models' : '/settings/models')}>
        <View style={styles.bannerIcon}>
          <Ionicons
            name={modelsReady ? 'sparkles-outline' : 'cloud-download-outline'}
            size={18}
            color={colors.red}
          />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>
            {modelsReady ? 'Models ready · offline' : 'Finish model setup'}
          </Text>
          <Text style={styles.bannerCaption}>
            {modelsReady
              ? 'Everything runs on this phone.'
              : 'Install a speech and translation model to start.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
      </Pressable>

      <View style={styles.grid}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.title}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            onPress={() => router.push(action.route as never)}>
            <View style={styles.tileTop}>
              <View style={styles.tileIcon}>
                <Ionicons name={action.icon} size={20} color={colors.red} />
              </View>
              <Ionicons name="arrow-up-outline" size={16} color={colors.dark} style={styles.diag} />
            </View>
            <Text style={styles.tileTitle}>{action.title}</Text>
            <Text style={styles.tileCaption}>{action.caption}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.historyHead}>
        <Text style={styles.sectionTitle}>History</Text>
        <Pressable onPress={() => router.push('/history')} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <Text style={styles.empty}>Nothing translated yet.</Text>
      ) : (
        recent.map((entry) => (
          <View key={entry.id} style={styles.historyCard}>
            <View style={styles.historyIcon}>
              <Ionicons
                name={entry.inputType === 'voice' ? 'mic-outline' : 'document-text-outline'}
                size={17}
                color={colors.red}
              />
            </View>
            <View style={styles.historyText}>
              <Text style={styles.historySource} numberOfLines={1}>
                {entry.sourceText}
              </Text>
              <Text style={styles.historyResult} numberOfLines={1}>
                {entry.translatedText}
              </Text>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { ...type.display, fontSize: 30, color: colors.dark },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputPlaceholder: { ...type.body, fontSize: 14, color: colors.secondaryText },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pair: { ...type.label, color: colors.dark },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerWarn: { backgroundColor: colors.sulphur },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.badge,
    backgroundColor: colors.sulphur,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, gap: 1 },
  bannerTitle: { ...type.cardTitle, color: colors.dark },
  bannerCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.badge,
    backgroundColor: colors.sulphur,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diag: { transform: [{ rotate: '45deg' }] },
  tileTitle: { ...type.cardTitle, color: colors.dark },
  tileCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { ...type.h2, color: colors.dark },
  seeAll: { ...type.body, fontSize: 12, color: colors.secondaryText },
  empty: { ...type.body, color: colors.secondaryText },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.badge,
    backgroundColor: colors.sulphur,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: { flex: 1, gap: 1 },
  historySource: { ...type.body, fontSize: 12, color: colors.dark },
  historyResult: { ...type.body, fontSize: 11, color: colors.secondaryText },
});
