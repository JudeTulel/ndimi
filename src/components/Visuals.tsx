import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { gradient } from '../theme/tokens';

const HEIGHTS = [18, 34, 52, 34, 18];
const TINTS = ['#F5ECC2', '#FFFFFF', '#FF073A', '#FFFFFF', '#F5ECC2'];

type Props = {
  active: boolean;
  bars?: number[];
};

/**
 * Five-bar waveform. Bars ripple out of phase while `active`, and settle to a
 * flat line when the recorder is idle.
 */
export function VoiceWaveform({ active, bars = HEIGHTS }: Props) {
  const anims = useRef(bars.map(() => new Animated.Value(0.4))).current;

  useEffect(() => {
    if (!active) {
      Animated.parallel(
        anims.map((a) =>
          Animated.timing(a, { toValue: 0.35, duration: 220, useNativeDriver: true })
        )
      ).start();
      return;
    }
    const loops = anims.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(value, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.45,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, anims]);

  return (
    <View style={styles.row}>
      {bars.map((height, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            { height, backgroundColor: active ? TINTS[index % TINTS.length] : 'rgba(17,19,20,0.15)' },
            { transform: [{ scaleY: anims[index] }] },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Decorative iridescent sphere for the Translate screen hero.
 *
 * A rotating diagonal gradient with a gloss overlay: two stacked layers that only
 * animate a transform, so it stays on the native driver.
 */
export function Orb({ size = 168 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const radius = size / 2;

  return (
    <View style={[styles.orbWrap, { width: size, height: size, borderRadius: radius }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <LinearGradient
          colors={[...gradient.orb]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      </Animated.View>
      {/* Specular highlight: a small off-centre ellipse with a second, stronger one
          inside it fakes glass. Static, so it does not rotate with the gradient. */}
      <View style={[styles.orbSheen, { borderRadius: radius }]}>
        <View style={styles.orbSpec} />
        <View style={styles.orbSpecCore} />
      </View>
      <View style={[styles.orbGloss, { borderRadius: radius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 60 },
  bar: { width: 10, borderRadius: 999 },
  orbWrap: {
    overflow: 'hidden',
    backgroundColor: '#F5ECC2',
    // Shadow lifts the sphere off the cream background.
    shadowColor: '#FF073A',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  orbGloss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  orbSheen: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orbSpec: {
    position: 'absolute',
    top: '12%',
    left: '14%',
    width: '46%',
    height: '34%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
    transform: [{ rotate: '-18deg' }],
  },
  orbSpecCore: {
    position: 'absolute',
    top: '17%',
    left: '20%',
    width: '22%',
    height: '15%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    transform: [{ rotate: '-18deg' }],
  },
});
