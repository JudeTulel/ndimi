import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, type } from '../theme/tokens';
import {
  clearHistory,
  deleteEntry,
  listHistory,
  listPairs,
  type HistoryEntry,
} from '../features/history/historyStore';

type Pair = { from: string; to: string };

const ICONS: Record<HistoryEntry['inputType'], 'mic-outline' | 'camera-outline' | 'document-text-outline'> = {
  voice: 'mic-outline',
  camera: 'camera-outline',
  text: 'document-text-outline',
};

export default function History() {
  const router = useRouter();
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [query, setQuery] = useState('');
  const [pair, setPair] = useState<Pair | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [entries, available] = await Promise.all([
      listHistory({ q: query, pair: pair ?? undefined }),
      listPairs(),
    ]);
    setRows(entries);
    setPairs(available);
  }, [pair, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const pairsWithCurrent = useMemo(() => {
    if (!pair || pairs.some((p) => p.from === pair.from && p.to === pair.to)) return pairs;
    return [pair, ...pairs];
  }, [pair, pairs]);

  const copy = async (entry: HistoryEntry) => {
    await Clipboard.setStringAsync(entry.translatedText);
    setCopied(entry.id);
    setTimeout(() => setCopied((current) => (current === entry.id ? null : current)), 1200);
  };

  const filtering = !!query.trim() || !!pair;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.dark} />
        </Pressable>
        <Text style={styles.title}>History</Text>
        {rows.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={async () => {
              await clearHistory();
              setPair(null);
              setQuery('');
              await load();
            }}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : (
          <View style={styles.spacerIcon} />
        )}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.secondaryText} />
        <TextInput
          style={styles.search}
          placeholder="Search translations…"
          placeholderTextColor={colors.secondaryText}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
          </Pressable>
        ) : null}
      </View>

      {pairsWithCurrent.length > 0 ? (
        <View style={styles.filters}>
          <Pressable
            onPress={() => setPair(null)}
            style={[styles.chip, !pair && styles.chipOn]}>
            <Text style={[styles.chipText, !pair && styles.chipTextOn]}>All pairs</Text>
          </Pressable>
          {pairsWithCurrent.map((option) => {
            const on = pair?.from === option.from && pair?.to === option.to;
            return (
              <Pressable
                key={`${option.from}-${option.to}`}
                onPress={() => setPair(on ? null : option)}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {option.from.toUpperCase()} → {option.to.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {filtering ? 'Nothing matches that search.' : 'Nothing translated yet.'}
        </Text>
      ) : (
        rows.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name={ICONS[entry.inputType]} size={16} color={colors.red} />
              <Text style={styles.pair}>
                {entry.sourceLanguage.toUpperCase()} → {entry.targetLanguage.toUpperCase()}
              </Text>
              <Text style={styles.stamp}>{stamp(entry.createdAt)}</Text>
              <Pressable onPress={() => void copy(entry)} hitSlop={8} accessibilityLabel="Copy">
                <Ionicons
                  name={copied === entry.id ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={colors.secondaryText}
                />
              </Pressable>
              <Pressable
                hitSlop={8}
                accessibilityLabel="Delete"
                onPress={async () => {
                  await deleteEntry(entry.id);
                  await load();
                }}>
                <Ionicons name="trash-outline" size={15} color={colors.secondaryText} />
              </Pressable>
            </View>
            <Text style={styles.source}>{entry.sourceText}</Text>
            <Text style={styles.result}>{entry.translatedText}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

/** Compact relative stamp — history is scanned, not read. */
function stamp(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.h1, color: colors.dark },
  spacerIcon: { width: 22 },
  clear: { ...type.cardTitle, color: colors.red },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  search: { flex: 1, ...type.body, fontSize: 13, color: colors.text },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  chipOn: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipText: { ...type.label, fontSize: 10, color: colors.secondaryText },
  chipTextOn: { color: '#FFFFFF' },
  empty: { ...type.body, color: colors.secondaryText },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  pair: { ...type.label, color: colors.secondaryText, flex: 1 },
  stamp: { ...type.body, fontSize: 10, color: colors.secondaryText },
  source: { ...type.body, fontSize: 13, color: colors.dark },
  result: { ...type.body, fontSize: 12, color: colors.secondaryText },
});
