import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { CircleButton } from '../components/CircleButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, surfaceTheme, type } from '../theme/tokens';
import { readText } from '../features/ocr/ocrService';

type Shot = { uri: string; base64?: string };

/**
 * In-app capture. The camera is live; the recognised text is real OCR output from
 * the installed GLM-OCR pair, handed to Translate as the source string.
 */
export default function Camera() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const capture = async () => {
    setError(null);
    setText(null);
    const photo = await camera.current?.takePictureAsync({ quality: 0.7, base64: true });
    if (photo) setShot({ uri: photo.uri, base64: photo.base64 ?? undefined });
  };

  const pick = async () => {
    setError(null);
    setText(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setShot({ uri: result.assets[0].uri, base64: result.assets[0].base64 ?? undefined });
    }
  };

  const recognise = async () => {
    if (!shot) return;
    setBusy(true);
    setError(null);
    try {
      if (!shot.base64) throw new Error('Capture failed to produce image data.');
      const recognised = await readText(shot.base64);
      if (!recognised) {
        setError('No text found in that image. Try again with more light and less angle.');
        return;
      }
      setText(recognised);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the image.');
    } finally {
      setBusy(false);
    }
  };

  if (!permission) return <Screen fixed>{null}</Screen>;

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
      {shot ? (
        <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      )}

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <CircleButton onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </CircleButton>
          <Text style={styles.overlayTitle}>{shot ? 'Review' : 'Scan text'}</Text>
          <CircleButton onPress={pick} accessibilityLabel="Choose from library">
            <Ionicons name="images-outline" size={18} color={colors.text} />
          </CircleButton>
        </View>

        {!shot ? <View style={styles.frame} /> : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {text ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>RECOGNISED TEXT</Text>
            <Text style={styles.resultText} numberOfLines={5}>
              {text}
            </Text>
            <View style={styles.row}>
              <PrimaryButton
                label="Retake"
                variant="ghost"
                compact
                onPress={() => {
                  setShot(null);
                  setText(null);
                }}
              />
              <PrimaryButton
                label="Translate"
                compact
                onPress={() => router.replace({ pathname: '/translate', params: { text } })}
              />
            </View>
          </View>
        ) : shot ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>PHOTO CAPTURED</Text>
            <Text style={styles.resultText}>Read the text in this photo?</Text>
            <View style={styles.row}>
              <PrimaryButton
                label="Retake"
                variant="ghost"
                compact
                onPress={() => setShot(null)}
              />
              <PrimaryButton
                label={busy ? 'Reading…' : 'Read text'}
                compact
                disabled={busy}
                onPress={recognise}
              />
            </View>
          </View>
        ) : (
          <View style={styles.shutterRow}>
            <CircleButton size={64} tone="solid" onPress={capture} accessibilityLabel="Capture">
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="scan-outline" size={26} color="#FFFFFF" />
              )}
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
  error: { ...type.body, fontSize: 11, color: colors.red, textAlign: 'center' },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    ...surfaceTheme.shadow,
  },
  resultLabel: { ...type.label, color: colors.secondaryText },
  resultText: { ...type.body, fontSize: 13, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
