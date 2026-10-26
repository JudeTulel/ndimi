import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing, type } from '../../theme/tokens';
import { CATALOG, formatBytes } from '../../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../../features/models/modelStore';

export default function Profile() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});

  useEffect(() => subscribe(setStatus), []);

  const counts = useMemo(() => {
    const values = CATALOG.map((model) => status[model.id]?.status ?? 'absent');
    return {
      installed: values.filter((v) => v === 'installed').length,
      downloading: values.filter((v) => v === 'downloading').length,
      failed: values.filter((v) => v === 'failed').length,
    };
  }, [status]);

  const bytes = useMemo(
    () =>
      CATALOG.filter((model) => status[model.id]?.status === 'installed').reduce(
        (sum, model) => sum + model.sizeBytes,
        0
      ),
    [status]
  );

  const modelSummary =
    counts.downloading > 0
      ? `${counts.downloading} downloading · ${counts.installed} installed`
      : counts.installed > 0
        ? `${counts.installed} installed · ${formatBytes(bytes)}`
        : 'No models installed';

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>MODELS</Text>
        <Text style={styles.cardValue}>{modelSummary}</Text>
        {counts.failed > 0 ? (
          <Text style={styles.warn}>{counts.failed} need attention — open Settings to retry.</Text>
        ) : null}
      </View>

      <Text style={styles.section}>Settings</Text>

      <SettingRow
        icon="cube-outline"
        title="Models"
        caption="Download, retry or remove translation and speech models"
        onPress={() => router.push('/settings/models')}
      />
    </Screen>
  );
}

function SettingRow({
  icon,
  title,
  caption,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.red} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowCaption}>{caption}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { ...type.label, color: colors.secondaryText },
  cardValue: { ...type.cardTitle, color: colors.text },
  warn: { ...type.body, fontSize: 11, color: colors.danger },
  section: { ...type.label, color: colors.secondaryText, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowPressed: { opacity: 0.85 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.badge,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...type.cardTitle, color: colors.text },
  rowCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
});
