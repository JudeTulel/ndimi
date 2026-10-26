import { Image, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

const LOGO = require('../../assets/logo.jpg');

/**
 * The Ndimi mark from `assets/logo.jpg`, rendered as an image so the real
 * artwork stays the source of truth. Only the surrounding frame uses tokens.
 */
export function LogoMark({ diameter = 168 }: { diameter?: number }) {
  return (
    <View
      style={[
        styles.frame,
        { width: diameter, height: diameter, borderRadius: radius.card },
      ]}>
      <Image source={LOGO} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.dark,
  },
  image: { width: '100%', height: '100%' },
});
