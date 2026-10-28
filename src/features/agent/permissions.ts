import { PermissionsAndroid, Platform, type Permission } from 'react-native';

/**
 * Runtime permission gates for the agent's native tools.
 *
 * Declaring READ_SMS in the manifest is not enough on Android 6+: the grant has to
 * be asked for at the moment of use. Results are cached per session so a busy agent
 * turn does not re-prompt between rounds.
 */

const granted = new Set<Permission>();

const SPEC: Record<'sms-read' | 'sms-send', { permission: Permission; label: string }> = {
  'sms-read': { permission: PermissionsAndroid.PERMISSIONS.READ_SMS, label: 'read your messages' },
  'sms-send': { permission: PermissionsAndroid.PERMISSIONS.SEND_SMS, label: 'send messages' },
};

/** Throws an actionable error instead of letting the bridge fail obscurely. */
export async function requirePermission(what: 'sms-read' | 'sms-send'): Promise<void> {
  if (Platform.OS !== 'android') return;

  const { permission, label } = SPEC[what];
  if (granted.has(permission)) return;

  const result = await PermissionsAndroid.request(permission);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error(
      result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        ? `Ndimi needs permission to ${label}. Enable it in the app settings.`
        : `Permission to ${label} was denied.`
    );
  }
  granted.add(permission);
}
