import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

const LOGO = require('../../assets/logo.jpg');

/**
 * The Ndimi mark from `assets/logo.jpg`: a flat-topped half-disc, red over green
 * with an olive overlap lens, on black. Rendered as an image so the real artwork
 * is the source of truth rather than a hand-drawn approximation.
 */
export function LogoMark({ diameter = 184 }: { diameter?: number }) {
  return (
    <View
      style={[
        styles.frame,
        { width: diameter, height: diameter, borderRadius: diameter * 0.34 },
      ]}>
      <Image source={LOGO} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
});
