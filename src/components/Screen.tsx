import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  /** Horizontal gutter inside the scroll area. */
  gutter?: number;
  /** Extra bottom padding on top of the safe-area inset. */
  footerGap?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Screen scaffold for the onboarding flow.
 *
 * Edge-to-edge is on, so the system navigation bar paints over the app and the
 * scroll content has to clear it itself. Measured insets are applied *after*
 * `contentStyle` and floored, so a screen's own padding can never cancel them.
 */
export function Screen({ children, gutter = spacing.lg, footerGap = spacing.lg, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, spacing.md) + spacing.sm;
  const bottom = Math.max(insets.bottom, 24) + footerGap;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle, { paddingTop: top, paddingHorizontal: gutter, paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: spacing.md,
  },
});
