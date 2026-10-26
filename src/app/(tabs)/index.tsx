import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing, type } from '../../theme/tokens';
import { CATALOG } from '../../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../../features/models/modelStore';
import { listHistory, type HistoryEntry } from '../../features/history/historyStore';
import { getDirection, type Direction } from '../../core/db/settings';

const TILES = [
  { icon: 'camera-outline' as const, title: 'Camera', caption: 'Snap your text.', route: '/camera' },
  { icon: 'mic-outline' as const, title: 'Voice', caption: 'Speak and translate.', route: '/voice' },
  { icon: 'language-outline' as const, title: 'Translate AI', caption: 'Smart. Fast. Now.', route: '/translate' },
  { icon: 'scan-outline' as const, title: 'Scan', caption: 'Scan and convert.', route: '/camera' },
];

export default function Home() {
  const router = useRouter();
  const navigation = useNavigation();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  const [direction, setDirection] = useState<Direction>('en-sw');

  useEffect(() => subscribe(setStatus), []);
  useEffect(() => {
    void getDirection().then(setDirection);
  }, []);

  // Refresh the two most recent rows on focus: the tab stays mounted while the
  // user translates elsewhere, so a mount-only load would show stale history.
  useEffect(() => {
    const reload = () => void listHistory({ limit: 2 }).then(setRecent);
    reload();
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [navigation]);

  // Ready means at least one model per required task, not every catalog entry.
  const hasTask = (task: 'asr' | 'translation') =>
    CATALOG.some((m) => m.task === task && status[m.id]?.status === 'installed');
  const modelsReady = hasTask('asr') && hasTask('translation');
  const directionLabel = direction === 'sw-en' ? 'Swahili → English' : 'English → Swahili';

  return (
    <Screen footerGap={spacing.sm}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.wordmark}>Ndimi</Text>
          <Text style={styles.brandCaption}>English ↔ Swahili</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={10} style={styles.avatar}>
          <Ionicons name="person-outline" size={16} color={colors.sulphur} />
        </Pressable>
      </View>

      <GlassCard onPress={() => router.push('/translate')} style={styles.prompt}>
        <Text style={styles.promptText}>Write text to translate…</Text>
        <View style={styles.promptRow}>
          <Text style={styles.pair}>{directionLabel}</Text>
          <View style={styles.go}>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </View>
        </View>
      </GlassCard>

      <GlassCard
        onPress={() =>
          router.push(
            modelsReady
              ? '/(tabs)/chat'
              : '/settings/models'
          )
        }
        style={styles.assistant}>
        <View style={styles.assistantIcon}>
          <Ionicons name={modelsReady ? 'sparkles' : 'cloud-download-outline'} size={18} color={colors.red} />
        </View>
        <View style={styles.assistantText}>
          <Text style={styles.assistantTitle}>
            {modelsReady ? 'Help Assistant AI' : 'Finish model setup'}
          </Text>
          <Text style={styles.assistantCaption}>
            {modelsReady
              ? 'Get help instantly.'
              : `${hasTask('translation') ? 'Translation' : 'Speech'} model still missing.`}
          </Text>
        </View>
        <Ionicons name="arrow-up-outline" size={16} color={colors.text} style={styles.diag} />
      </GlassCard>

      <View style={styles.grid}>
        {TILES.map((tile) => (
          <GlassCard key={tile.title} onPress={() => router.push(tile.route as never)} style={styles.tile}>
            <View style={styles.tileTop}>
              <View style={styles.tileIcon}>
                <Ionicons name={tile.icon} size={18} color={colors.red} />
              </View>
              <Ionicons name="arrow-up-outline" size={15} color={colors.text} style={styles.diag} />
            </View>
            <Text style={styles.tileTitle}>{tile.title}</Text>
            <Text style={styles.tileCaption}>{tile.caption}</Text>
          </GlassCard>
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
          <GlassCard key={entry.id} radiusSize={radius.input} style={styles.historyRow}>
            <View style={styles.historyIcon}>
              <Ionicons
                name={entry.inputType === 'voice' ? 'mic-outline' : 'document-text-outline'}
                size={16}
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
          </GlassCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { gap: 1 },
  wordmark: { ...type.display, color: colors.text },
  brandCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.badge,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: { gap: spacing.md },
  promptText: { ...type.body, fontSize: 14, color: colors.secondaryText },
  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pair: { ...type.label, color: colors.text },
  go: {
    width: 26,
    height: 26,
    borderRadius: radius.badge,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistant: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assistantIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.badge,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantText: { flex: 1, gap: 1 },
  assistantTitle: { ...type.cardTitle, color: colors.text },
  assistantCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  diag: { transform: [{ rotate: '45deg' }] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  tile: { width: '47.5%', flexGrow: 1, gap: spacing.xs },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.badge,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { ...type.cardTitle, color: colors.text },
  tileCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { ...type.h2, color: colors.text },
  seeAll: { ...type.label, color: colors.red },
  empty: { ...type.body, color: colors.secondaryText },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 4 },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.badge,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: { flex: 1, gap: 1 },
  historySource: { ...type.body, fontSize: 12, color: colors.text },
  historyResult: { ...type.body, fontSize: 11, color: colors.secondaryText },
});
