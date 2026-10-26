import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  trailing?: string;
  compact?: boolean;
};

/** Pill CTA. Disabled state uses the reference's grey fill. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  trailing,
  compact,
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
        ghost ? styles.ghost : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text style={[styles.label, compact && styles.compactLabel, disabled && styles.disabledLabel]}>
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
  },
  compact: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    minWidth: 76,
  },
  primary: {
    backgroundColor: colors.red,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: colors.track,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...type.cta,
    color: '#FFFFFF',
  },
  compactLabel: {
    fontSize: 12,
  },
  disabledLabel: {
    color: '#FBFBFD',
  },
});
