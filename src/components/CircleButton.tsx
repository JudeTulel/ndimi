import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, surfaceTheme } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  size?: number;
  tone?: 'glass' | 'solid';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Circular glass control for back / overflow / secondary actions. */
export function CircleButton({
  children,
  onPress,
  size = 42,
  tone = 'glass',
  style,
  disabled,
  accessibilityLabel,
}: Props) {
  const solid = tone === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        surfaceTheme.shadow,
        {
          width: size,
          height: size,
          borderRadius: radius.badge,
          backgroundColor: solid ? colors.red : colors.surfaceRaised,
          borderColor: solid ? colors.red : colors.border,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
