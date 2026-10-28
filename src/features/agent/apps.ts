import { Linking } from 'react-native';

/**
 * Opening another app.
 *
 * A fixed map rather than package lookup: reading installed packages needs a native
 * module, and the model only ever names common apps, so a small table covers the
 * real cases and gives a clear miss when it does not.
 *
 * Schemed deeplinks are used rather than `market://` so an app already installed
 * opens directly instead of bouncing through the Play Store.
 */
const APPS: Record<string, string> = {
  whatsapp: 'whatsapp://app',
  telegram: 'tg://app',
  youtube: 'vnd.youtube://',
  maps: 'geo:0,0',
  camera: 'camera://',
  gallery: 'content://media/internal/images/media',
  facebook: 'fb://',
  instagram: 'instagram://app',
  tiktok: 'snssdk1128://',
  chrome: 'googlechrome://',
  settings: 'android.settings.SETTINGS',
};

export const APP_NAMES = Object.keys(APPS);

export async function openApp(name: string): Promise<string> {
  const key = name.trim().toLowerCase();
  const target = APPS[key];
  if (!target) {
    throw new Error(`I do not know "${name}". Try: ${APP_NAMES.join(', ')}.`);
  }

  const url = target;
  const opened = await Linking.canOpenURL(url).catch(() => false);
  if (!opened) throw new Error(`${name} is not installed.`);
  await Linking.openURL(url);
  return `Opened ${name}.`;
}
