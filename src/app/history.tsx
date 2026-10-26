import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, type } from '../theme/tokens';
import {
  clearHistory,
  deleteEntry,
  listHistory,
  type HistoryEntry,
} from '../features/history/historyStore';

export default function History() {
  const router = useRouter();
  const [rows, setRows] = useState<HistoryEntry[]>([]);

  const load = () => void listHistory(100).then(setRows);
  useEffect(load, []);

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
              load();
            }}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : (
          <View style={styles.spacerIcon} />
        )}
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>Nothing translated yet.</Text>
      ) : (
        rows.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons
                name={entry.inputType === 'voice' ? 'mic-outline' : 'document-text-outline'}
                size={16}
                color={colors.red}
              />
              <Text style={styles.pair}>
                {entry.sourceLanguage.toUpperCase()} → {entry.targetLanguage.toUpperCase()}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={async () => {
                  await deleteEntry(entry.id);
                  load();
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.h1, color: colors.dark },
  spacerIcon: { width: 22 },
  clear: { ...type.cardTitle, color: colors.red },
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
  source: { ...type.body, fontSize: 13, color: colors.dark },
  result: { ...type.body, fontSize: 12, color: colors.secondaryText },
});
