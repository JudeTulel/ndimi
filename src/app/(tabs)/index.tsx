import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { setPref, ONBOARDING_COMPLETE } from '../../core/db/preferences';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Home() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.content}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center' },
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
