import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from './ScreenBackground';
import { spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  gutter?: number;
  footerGap?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Omit the scroll view for fixed-layout screens (e.g. the voice recorder). */
  fixed?: boolean;
};

/**
 * Screen scaffold. Hosts the pastel background, then applies measured safe-area
 * insets after `contentStyle` and floored, so a screen's own padding can never
 * cancel them.
 */
export function Screen({
  children,
  gutter = spacing.lg,
  footerGap = spacing.lg,
  contentStyle,
  fixed,
}: Props) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, spacing.md) + spacing.sm;
  const bottom = Math.max(insets.bottom, 24) + footerGap;
  const padding = { paddingTop: top, paddingHorizontal: gutter, paddingBottom: bottom };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      {fixed ? (
        <View style={[styles.content, contentStyle, padding]}>{children}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentStyle, padding]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: spacing.md },
});
