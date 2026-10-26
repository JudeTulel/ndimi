import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, surfaceTheme } from '../theme/tokens';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Render as a pressable pane. */
  onPress?: () => void;
  padded?: boolean;
  radiusSize?: number;
};

/**
 * Raised surface: a lighter tone of the background with a hairline border and
 * soft shadow, so cards read as layered without any translucency.
 */
export function GlassCard({ children, style, onPress, padded = true, radiusSize = radius.card }: Props) {
  const shape: StyleProp<ViewStyle> = [
    styles.card,
    surfaceTheme.shadow,
    { borderRadius: radiusSize },
    padded && styles.padded,
    style,
  ];

  if (!onPress) return <View style={shape}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [shape, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surfaceTheme.fill,
    borderWidth: 1,
    borderColor: surfaceTheme.border,
    overflow: 'hidden',
  },
  padded: { padding: spacing.md },
  pressed: { backgroundColor: colors.surfaceRaised, transform: [{ scale: 0.994 }] },
});
