import { getPref, setPref } from './preferences';

/**
 * Typed accessors over the key/value store. A bad or missing row falls back to
 * the default rather than throwing, because every read happens on a render path.
 */

export const ONBOARDING_COMPLETE = 'onboarding_complete';

const DEFAULT_DIRECTION = 'default_direction';
const OFFLINE_MODE = 'offline_mode';
const ACTIVE_CHAT_MODEL = 'active_chat_model';

export type Direction = 'en-sw' | 'sw-en';

export const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'en-sw', label: 'English → Swahili' },
  { value: 'sw-en', label: 'Swahili → English' },
];

export async function getDirection(): Promise<Direction> {
  const value = await getPref(DEFAULT_DIRECTION);
  return value === 'sw-en' ? 'sw-en' : 'en-sw';
}

export async function setDirection(direction: Direction): Promise<void> {
  await setPref(DEFAULT_DIRECTION, direction);
}

/**
 * Offline mode is a preference, not a radio switch: nothing in the app opens a
 * socket during inference anyway, so this only governs whether the UI offers
 * network-backed actions (registry OCR fetch, model downloads).
 */
export async function getOfflineMode(): Promise<boolean> {
  return (await getPref(OFFLINE_MODE)) === 'true';
}

export async function setOfflineMode(enabled: boolean): Promise<void> {
  await setPref(OFFLINE_MODE, enabled ? 'true' : 'false');
}

/**
 * Which installed chat model the assistant uses. Several chat models can be
 * installed side by side, so the choice has to be explicit rather than "whichever
 * entry the catalog lists first". A null value means the default.
 */
export async function getActiveChatModel(): Promise<string | null> {
  return await getPref(ACTIVE_CHAT_MODEL);
}

export async function setActiveChatModel(id: string): Promise<void> {
  await setPref(ACTIVE_CHAT_MODEL, id);
}

export async function clearActiveChatModel(): Promise<void> {
  await setPref(ACTIVE_CHAT_MODEL, '');
}
