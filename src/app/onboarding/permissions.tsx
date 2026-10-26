import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PermissionCard } from '../../components/PermissionCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StepIndicator } from '../../components/StepIndicator';
import { colors, radius, spacing, type } from '../../theme/tokens';

type Grant = 'unknown' | 'granted' | 'denied';

export default function Permissions() {
  const router = useRouter();
  const [camera, requestCamera] = useCameraPermissions();
  const [mic, setMic] = useState<Grant>('unknown');
  const [note, setNote] = useState<string | null>(null);

  const refreshMic = useCallback(async () => {
    const { granted } = await getRecordingPermissionsAsync();
    setMic(granted ? 'granted' : 'unknown');
  }, []);

  // A grant can come from the OS dialog (which resumes the app) or be revoked in
  // Settings; re-read on resume instead of trusting local state.
  useEffect(() => {
    void refreshMic();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshMic();
    });
    return () => sub.remove();
  }, [refreshMic]);

  const cameraGranted = camera?.granted === true;
  const micGranted = mic === 'granted';
  const canContinue = cameraGranted && micGranted;

  const onGrantCamera = async () => {
    const response = await requestCamera();
    if (!response.granted && !response.canAskAgain) {
      setNote('Camera is blocked. Enable it in Settings › Apps › Ndimi › Permissions.');
    }
  };

  const onGrantMic = async () => {
    const { granted, canAskAgain } = await requestRecordingPermissionsAsync();
    if (granted) {
      setMic('granted');
      setNote(null);
      return;
    }
    setMic('denied');
    if (!canAskAgain) {
      setNote('Microphone is blocked. Enable it in Settings › Apps › Ndimi › Permissions.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StepIndicator current={1} />

        <View style={styles.header}>
          <Text style={styles.title}>Configure Permissions</Text>
          <Text style={styles.subtitle}>
            Translation stays on device. These grants let Ndimi listen and read text from the
            camera.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>MANDATORY</Text>

        <PermissionCard
          icon={<Ionicons name="mic-outline" size={20} color={colors.red} />}
          title="Microphone"
          body="Required to record speech and convert it to text for translation."
          status={micGranted ? 'done' : 'pending'}
          action={
            micGranted ? (
              <DoneTick />
            ) : (
              <PrimaryButton label="Grant" compact onPress={onGrantMic} />
            )
          }
        />

        <PermissionCard
          icon={<Ionicons name="camera-outline" size={20} color={colors.red} />}
          title="Camera"
          body="Used to capture printed text so it can be recognised and translated."
          status={cameraGranted ? 'done' : 'pending'}
          action={
            cameraGranted ? (
              <DoneTick />
            ) : (
              <PrimaryButton label="Grant" compact onPress={onGrantCamera} />
            )
          }
        />

        <Text style={styles.sectionLabel}>OPTIONAL</Text>

        <PermissionCard
          icon={<Ionicons name="phone-portrait-outline" size={20} color={colors.red} />}
          title="Device info"
          body="Read automatically to choose a model variant that fits this phone. No prompt needed."
          status="done"
          action={<DoneTick />}
        />

        {note ? <Text style={styles.note}>{note}</Text> : null}

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <PrimaryButton label="Back" variant="ghost" onPress={() => router.back()} />
          <PrimaryButton
            label="Next"
            trailing="→"
            disabled={!canContinue}
            onPress={() => router.push('/onboarding/models')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DoneTick() {
  return (
    <View style={styles.tick}>
      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
    </View>
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
  sectionLabel: {
    ...type.label,
    color: colors.secondaryText,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  note: {
    ...type.body,
    fontSize: 12,
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: radius.badge,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1, minHeight: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
