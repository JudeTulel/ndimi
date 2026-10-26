import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase } from '../core/db/database';
import { getPref, ONBOARDING_COMPLETE } from '../core/db/preferences';
import { hydrate } from '../features/models/modelStore';
import { colors, spacing, type } from '../theme/tokens';

/**
 * Boot gate. Opens the database, restores model state, then sends the user to
 * the wizard or straight into the app.
 */
export default function Boot() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDatabase();
        await hydrate();
        const done = await getPref(ONBOARDING_COMPLETE);
        if (cancelled) return;
        router.replace(done === 'true' ? '/(tabs)' : '/onboarding');
      } catch (error) {
        console.error('Bootstrap error', error);
        if (!cancelled) router.replace('/onboarding');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.wordmark}>Ndimi</Text>
      <ActivityIndicator color={colors.red} />
      <Text style={styles.caption}>Starting Ndimi Swahili…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  wordmark: { ...type.display, color: colors.text },
  caption: { ...type.body, color: colors.secondaryText },
});
