import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme/tokens';

/**
 * Floating pill tab bar: 86% width with rounded ends, and the active tab grows in
 * place. Scaling is animated with `Animated` (native driver) rather than a layout
 * change, so the labels beside it do not reflow on every switch.
 */
function TabIcon({
  name,
  activeName,
  color,
  size,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  activeName: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  const grow = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [focused, grow]);

  const scale = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <Animated.View style={[styles.icon, { transform: [{ scale }] }]}>
      <Ionicons name={focused ? activeName : name} size={size} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // 86% of the screen, with a floor so it stays usable on very narrow devices.
  const barWidth = Math.max(Math.round(width * 0.86), 240);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          // Floating, not full-bleed: rounded capsule inset from both edges.
          width: barWidth,
          alignSelf: 'center',
          backgroundColor: colors.surfaceRaised,
          borderTopColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.pill,
          // The system nav bar is transparent under edge-to-edge, so the bar has to
          // clear it itself.
          marginBottom: insets.bottom + 10,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#111314',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home-outline" activeName="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="sparkles-outline"
              activeName="sparkles"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="person-outline"
              activeName="person"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});
