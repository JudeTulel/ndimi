import * as SecureStore from 'expo-secure-store';

/**
 * The M-Pesa PIN, held in the Android keystore.
 *
 * A PIN is the one value the agent needs and must not put in a plain preference or
 * show in a bubble, so it lives in SecureStore under its own key.
 *
 * Only 4 digits are kept as digits: STK prompts accept the PIN padded with `#`,
 * which is why `pinForUssd` exists — sending bare "1234" into a `#`-terminated
 * field leaves the menu waiting.
 */

const KEY = 'agent_pin';

export type PinResult = 'sent' | 'missing';

export async function setPin(pin: string): Promise<void> {
  const clean = pin.replace(/\D/g, '');
  if (clean.length < 4 || clean.length > 6) throw new Error('A PIN is 4 to 6 digits.');
  await SecureStore.setItemAsync(KEY, clean);
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) !== null;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

/** The stored PIN padded for a USSD prompt, or null when none is saved. */
export async function pinForUssd(): Promise<string | null> {
  const pin = await SecureStore.getItemAsync(KEY);
  if (!pin) return null;
  return `${pin}#`;
}
