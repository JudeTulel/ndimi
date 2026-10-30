import {
  cancelSession,
  isAccessibilityEnabled,
  multisessionUssd,
  openAccessibilitySettings,
  sendMessage,
  sendUssd,
} from 'react-native-ussd-advanced';

/** USSD session wrapper.
 *
 * `react-native-ussd-advanced` drives the dialer through an accessibility service:
 * it types the code, waits for the reply and returns the menu text, then types our
 * answers back. That is the only way to read a menu — `tel:` links show the menu but
 * return nothing, so the model would be driving blind.
 *
 * Session state is kept here rather than in the screen: the model only ever sees
 * the menu text, and answers by name.
 */

let open = false;

export type UssdResult = { text: string; ended: boolean };

/** Throws with an actionable message when the service is not switched on. */
export async function ensureAccessibility(): Promise<void> {
  if (await isAccessibilityEnabled()) return;
  await openAccessibilitySettings();
  throw new Error(
    'USSD needs the accessibility service. Switch Ndimi on in Accessibility settings, then retry.'
  );
}

function clean(reply: string | null): UssdResult {
  // An empty reply means the session closed, which ussd-advanced signals exactly so.
  const text = (reply ?? '').trim();
  if (!text) {
    open = false;
    return { text: 'The USSD session ended with no reply.', ended: true };
  }
  return { text, ended: false };
}

/** Starts a session and returns the first menu. */
export async function startSession(code: string): Promise<UssdResult> {
  await ensureAccessibility();
  try {
    const reply = await multisessionUssd(code);
    open = true;
    return clean(reply);
  } catch (error) {
    open = false;
    throw error;
  }
}

/** Answers the current menu. */
export async function replyToSession(input: string): Promise<UssdResult> {
  if (!open) throw new Error('No USSD session is open. Start one with a code first.');
  try {
    const reply = await sendMessage(input);
    return clean(reply);
  } catch (error) {
    open = false;
    throw error;
  }
}

/** Cancels any open USSD session and resets the session tracker. */
export async function cancelUssdSession(): Promise<string> {
  open = false;
  try {
    await cancelSession();
  } catch {
    // Native session might have already closed or timed out
  }
  return 'USSD session ended.';
}

/**
 * Direct phone dialer using Android ACTION_CALL via telephony bridge.
 * Directly places the call without stopping at the dialer screen (clicks call button).
 */
export async function directDial(number: string): Promise<boolean> {
  return sendUssd(number);
}

/** Whether the accessibility service is on; `null` before it has been checked. */
export async function accessibilityReady(): Promise<boolean> {
  return isAccessibilityEnabled();
}

/** Whether a USSD session is currently open (drives the dialer via the accessibility service). */
export function ussdSessionOpen(): boolean {
  return open;
}

export { openAccessibilitySettings };

