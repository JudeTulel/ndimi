import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radius, spacing, type } from '../../theme/tokens';
import { CATALOG, formatBytes } from '../../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../../features/models/modelStore';
import { clearPin, hasPin, setPin } from '../../features/agent/pin';
import { clearHistory, listHistory } from '../../features/history/historyStore';
import {
  DIRECTIONS,
  getDirection,
  getOfflineMode,
  setDirection,
  setOfflineMode,
  type Direction,
} from '../../core/db/settings';

export default function Profile() {
  const router = useRouter();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [direction, setDirectionState] = useState<Direction>('en-sw');
  const [offline, setOffline] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [cleared, setCleared] = useState(false);
  const [hasSaved, setHasSaved] = useState<boolean | null>(null);
  const [pinDraft, setPinDraft] = useState('');

  useEffect(() => subscribe(setStatus), []);
  useEffect(() => {
    void getDirection().then(setDirectionState);
    void getOfflineMode().then(setOffline);
    void listHistory({ limit: 1000 }).then((rows) => setSaved(rows.length));
    void hasPin().then(setHasSaved);
  }, []);

  const savePin = async () => {
    await setPin(pinDraft);
    setPinDraft('');
    setHasSaved(true);
  };

  const forgetPin = async () => {
    await clearPin();
    setHasSaved(false);
  };

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

  const chooseDirection = async (value: Direction) => {
    setDirectionState(value);
    await setDirection(value);
  };

  const toggleOffline = async (value: boolean) => {
    setOffline(value);
    await setOfflineMode(value);
  };

  const eraseHistory = async () => {
    await clearHistory();
    setSaved(0);
    setCleared(true);
  };

  return (
    <Screen tabBar={false}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>MODELS</Text>
        <Text style={styles.cardValue}>{modelSummary}</Text>
        {counts.failed > 0 ? (
          <Text style={styles.warn}>{counts.failed} need attention — open Settings to retry.</Text>
        ) : null}
      </View>

      <Text style={styles.section}>Translation</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>DEFAULT DIRECTION</Text>
        <View style={styles.segments}>
          {DIRECTIONS.map((option) => {
            const on = direction === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => void chooseDirection(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.segment, on && styles.segmentOn]}>
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.rowIcon}>
          <Ionicons name="airplane-outline" size={20} color={colors.red} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Offline mode</Text>
          <Text style={styles.rowCaption}>
            Hides network-backed actions. Inference already runs on device.
          </Text>
        </View>
        <Switch
          value={offline}
          onValueChange={(value) => void toggleOffline(value)}
          trackColor={{ false: colors.border, true: colors.red }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text style={styles.section}>Data</Text>

      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => void eraseHistory()}>
        <View style={styles.rowIcon}>
          <Ionicons name="trash-outline" size={20} color={colors.red} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Clear history</Text>
          <Text style={styles.rowCaption}>
            {saved === null
              ? 'Reading local history…'
              : cleared && saved === 0
                ? 'History is empty.'
                : `${saved} saved translation${saved === 1 ? '' : 's'} on this phone.`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
      </Pressable>

      <Text style={styles.section}>Agent</Text>

      <View style={styles.pinRow}>
        <View style={styles.rowIcon}>
          <Ionicons name="keypad-outline" size={20} color={colors.red} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>M-Pesa PIN</Text>
          <Text style={styles.rowCaption}>
            {hasSaved === null
              ? 'Reading…'
              : hasSaved
                ? 'Saved — the agent sends it when a USSD menu asks.'
                : 'Not saved. The agent cannot pay or confirm without it.'}
          </Text>
        </View>
        {hasSaved ? (
          <Pressable onPress={() => void forgetPin()} hitSlop={8}>
            <Text style={styles.pinForget}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.pinInputRow}>
        <TextInput
          style={styles.pinInput}
          value={pinDraft}
          onChangeText={setPinDraft}
          placeholder="4 to 6 digits"
          placeholderTextColor={colors.secondaryText}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />
        <PrimaryButton
          label={hasSaved ? 'Update' : 'Save'}
          compact
          disabled={pinDraft.replace(/\D/g, '').length < 4}
          onPress={() => void savePin()}
        />
      </View>

      <Text style={styles.section}>Manage</Text>

      <SettingRow
        icon="cube-outline"
        title="Models"
        caption="Download, retry or remove translation and speech models"
        onPress={() => router.push('/settings/models')}
      />

      <Text style={styles.footnote}>
        Ndimi Swahili keeps audio, transcripts and translations on this device. Nothing is uploaded.
      </Text>
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
  segments: { flexDirection: 'row', gap: spacing.xs + 2, marginTop: spacing.xs },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.sm,
  },
  segmentOn: { backgroundColor: colors.dark, borderColor: colors.dark },
  segmentText: { ...type.label, fontSize: 10, color: colors.secondaryText },
  segmentTextOn: { color: '#FFFFFF' },
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
  toggleRow: {
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
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pinForget: { ...type.label, fontSize: 10, color: colors.red },
  pinInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pinInput: {
    flex: 1,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...type.body,
    fontSize: 15,
    letterSpacing: 3,
    color: colors.text,
  },
  rowTitle: { ...type.cardTitle, color: colors.text },
  rowCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  footnote: { ...type.body, fontSize: 11, color: colors.secondaryText, marginTop: spacing.sm },
});
