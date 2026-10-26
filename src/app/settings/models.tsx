import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../../theme/tokens';
import { ModelList } from '../../features/models/ModelList';
import { CATALOG, formatBytes } from '../../features/models/catalog';
import {
  freeDiskBytes,
  hydrate,
  subscribe,
  type ModelStatusMap,
} from '../../features/models/modelStore';

/** Full model manager. Reachable from Profile › Settings at any time. */
export default function SettingsModels() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    void hydrate();
    void freeDiskBytes().then(setFree);
    return subscribe(setStatus);
  }, []);

  const downloaded = CATALOG.filter((m) => status[m.id]?.status === 'installed').reduce(
    (sum, m) => sum + m.sizeBytes,
    0
  );

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Models</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {formatBytes(downloaded)} used by models
            {free === null ? '' : ` · ${formatBytes(free)} free`}
          </Text>
          <Text style={styles.summaryHint}>
            Downloads continue while you use the app. A model is only usable once its checksum has
            been verified.
          </Text>
        </View>

        <ModelList status={status} free={free} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  back: { padding: spacing.xs },
  title: { ...type.h1, color: colors.text },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  summary: {
    backgroundColor: colors.sulphur,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryText: { ...type.cardTitle, color: colors.text },
  summaryHint: { ...type.body, fontSize: 11, color: colors.secondaryText },
});
