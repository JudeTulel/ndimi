import {
  cancelSession,
  isAccessibilityEnabled,
  multisessionUssd,
  openAccessibilitySettings,
  sendMessage,
} from 'react-native-ussd-advanced';

/**
 * USSD session wrapper.
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
  const reply = await multisessionUssd(code);
  open = true;
  return clean(reply);
}

/** Answers the current menu. */
export async function replyToSession(input: string): Promise<UssdResult> {
  if (!open) throw new Error('No USSD session is open. Start one with a code first.');
  const reply = await sendMessage(input);
  return clean(reply);
}

export async function endSession(): Promise<void> {
  if (!open) return;
  open = false;
  await cancelSession().catch(() => {});
}

/** Whether the accessibility service is on; `null` before it has been checked. */
export async function accessibilityReady(): Promise<boolean> {
  return isAccessibilityEnabled();
}

export { openAccessibilitySettings };
