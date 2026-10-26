import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * The Ndimi mark redrawn in brand colours only: a flat-topped half-disc, red
 * over dark, with the overlap band in dark. Drawn with plain Views so no asset
 * colours leak into the palette.
 */
export function LogoMark({ width = 176 }: { width?: number }) {
  const height = width * 0.62;
  const red = height * 0.46;
  const overlap = height * 0.1;

  return (
    <View style={[styles.stage, { width, height: height + 8 }]}>
      <View
        style={[
          styles.disc,
          {
            width,
            height,
            borderBottomLeftRadius: width / 2,
            borderBottomRightRadius: width / 2,
            backgroundColor: colors.dark,
          },
        ]}
      />
      <View
        style={[
          styles.overlay,
          {
            width,
            height: red,
            borderBottomLeftRadius: width / 2,
            borderBottomRightRadius: width / 2,
            backgroundColor: colors.red,
          },
        ]}
      />
      <View
        style={[
          styles.overlay,
          {
            width,
            height: overlap,
            marginTop: red - overlap / 2,
            backgroundColor: colors.dark,
            opacity: 0.9,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { justifyContent: 'flex-start' },
  disc: { position: 'absolute', top: 0, left: 0 },
  overlay: { position: 'absolute', top: 0, left: 0 },
});
