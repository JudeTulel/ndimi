import SmsAndroid from 'react-native-get-sms-android';

/**
 * SMS access.
 *
 * Split from the tool table so a permission error reads as one clear message
 * instead of the raw bridge failure, and so the same read is reusable outside the
 * agent (history, summaries) later.
 */

export type SmsRow = { id: number; address: string; body: string; date: number; read: boolean };

function list(filter: Record<string, unknown>): Promise<SmsRow[]> {
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (error) => reject(new Error(error)),
      (_count, smsList) => {
        try {
          const rows = JSON.parse(smsList) as {
            _id: number;
            address: string;
            body: string;
            date: number;
            read: number;
          }[];
          resolve(
            rows.map((row) => ({
              id: row._id,
              address: row.address,
              body: row.body,
              date: row.date,
              read: row.read === 1,
            }))
          );
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Could not read the inbox.'));
        }
      }
    );
  });
}

/** Newest messages first, regardless of sender. */
export async function latestMessages(count = 5): Promise<SmsRow[]> {
  const rows = await list({ box: 'inbox', indexFrom: 0, maxCount: Math.min(count, 20) });
  return rows.sort((a, b) => b.date - a.date);
}

/** Newest messages from one sender, matched loosely on the last 9 digits. */
export async function latestFrom(address: string, count = 5): Promise<SmsRow[]> {
  const digits = address.replace(/\D/g, '').slice(-9);
  const rows = await list({ box: 'inbox', maxCount: 50 });
  return rows
    .filter((row) => row.address.replace(/\D/g, '').endsWith(digits))
    .sort((a, b) => b.date - a.date)
    .slice(0, count);
}

/** Sends without leaving the app, so the agent can complete a job unattended. */
export function sendSms(address: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    SmsAndroid.autoSend(
      address,
      message,
      (error) => reject(new Error(error)),
      () => resolve()
    );
  });
}

/** Compact inbox digest for a prompt: sender and first 80 characters each. */
export function summarise(rows: SmsRow[]): string {
  if (rows.length === 0) return 'No messages.';
  return rows
    .map(
      (row) =>
        `- ${row.address}: ${row.body.replace(/\s+/g, ' ').slice(0, 80)}`
    )
    .join('\n');
}
