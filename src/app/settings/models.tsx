import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../../theme/tokens';
import { ModelList } from '../../features/models/ModelList';
import { CATALOG, formatBytes, type CatalogModel } from '../../features/models/catalog';
import { adoptModelFile } from '../../features/models/adoptService';
import {
  adoptInstalled,
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
  const [adopting, setAdopting] = useState<string | null>(null);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const [adoptNote, setAdoptNote] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
    void freeDiskBytes().then(setFree);
    return subscribe(setStatus);
  }, []);

  /**
   * Points the manager at a weight file the user already has. The service copies it
   * into app storage and proves it loads; recording it is then the same install an
   * in-app download produces, so everything downstream (pickers, remove, resume)
   * treats it identically.
   */
  const adopt = async () => {
    setAdoptError(null);
    setAdoptNote(null);
    try {
      const result = await adoptModelFile((stage) =>
        setAdopting(stage === 'picking' ? 'Choose a file' : stage === 'hashing' ? 'Checking SHA-256…' : stage === 'copying' ? 'Copying into app storage…' : 'Test loading…')
      );
      if (!result) return;
      if (!result.ok) {
        setAdoptError(result.message);
        return;
      }
      const model = CATALOG.find((m): m is CatalogModel => m.id === result.catalogId);
      if (model) await adoptInstalled(model, result.localPath, model.sha256);
      setAdoptNote(
        `${model?.title ?? 'Model'} added from your file.${
          result.renamed ? ' Renamed to its published filename so the runtime recognises it.' : ''
        }`
      );
      void freeDiskBytes().then(setFree);
    } finally {
      setAdopting(null);
    }
  };

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

        {/* Alternate install path: use weights the user already has on disk instead of
            downloading them again. */}
        <Pressable
          onPress={() => void adopt()}
          disabled={!!adopting}
          style={[styles.adopt, adopting ? styles.adoptBusy : null]}
          accessibilityRole="button">
          <View style={styles.adoptIcon}>
            <Ionicons
              name={adopting ? 'hourglass-outline' : 'folder-open-outline'}
              size={16}
              color={colors.green}
            />
          </View>
          <View style={styles.adoptText}>
            <Text style={styles.adoptTitle}>
              {adopting ?? 'Use a model file from this phone'}
            </Text>
            <Text style={styles.adoptHint}>
              {adopting
                ? 'Keep this screen open.'
                : 'Already downloaded a .gguf or .bin? It is checked against the catalog, then installed.'}
            </Text>
          </View>
          {adopting ? null : (
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          )}
        </Pressable>

        {adoptError ? <Text style={styles.adoptError}>{adoptError}</Text> : null}
        {adoptNote ? <Text style={styles.adoptNote}>{adoptNote}</Text> : null}

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
  adopt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.successSoft,
    borderRadius: 18,
    padding: spacing.md,
  },
  adoptBusy: { borderColor: colors.green },
  adoptIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenWash,
  },
  adoptText: { flex: 1, gap: 2 },
  adoptTitle: { ...type.cardTitle, color: colors.text },
  adoptHint: { ...type.body, fontSize: 11, color: colors.green },
  adoptError: { ...type.body, fontSize: 11, color: colors.danger },
  adoptNote: { ...type.body, fontSize: 11, color: colors.greenInk },
});
