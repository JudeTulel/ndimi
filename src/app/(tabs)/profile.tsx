import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, type } from '../../theme/tokens';
import { CATALOG, formatBytes } from '../../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../../features/models/modelStore';

export default function Profile() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});

  useEffect(() => subscribe(setStatus), []);

  const installed = useMemo(
    () => CATALOG.filter((model) => status[model.id]?.status === 'installed'),
    [status]
  );
  const bytes = installed.reduce((sum, model) => sum + model.sizeBytes, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Installed models</Text>
          {installed.length === 0 ? (
            <Text style={styles.muted}>No models installed yet.</Text>
          ) : (
            installed.map((model) => (
              <View key={model.id} style={styles.row}>
                <Text style={styles.rowText}>{model.title}</Text>
                <Text style={styles.muted}>{formatBytes(model.sizeBytes)}</Text>
              </View>
            ))
          )}
          {installed.length > 0 ? (
            <Text style={styles.muted}>Total {formatBytes(bytes)}</Text>
          ) : null}
        </View>

        <PrimaryButton label="Manage models" onPress={() => router.push('/onboarding/models')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.h1, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...type.cardTitle, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowText: { ...type.body, color: colors.text, flex: 1 },
  muted: { ...type.body, fontSize: 11, color: colors.secondaryText },
});
