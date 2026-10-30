import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  checkPairStatus,
  forgetConnection,
  getActiveEndpoint,
  getCapabilities,
  getConnection,
  getConnectionState,
  getInferenceTarget,
  getLastError,
  initializeConnection,
  parseQrPayload,
  pauseConnection,
  refreshStatus,
  setInferenceTarget,
  startPairing,
  subscribeConnection,
  type ComputerConnection,
  type ConnectionState,
  type RemoteCapability,
} from '../../features/desktop/connectionStore';
import { colors, radius, spacing, surfaceTheme, type } from '../../theme/tokens';

export default function SettingsConnect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [connection, setConnection] = useState<ComputerConnection | null>(getConnection());
  const [state, setState] = useState<ConnectionState>(getConnectionState());
  const [capabilities, setCapabilities] = useState<RemoteCapability[]>(getCapabilities());
  const [endpoint, setEndpoint] = useState<string | null>(getActiveEndpoint());
  const [error, setError] = useState<string | null>(getLastError());

  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    void initializeConnection();
    return subscribeConnection(() => {
      setConnection(getConnection());
      setState(getConnectionState());
      setCapabilities(getCapabilities());
      setEndpoint(getActiveEndpoint());
      setError(getLastError());
    });
  }, []);

  // Polling loop for desktop approval
  useEffect(() => {
    if (state !== 'awaiting_approval') return;
    const interval = setInterval(async () => {
      try {
        await checkPairStatus();
      } catch {}
    }, 1500);
    return () => clearInterval(interval);
  }, [state]);

  const onScanBarcode = async ({ data }: { data: string }) => {
    if (scannedRef.current || busy) return;
    scannedRef.current = true;
    setBusy(true);
    try {
      const qr = parseQrPayload(data);
      setScannerOpen(false);
      await startPairing(qr, 'Ndimi Phone');
    } catch (e) {
      Alert.alert('Pairing Error', e instanceof Error ? e.message : 'Invalid QR code.');
      scannedRef.current = false;
    } finally {
      setBusy(false);
    }
  };

  const submitManualPayload = async () => {
    if (!manualCode.trim() || busy) return;
    setBusy(true);
    try {
      const qr = parseQrPayload(manualCode);
      setShowManual(false);
      setManualCode('');
      await startPairing(qr, 'Ndimi Phone');
    } catch (e) {
      Alert.alert('Pairing Error', e instanceof Error ? e.message : 'Failed to parse payload.');
    } finally {
      setBusy(false);
    }
  };

  const handleForget = () => {
    Alert.alert(
      'Forget computer?',
      'This will delete the trusted connection and cryptographic keys from your phone. You will need to pair again to use desktop models.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => void forgetConnection(),
        },
      ]
    );
  };

  const target = getInferenceTarget();

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Connect to computer</Text>
          <Text style={styles.subtitle}>Local network inference</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {state === 'awaiting_approval' ? (
          <View style={styles.card}>
            <View style={styles.awaitingBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={styles.awaitingTitle}>Awaiting approval</Text>
              <Text style={styles.awaitingBody}>
                Pairing request sent. Please look at your Ndimi Desktop window and click “Approve”
                to grant this phone access.
              </Text>
              <Pressable
                style={styles.cancelButton}
                onPress={() => void forgetConnection()}>
                <Text style={styles.cancelText}>Cancel pairing</Text>
              </Pressable>
            </View>
          </View>
        ) : connection && (state === 'connected' || state === 'paused' || state === 'reconnecting') ? (
          <>
            {/* Connected Host Card */}
            <View style={styles.card}>
              <View style={styles.hostHeader}>
                <View style={styles.hostIcon}>
                  <Ionicons name="laptop-outline" size={26} color={colors.greenInk} />
                </View>
                <View style={styles.hostDetails}>
                  <Text style={styles.hostName}>{connection.displayName}</Text>
                  <Text style={styles.hostEndpoint}>
                    {endpoint ? endpoint : connection.endpoints[0] ?? 'LAN Host'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    state === 'connected'
                      ? styles.statusPillGreen
                      : state === 'reconnecting'
                        ? styles.statusPillOrange
                        : styles.statusPillGray,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      state === 'connected'
                        ? styles.statusTextGreen
                        : state === 'reconnecting'
                          ? styles.statusTextOrange
                          : styles.statusTextGray,
                    ]}>
                    {state === 'connected' ? 'Connected' : state === 'reconnecting' ? 'Reconnecting' : 'Paused'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Certificate Pin (SHA-256)</Text>
                <Text style={styles.certValue}>
                  {connection.certificateSha256.slice(0, 10)}…{connection.certificateSha256.slice(-10)}
                </Text>
              </View>
            </View>

            {/* Inference Mode Selector */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>INFERENCE TARGET</Text>
            </View>

            <View style={styles.targetCard}>
              <View style={styles.targetToggle}>
                <Pressable
                  style={[styles.targetOption, target === 'phone' && styles.targetOptionActive]}
                  onPress={() => void setInferenceTarget('phone')}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={15}
                    color={target === 'phone' ? '#FFFFFF' : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.targetOptionText,
                      target === 'phone' && styles.targetOptionTextActive,
                    ]}>
                    Use this phone
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.targetOption, target === 'computer' && styles.targetOptionActive]}
                  onPress={() => void setInferenceTarget('computer')}>
                  <Ionicons
                    name="laptop-outline"
                    size={15}
                    color={target === 'computer' ? '#FFFFFF' : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.targetOptionText,
                      target === 'computer' && styles.targetOptionTextActive,
                    ]}>
                    Use connected computer
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.targetHint}>
                {target === 'computer'
                  ? 'All typed translations and chat/agent reasoning route to this computer. Actions, contacts and permissions stay strictly on your phone.'
                  : 'Inference runs on this phone using local downloaded models.'}
              </Text>
            </View>

            {/* Capabilities Inventory */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AVAILABLE ON THIS COMPUTER</Text>
            </View>

            <View style={styles.card}>
              {capabilities.length === 0 ? (
                <Text style={styles.emptyCaps}>Checking capabilities from computer…</Text>
              ) : (
                capabilities.map((cap, idx) => (
                  <View key={cap.id}>
                    {idx > 0 ? <View style={styles.capDivider} /> : null}
                    <View style={styles.capRow}>
                      <View style={styles.capIcon}>
                        <Ionicons
                          name={
                            cap.id === 'text'
                              ? 'document-text-outline'
                              : cap.id === 'vision'
                                ? 'eye-outline'
                                : cap.id === 'speech'
                                  ? 'mic-outline'
                                  : 'cube-outline'
                          }
                          size={18}
                          color={colors.greenInk}
                        />
                      </View>
                      <View style={styles.capInfo}>
                        <Text style={styles.capTitle}>
                          {cap.id === 'text'
                            ? 'Text translation & reasoning'
                            : cap.id === 'vision'
                              ? 'Vision & OCR'
                              : cap.id === 'speech'
                                ? 'Speech recognition'
                                : cap.id}
                        </Text>
                        <Text style={styles.capModel}>
                          {cap.model ? `Model: ${cap.model}` : cap.reason ?? 'Active capability'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.capBadge,
                          cap.status === 'ready' ? styles.capReady : styles.capNotReady,
                        ]}>
                        <Text
                          style={[
                            styles.capBadgeText,
                            cap.status === 'ready' ? styles.capReadyText : styles.capNotReadyText,
                          ]}>
                          {cap.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.actionRow} onPress={() => void refreshStatus()}>
                <Ionicons name="refresh-outline" size={18} color={colors.text} />
                <Text style={styles.actionText}>Check connection</Text>
              </Pressable>

              {target === 'computer' ? (
                <Pressable style={styles.actionRow} onPress={() => void pauseConnection()}>
                  <Ionicons name="pause-outline" size={18} color={colors.text} />
                  <Text style={styles.actionText}>Pause computer inference</Text>
                </Pressable>
              ) : null}

              <Pressable style={[styles.actionRow, styles.actionDanger]} onPress={handleForget}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionText, styles.actionTextDanger]}>Forget computer</Text>
              </Pressable>
            </View>
          </>
        ) : (
          /* Not Paired Screen */
          <View style={styles.card}>
            <View style={styles.promo}>
              <View style={styles.promoIcon}>
                <Ionicons name="laptop-outline" size={38} color={colors.greenInk} />
              </View>
              <Text style={styles.promoTitle}>Run larger models on your laptop</Text>
              <Text style={styles.promoBody}>
                Pair with Ndimi Desktop over your local Wi-Fi. Your phone handles interface,
                speech recording and safe phone actions, while your computer executes inference.
              </Text>

              <View style={styles.steps}>
                <Text style={styles.stepItem}>1. Open Ndimi Desktop on your computer.</Text>
                <Text style={styles.stepItem}>2. Go to Devices › Pair a device.</Text>
                <Text style={styles.stepItem}>3. Scan the displayed QR code with your phone.</Text>
              </View>

              <PrimaryButton
                label="Scan pairing QR code"
                onPress={async () => {
                  if (!cameraPermission?.granted) {
                    const res = await requestCameraPermission();
                    if (!res.granted) {
                      Alert.alert(
                        'Camera permission needed',
                        'Camera access is required to scan the pairing QR code.'
                      );
                      return;
                    }
                  }
                  scannedRef.current = false;
                  setScannerOpen(true);
                }}
              />

              <Pressable
                style={styles.manualLink}
                onPress={() => setShowManual(true)}
                hitSlop={8}>
                <Text style={styles.manualLinkText}>Or enter pairing code manually</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide">
        <View style={styles.scannerRoot}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanBarcode}
          />
          <View style={[styles.scannerHeader, { paddingTop: insets.top + spacing.md }]}>
            <Pressable
              onPress={() => setScannerOpen(false)}
              style={styles.scannerClose}
              hitSlop={12}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.scannerTitle}>Scan Desktop QR</Text>
          </View>
          <View style={styles.scannerOverlay}>
            <View style={styles.reticle} />
            <Text style={styles.scannerHint}>Point camera at the QR code on your computer</Text>
          </View>
        </View>
      </Modal>

      {/* Manual Code Entry Modal */}
      <Modal visible={showManual} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Paste Pairing Code</Text>
            <Text style={styles.manualDesc}>
              Paste the JSON payload generated by Ndimi Desktop:
            </Text>
            <TextInput
              style={styles.manualInput}
              multiline
              value={manualCode}
              onChangeText={setManualCode}
              placeholder='{"v":1,"id":"...","pin":"..."}'
              placeholderTextColor={colors.secondaryText}
            />
            <View style={styles.manualButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => {
                  setShowManual(false);
                  setManualCode('');
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <PrimaryButton
                label="Pair"
                compact
                disabled={!manualCode.trim() || busy}
                onPress={() => void submitManualPayload()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { padding: spacing.xs },
  headerText: { flex: 1 },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.body, fontSize: 11, color: colors.greenInk },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,7,58,0.08)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.input,
    padding: spacing.md,
  },
  errorText: { ...type.body, fontSize: 12, color: colors.danger, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...surfaceTheme.shadow,
  },
  promo: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  promoIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoTitle: { ...type.hero, fontSize: 19, textAlign: 'center', color: colors.text },
  promoBody: { ...type.body, textAlign: 'center', color: colors.secondaryText, lineHeight: 18 },
  steps: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    borderRadius: radius.input,
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  stepItem: { ...type.body, fontSize: 12, color: colors.text },
  manualLink: { paddingVertical: spacing.xs },
  manualLinkText: { ...type.label, fontSize: 12, color: colors.greenInk },
  awaitingBox: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  awaitingTitle: { ...type.h1, color: colors.text, marginTop: spacing.sm },
  awaitingBody: { ...type.body, textAlign: 'center', color: colors.secondaryText },
  cancelButton: { marginTop: spacing.sm, padding: spacing.xs },
  cancelText: { ...type.label, color: colors.danger },
  hostHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hostIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hostDetails: { flex: 1 },
  hostName: { ...type.h2, color: colors.text },
  hostEndpoint: { ...type.body, fontSize: 11, color: colors.secondaryText },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  statusPillGreen: { backgroundColor: colors.greenWash },
  statusPillOrange: { backgroundColor: 'rgba(255,165,0,0.15)' },
  statusPillGray: { backgroundColor: colors.darkWash },
  statusPillText: { ...type.label, fontSize: 10 },
  statusTextGreen: { color: colors.greenInk },
  statusTextOrange: { color: '#B35900' },
  statusTextGray: { color: colors.secondaryText },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  certRow: { gap: 2 },
  certLabel: { ...type.label, fontSize: 10, color: colors.secondaryText },
  certValue: { ...type.body, fontSize: 11, color: colors.text, fontFamily: 'monospace' },
  sectionHeader: { marginTop: spacing.xs },
  sectionTitle: { ...type.label, fontSize: 10.5, color: colors.secondaryText, letterSpacing: 1 },
  targetCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    ...surfaceTheme.shadow,
  },
  targetToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
  },
  targetOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  targetOptionActive: { backgroundColor: colors.dark },
  targetOptionText: { ...type.label, fontSize: 11, color: colors.secondaryText },
  targetOptionTextActive: { color: '#FFFFFF' },
  targetHint: { ...type.body, fontSize: 11.5, color: colors.secondaryText, paddingHorizontal: spacing.xs },
  emptyCaps: { ...type.body, color: colors.secondaryText, fontStyle: 'italic' },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  capDivider: { height: 1, backgroundColor: colors.border },
  capIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capInfo: { flex: 1 },
  capTitle: { ...type.cardTitle, fontSize: 13, color: colors.text },
  capModel: { ...type.body, fontSize: 11, color: colors.secondaryText },
  capBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  capReady: { backgroundColor: colors.greenWash },
  capNotReady: { backgroundColor: colors.darkWash },
  capBadgeText: { ...type.label, fontSize: 9.5 },
  capReadyText: { color: colors.greenInk },
  capNotReadyText: { color: colors.secondaryText },
  actions: { gap: spacing.xs, marginTop: spacing.xs },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
  },
  actionDanger: { borderColor: 'rgba(255,7,58,0.2)' },
  actionText: { ...type.cardTitle, fontSize: 13, color: colors.text },
  actionTextDanger: { color: colors.danger },
  scannerRoot: { flex: 1, backgroundColor: '#000000' },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  scannerClose: { padding: spacing.xs },
  scannerTitle: { ...type.h1, color: '#FFFFFF', marginLeft: spacing.md },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: radius.card,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  scannerHint: { ...type.body, color: '#FFFFFF', textAlign: 'center', maxWidth: 220 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  manualTitle: { ...type.h1, color: colors.text },
  manualDesc: { ...type.body, color: colors.secondaryText },
  manualInput: {
    height: 120,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.md,
    ...type.body,
    fontSize: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  manualButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancel: { padding: spacing.sm },
  modalCancelText: { ...type.label, color: colors.secondaryText },
});
