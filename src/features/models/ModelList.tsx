import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DownloadProgress } from '../../components/DownloadProgress';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radius, spacing, type } from '../../theme/tokens';
import {
  getInUseChatId,
  loadActiveChatModel,
  setActiveChat,
  subscribeActiveChat,
} from '../chat/chatService';
import { CATALOG, formatBytes, type CatalogModel, type ModelTask } from './catalog';
import {
  cancelDownload,
  hasInstalledTask,
  remove,
  startDownload,
  type ModelState,
  type ModelStatusMap,
} from './modelStore';

const TASKS: { key: ModelTask; label: string; caption: string }[] = [
  { key: 'asr', label: 'Speech recognition', caption: 'Required for voice translation' },
  { key: 'translation', label: 'Translation', caption: 'Required for all translation' },
  { key: 'ocr', label: 'Text scanning', caption: 'Required for camera translation' },
  { key: 'chat', label: 'General chat', caption: 'Optional — conversational assistant' },
];

type Props = {
  status: ModelStatusMap;
  free: number | null;
};

/**
 * The curated catalog grouped by task. Shared by the onboarding setup step and
 * the Settings model manager so both stay identical.
 */
export function ModelList({ status, free }: Props) {
  const [activeChat, setActive] = useState<string | null>(getInUseChatId());

  useEffect(() => {
    void loadActiveChatModel();
    return subscribeActiveChat(() => setActive(getInUseChatId()));
  }, []);

  return (
    <>
      {TASKS.map((task) => {
        const models = CATALOG.filter((m) => m.task === task.key);
        return (
          <View key={task.key} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupLabel}>{task.label.toUpperCase()}</Text>
              {hasInstalledTask(status, task.key) ? (
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
                active={activeChat === model.id}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}

function ModelCard({
  model,
  state,
  free,
  active,
}: {
  model: CatalogModel;
  state: ModelState;
  free: number | null;
  active: boolean;
}) {
  // Only block a fresh download when free space genuinely cannot hold it.
  const tooBig =
    free !== null &&
    state.status === 'absent' &&
    free < (model.sizeBytes + (model.projection?.sizeBytes ?? 0)) * 1.1;

  return (
    <View style={[styles.card, state.status === 'installed' && styles.cardDone]}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitles}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{model.title}</Text>
            {active ? (
              <View style={styles.activePill}>
                <Text style={styles.activeText}>IN USE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardMeta}>
            {model.quantization} ·{' '}
            {formatBytes(model.sizeBytes + (model.projection?.sizeBytes ?? 0))} ·{' '}
            {model.licence}
            {/* Speech models are language-scoped, so say which before install. */}
            {model.task === 'asr'
              ? ` · ${model.languages.map((l) => l.toUpperCase()).join('/')} only`
              : ''}
            {/* A multimodal install is two files; say so rather than let the size jump. */}
            {model.projection ? ' · weights + image projector' : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          {/* Several chat models can be installed at once, so the assistant needs to
              be told which one to run. Only offered for installed chat entries. */}
          {model.task === 'chat' && state.status === 'installed' && !active ? (
            <PrimaryButton label="Use" compact variant="ghost" onPress={() => void setActiveChat(model.id)} />
          ) : null}
          <ModelAction model={model} state={state} tooBig={tooBig} />
        </View>
      </View>

      <Text style={styles.cardBody}>{model.summary}</Text>

      {state.status === 'downloading' ? (
        state.totalBytes > 0 ? (
          <DownloadProgress
            bytesWritten={state.bytesWritten}
            totalBytes={state.totalBytes}
            progress={state.progress}
          />
        ) : (
          <Text style={styles.cardStatus}>Fetching from the QVAC registry…</Text>
        )
      ) : null}

      {state.status === 'verifying' ? (
        <Text style={styles.cardStatus}>Verifying SHA-256…</Text>
      ) : null}

      {state.status === 'paused' ? (
        <DownloadProgress
          bytesWritten={state.bytesWritten}
          totalBytes={state.totalBytes}
          progress={state.totalBytes > 0 ? state.bytesWritten / state.totalBytes : 0}
        />
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
  if (state.status === 'paused') {
    // Paused keeps its bytes; Resume continues rather than restarting.
    return <PrimaryButton label="Resume" compact onPress={() => startDownload(model)} />;
  }
  const label = state.status === 'failed' ? 'Retry' : 'Download';
  return (
    <PrimaryButton label={label} compact disabled={tooBig} onPress={() => startDownload(model)} />
  );
}

const styles = StyleSheet.create({
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
    // Green: these are guidance lines, not body copy.
    color: colors.green,
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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  activePill: {
    backgroundColor: colors.dark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activeText: { ...type.label, fontSize: 9, color: '#FFFFFF' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { ...type.cardTitle, color: colors.text },
  cardMeta: { ...type.body, fontSize: 11, color: colors.secondaryText },
  cardBody: { ...type.body, color: colors.secondaryText },
  cardStatus: { ...type.body, fontSize: 11, color: colors.red },
  cardError: { ...type.body, fontSize: 11, color: colors.danger },
});
