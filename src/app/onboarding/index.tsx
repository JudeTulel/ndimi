import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LogoMark } from '../../components/LogoMark';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StepIndicator } from '../../components/StepIndicator';
import { colors, fonts, radius, spacing, type } from '../../theme/tokens';

const FEATURES = [
  {
    icon: 'key-outline' as const,
    title: 'Local & Private',
    body: 'Translation runs on the device. Audio and text never leave the phone.',
  },
  {
    icon: 'language-outline' as const,
    title: 'English ↔ Swahili',
    body: 'Text and recorded speech in both directions, without a backend.',
  },
];

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen>
      <StepIndicator current={0} />

      <View style={styles.hero}>
        <LogoMark />
      </View>

      <View style={styles.wordmarkWrap}>
        <Text style={styles.wordmark}>Ndimi</Text>
        <Text style={styles.tagline}>Your local language translator</Text>
      </View>

      <View style={styles.cards}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.badge}>
                <Ionicons name={feature.icon} size={20} color={colors.red} />
              </View>
              <Text style={styles.cardTitle}>{feature.title}</Text>
            </View>
            <Text style={styles.cardBody}>{feature.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />

      <PrimaryButton
        label="Get Started"
        trailing="→"
        onPress={() => router.push('/onboarding/permissions')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  wordmarkWrap: { alignItems: 'center', gap: spacing.xs },
  wordmark: { ...type.display, color: colors.text },
  tagline: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, textAlign: 'center' },
  cards: { gap: spacing.sm + 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.badge,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...type.cardTitle, color: colors.text },
  cardBody: { ...type.body, color: colors.secondaryText, paddingLeft: 40 + spacing.sm },
  spacer: { flex: 1, minHeight: spacing.sm },
});
