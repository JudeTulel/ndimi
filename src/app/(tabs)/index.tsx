import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setPref, ONBOARDING_COMPLETE } from '../../core/db/preferences';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.wordmark}>Ndimi</Text>
        <Text style={styles.caption}>Home — translation flow lands here next.</Text>

        <Pressable
          style={styles.link}
          onPress={async () => {
            await setPref(ONBOARDING_COMPLETE, 'false');
            router.push('/onboarding');
          }}>
          <Ionicons name="refresh-outline" size={18} color={colors.red} />
          <Text style={styles.linkText}>Replay onboarding</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  wordmark: { ...type.display, color: colors.text },
  caption: { ...type.body, color: colors.secondaryText },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  linkText: { ...type.cardTitle, color: colors.red },
});
