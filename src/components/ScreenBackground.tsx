import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

/** Flat background. Screens are solid colour; depth comes from lighter surfaces. */
export function ScreenBackground() {
  return <View style={[StyleSheet.absoluteFill, styles.fill]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  fill: { backgroundColor: colors.background },
});
