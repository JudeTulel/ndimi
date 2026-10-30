import { Linking, Platform } from 'react-native';
import { openApp } from './apps';
import { findContact } from './contacts';
import { pinForUssd } from './pin';
import { requirePermission } from './permissions';
import { latestFrom, latestMessages, sendSms, summarise } from './sms';
import { cancelUssdSession, directDial, replyToSession, startSession } from './ussd';

/** Tools the agent can run on the phone.

 * Deliberately few and small: a 0.5B–3B on-device model picks from this list, so
 * every tool has a one-clause description and a flat argument shape.
 */
export type ToolSpec = {
  name: string;
  /** One clause. Long descriptions cost tokens the small models cannot spare. */
  description: string;
  /** Argument names with a type hint, in call order. */
  args: string;
  run: (args: Record<string, string>) => Promise<string>;
};

/** USSD codes must be encoded: the dialer treats a bare `#` as a fragment. */
export function encodeUssd(code: string): string {
  const cleaned = code.replace(/\s/g, '');
  return `tel:${encodeURIComponent(cleaned).replace(/%23/gi, '%23')}`;
}

/** Strips a number down to something the dialer will take. Models repeat the local
 * formatting they saw in the prompt ("0722 000 000", "+254 (722) 000-000"), and
 * spaces or brackets break the `tel:` URI on Android. */
export function normaliseNumber(raw: string): string {
  const trimmed = raw.trim().replace(/[^\d+*#]/g, '');
  if (!trimmed) throw new Error('No phone number given.');
  return trimmed;
}

export const TOOLS: ToolSpec[] = [
  {
    name: 'call',
    description: 'Call a phone number directly, or open the dialer.',
    args: 'number',
    run: async (args) => {
      const number = normaliseNumber(args.number ?? '');
      if (Platform.OS === 'android') {
        try {
          await requirePermission('call-phone');
          await directDial(number);
          return `Dialling ${number}.`;
        } catch {
          // If direct call fails or permission is denied, fall back to opening the dialer
          await Linking.openURL(`tel:${number}`);
          return `Opened dialer for ${number}.`;
        }
      }
      await Linking.openURL(`tel:${number}`);
      return `Dialling ${number}.`;
    },
  },
  {
    name: 'sms',
    description: 'Open the messaging app with a number and message filled in.',
    args: 'number, message',
    run: async (args) => {
      const number = normaliseNumber(args.number ?? '');
      const message = (args.message ?? '').trim();
      if (!message) throw new Error('No message text given.');
      // Android wants the body in a query param; iOS in the path, which is the
      // separator form below.
      const url =
        Platform.OS === 'android'
          ? `sms:${number}?body=${encodeURIComponent(message)}`
          : `sms:${number}&body=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      return `Message to ${number} is ready to send.`;
    },
  },
  {
    name: 'sms_send',
    description: 'Send an SMS in the background without opening the app.',
    args: 'number, message',
    run: async (args) => {
      const number = normaliseNumber(args.number ?? '');
      const message = (args.message ?? '').trim();
      if (!message) throw new Error('No message text given.');
      await requirePermission('sms-send');
      await sendSms(number, message);
      return `Sent to ${number}.`;
    },
  },
  {
    name: 'sms_read',
    description: 'Read the newest inbox messages, optionally from one sender.',
    args: 'sender?, count?',
    run: async (args) => {
      await requirePermission('sms-read');
      const count = Number(args.count ?? 5) || 5;
      const rows = args.sender
        ? await latestFrom(args.sender, count)
        : await latestMessages(count);
      return summarise(rows);
    },
  },
  {
    name: 'ussd',
    description: 'Open the dialer with a USSD code such as *334#. No reply is returned.',
    args: 'code',
    run: async (args) => {
      const code = (args.code ?? '').trim();
      if (!code) throw new Error('No USSD code given.');
      await Linking.openURL(encodeUssd(code));
      return `Opened ${code}.`;
    },
  },
  {
    name: 'ussd_start',
    description: 'Run a USSD code in session and return the menu text.',
    args: 'code',
    run: async (args) => {
      const code = (args.code ?? '').trim();
      if (!code) throw new Error('No USSD code given.');
      const result = await startSession(code);
      return result.text;
    },
  },
  {
    name: 'ussd_reply',
    description: 'Answer the open USSD menu and return the next menu.',
    args: 'input',
    run: async (args) => {
      const input = (args.input ?? '').trim();
      if (!input) throw new Error('No menu answer given.');
      const result = await replyToSession(input);
      return result.text;
    },
  },
  {
    name: 'ussd_cancel',
    description: 'Cancel and close the currently open USSD session.',
    args: 'none',
    run: async () => cancelUssdSession(),
  },
  {
    name: 'pin_send',
    description: 'Send the saved PIN into the open USSD menu.',
    args: 'none',
    run: async () => {
      const pin = await pinForUssd();
      if (!pin) throw new Error('No PIN saved. Ask the user to set one in Settings.');
      const result = await replyToSession(pin);
      return result.text;
    },
  },
  {
    name: 'open_app',
    description: 'Open an installed app by name.',
    args: 'app',
    run: async (args) => openApp(args.app ?? ''),
  },
  {
    name: 'clock',
    description: 'Read the current date and time on the phone.',
    args: 'none',
    run: async () => new Date().toISOString(),
  },
  {
    name: 'contacts_find',
    description: 'Look up a phone number by contact name.',
    args: 'name',
    run: async (args) => {
      const name = (args.name ?? '').trim();
      if (!name) throw new Error('No contact name given.');
      return findContact(name);
    },
  },
];

export function findTool(name: string): ToolSpec | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Prompt fragment listing the tools, in the compact form small models follow. */
export function toolManifest(): string {
  return TOOLS.map((t) => `- ${t.name}(${t.args}): ${t.description}`).join('\n');
}

/** Matches a contact name and a message off a short free-text request.

 * "text mum that I am late" -> { name: "mum", message: "I am late" }
 * "text my landlord" -> { name: "landlord", message: "" }
 */
export function extractContactAndMessage(raw: string): { name: string; message: string } | null {
  const trimmed = raw.trim();
  const m = /^(?:(text|message|sms|send an sms|send sms|text my|send a message to|send message to|send an sms to)\b[\s:]*)?(.+)$/i.exec(trimmed);
  if (!m) return null;
  const rest = m[2]?.trim() ?? '';
  if (!rest) return null;
  // Split on the first clause boundary: "that ...", "saying ...", "because ...", etc.
  const [name, ...restParts] = rest.split(/\b(?:that|because|and|then|saying|to say)\b/i);
  const message = restParts.join(' ').trim();
  return { name: name.trim(), message: message };
}

/** Strips a number down to something the dialer will take. Models repeat the local
 * formatting they saw in the prompt ("0722 000 000", "+254 (722) 000-000"), and
 * spaces or brackets break the `tel:` URI on Android. */
export function extractContactNumber(raw: string): string | null {
  const digitsOnly = raw.trim().replace(/[^\d+*#]/g, '');
  if (!digitsOnly || digitsOnly.length < 3) return null;
  return digitsOnly;
}

/** Current date/time. Returns a fixed ISO string plus a short "now" summary. */
export function clock(): string {
  return new Date().toISOString();
}

