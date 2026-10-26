import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { CircleButton } from '../components/CircleButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, spacing, type } from '../theme/tokens';
import { CATALOG } from '../features/models/catalog';
import { subscribe, type ModelStatusMap } from '../features/models/modelStore';

type Shot = { uri: string; base64?: string };

/**
 * Camera capture for OCR. The camera itself is real; the recognition step reads
 * from an installed OCR model so the screen stays honest about what it can do.
 */
export default function Camera() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ModelStatusMap>({});
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);

  useEffect(() => subscribe(setStatus), []);
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const ocrModel = useMemo(
    () => CATALOG.find((m) => m.task === 'ocr' && status[m.id]?.status === 'installed'),
    [status]
  );
  const hasProjector = useMemo(
    () => CATALOG.some((m) => m.id.includes('mmproj') && status[m.id]?.status === 'installed'),
    [status]
  );
  const ready = !!ocrModel && hasProjector;

  const capture = async () => {
    setBusy(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.7, base64: true });
      if (photo) setShot({ uri: photo.uri, base64: photo.base64 ?? undefined });
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setShot({ uri: result.assets[0].uri, base64: result.assets[0].base64 ?? undefined });
    }
  };

  const useShot = () => {
    if (!shot) return;
    // Recognition adapter lands next; hand the capture to Translate prefilled.
    router.replace({ pathname: '/translate', params: { from: 'camera' } });
  };

  if (!permission) {
    return <Screen fixed>{null}</Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen fixed contentStyle={styles.center}>
        <Ionicons name="camera-outline" size={40} color={colors.red} />
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.caption}>
          Ndimi reads printed text from a photo. Grant camera access to continue.
        </Text>
        <PrimaryButton label="Grant camera" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <CircleButton onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </CircleButton>
          <Text style={styles.overlayTitle}>Scan text</Text>
          <CircleButton onPress={pick} accessibilityLabel="Choose from library">
            <Ionicons name="images-outline" size={18} color={colors.text} />
          </CircleButton>
        </View>

        <View style={styles.frame} />

        {!ready ? (
          <Pressable style={styles.warn} onPress={() => router.push('/settings/models')}>
            <Ionicons name="cloud-download-outline" size={15} color={colors.red} />
            <Text style={styles.warnText}>
              {!ocrModel ? 'Install an OCR model to read text' : 'Install the OCR vision projector'}
            </Text>
          </Pressable>
        ) : null}

        {shot ? (
          <View style={styles.captureCard}>
            <Text style={styles.captureTitle}>Photo captured</Text>
            <Text style={styles.captureCaption}>
              {ready ? 'Send it to Translate to read and translate the text.' : 'Install the OCR model to read it.'}
            </Text>
            <View style={styles.captureRow}>
              <PrimaryButton label="Retake" variant="ghost" compact onPress={() => setShot(null)} />
              <PrimaryButton label="Use photo" compact disabled={!ready} onPress={useShot} />
            </View>
          </View>
        ) : (
          <View style={styles.shutterRow}>
            <CircleButton size={64} tone="solid" onPress={capture} disabled={busy} accessibilityLabel="Capture">
              <Ionicons name="scan-outline" size={26} color="#FFFFFF" />
            </CircleButton>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: { ...type.h1, color: colors.text },
  caption: { ...type.body, color: colors.secondaryText, textAlign: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overlayTitle: { ...type.h2, color: colors.text },
  frame: {
    alignSelf: 'center',
    width: '78%',
    aspectRatio: 1.45,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  shutterRow: { alignItems: 'center', marginBottom: spacing.md },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  warnText: { ...type.body, fontSize: 11, color: colors.text },
  captureCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  captureTitle: { ...type.h2, color: colors.text },
  captureCaption: { ...type.body, fontSize: 11, color: colors.secondaryText },
  captureRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
