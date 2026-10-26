import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

type Props = {
  icon: ReactNode;
  title: string;
  body: string;
  status?: 'pending' | 'done';
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Permission card from the reference: soft badge, bold title, trailing action,
 * body copy spanning the card. The green outline marks a satisfied requirement.
 */
export function PermissionCard({ icon, title, body, status = 'pending', action, style }: Props) {
  const done = status === 'done';
  return (
    <View style={[styles.card, done && styles.cardDone, style]}>
      <View style={styles.row}>
        <View style={[styles.badge, done && styles.badgeDone]}>{icon}</View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardDone: {
    borderColor: colors.successSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.badge,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  badgeDone: {
    backgroundColor: colors.successSoft,
  },
  title: {
    ...type.cardTitle,
    color: colors.text,
    flex: 1,
  },
  action: {
    marginLeft: spacing.sm,
  },
  body: {
    ...type.body,
    color: colors.secondaryText,
  },
});
