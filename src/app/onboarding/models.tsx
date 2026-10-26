import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DownloadProgress } from '../../components/DownloadProgress';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StepIndicator } from '../../components/StepIndicator';
import { setPref, ONBOARDING_COMPLETE } from '../../core/db/preferences';
import { colors, radius, spacing, type } from '../../theme/tokens';
import {
  CATALOG,
  formatBytes,
  type CatalogModel,
  type ModelTask,
} from '../../features/models/catalog';
import {
  cancelDownload,
  freeDiskBytes,
  hasInstalledTask,
  hydrate,
  remove,
  startDownload,
  subscribe,
  type ModelState,
  type ModelStatusMap,
} from '../../features/models/modelStore';

const TASKS: { key: ModelTask; label: string; caption: string }[] = [
  { key: 'asr', label: 'Speech recognition', caption: 'Required for voice translation' },
  { key: 'translation', label: 'Translation', caption: 'Required for all translation' },
];

export default function ModelSetup() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    void hydrate();
    void freeDiskBytes().then(setFree);
    return subscribe(setStatus);
  }, []);

  const installed = useMemo(
    () => ({
      asr: hasInstalledTask(status, 'asr'),
      translation: hasInstalledTask(status, 'translation'),
    }),
    [status]
  );
  const ready = installed.asr && installed.translation;

  const finish = async () => {
    await setPref(ONBOARDING_COMPLETE, 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StepIndicator current={2} />

        <View style={styles.header}>
          <Text style={styles.title}>AI Setup</Text>
          <Text style={styles.subtitle}>
            Models download once, then everything runs offline. Install one model per task.
          </Text>
        </View>

        {TASKS.map((task) => {
          const models = CATALOG.filter((m) => m.task === task.key);
          return (
            <View key={task.key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{task.label.toUpperCase()}</Text>
                {installed[task.key] ? (
                  <View style={styles.readyPill}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    <Text style={styles.readyText}>Ready</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.groupCaption}>{task.caption}</Text>
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  state={status[model.id] ?? { status: 'absent' }}
                  free={free}
                />
              ))}
            </View>
          );
        })}

        <Text style={styles.storage}>
          {free === null
            ? 'Checking free space…'
            : `${formatBytes(free)} free · models stay in app storage and can be removed here.`}
        </Text>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <PrimaryButton label="Back" variant="ghost" onPress={() => router.back()} />
          <PrimaryButton label="Start translating" disabled={!ready} onPress={finish} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModelCard({
  model,
  state,
  free,
}: {
  model: CatalogModel;
  state: ModelState;
  free: number | null;
}) {
  const tooBig = free !== null && state.status === 'absent' && free < model.sizeBytes * 1.1;

  return (
    <View style={[styles.card, state.status === 'installed' && styles.cardDone]}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitles}>
          <Text style={styles.cardTitle}>{model.title}</Text>
          <Text style={styles.cardMeta}>
            {model.quantization} · {formatBytes(model.sizeBytes)} · {model.licence}
          </Text>
        </View>
        <ModelAction model={model} state={state} tooBig={tooBig} />
      </View>

      <Text style={styles.cardBody}>{model.summary}</Text>

      {state.status === 'downloading' ? (
        <DownloadProgress
          bytesWritten={state.bytesWritten}
          totalBytes={state.totalBytes}
          progress={state.progress}
        />
      ) : null}

      {state.status === 'verifying' ? (
        <Text style={styles.cardStatus}>Verifying SHA-256…</Text>
      ) : null}

      {state.status === 'failed' ? <Text style={styles.cardError}>{state.message}</Text> : null}

      {tooBig ? (
        <Text style={styles.cardError}>Not enough free space for this download.</Text>
      ) : null}
    </View>
  );
}

function ModelAction({
  model,
  state,
  tooBig,
}: {
  model: CatalogModel;
  state: ModelState;
  tooBig: boolean;
}) {
  if (state.status === 'installed') {
    return <PrimaryButton label="Remove" compact variant="ghost" onPress={() => remove(model)} />;
  }
  if (state.status === 'downloading') {
    return (
      <PrimaryButton
        label="Cancel"
        compact
        variant="ghost"
        onPress={() => cancelDownload(model.id)}
      />
    );
  }
  if (state.status === 'verifying') {
    return <Text style={styles.cardStatus}>Verifying</Text>;
  }
  const label = state.status === 'failed' ? 'Retry' : 'Download';
  return (
    <PrimaryButton label={label} compact disabled={tooBig} onPress={() => startDownload(model)} />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm + 4,
  },
  header: { gap: spacing.xs + 2, paddingHorizontal: spacing.xs },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.body, color: colors.secondaryText },
  group: { gap: spacing.xs + 2, marginTop: spacing.sm },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  groupLabel: { ...type.label, color: colors.secondaryText },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  readyText: { ...type.label, fontSize: 10, color: '#FFFFFF' },
  groupCaption: {
    ...type.body,
    fontSize: 11,
    color: colors.secondaryText,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardDone: { borderColor: colors.successSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitles: { flex: 1, gap: 2 },
  cardTitle: { ...type.cardTitle, color: colors.text },
  cardMeta: { ...type.body, fontSize: 11, color: colors.secondaryText },
  cardBody: { ...type.body, color: colors.secondaryText },
  cardStatus: { ...type.body, fontSize: 11, color: colors.red },
  cardError: { ...type.body, fontSize: 11, color: colors.danger },
  storage: {
    ...type.body,
    fontSize: 11,
    color: colors.secondaryText,
    paddingHorizontal: spacing.xs,
  },
  spacer: { flex: 1, minHeight: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
