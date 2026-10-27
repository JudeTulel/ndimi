import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from './ScreenBackground';
import { spacing } from '../theme/tokens';
import { useKeyboardHeight } from '../core/ui/useKeyboardHeight';

/** Floating tab bar: 62 high, 10 bottom margin, plus breathing room. */
const TAB_BAR_CLEARANCE = 72;

type Props = {
  children: ReactNode;
  gutter?: number;
  footerGap?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Omit the scroll view for fixed-layout screens (e.g. the voice recorder). */
  fixed?: boolean;
  /** False on tab screens: the floating bar already insets those for itself. */
  tabBar?: boolean;
  /**
   * Set on screens that position their own bottom edge (a pinned composer). The
   * scaffold then contributes no bottom padding, so the two do not stack.
   */
  ownBottom?: boolean;
};

/**
 * Screen scaffold. Hosts the pastel background, then applies measured safe-area
 * insets after `contentStyle` and floored, so a screen's own padding can never
 * cancel them.
 *
 * The keyboard is handled here rather than per screen: the content is lifted by the
 * keyboard height so nothing stays hidden behind it, and the scroll viewport is
 * shortened to match so long content can still reach the focused field.
 */
export function Screen({
  children,
  gutter = spacing.lg,
  footerGap = spacing.lg,
  contentStyle,
  fixed,
  tabBar = true,
  ownBottom = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const top = Math.max(insets.top, spacing.md) + spacing.sm;

  // While the keyboard is up it owns the bottom of the screen, so its height stands
  // in for the safe-area inset instead of adding to it. Under the floating tab bar
  // the screens still need a scrollable gap big enough to clear that bar (62 high +
  // 10 margin), or the last row can never be scrolled into view.
  const resting = tabBar
    ? Math.max(insets.bottom, 24) + footerGap
    : TAB_BAR_CLEARANCE + spacing.xl + insets.bottom;
  const bottom = ownBottom && keyboard === 0 ? 0 : keyboard > 0 ? spacing.md : resting;
  const padding = { paddingTop: top, paddingHorizontal: gutter, paddingBottom: bottom };

  return (
    <View style={[styles.root, keyboard > 0 && { paddingBottom: keyboard }]}>
      <ScreenBackground />
      {fixed ? (
        <View style={[styles.content, contentStyle, padding]}>{children}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentStyle, padding]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
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
