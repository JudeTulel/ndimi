import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme/tokens';

const STEPS = ['Welcome', 'Permissions', 'AI Setup'] as const;

type Props = { current: 0 | 1 | 2 };

/** Three-segment indicator. Completed and active segments are filled. */
export function StepIndicator({ current }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {STEPS.map((step, index) => (
          <View
            key={step}
            style={[
              styles.segment,
              index < current && styles.segmentDone,
              index === current && styles.segmentActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {STEPS.map((step, index) => (
          <Text
            key={step}
            style={[
              styles.label,
              index < current && styles.labelDone,
              index === current && styles.labelActive,
            ]}>
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  track: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.track,
  },
  segmentActive: {
    backgroundColor: colors.red,
    height: 6,
    marginTop: -1,
  },
  segmentDone: {
    backgroundColor: colors.sulphur,
  },
  labels: {
    flexDirection: 'row',
  },
  label: {
    ...type.label,
    flex: 1,
    textAlign: 'center',
    color: colors.secondaryText,
  },
  labelActive: {
    color: colors.red,
  },
  labelDone: {
    color: colors.red,
    opacity: 0.55,
  },
});
