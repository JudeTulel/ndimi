import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme/tokens';

type Props = {
  bytesWritten: number;
  totalBytes: number;
  progress: number;
};

/** Download progress: filled track plus byte readout, per the model card spec. */
export function DownloadProgress({ bytesWritten, totalBytes, progress }: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.meta}>{Math.round(pct * 100)}%</Text>
        <Text style={styles.meta}>
          {formatMb(bytesWritten)} / {formatMb(totalBytes)}
        </Text>
      </View>
    </View>
  );
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.red,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    ...type.body,
    fontSize: 11,
    color: colors.secondaryText,
  },
});
