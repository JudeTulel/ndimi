import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StepIndicator } from '../../components/StepIndicator';
import { setPref, ONBOARDING_COMPLETE } from '../../core/db/preferences';
import { ModelList } from '../../features/models/ModelList';
import { CATALOG, formatBytes } from '../../features/models/catalog';
import {
  freeDiskBytes,
  hydrate,
  subscribe,
  type ModelStatusMap,
} from '../../features/models/modelStore';
import { colors, radius, spacing, type } from '../../theme/tokens';

/**
 * Final wizard step. Non-blocking: models can be queued here and the user can
 * move on immediately — downloads continue in the background and full
 * management lives in Settings.
 */
export default function ModelSetup() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    void hydrate();
    void freeDiskBytes().then(setFree);
    return subscribe(setStatus);
  }, []);

  const downloading = CATALOG.filter((m) => status[m.id]?.status === 'downloading').length;
  const installed = CATALOG.filter((m) => status[m.id]?.status === 'installed').length;

  const finish = async () => {
    await setPref(ONBOARDING_COMPLETE, 'true');
    router.replace('/(tabs)');
  };

  const summary =
    installed === 0 && downloading === 0
      ? 'Optional — you can install models any time from Settings.'
      : `${installed} installed${downloading > 0 ? ` · ${downloading} downloading in the background` : ''}`;

  return (
    <Screen gutter={spacing.md} contentStyle={styles.content}>
      <StepIndicator current={2} />

      <View style={styles.header}>
        <Text style={styles.title}>AI Setup</Text>
        <Text style={styles.subtitle}>
          Start a download now or skip and do it later. Nothing here blocks the app.
        </Text>
      </View>

      <View style={styles.banner}>
        <Ionicons name="information-circle-outline" size={18} color={colors.text} />
        <Text style={styles.bannerText}>{summary}</Text>
      </View>

      <ModelList status={status} free={free} />

      <Text style={styles.storage}>
        {free === null ? 'Checking free space…' : `${formatBytes(free)} free`}
      </Text>

      <View style={styles.footer}>
        <PrimaryButton label="Back" variant="ghost" onPress={() => router.back()} />
        <PrimaryButton label={downloading > 0 ? 'Continue' : 'Start translating'} onPress={finish} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm + 4 },
  header: { gap: spacing.xs + 2, paddingHorizontal: spacing.xs },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.body, color: colors.secondaryText },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sulphur,
    borderRadius: radius.input,
    padding: spacing.sm + 4,
  },
  bannerText: { ...type.body, color: colors.text, flex: 1 },
  storage: {
    ...type.body,
    fontSize: 11,
    color: colors.secondaryText,
    paddingHorizontal: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
