import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, surfaceTheme, type } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  trailing?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Pill CTA — solid red for primary, frosted pane for ghost. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  trailing,
  compact,
  style,
}: Props) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        surfaceTheme.shadow,
        ghost ? styles.ghost : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.label, compact && styles.compactLabel, ghost && styles.ghostLabel, disabled && styles.disabledLabel]}>
        {label}
        {trailing ? ` ${trailing}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  compact: { height: 34, borderRadius: radius.pill, paddingHorizontal: spacing.md, minWidth: 78 },
  primary: { backgroundColor: colors.red, borderColor: 'rgba(255,255,255,0.4)' },
  ghost: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  disabled: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { opacity: 0.86 },
  label: { ...type.cta, color: '#FFFFFF' },
  compactLabel: { fontSize: 12 },
  ghostLabel: { color: colors.text },
  disabledLabel: { color: colors.secondaryText },
});
