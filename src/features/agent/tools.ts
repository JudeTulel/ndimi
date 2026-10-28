import { Linking, Platform } from 'react-native';

/**
 * Tools the agent can run on the phone.
 *
 * Deliberately few and small: a 0.5B–3B on-device model picks from this list, so
 * every tool has a one-clause description and a flat argument shape. Anything that
 * needs a multi-step dialog (a real USSD session, reading the inbox) arrives as a
 * later increment rather than bloating the first set.
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

/**
 * Strips a number down to something the dialer will take. Models repeat the local
 * formatting they saw in the prompt ("0722 000 000", "+254 (722) 000-000"), and
 * spaces or brackets break the `tel:` URI on Android.
 */
export function normaliseNumber(raw: string): string {
  const trimmed = raw.trim().replace(/[^\d+*#]/g, '');
  if (!trimmed) throw new Error('No phone number given.');
  return trimmed;
}

export const TOOLS: ToolSpec[] = [
  {
    name: 'call',
    description: 'Open the dialer and call a phone number.',
    args: 'number',
    run: async (args) => {
      const number = normaliseNumber(args.number ?? '');
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
    name: 'ussd',
    description: 'Open the dialer with a USSD code such as *334#.',
    args: 'code',
    run: async (args) => {
      const code = (args.code ?? '').trim();
      if (!code) throw new Error('No USSD code given.');
      await Linking.openURL(encodeUssd(code));
      return `Opened ${code}.`;
    },
  },
  {
    name: 'clock',
    description: 'Read the current date and time on the phone.',
    args: 'none',
    run: async () => new Date().toString(),
  },
];

export function findTool(name: string): ToolSpec | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Prompt fragment listing the tools, in the compact form small models follow. */
export function toolManifest(): string {
  return TOOLS.map((t) => `- ${t.name}(${t.args}): ${t.description}`).join('\n');
}
